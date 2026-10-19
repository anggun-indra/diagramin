/**
 * Copyright (c) 2006-2024, JGraph Holdings Ltd
 * Copyright (c) 2006-2024, draw.io AG
 */
// Overrides of global vars need to be pre-loaded
window.DRAWIO_PUBLIC_BUILD = true;
window.EXPORT_URL = null; // Uses client-side print / export
window.DRAWIO_BASE_URL = '.'; // Self-hosted relative base path
window.DRAWIO_VIEWER_URL = 'js/viewer.min.js';
window.DRAWIO_LIGHTBOX_URL = null;
window.DRAW_MATH_URL = 'math4/es5';
window.DRAWIO_SERVER_URL = null; // No Java backend dependency
window.DRAWIO_CONFIG = null;
urlParams['sync'] = 'manual';

// Only allow Local Device and Diagramin Cloud storage (disable 3rd party providers)
urlParams['services'] = '0';
urlParams['gapi'] = '0';
urlParams['db'] = '0';
urlParams['od'] = '0';
urlParams['gh'] = '0';
urlParams['gl'] = '0';
urlParams['tr'] = '0';
urlParams['browser'] = '0';
