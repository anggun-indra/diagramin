/**
 * Copyright (c) 2006-2024, JGraph Holdings Ltd
 * Copyright (c) 2006-2024, draw.io AG
 */
// null'ing of global vars need to be after init.js
window.ICONSEARCH_PATH = null;
window.ICON_SERVICE_PATH = null;

// Loads Solar Icons (Linear Style)
if (typeof mxscript === 'function')
{
	mxscript((typeof drawDevUrl !== 'undefined' ? drawDevUrl : '') + 'js/solar-icons.js');
	mxscript((typeof drawDevUrl !== 'undefined' ? drawDevUrl : '') + 'js/firebase-auth.js');
}
