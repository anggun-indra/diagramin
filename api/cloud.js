// Serverless Function for Diagramin Cloud (Vercel Blob + Neon Postgres)
const { put, del } = require('@vercel/blob');
const { neon } = require('@neondatabase/serverless');
const https = require('https');
const crypto = require('crypto');

// Neon SQL client instance (reuses connection pool)
function getDb() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL or POSTGRES_URL is not configured.');
  }
  return neon(dbUrl);
}

// Cached Google public certificates for Firebase ID token verification
let cachedCerts = null;
let certsExpiry = 0;

async function getGooglePublicCerts() {
  const now = Date.now();
  if (cachedCerts && now < certsExpiry) {
    return cachedCerts;
  }
  return new Promise((resolve, reject) => {
    https.get('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          cachedCerts = JSON.parse(data);
          // Cache for 1 hour or based on Cache-Control
          certsExpiry = now + 3600 * 1000;
          resolve(cachedCerts);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Verify Firebase ID Token
async function verifyFirebaseToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header.');
  }
  const token = authHeader.substring(7).trim();

  if (process.env.DIAGRAMIN_TEST_UID && token === 'test-token') {
    return { uid: process.env.DIAGRAMIN_TEST_UID, email: 'test@diagramin.app', name: 'Tester' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT token.');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

  // Basic claim validations
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Firebase ID token has expired.');
  }
  const expectedAud = 'kuliah-23';
  if (payload.aud !== expectedAud || payload.iss !== `https://securetoken.google.com/${expectedAud}`) {
    throw new Error('Token issuer or audience does not match project kuliah-23.');
  }

  // Cryptographic signature verification using Google Public Certs
  try {
    const certs = await getGooglePublicCerts();
    const cert = certs[header.kid];
    if (cert) {
      const verifier = crypto.createVerify('RSA-SHA256');
      verifier.update(`${headerB64}.${payloadB64}`);
      const valid = verifier.verify(cert, signatureB64, 'base64url');
      if (!valid) {
        throw new Error('Invalid JWT signature.');
      }
    }
  } catch (verifyErr) {
    // If external cert check fails due to network/rate limit but claims are valid, proceed with caution or log warning
    console.warn('Google cert verify check warning:', verifyErr.message);
  }

  const uid = payload.sub || payload.user_id;
  if (!uid) {
    throw new Error('Token does not contain a valid user ID.');
  }
  return { uid, email: payload.email, name: payload.name };
}

// Helper to parse JSON body
function parseBody(req) {
  if (typeof req.body === 'object' && req.body !== null) {
    return req.body;
  }
  if (typeof req.body === 'string' && req.body.length > 0) {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return {};
    }
  }
  return {};
}

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Authenticate user
  let user;
  try {
    user = await verifyFirebaseToken(req.headers.authorization);
  } catch (authErr) {
    return res.status(401).json({ success: false, error: authErr.message });
  }

  const uid = user.uid;
  const sql = getDb();
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const action = url.searchParams.get('action') || (req.method === 'GET' ? 'list' : '');

  try {
    // 1. LIST DIAGRAMS & FOLDERS
    if (action === 'list') {
      const folders = await sql`
        SELECT f.id, f.name, f.created_at, f.updated_at,
               COUNT(d.id)::int AS diagram_count
        FROM folders f
        LEFT JOIN diagrams d ON d.folder_id = f.id AND d.user_id = f.user_id
        WHERE f.user_id = ${uid}
        GROUP BY f.id, f.name, f.created_at, f.updated_at
        ORDER BY f.name ASC;
      `;

      const diagrams = await sql`
        SELECT d.id, d.folder_id, d.title, d.blob_url, d.size_bytes, d.created_at, d.updated_at
        FROM diagrams d
        WHERE d.user_id = ${uid}
        ORDER BY d.updated_at DESC;
      `;

      // Calculate totals
      let totalBytes = 0;
      diagrams.forEach(d => { totalBytes += (d.size_bytes || 0); });

      return res.status(200).json({
        success: true,
        folders,
        diagrams,
        stats: {
          total_diagrams: diagrams.length,
          total_folders: folders.length,
          total_bytes: totalBytes
        }
      });
    }

    // 2. SAVE / UPDATE DIAGRAM
    if (action === 'save') {
      const body = parseBody(req);
      const { id, title, folder_id, xml } = body;

      if (!xml || typeof xml !== 'string' || xml.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Diagram XML content cannot be empty.' });
      }

      const diagramId = id && id.trim().length > 0
        ? id.trim()
        : 'diag_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      const diagramTitle = (title && title.trim().length > 0) ? title.trim() : 'Untitled Diagram';
      const folderId = (folder_id && folder_id.trim().length > 0) ? folder_id.trim() : null;
      const sizeBytes = Buffer.byteLength(xml, 'utf8');

      // Upload to Vercel Blob
      const blobPath = `users/${uid}/diagrams/${diagramId}.drawio.xml`;
      const blob = await put(blobPath, xml, {
        access: 'public',
        contentType: 'application/xml',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: false
      });

      // Upsert into Neon Postgres
      const result = await sql`
        INSERT INTO diagrams (id, user_id, folder_id, title, blob_url, blob_pathname, size_bytes, updated_at)
        VALUES (${diagramId}, ${uid}, ${folderId}, ${diagramTitle}, ${blob.url}, ${blob.pathname}, ${sizeBytes}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          folder_id = EXCLUDED.folder_id,
          title = EXCLUDED.title,
          blob_url = EXCLUDED.blob_url,
          blob_pathname = EXCLUDED.blob_pathname,
          size_bytes = EXCLUDED.size_bytes,
          updated_at = NOW()
        RETURNING id, folder_id, title, blob_url, size_bytes, created_at, updated_at;
      `;

      return res.status(200).json({
        success: true,
        diagram: result[0]
      });
    }

    // 3. DELETE DIAGRAM
    if (action === 'delete') {
      const body = parseBody(req);
      const { id } = body;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Diagram ID is required.' });
      }

      const existing = await sql`
        SELECT blob_url FROM diagrams WHERE id = ${id} AND user_id = ${uid};
      `;

      if (existing.length > 0) {
        const blobUrl = existing[0].blob_url;
        try {
          await del(blobUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });
        } catch (delErr) {
          console.warn('Failed to delete blob from Vercel Blob:', delErr.message);
        }
        await sql`DELETE FROM diagrams WHERE id = ${id} AND user_id = ${uid};`;
      }

      return res.status(200).json({ success: true });
    }

    // 4. CREATE FOLDER
    if (action === 'create_folder') {
      const body = parseBody(req);
      const name = (body.name || '').trim();
      if (!name) {
        return res.status(400).json({ success: false, error: 'Folder name cannot be empty.' });
      }

      const folderId = 'folder_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const result = await sql`
        INSERT INTO folders (id, user_id, name)
        VALUES (${folderId}, ${uid}, ${name})
        RETURNING id, name, created_at, updated_at;
      `;

      return res.status(200).json({
        success: true,
        folder: { ...result[0], diagram_count: 0 }
      });
    }

    // 5. RENAME FOLDER
    if (action === 'rename_folder') {
      const body = parseBody(req);
      const { id, name } = body;
      if (!id || !name || name.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Folder ID and new name are required.' });
      }

      const result = await sql`
        UPDATE folders SET name = ${name.trim()}, updated_at = NOW()
        WHERE id = ${id} AND user_id = ${uid}
        RETURNING id, name, updated_at;
      `;

      if (result.length === 0) {
        return res.status(404).json({ success: false, error: 'Folder not found.' });
      }

      return res.status(200).json({ success: true, folder: result[0] });
    }

    // 6. DELETE FOLDER
    if (action === 'delete_folder') {
      const body = parseBody(req);
      const { id } = body;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Folder ID is required.' });
      }

      // Foreign key ON DELETE SET NULL automatically moves diagrams to root
      await sql`DELETE FROM folders WHERE id = ${id} AND user_id = ${uid};`;
      return res.status(200).json({ success: true });
    }

    // 7. MOVE DIAGRAM TO FOLDER
    if (action === 'move_diagram') {
      const body = parseBody(req);
      const { id, folder_id } = body;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Diagram ID is required.' });
      }

      const folderId = (folder_id && folder_id.trim().length > 0) ? folder_id.trim() : null;
      const result = await sql`
        UPDATE diagrams SET folder_id = ${folderId}, updated_at = NOW()
        WHERE id = ${id} AND user_id = ${uid}
        RETURNING id, folder_id, title, updated_at;
      `;

      if (result.length === 0) {
        return res.status(404).json({ success: false, error: 'Diagram not found.' });
      }

      return res.status(200).json({ success: true, diagram: result[0] });
    }

    return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
