# Diagramin

[![Live Production](https://img.shields.io/badge/Demo-diagramin.vercel.app-blue?style=flat&logo=vercel)](https://diagramin.vercel.app)
[![License](https://img.shields.io/badge/License-Apache_2.0-green.svg)](LICENSE)
[![Upstream](https://img.shields.io/badge/Upstream-jgraph%2Fdrawio-orange)](https://github.com/jgraph/drawio)

**Diagramin** adalah aplikasi diagramming dan flowchart berbasis web yang dirancang khusus untuk kebutuhan spesifik—terutama di lingkungan **akademik, perkuliahan, dan institusi pendidikan**.

Project ini merupakan **fork independen** dari open-source [draw.io (jgraph/drawio)](https://github.com/jgraph/drawio) dengan modifikasi utama pada arsitektur penyimpanan: mengganti dependensi cloud pihak ketiga (Google Drive, OneDrive, Dropbox) dengan **penyimpanan cloud mandiri berbasis Vercel Blob Storage dan database metadata Neon PostgreSQL**, serta mempertahankan opsi penyimpanan **Local Device**.

---

## ⚖️ Etika Forking & Atribusi Open-Source (Open Source Attribution)

Proyek ini menghormati dan mematuhi etika open-source serta ketentuan lisensi upstream:

1. **Upstream Project & Origin**:
   Aplikasi ini merupakan karya turunan (*derivative work*) yang di-fork dari proyek sumber terbuka [draw.io](https://github.com/jgraph/drawio), yang dikembangkan dan dimiliki secara bersama oleh **draw.io Ltd** (sebelumnya JGraph Ltd) dan **draw.io AG**.
2. **Lisensi Apache 2.0**:
   Seluruh kode sumber Diagramin tetap tunduk dan dilisensikan di bawah [Apache License 2.0](LICENSE), mempertahankan ketentuan lisensi asli.
3. **Pemberitahuan Merek Dagang (Trademark Disclaimer)**:
   Nama "draw.io" dan "diagrams.net" adalah merek dagang terdaftar milik draw.io Ltd / draw.io AG. Proyek ini menggunakan nama **Diagramin** untuk membedakan secara tegas dari produk resmi draw.io. Diagramin adalah proyek independen dan **tidak terafiliasi dengan, didukung oleh, atau disponsori oleh draw.io Ltd maupun draw.io AG**.
4. **Ketentuan Aset Ikon & Stencil**:
   Ikon, stencil, dan pustaka bentuk bawaan disediakan sesuai dengan ketentuan lisensi asli upstream draw.io. Aset-aset tersebut tidak boleh digunakan sebagai aset perangkat lunak dalam produk ekosistem Atlassian tanpa izin tertulis dari pemilik hak cipta aslinya.

---

## 🎯 Mengapa Fork Ini Dibuat? (Latar Belakang & Tujuan)

Meskipun draw.io asli sangat handal, integrasi default-nya mengandalkan akun Google Drive, OneDrive, atau Dropbox individu. Dalam konteks perkuliahan dan pengajaran kampus, arsitektur tersebut sering menimbulkan kendala:

- **Kebijakan Google Workspace Kampus**: Akun email kampus sering kali membatasi otorisasi OAuth aplikasi pihak ketiga ke Google Drive mahasiswa/dosen, memicu error izin (*permission denied* atau *unverified app warning*).
- **Kerapian & Fokus Akademik**: Mahasiswa dan dosen memerlukan wadah penyimpanan diagram yang rapi dan terorganisir per mata kuliah/tugas tanpa tercampur dengan tumpukan dokumen pribadi di Google Drive.
- **Dua Pilihan Penyimpanan yang Jelas**:
  1. **Diagramin Cloud**: Tersimpan otomatis dan aman di cloud mandiri (*Vercel Blob Storage* untuk isi diagram dan *Neon Serverless PostgreSQL* untuk metadata & folder).
  2. **Local Device**: File diagram `.drawio` disimpan langsung ke komputer pengguna secara instan tanpa membutuhkan koneksi internet atau login akun.
- **Bebas Bloatware Pihak Ketiga**: Menu dan dialog integrasi cloud eksternal (Google Drive, Dropbox, OneDrive, WebDAV, GitLab, dsb.) telah dihilangkan agar antarmuka menjadi bersih, cepat, dan fokus untuk kegiatan belajar-mengajar.

---

## ✨ Fitur Utama Diagramin

- **🎨 Editor Lengkap**: Fitur pembuatan diagram lengkap bawaan draw.io (Flowchart, UML, ERD, Arsitektur Cloud, Network Diagram, Mind Map, Wireframe UI).
- **☁️ Dedicated Blob Storage (Vercel Blob)**: Menyimpan file diagram XML dengan performa tinggi, latency rendah, dan skalabilitas serverless.
- **🗂️ Manajemen Folder & Meta Data (Neon PostgreSQL)**: Pengguna dapat membuat folder (misalnya per mata kuliah atau topik riset) dan mengelompokkan diagram dengan mudah.
- **🔐 Autentikasi Google Terintegrasi**: Login praktis menggunakan akun Google (hanya untuk autentikasi identitas, tidak memerlukan akses ke Google Drive pribadi).
- **💾 Penyimpanan Local**: Opsi unduh dan buka langsung dari storage lokal (*Local Device*).
- **🌓 Tampilan Modern & Rapi**:
  - Peningkatan pada kontrol input angka (*steppers*) yang menyatu (*seamless*).
  - Indikator status penyimpanan cloud berwarna hijau (`✓ Tersimpan di Vercel Cloud`).
  - Dukungan tema Light Mode dan Dark Mode yang konsisten.

---

## 🏗️ Arsitektur Sistem

```
┌────────────────────────────────────────────────────────┐
│                   Diagramin Frontend                   │
│         (HTML5, Canvas, mxGraph, Modern UI)            │
└───────────────────────────┬────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
   ┌───────────────────────┐  ┌─────────────────────────┐
   │    Local Storage      │  │     Diagramin Cloud     │
   │  (Device File System) │  │   (Google/Firebase Auth)│
   └───────────────────────┘  └─────────────┬───────────┘
                                            │
                               ┌────────────┴────────────┐
                               ▼                         ▼
                    ┌─────────────────────┐   ┌─────────────────────┐
                    │     Vercel Blob     │   │   Neon PostgreSQL   │
                    │   (Konten XML)      │   │ (Metadata & Folder) │
                    └─────────────────────┘   └─────────────────────┘
```

---

## 🚀 Panduan Menjalankan Secara Lokal (Local Development)

### Prasyarat
- [Node.js](https://nodejs.org/) (versi 18 ke atas)
- Akun [Vercel](https://vercel.com) (untuk Vercel Blob token)
- Akun [Neon](https://neon.tech) (untuk PostgreSQL database)

### Langkah Menjalankan:
1. **Clone repository ini:**
   ```bash
   git clone https://github.com/anggun-indra/diagramin.git
   cd diagramin
   ```

2. **Install dependensi:**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variables:**
   Buat file `.env.local` di direktori root:
   ```env
   DATABASE_URL="postgres://user:password@ep-sample.region.neon.tech/neondb?sslmode=require"
   BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
   ```

4. **Jalankan development server menggunakan Vercel CLI:**
   ```bash
   npx vercel dev
   ```
   Buka peramban Anda di `http://localhost:3000`.

---

## 🚢 Deployment ke Vercel

Diagramin siap di-deploy langsung ke Vercel:

1. Import repository `anggun-indra/diagramin` ke dashboard Vercel.
2. Tambahkan **Environment Variables** di Vercel:
   - `DATABASE_URL` : Connection string database Neon Postgres.
   - `BLOB_READ_WRITE_TOKEN` : Token akses baca/tulis Vercel Blob.
3. Deploy! Aplikasi akan otomatis ter-build dan terbit ke domain produksi Anda.

Live production app: **[https://diagramin.vercel.app](https://diagramin.vercel.app)**

---

## 📜 Lisensi & Hak Cipta

- **Kode Sumber Diagramin**: Dilisensikan di bawah [Apache License 2.0](LICENSE).
- **Hak Cipta Upstream**: Hak cipta asli draw.io dimiliki oleh draw.io Ltd (JGraph Ltd) dan draw.io AG.
- **Modifikasi Diagramin**: Hak cipta modifikasi © 2026 Anggun Indra dan kontributor Diagramin.
