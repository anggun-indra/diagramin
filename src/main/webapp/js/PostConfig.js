/**
 * Copyright (c) 2006-2024, JGraph Holdings Ltd
 * Copyright (c) 2006-2024, draw.io AG
 */
// null'ing of global vars need to be after init.js
window.ICONSEARCH_PATH = null;
window.ICON_SERVICE_PATH = null;

// Disable Google Drive and 3rd party storage clients
window.DriveClient = null;
window.OneDriveClient = null;
window.DropboxClient = null;
window.TrelloClient = null;

if (typeof App !== 'undefined')
{
	App.prototype.isModeEnabled = function(mode)
	{
		return mode === App.MODE_DEVICE;
	};
	App.prototype.isModeReady = function(mode)
	{
		return false;
	};
	App.prototype.getServiceForName = function(name)
	{
		return null;
	};
	App.prototype.isOwnGDriveDomain = function()
	{
		return false;
	};
	App.prototype.isDriveDomain = function()
	{
		return false;
	};
	App.prototype.showDriveAccessDialog = function()
	{
		return false;
	};
}

if (typeof EditorUi !== 'undefined' && EditorUi.prototype)
{
	var origEditorUiInit = EditorUi.prototype.init;
	EditorUi.prototype.init = function()
	{
		window.editorUi = this;
		return origEditorUiInit.apply(this, arguments);
	};
}


// Loads Solar Icons (Linear Style)
if (typeof mxscript === 'function')
{
	mxscript((typeof drawDevUrl !== 'undefined' ? drawDevUrl : '') + 'js/solar-icons.js');
	mxscript((typeof drawDevUrl !== 'undefined' ? drawDevUrl : '') + 'js/firebase-auth.js');
}

