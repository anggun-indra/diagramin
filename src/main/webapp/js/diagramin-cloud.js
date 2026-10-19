/**
 * Diagramin Cloud Integration (Vercel Blob + Neon Postgres)
 * Strictly 2 storage options: Local Device and Diagramin Cloud
 */
(function()
{
	var CLOUD_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>';
	var FOLDER_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>';
	var FILE_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>';
	var TRASH_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
	var EDIT_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
	var MOVE_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>';

	function getDiagraminCloudFileClass()
	{
		if (window.DiagraminCloudFile) return window.DiagraminCloudFile;

		function DiagraminCloudFile(ui, data, title, diagramMeta)
		{
			if (typeof DrawioFile !== 'undefined')
			{
				DrawioFile.call(this, ui, data);
			}
			this.ui = ui;
			this.title = title || (diagramMeta ? diagramMeta.title : null) || (ui && ui.defaultFilename) || 'Untitled Diagram';
			this.diagramMeta = diagramMeta || null;
			this.mode = 'diagramin_cloud';
		}

		if (typeof DrawioFile !== 'undefined')
		{
			mxUtils.extend(DiagraminCloudFile, DrawioFile);
		}

		DiagraminCloudFile.prototype.allChangesSavedKey = 'allChangesSaved';
		DiagraminCloudFile.prototype.savingStatusKey = 'saving';

		DiagraminCloudFile.prototype.getMode = function()
		{
			return this.mode;
		};

		DiagraminCloudFile.prototype.getTitle = function()
		{
			return this.title;
		};

		DiagraminCloudFile.prototype.isRenamable = function()
		{
			return true;
		};

		DiagraminCloudFile.prototype.isEditable = function()
		{
			return true;
		};

		DiagraminCloudFile.prototype.getHash = function()
		{
			return 'C' + (this.diagramMeta && this.diagramMeta.id ? this.diagramMeta.id : '');
		};

		DiagraminCloudFile.prototype.save = function(revision, success, error)
		{
			this.saveFile(this.title, revision, success, error);
		};

		DiagraminCloudFile.prototype.saveAs = function(title, success, error)
		{
			this.saveFile(title, false, success, error);
		};

		DiagraminCloudFile.prototype.saveFile = function(title, revision, success, error)
		{
			var self = this;
			var diagId = this.diagramMeta ? this.diagramMeta.id : null;
			var folderId = this.diagramMeta ? this.diagramMeta.folder_id : null;
			DiagraminCloud.saveDiagram({
				id: diagId,
				title: title || self.title,
				folder_id: folderId
			}).then(function(res)
			{
				self.setModified(false);
				if (success) success();
			}).catch(function(err)
			{
				if (error) error(err);
			});
		};

		DiagraminCloudFile.prototype.rename = function(newTitle, success, error)
		{
			var self = this;
			this.title = newTitle;
			if (this.diagramMeta) this.diagramMeta.title = newTitle;
			if (this.descriptorChanged) this.descriptorChanged();

			if (this.diagramMeta && this.diagramMeta.id)
			{
				DiagraminCloud.saveDiagram({
					id: this.diagramMeta.id,
					title: newTitle,
					folder_id: this.diagramMeta.folder_id
				}).then(function(res)
				{
					self.setModified(false);
					if (success) success();
				}).catch(function(err)
				{
					if (error) error(err);
				});
			}
			else if (success)
			{
				success();
			}
		};

		window.DiagraminCloudFile = DiagraminCloudFile;
		return DiagraminCloudFile;
	}
	window.getDiagraminCloudFileClass = getDiagraminCloudFileClass;

	window.DiagraminCloud = {
		getFileClass: getDiagraminCloudFileClass,
		currentDiagram: null, // { id, title, folder_id, blob_url }
		folders: [],
		diagrams: [],
		stats: {},
		selectedFolderId: 'ALL', // 'ALL', 'ROOT', or folder_id
		activeUi: null,

		init: function(editorUi)
		{
			this.activeUi = editorUi;
			this.nullifyExternalClients();
			this.installCustomStorageDialog();
			this.patchMenus(editorUi);
			this.overrideShowSplash(editorUi);
			this.overridePickFile();
			this.overrideServiceCount();
			this.mountHeaderButtons();
			this.installKeyHandlers();

			// Listen to auth changes
			if (window.DiagraminAuth)
			{
				window.DiagraminAuth.onAuthStateChanged(mxUtils.bind(this, function(user)
				{
					this.updateHeaderButtons(user != null);
					if (user != null)
					{
						this.refreshList();
					}
					else
					{
						this.currentDiagram = null;
						this.folders = [];
						this.diagrams = [];
					}
				}));
			}
		},

		// Explicitly disable Google Drive, OneDrive, Dropbox, and 3rd party providers
		nullifyExternalClients: function()
		{
			window.DriveClient = null;
			window.OneDriveClient = null;
			window.DropboxClient = null;
			window.TrelloClient = null;

			if (window.App && window.App.prototype)
			{
				window.App.prototype.isModeEnabled = function(mode)
				{
					return mode === window.App.MODE_DEVICE;
				};
				window.App.prototype.isModeReady = function(mode)
				{
					return false;
				};
				window.App.prototype.getServiceForName = function(name)
				{
					return null;
				};
				window.App.prototype.isOwnGDriveDomain = function()
				{
					return false;
				};
				window.App.prototype.isDriveDomain = function()
				{
					return false;
				};
				window.App.prototype.showDriveAccessDialog = function()
				{
					return false;
				};
			}
		},

		// Overrides App.prototype.showSplash to offer Diagramin Cloud & Local Device
		overrideShowSplash: function(editorUi)
		{
			if (!window.App || !window.App.prototype) return;

			var self = this;
			window.App.prototype.showSplash = function(force)
			{
				if (urlParams['noFileMenu'] == '1') return;

				var showSecondDialog = mxUtils.bind(this, function()
				{
					if (this.isHomeEnabled && this.isHomeEnabled())
					{
						this.showHome();
						return;
					}

					var dlg = (typeof SplashDialog === 'function') ? new SplashDialog(this) : null;
					if (dlg && dlg.container)
					{
						this.showDialog(dlg.container, 340, 230, true, true, mxUtils.bind(this, function(cancel, isEsc)
						{
							if (cancel || isEsc)
							{
								var prev = Editor.useLocalStorage;
								this.createFile(this.defaultFilename, null, null, null, null, null, null, urlParams['local'] != '1');
								Editor.useLocalStorage = prev;
							}
						}), true);
					}
					else
					{
						this.createFile(this.defaultFilename, null, null, null, null, null, null, true);
					}
				});

				if (this.mode == null || force)
				{
					var dlg = new window.StorageDialog(this, mxUtils.bind(this, function()
					{
						this.hideDialog();
						showSecondDialog();
					}));

					this.showDialog(dlg.container, 460, 260, true, false);
				}
				else if (urlParams['create'] == null)
				{
					showSecondDialog();
				}
			};
		},

		// Overrides App.prototype.pickFile to redirect to Diagramin Cloud or local file picker
		overridePickFile: function()
		{
			if (!window.App || !window.App.prototype) return;
			var self = this;
			var origPickFile = window.App.prototype.pickFile;

			window.App.prototype.pickFile = function(mode)
			{
				mode = (mode != null) ? mode : this.mode;

				if (mode === 'diagramin_cloud' || mode === App.MODE_GOOGLE)
				{
					if (self.showFileManagerDialog)
					{
						self.showFileManagerDialog();
					}
					return;
				}

				return origPickFile.apply(this, arguments);
			};
		},

		// Override getServiceCount to report 2 services: Diagramin Cloud & Local Device
		overrideServiceCount: function()
		{
			if (!window.EditorUi || !window.EditorUi.prototype) return;
			window.EditorUi.prototype.getServiceCount = function()
			{
				return 2;
			};
		},

		// Replaces window.StorageDialog so that only Diagramin Cloud & Local Device are offered
		installCustomStorageDialog: function()
		{
			var self = this;
			window.StorageDialog = function(editorUi, fn, rowLimit)
			{
				var div = document.createElement('div');
				div.style.cssText = 'padding:16px 20px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#111827;';

				var title = document.createElement('h2');
				title.style.cssText = 'font-size:18px;font-weight:700;margin:0 0 6px 0;color:#111827;';
				title.textContent = 'Pilih Tempat Penyimpanan Diagram';
				div.appendChild(title);

				var desc = document.createElement('p');
				desc.style.cssText = 'font-size:13px;color:#6b7280;margin:0 0 20px 0;line-height:1.4;';
				desc.textContent = 'Diagramin difokuskan pada 2 mode penyimpanan:';
				div.appendChild(desc);

				var cards = document.createElement('div');
				cards.style.cssText = 'display:flex;gap:14px;justify-content:center;margin-bottom:16px;flex-direction:row;flex-wrap:nowrap;';

				// 1. Cloud Storage Option
				var cloudCard = document.createElement('div');
				cloudCard.style.cssText = 'flex:1;min-width:140px;max-width:180px;padding:16px 14px;border:1.5px solid #2563eb;border-radius:10px;background:#eff6ff;cursor:pointer;text-align:center;transition:all 0.15s ease;box-shadow:0 2px 4px rgba(37,99,235,0.08);';
				cloudCard.innerHTML = '<div style="width:44px;height:44px;margin:0 auto 10px auto;border-radius:50%;background:#2563eb;color:#ffffff;display:flex;align-items:center;justify-content:center;">' +
					'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>' +
					'</div>' +
					'<div style="font-size:14px;font-weight:700;color:#1d4ed8;margin-bottom:4px;">Diagramin Cloud</div>' +
					'<div style="font-size:11px;color:#3b82f6;line-height:1.3;">Vercel Blob &amp; Postgres</div>';
				cloudCard.onmouseover = function() { this.style.transform = 'translateY(-2px)'; this.style.boxShadow = '0 6px 12px rgba(37,99,235,0.15)'; };
				cloudCard.onmouseout = function() { this.style.transform = 'none'; this.style.boxShadow = '0 2px 4px rgba(37,99,235,0.08)'; };
				cloudCard.onclick = function()
				{
					editorUi.hideDialog();
					if (window.DiagraminAuth && window.DiagraminAuth.currentUser != null)
					{
						if (fn) fn();
					}
					else
					{
						if (window.DiagraminAuth)
						{
							window.DiagraminAuth.showLoginModal();
						}
						if (fn) fn();
					}
				};
				cards.appendChild(cloudCard);

				// 2. Local Device Option
				var deviceCard = document.createElement('div');
				deviceCard.style.cssText = 'flex:1;min-width:140px;max-width:180px;padding:16px 14px;border:1.5px solid #e5e7eb;border-radius:10px;background:#ffffff;cursor:pointer;text-align:center;transition:all 0.15s ease;box-shadow:0 1px 3px rgba(0,0,0,0.05);';
				deviceCard.innerHTML = '<div style="width:44px;height:44px;margin:0 auto 10px auto;border-radius:50%;background:#f3f4f6;color:#374151;display:flex;align-items:center;justify-content:center;">' +
					'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6 18h.01"/><path d="M10 18h.01"/><path d="M4 14V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8"/></svg>' +
					'</div>' +
					'<div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:4px;">Perangkat (Lokal)</div>' +
					'<div style="font-size:11px;color:#6b7280;line-height:1.3;">Penyimpanan Komputer</div>';
				deviceCard.onmouseover = function() { this.style.borderColor = '#9ca3af'; this.style.transform = 'translateY(-2px)'; this.style.boxShadow = '0 6px 12px rgba(0,0,0,0.08)'; };
				deviceCard.onmouseout = function() { this.style.borderColor = '#e5e7eb'; this.style.transform = 'none'; this.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; };
				deviceCard.onclick = function()
				{
					editorUi.hideDialog();
					editorUi.setMode(window.App ? window.App.MODE_DEVICE : 'device', true);
					if (fn) fn();
				};
				cards.appendChild(deviceCard);

				div.appendChild(cards);

				var later = document.createElement('div');
				later.style.cssText = 'font-size:12px;color:#9ca3af;cursor:pointer;text-decoration:underline;margin-top:6px;';
				later.textContent = 'Tentukan nanti (buka kanvas kosong)';
				later.onclick = function()
				{
					editorUi.hideDialog();
					var prev = Editor.useLocalStorage;
					editorUi.createFile(editorUi.defaultFilename, null, null, null, null, null, null, true);
					Editor.useLocalStorage = prev;
				};
				div.appendChild(later);

				this.container = div;
			};
		},

		// Patch Menus to strictly allow only Cloud and Device
		patchMenus: function(editorUi)
		{
			if (!editorUi) return;

			var self = this;
			var applyPatch = function(menus)
			{
				if (!menus || typeof Menu === 'undefined') return;

				// 1. Override openFrom
				menus.put('openFrom', new Menu(mxUtils.bind(self, function(menu, parent)
				{
					menu.addItem('Diagramin Cloud (Vercel)...', null, mxUtils.bind(self, function()
					{
						self.showFileManagerDialog();
					}), parent);

					menu.addItem(mxResources.get('device') + '...', null, function()
					{
						editorUi.pickFile(window.App ? window.App.MODE_DEVICE : 'device');
					}, parent);
				})));

				// 2. Override importFrom
				menus.put('importFrom', new Menu(mxUtils.bind(self, function(menu, parent)
				{
					menu.addItem('Diagramin Cloud (Vercel)...', null, mxUtils.bind(self, function()
					{
						self.showFileManagerDialog();
					}), parent);

					menu.addItem(mxResources.get('device') + '...', null, function()
					{
						editorUi.actions.get('import').funct();
					}, parent);
				})));
			};

			if (editorUi.menus)
			{
				applyPatch(editorUi.menus);
			}

			// Also patch future menus if regenerated
			if (typeof EditorUi !== 'undefined' && EditorUi.prototype && !EditorUi.prototype._diagraminMenusPatched)
			{
				EditorUi.prototype._diagraminMenusPatched = true;
				var origCreateMenus = EditorUi.prototype.createMenus;
				EditorUi.prototype.createMenus = function()
				{
					var menus = origCreateMenus.apply(this, arguments);
					applyPatch(menus);
					return menus;
				};
			}

			// Hook into save action (Ctrl+S / File > Save)
			var saveAction = editorUi.actions.get('save');
			if (saveAction && !saveAction._diagraminHooked)
			{
				saveAction._diagraminHooked = true;
				var origSaveFunct = saveAction.funct;
				saveAction.funct = mxUtils.bind(this, function()
				{
					if (window.DiagraminAuth && window.DiagraminAuth.currentUser != null)
					{
						this.handleSaveAction();
					}
					else
					{
						origSaveFunct.apply(this, arguments);
					}
				});
			}

			// Hook into saveAs action (Shift+Ctrl+S / File > Save As...)
			var saveAsAction = editorUi.actions.get('saveAs');
			if (saveAsAction && !saveAsAction._diagraminHooked)
			{
				saveAsAction._diagraminHooked = true;
				var origSaveAsFunct = saveAsAction.funct;
				saveAsAction.funct = mxUtils.bind(this, function()
				{
					this.showSaveChoiceDialog(origSaveAsFunct);
				});
			}
		},

		// Choice between Cloud and Local when saving as
		showSaveChoiceDialog: function(fallbackLocalFn)
		{
			var overlay = this.createModalOverlay('diagSaveChoiceModal');
			var modal = document.createElement('div');
			modal.style.cssText = 'background:#ffffff;border-radius:12px;width:380px;padding:24px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.15);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#111827;text-align:center;';

			modal.innerHTML = '<div style="font-size:18px;font-weight:700;margin-bottom:6px;">Simpan Diagram Sebagai</div>' +
				'<p style="font-size:13px;color:#6b7280;margin:0 0 20px 0;">Pilih tujuan penyimpanan diagram Anda:</p>' +
				'<div style="display:flex;gap:12px;margin-bottom:16px;">' +
				'<div id="choiceSaveCloud" style="flex:1;padding:16px 12px;border:1.5px solid #2563eb;border-radius:10px;background:#eff6ff;cursor:pointer;transition:all 0.15s ease;">' +
				'<div style="width:40px;height:40px;margin:0 auto 8px auto;border-radius:50%;background:#2563eb;color:#ffffff;display:flex;align-items:center;justify-content:center;">' +
				'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>' +
				'</div>' +
				'<div style="font-size:14px;font-weight:700;color:#1d4ed8;">Cloud (Vercel)</div>' +
				'<div style="font-size:11px;color:#3b82f6;margin-top:2px;">Blob &amp; Postgres</div>' +
				'</div>' +
				'<div id="choiceSaveLocal" style="flex:1;padding:16px 12px;border:1.5px solid #e5e7eb;border-radius:10px;background:#ffffff;cursor:pointer;transition:all 0.15s ease;">' +
				'<div style="width:40px;height:40px;margin:0 auto 8px auto;border-radius:50%;background:#f3f4f6;color:#374151;display:flex;align-items:center;justify-content:center;">' +
				'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6 18h.01"/><path d="M10 18h.01"/><path d="M4 14V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8"/></svg>' +
				'</div>' +
				'<div style="font-size:14px;font-weight:700;color:#111827;">Perangkat (Lokal)</div>' +
				'<div style="font-size:11px;color:#6b7280;margin-top:2px;">Download .drawio</div>' +
				'</div>' +
				'</div>' +
				'<button id="cancelChoiceBtn" style="padding:6px 16px;border:1px solid #d1d5db;background:#ffffff;border-radius:6px;cursor:pointer;font-size:13px;color:#4b5563;">Batal</button>';

			overlay.appendChild(modal);
			document.body.appendChild(overlay);

			var cloudChoice = document.getElementById('choiceSaveCloud');
			cloudChoice.onmouseover = function() { this.style.transform = 'translateY(-2px)'; };
			cloudChoice.onmouseout = function() { this.style.transform = 'none'; };
			cloudChoice.onclick = mxUtils.bind(this, function()
			{
				this.closeModal();
				this.showSaveDialog();
			});

			var localChoice = document.getElementById('choiceSaveLocal');
			localChoice.onmouseover = function() { this.style.borderColor = '#9ca3af'; this.style.transform = 'translateY(-2px)'; };
			localChoice.onmouseout = function() { this.style.borderColor = '#e5e7eb'; this.style.transform = 'none'; };
			localChoice.onclick = mxUtils.bind(this, function()
			{
				this.closeModal();
				if (fallbackLocalFn)
				{
					fallbackLocalFn();
				}
				else if (this.activeUi)
				{
					this.activeUi.saveFile(true);
				}
			});

			document.getElementById('cancelChoiceBtn').onclick = mxUtils.bind(this, this.closeModal);
		},

		// Mount Cloud Buttons into header container
		mountHeaderButtons: function()
		{
			var container = document.querySelector('.geButtonContainer');
			if (!container)
			{
				setTimeout(mxUtils.bind(this, this.mountHeaderButtons), 200);
				return;
			}

			// 1. My Diagrams Button
			if (!document.getElementById('diagraminMyFilesBtn'))
			{
				var myFilesBtn = document.createElement('button');
				myFilesBtn.id = 'diagraminMyFilesBtn';
				myFilesBtn.title = 'Buka daftar diagram & folder Anda di Vercel Cloud';
				myFilesBtn.style.cssText = 'display:none;align-items:center;gap:4px;height:32px;padding:0 12px;border-radius:6px;border:1px solid rgba(0,0,0,0.12);background:#ffffff;color:#374151;font-size:13px;font-weight:500;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.05);transition:all 0.15s ease;box-sizing:border-box;outline:none;';
				myFilesBtn.innerHTML = FOLDER_ICON + '<span>Diagram Saya</span>';
				myFilesBtn.onmouseover = function() { this.style.background = '#f3f4f6'; this.style.borderColor = '#d1d5db'; };
				myFilesBtn.onmouseout = function() { this.style.background = '#ffffff'; this.style.borderColor = 'rgba(0,0,0,0.12)'; };
				myFilesBtn.onclick = mxUtils.bind(this, function(e)
				{
					if (e) mxEvent.consume(e);
					this.showFileManagerDialog();
				});

				var shareBtn = container.querySelector('.gePrimaryBtn');
				if (shareBtn)
				{
					container.insertBefore(myFilesBtn, shareBtn);
				}
				else
				{
					container.appendChild(myFilesBtn);
				}
			}

			// 2. Save to Cloud Button
			if (!document.getElementById('diagraminSaveCloudBtn'))
			{
				var saveBtn = document.createElement('button');
				saveBtn.id = 'diagraminSaveCloudBtn';
				saveBtn.title = 'Simpan diagram ini ke Vercel Cloud Storage (Ctrl+S)';
				saveBtn.style.cssText = 'display:none;align-items:center;gap:4px;height:32px;padding:0 12px;border-radius:6px;border:1px solid #2563eb;background:#2563eb;color:#ffffff;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 1px 2px rgba(37,99,235,0.2);transition:all 0.15s ease;box-sizing:border-box;outline:none;';
				saveBtn.innerHTML = CLOUD_ICON + '<span id="diagraminSaveBtnLabel">Simpan Cloud</span>';
				saveBtn.onmouseover = function() { this.style.background = '#1d4ed8'; };
				saveBtn.onmouseout = function() { this.style.background = '#2563eb'; };
				saveBtn.onclick = mxUtils.bind(this, function(e)
				{
					if (e) mxEvent.consume(e);
					this.handleSaveAction();
				});

				var myFiles = document.getElementById('diagraminMyFilesBtn');
				if (myFiles)
				{
					container.insertBefore(saveBtn, myFiles);
				}
				else
				{
					container.appendChild(saveBtn);
				}
			}

			var isLoggedIn = (window.DiagraminAuth && window.DiagraminAuth.currentUser != null);
			this.updateHeaderButtons(isLoggedIn);
		},

		updateHeaderButtons: function(isLoggedIn)
		{
			var myFilesBtn = document.getElementById('diagraminMyFilesBtn');
			var saveBtn = document.getElementById('diagraminSaveCloudBtn');

			if (myFilesBtn) myFilesBtn.style.display = isLoggedIn ? 'inline-flex' : 'none';
			if (saveBtn) saveBtn.style.display = isLoggedIn ? 'inline-flex' : 'none';

			if (isLoggedIn && this.currentDiagram)
			{
				var label = document.getElementById('diagraminSaveBtnLabel');
				if (label) label.textContent = 'Simpan';
			}
		},

		// API Helper
		fetchApi: async function(action, method, body)
		{
			if (!window.DiagraminAuth || !window.DiagraminAuth.currentUser)
			{
				throw new Error('Silakan login terlebih dahulu untuk mengakses Vercel Cloud Storage.');
			}

			var user = firebase.auth().currentUser;
			if (!user)
			{
				throw new Error('Sesi autentikasi tidak ditemukan. Silakan login kembali.');
			}

			var token = await user.getIdToken();
			var options = {
				method: method || 'GET',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': 'Bearer ' + token
				}
			};

			if (body && (method === 'POST' || method === 'PUT'))
			{
				options.body = JSON.stringify(body);
			}

			var res = await fetch('/api/cloud?action=' + action, options);
			var data = await res.json();

			if (!res.ok || !data.success)
			{
				throw new Error(data.error || 'Terjadi kesalahan pada server (' + res.status + ')');
			}

			return data;
		},

		// Refresh diagram & folder list
		refreshList: async function()
		{
			try
			{
				var data = await this.fetchApi('list', 'GET');
				this.folders = data.folders || [];
				this.diagrams = data.diagrams || [];
				this.stats = data.stats || {};
				return data;
			}
			catch (e)
			{
				console.warn('Gagal memuat list cloud diagram:', e.message);
			}
		},

		// Save Action handler (smart save: direct if already in cloud, prompt if new)
		handleSaveAction: function()
		{
			if (!window.DiagraminAuth || !window.DiagraminAuth.currentUser)
			{
				window.DiagraminAuth.showLoginModal();
				return;
			}

			if (this.currentDiagram && this.currentDiagram.id)
			{
				// Direct update
				this.saveDiagram({
					id: this.currentDiagram.id,
					title: this.currentDiagram.title,
					folder_id: this.currentDiagram.folder_id
				});
			}
			else
			{
				this.showSaveDialog();
			}
		},

		// Save diagram to Vercel Blob & Neon Postgres
		saveDiagram: async function(params)
		{
			var editorUi = this.activeUi || window.editorUi;
			if (!editorUi) return;

			var xml = (editorUi.getFileData ? editorUi.getFileData(true) : null) ||
				(editorUi.editor && editorUi.editor.getGraphXml ? mxUtils.getXml(editorUi.editor.getGraphXml()) : null);
			if (!xml || xml.trim().length === 0)
			{
				this.showToast('Gagal menyimpan: Konten diagram kosong.', 'error');
				return;
			}

			var title = (params && params.title) || (this.currentDiagram && this.currentDiagram.title) ||
				(editorUi.getCurrentFile && editorUi.getCurrentFile() && editorUi.getCurrentFile().getTitle()) ||
				(editorUi.getBaseFilename && editorUi.getBaseFilename()) || 'Untitled Diagram';
			var folderId = (params && params.folder_id !== undefined) ? params.folder_id : (this.currentDiagram ? this.currentDiagram.folder_id : null);
			var diagramId = (params && params.id) || (this.currentDiagram ? this.currentDiagram.id : null);

			var saveBtnLabel = document.getElementById('diagraminSaveBtnLabel');
			if (saveBtnLabel) saveBtnLabel.textContent = 'Menyimpan...';

			try
			{
				var res = await this.fetchApi('save', 'POST', {
					id: diagramId,
					title: title,
					folder_id: folderId,
					xml: xml
				});

				this.currentDiagram = res.diagram;

				var CloudFileClass = getDiagraminCloudFileClass();
				var curFile = (editorUi.getCurrentFile ? editorUi.getCurrentFile() : null);

				if (!curFile || !(curFile instanceof CloudFileClass))
				{
					var newFile = new CloudFileClass(editorUi, xml, res.diagram.title, res.diagram);
					newFile.setModified(false);
					if (editorUi.setCurrentFile)
					{
						editorUi.setCurrentFile(newFile);
					}
					if (newFile.installListeners)
					{
						newFile.installListeners();
					}
					curFile = newFile;
				}
				else
				{
					curFile.title = res.diagram.title;
					curFile.diagramMeta = res.diagram;
					curFile.setModified(false);
				}

				if (curFile)
				{
					curFile.setModified(false);
					if (curFile.removeDraft)
					{
						curFile.removeDraft();
					}
					if (curFile.clearStatus)
					{
						curFile.clearStatus();
					}
				}

				// Update top navigation filename & document title
				if (editorUi.fname)
				{
					editorUi.fname.innerText = res.diagram.title;
				}
				if (editorUi.descriptorChanged)
				{
					editorUi.descriptorChanged();
				}
				if (editorUi.updateDocumentTitle)
				{
					editorUi.updateDocumentTitle();
				}
				if (editorUi.clearStatus)
				{
					editorUi.clearStatus();
				}

				// Update editor status badge to green saved status
				if (editorUi.editor)
				{
					editorUi.editor.setModified(false);
					if (editorUi.editor.setStatus)
					{
						editorUi.editor.setStatus('<div title="Tersimpan di Cloud" style="color:#16a34a;font-weight:600;display:inline-flex;align-items:center;gap:4px;">' +
							'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' +
							'<span>Tersimpan di Vercel Cloud</span></div>');
					}
				}

				this.showToast('Diagram "' + res.diagram.title + '" berhasil disimpan di Vercel Cloud!', 'success');
				this.refreshList();
				return res;
			}
			catch (err)
			{
				console.error('Save to cloud failed:', err);
				this.showToast('Gagal menyimpan: ' + err.message, 'error');
				throw err;
			}
			finally
			{
				if (saveBtnLabel) saveBtnLabel.textContent = 'Simpan';
			}
		},

		// Open Diagram from Cloud
		openDiagram: async function(diag)
		{
			var editorUi = this.activeUi || window.editorUi;
			if (!editorUi) return;

			try
			{
				this.showToast('Memuat diagram "' + diag.title + '"...', 'info');
				var response = await fetch(diag.blob_url);
				if (!response.ok)
				{
					throw new Error('Gagal mengunduh file dari Vercel Blob (' + response.status + ')');
				}
				var xml = await response.text();

				var CloudFileClass = getDiagraminCloudFileClass();
				var file = new CloudFileClass(editorUi, xml, diag.title, diag);

				if (typeof editorUi.fileLoaded === 'function')
				{
					editorUi.fileLoaded(file);
				}
				else
				{
					var doc = mxUtils.parseXml(xml);
					if (doc && doc.documentElement && editorUi.editor)
					{
						editorUi.editor.setGraphXml(doc.documentElement);
					}
					if (editorUi.setCurrentFile)
					{
						editorUi.setCurrentFile(file);
					}
					if (file.open)
					{
						file.open();
					}
				}

				this.currentDiagram = diag;

				// Guarantee title and clean saved status
				if (editorUi.fname)
				{
					editorUi.fname.innerText = diag.title;
				}
				if (editorUi.descriptorChanged)
				{
					editorUi.descriptorChanged();
				}
				if (editorUi.updateDocumentTitle)
				{
					editorUi.updateDocumentTitle();
				}

				if (file.setModified)
				{
					file.setModified(false);
				}
				if (file.removeDraft)
				{
					file.removeDraft();
				}
				if (file.clearStatus)
				{
					file.clearStatus();
				}
				if (editorUi.clearStatus)
				{
					editorUi.clearStatus();
				}
				if (editorUi.editor)
				{
					editorUi.editor.setModified(false);
					if (editorUi.editor.undoManager)
					{
						editorUi.editor.undoManager.clear();
					}
					if (editorUi.editor.setStatus)
					{
						editorUi.editor.setStatus('<div title="Tersimpan di Cloud" style="color:#16a34a;font-weight:600;display:inline-flex;align-items:center;gap:4px;">' +
							'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' +
							'<span>Tersimpan di Vercel Cloud</span></div>');
					}
				}

				this.showToast('Diagram "' + diag.title + '" berhasil dibuka!', 'success');
				this.closeModal();
			}
			catch (err)
			{
				console.error('Failed to open diagram:', err);
				this.showToast('Gagal membuka diagram: ' + err.message, 'error');
			}
		},

		// Delete diagram
		deleteDiagram: async function(diagId, diagTitle)
		{
			if (!confirm('Apakah Anda yakin ingin menghapus diagram "' + diagTitle + '" dari Vercel Cloud?'))
			{
				return;
			}

			try
			{
				await this.fetchApi('delete', 'POST', { id: diagId });
				this.showToast('Diagram berhasil dihapus.', 'success');
				if (this.currentDiagram && this.currentDiagram.id === diagId)
				{
					this.currentDiagram = null;
				}
				await this.refreshList();
				this.renderFileManagerBody();
			}
			catch (err)
			{
				this.showToast('Gagal menghapus: ' + err.message, 'error');
			}
		},

		// Create Folder
		createFolder: async function(name)
		{
			if (!name || name.trim().length === 0) return;
			try
			{
				var res = await this.fetchApi('create_folder', 'POST', { name: name.trim() });
				this.showToast('Folder "' + res.folder.name + '" berhasil dibuat.', 'success');
				await this.refreshList();
				this.selectedFolderId = res.folder.id;
				this.renderFileManagerBody();
			}
			catch (err)
			{
				this.showToast('Gagal membuat folder: ' + err.message, 'error');
			}
		},

		// Rename Folder
		renameFolder: async function(folderId, oldName)
		{
			var newName = prompt('Ubah nama folder:', oldName);
			if (!newName || newName.trim() === oldName || newName.trim().length === 0) return;

			try
			{
				await this.fetchApi('rename_folder', 'POST', { id: folderId, name: newName.trim() });
				this.showToast('Folder berhasil diubah namanya.', 'success');
				await this.refreshList();
				this.renderFileManagerBody();
			}
			catch (err)
			{
				this.showToast('Gagal mengubah nama folder: ' + err.message, 'error');
			}
		},

		// Delete Folder
		deleteFolder: async function(folderId, folderName)
		{
			if (!confirm('Hapus folder "' + folderName + '"? Diagram di dalam folder ini tidak akan terhapus, melainkan dipindahkan ke Tanpa Folder.'))
			{
				return;
			}

			try
			{
				await this.fetchApi('delete_folder', 'POST', { id: folderId });
				this.showToast('Folder berhasil dihapus.', 'success');
				this.selectedFolderId = 'ALL';
				await this.refreshList();
				this.renderFileManagerBody();
			}
			catch (err)
			{
				this.showToast('Gagal menghapus folder: ' + err.message, 'error');
			}
		},

		// Move diagram to folder
		moveDiagram: async function(diagId, folderId)
		{
			try
			{
				await this.fetchApi('move_diagram', 'POST', { id: diagId, folder_id: folderId });
				this.showToast('Diagram berhasil dipindahkan.', 'success');
				await this.refreshList();
				this.renderFileManagerBody();
			}
			catch (err)
			{
				this.showToast('Gagal memindahkan diagram: ' + err.message, 'error');
			}
		},

		// Save to Cloud Dialog
		showSaveDialog: async function()
		{
			if (!window.DiagraminAuth || !window.DiagraminAuth.currentUser)
			{
				window.DiagraminAuth.showLoginModal();
				return;
			}

			await this.refreshList();
			var editorUi = this.activeUi || window.editorUi;
			var currentTitle = (this.currentDiagram && this.currentDiagram.title) ||
				(editorUi && editorUi.getBaseFilename && editorUi.getBaseFilename()) || 'Untitled Diagram';
			var currentFolder = (this.currentDiagram && this.currentDiagram.folder_id) || '';

			var overlay = this.createModalOverlay('saveCloudModal');

			var modal = document.createElement('div');
			modal.style.cssText = 'background:#ffffff;border-radius:12px;width:440px;max-width:92vw;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1),0 10px 10px -5px rgba(0,0,0,0.04);overflow:hidden;animation:diagraminFadeIn 0.2s ease;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

			// Header
			var header = document.createElement('div');
			header.style.cssText = 'padding:18px 20px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;background:#f9fafb;';
			header.innerHTML = '<div style="display:flex;align-items:center;gap:8px;font-size:16px;font-weight:600;color:#111827;">' +
				CLOUD_ICON + '<span>Simpan ke Vercel Cloud Storage</span></div>' +
				'<button id="closeSaveModalBtn" style="border:none;background:none;font-size:20px;color:#9ca3af;cursor:pointer;padding:0 4px;line-height:1;">&times;</button>';
			modal.appendChild(header);

			// Body
			var body = document.createElement('div');
			body.style.cssText = 'padding:20px;display:flex;flex-direction:column;gap:16px;';

			// Title field
			var titleGroup = document.createElement('div');
			titleGroup.innerHTML = '<label style="display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px;">Nama Diagram</label>' +
				'<input id="diagSaveTitleInput" type="text" value="' + mxUtils.htmlEntities(currentTitle) + '" style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;outline:none;" placeholder="Masukkan judul diagram...">';
			body.appendChild(titleGroup);

			// Folder field
			var folderGroup = document.createElement('div');
			var folderOptions = '<option value="">📄 Tanpa Folder (Root)</option>';
			for (var i = 0; i < this.folders.length; i++)
			{
				var f = this.folders[i];
				var sel = (f.id === currentFolder) ? ' selected' : '';
				folderOptions += '<option value="' + f.id + '"' + sel + '>📁 ' + mxUtils.htmlEntities(f.name) + '</option>';
			}

			folderGroup.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
				'<label style="font-size:13px;font-weight:500;color:#374151;">Pilih Folder</label>' +
				'<button id="diagNewFolderInlineBtn" type="button" style="border:none;background:none;color:#2563eb;font-size:12px;cursor:pointer;font-weight:500;">+ Buat Folder Baru</button>' +
				'</div>' +
				'<select id="diagSaveFolderSelect" style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;outline:none;background:#ffffff;">' +
				folderOptions +
				'</select>' +
				'<div id="diagNewFolderRow" style="display:none;margin-top:8px;gap:6px;">' +
				'<input id="diagNewFolderNameInput" type="text" placeholder="Nama folder baru..." style="flex:1;padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;">' +
				'<button id="diagSaveNewFolderBtn" type="button" style="padding:6px 12px;background:#10b981;color:#ffffff;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-weight:500;">Simpan</button>' +
				'</div>';
			body.appendChild(folderGroup);

			// Info
			var info = document.createElement('div');
			info.style.cssText = 'padding:10px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;font-size:12px;color:#1e40af;line-height:1.4;';
			info.innerHTML = 'Diagram disimpan aman di <strong>Vercel Blob Storage</strong> dan metadata di <strong>Neon Postgres (Free Tier)</strong>.';
			body.appendChild(info);

			// Actions
			var actions = document.createElement('div');
			actions.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:8px;';
			actions.innerHTML = '<button id="cancelSaveBtn" style="padding:8px 16px;border:1px solid #d1d5db;background:#ffffff;color:#374151;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;">Batal</button>' +
				'<button id="confirmSaveBtn" style="padding:8px 18px;background:#2563eb;color:#ffffff;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">' +
				CLOUD_ICON + '<span>Simpan</span></button>';
			body.appendChild(actions);

			modal.appendChild(body);
			overlay.appendChild(modal);
			document.body.appendChild(overlay);

			// Event Listeners
			var titleInput = document.getElementById('diagSaveTitleInput');
			var folderSelect = document.getElementById('diagSaveFolderSelect');
			var newFolderBtn = document.getElementById('diagNewFolderInlineBtn');
			var newFolderRow = document.getElementById('diagNewFolderRow');
			var newFolderNameInput = document.getElementById('diagNewFolderNameInput');
			var saveNewFolderBtn = document.getElementById('diagSaveNewFolderBtn');

			newFolderBtn.onclick = function()
			{
				newFolderRow.style.display = (newFolderRow.style.display === 'none') ? 'flex' : 'none';
				if (newFolderRow.style.display === 'flex') newFolderNameInput.focus();
			};

			saveNewFolderBtn.onclick = mxUtils.bind(this, async function()
			{
				var name = newFolderNameInput.value;
				if (!name || name.trim().length === 0) return;
				try
				{
					var res = await this.fetchApi('create_folder', 'POST', { name: name.trim() });
					await this.refreshList();
					var opt = document.createElement('option');
					opt.value = res.folder.id;
					opt.textContent = '📁 ' + res.folder.name;
					opt.selected = true;
					folderSelect.appendChild(opt);
					newFolderRow.style.display = 'none';
					newFolderNameInput.value = '';
				}
				catch (e)
				{
					alert('Gagal membuat folder: ' + e.message);
				}
			});

			document.getElementById('closeSaveModalBtn').onclick = mxUtils.bind(this, this.closeModal);
			document.getElementById('cancelSaveBtn').onclick = mxUtils.bind(this, this.closeModal);

			document.getElementById('confirmSaveBtn').onclick = mxUtils.bind(this, function()
			{
				var t = titleInput.value.trim() || 'Untitled Diagram';
				var f = folderSelect.value || null;
				this.closeModal();
				this.saveDiagram({ id: this.currentDiagram ? this.currentDiagram.id : null, title: t, folder_id: f });
			});

			setTimeout(function() { titleInput.focus(); titleInput.select(); }, 100);
		},

		// File Manager Dialog (My Diagrams & Folders)
		showFileManagerDialog: async function()
		{
			if (!window.DiagraminAuth || !window.DiagraminAuth.currentUser)
			{
				window.DiagraminAuth.showLoginModal();
				return;
			}

			var overlay = this.createModalOverlay('fileManagerModal');

			var modal = document.createElement('div');
			modal.id = 'diagraminFileManagerModal';
			modal.style.cssText = 'background:#ffffff;border-radius:12px;width:860px;max-width:95vw;height:580px;max-height:90vh;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);overflow:hidden;display:flex;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;animation:diagraminFadeIn 0.2s ease;';

			// Header
			var header = document.createElement('div');
			header.style.cssText = 'padding:16px 20px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;background:#f9fafb;';
			header.innerHTML = '<div style="display:flex;align-items:center;gap:10px;">' +
				FOLDER_ICON +
				'<div><div style="font-size:16px;font-weight:600;color:#111827;">Diagram Saya (Vercel Cloud)</div>' +
				'<div id="diagStorageStats" style="font-size:12px;color:#6b7280;margin-top:2px;">Memuat data...</div></div>' +
				'</div>' +
				'<button id="closeFileManagerBtn" style="border:none;background:none;font-size:22px;color:#9ca3af;cursor:pointer;padding:0 6px;line-height:1;">&times;</button>';
			modal.appendChild(header);

			// Main Content: 2-column layout (Folders Sidebar + Diagrams Grid)
			var content = document.createElement('div');
			content.id = 'diagraminFileManagerBody';
			content.style.cssText = 'display:flex;flex:1;overflow:hidden;';
			modal.appendChild(content);

			// Footer
			var footer = document.createElement('div');
			footer.style.cssText = 'padding:12px 20px;border-top:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;background:#f9fafb;font-size:12px;color:#6b7280;';
			footer.innerHTML = '<div>💡 Disimpan di <strong>Vercel Blob + Postgres</strong> (Free Tier)</div>' +
				'<button id="dismissFileManagerBtn" style="padding:6px 16px;background:#ffffff;border:1px solid #d1d5db;border-radius:6px;font-size:13px;cursor:pointer;color:#374151;">Tutup</button>';
			modal.appendChild(footer);

			overlay.appendChild(modal);
			document.body.appendChild(overlay);

			document.getElementById('closeFileManagerBtn').onclick = mxUtils.bind(this, this.closeModal);
			document.getElementById('dismissFileManagerBtn').onclick = mxUtils.bind(this, this.closeModal);

			await this.refreshList();
			this.renderFileManagerBody();
		},

		// Render Body of File Manager
		renderFileManagerBody: function()
		{
			var container = document.getElementById('diagraminFileManagerBody');
			if (!container) return;

			// Update stats in header
			var statsEl = document.getElementById('diagStorageStats');
			if (statsEl)
			{
				var total = this.diagrams.length;
				var fCount = this.folders.length;
				var bytes = (this.stats && this.stats.total_bytes) || 0;
				var kb = (bytes / 1024).toFixed(1);
				statsEl.textContent = total + ' Diagram · ' + fCount + ' Folder · ' + kb + ' KB digunakan (Batas Free Tier: 500 MB)';
			}

			// Left Sidebar (Folders)
			var sidebarHtml = '<div style="width:230px;border-right:1px solid #e5e7eb;background:#fcfdfd;display:flex;flex-direction:column;flex-shrink:0;">' +
				'<div style="padding:14px 16px 8px 16px;display:flex;align-items:center;justify-content:space-between;">' +
				'<span style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Folder</span>' +
				'<button id="diagAddFolderBtn" style="border:none;background:#2563eb;color:#ffffff;font-size:11px;font-weight:600;padding:3px 8px;border-radius:4px;cursor:pointer;">+ Folder</button>' +
				'</div>' +
				'<div style="flex:1;overflow-y:auto;padding:4px 8px;">';

			// Folder: Semua Diagram
			var allActive = (this.selectedFolderId === 'ALL') ? 'background:#e0e7ff;color:#3730a3;font-weight:600;' : 'color:#374151;';
			sidebarHtml += '<div class="diagFolderItem" data-folder="ALL" style="padding:8px 10px;border-radius:6px;margin-bottom:2px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;font-size:13px;' + allActive + '">' +
				'<span style="display:flex;align-items:center;gap:6px;">🗂️ Semua Diagram</span>' +
				'<span style="font-size:11px;padding:2px 6px;background:rgba(0,0,0,0.06);border-radius:10px;">' + this.diagrams.length + '</span>' +
				'</div>';

			// Folder: Tanpa Folder (Root)
			var rootCount = this.diagrams.filter(function(d) { return !d.folder_id; }).length;
			var rootActive = (this.selectedFolderId === 'ROOT') ? 'background:#e0e7ff;color:#3730a3;font-weight:600;' : 'color:#374151;';
			sidebarHtml += '<div class="diagFolderItem" data-folder="ROOT" style="padding:8px 10px;border-radius:6px;margin-bottom:2px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;font-size:13px;' + rootActive + '">' +
				'<span style="display:flex;align-items:center;gap:6px;">📄 Tanpa Folder</span>' +
				'<span style="font-size:11px;padding:2px 6px;background:rgba(0,0,0,0.06);border-radius:10px;">' + rootCount + '</span>' +
				'</div>';

			// User Created Folders
			for (var i = 0; i < this.folders.length; i++)
			{
				var f = this.folders[i];
				var count = f.diagram_count || 0;
				var fActive = (this.selectedFolderId === f.id) ? 'background:#e0e7ff;color:#3730a3;font-weight:600;' : 'color:#374151;';
				sidebarHtml += '<div class="diagFolderItem" data-folder="' + f.id + '" style="padding:8px 10px;border-radius:6px;margin-bottom:2px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;font-size:13px;position:relative;' + fActive + '">' +
					'<span style="display:flex;align-items:center;gap:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + mxUtils.htmlEntities(f.name) + '">📁 ' + mxUtils.htmlEntities(f.name) + '</span>' +
					'<div style="display:flex;align-items:center;gap:4px;">' +
					'<span style="font-size:11px;padding:2px 6px;background:rgba(0,0,0,0.06);border-radius:10px;">' + count + '</span>' +
					'<button class="diagRenameFolderBtn" data-fid="' + f.id + '" data-fname="' + mxUtils.htmlEntities(f.name) + '" title="Ubah Nama" style="border:none;background:none;color:#6b7280;cursor:pointer;padding:2px;">' + EDIT_ICON + '</button>' +
					'<button class="diagDeleteFolderBtn" data-fid="' + f.id + '" data-fname="' + mxUtils.htmlEntities(f.name) + '" title="Hapus Folder" style="border:none;background:none;color:#ef4444;cursor:pointer;padding:2px;">' + TRASH_ICON + '</button>' +
					'</div></div>';
			}

			sidebarHtml += '</div></div>';

			// Right Content Area (Diagrams List)
			var filtered = this.diagrams;
			if (this.selectedFolderId === 'ROOT')
			{
				filtered = this.diagrams.filter(function(d) { return !d.folder_id; });
			}
			else if (this.selectedFolderId !== 'ALL')
			{
				var targetFid = this.selectedFolderId;
				filtered = this.diagrams.filter(function(d) { return d.folder_id === targetFid; });
			}

			var mainHtml = '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden;background:#ffffff;">' +
				'<div style="padding:12px 18px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;justify-content:space-between;">' +
				'<input id="diagSearchInput" type="text" placeholder="Cari diagram..." style="width:240px;padding:6px 12px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;outline:none;">' +
				'<div style="font-size:12px;color:#6b7280;">Menampilkan ' + filtered.length + ' diagram</div>' +
				'</div>' +
				'<div id="diagItemsGrid" style="flex:1;overflow-y:auto;padding:16px;display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:12px;align-content:start;">';

			if (filtered.length === 0)
			{
				mainHtml += '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#9ca3af;">' +
					'<div style="font-size:36px;margin-bottom:8px;">📄</div>' +
					'<div style="font-size:14px;font-weight:500;color:#6b7280;">Tidak ada diagram di folder ini</div>' +
					'<div style="font-size:12px;margin-top:4px;">Klik "Simpan Cloud" di header untuk menyimpan diagram saat ini ke folder ini.</div>' +
					'</div>';
			}
			else
			{
				for (var j = 0; j < filtered.length; j++)
				{
					var d = filtered[j];
					var fObj = this.folders.find(function(f) { return f.id === d.folder_id; });
					var fName = fObj ? fObj.name : 'Tanpa Folder';
					var sizeKb = ((d.size_bytes || 0) / 1024).toFixed(1) + ' KB';
					var dateStr = d.updated_at ? new Date(d.updated_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '';

					mainHtml += '<div class="diagCard" style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;background:#ffffff;display:flex;flex-direction:column;justify-content:space-between;gap:10px;box-shadow:0 1px 2px rgba(0,0,0,0.03);transition:all 0.15s ease;">' +
						'<div>' +
						'<div style="display:flex;align-items:flex-start;gap:8px;">' +
						FILE_ICON +
						'<div style="flex:1;overflow:hidden;">' +
						'<div style="font-size:14px;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + mxUtils.htmlEntities(d.title) + '">' + mxUtils.htmlEntities(d.title) + '</div>' +
						'<div style="font-size:11px;color:#6b7280;margin-top:2px;">📁 ' + mxUtils.htmlEntities(fName) + ' · ' + sizeKb + '</div>' +
						'</div></div>' +
						'<div style="font-size:11px;color:#9ca3af;margin-top:6px;">Diperbarui: ' + dateStr + '</div>' +
						'</div>' +
						'<div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid #f3f4f6;padding-top:10px;gap:6px;">' +
						'<button class="diagOpenBtn" data-idx="' + j + '" style="flex:1;padding:6px 10px;background:#2563eb;color:#ffffff;border:none;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">Buka</button>' +
						'<button class="diagMoveBtn" data-id="' + d.id + '" data-fid="' + (d.folder_id || '') + '" title="Pindah Folder" style="padding:6px 8px;border:1px solid #e5e7eb;background:#ffffff;border-radius:5px;font-size:12px;cursor:pointer;color:#374151;">' + MOVE_ICON + '</button>' +
						'<button class="diagDeleteBtn" data-id="' + d.id + '" data-title="' + mxUtils.htmlEntities(d.title) + '" title="Hapus Diagram" style="padding:6px 8px;border:1px solid #fee2e2;background:#fff5f5;border-radius:5px;font-size:12px;cursor:pointer;color:#dc2626;">' + TRASH_ICON + '</button>' +
						'</div></div>';
				}
			}

			mainHtml += '</div></div>';

			container.innerHTML = sidebarHtml + mainHtml;

			// Attach Listeners
			// 1. Folder Click
			var folderItems = container.querySelectorAll('.diagFolderItem');
			folderItems.forEach(mxUtils.bind(this, function(item)
			{
				item.onclick = mxUtils.bind(this, function(e)
				{
					if (e.target.closest('button')) return; // ignore rename/delete buttons
					this.selectedFolderId = item.getAttribute('data-folder');
					this.renderFileManagerBody();
				});
			}));

			// 2. Add Folder
			var addFolderBtn = document.getElementById('diagAddFolderBtn');
			if (addFolderBtn)
			{
				addFolderBtn.onclick = mxUtils.bind(this, function()
				{
					var name = prompt('Nama folder baru:');
					if (name) this.createFolder(name);
				});
			}

			// 3. Rename Folder
			var renameBtns = container.querySelectorAll('.diagRenameFolderBtn');
			renameBtns.forEach(mxUtils.bind(this, function(btn)
			{
				btn.onclick = mxUtils.bind(this, function(e)
				{
					e.stopPropagation();
					this.renameFolder(btn.getAttribute('data-fid'), btn.getAttribute('data-fname'));
				});
			}));

			// 4. Delete Folder
			var deleteBtns = container.querySelectorAll('.diagDeleteFolderBtn');
			deleteBtns.forEach(mxUtils.bind(this, function(btn)
			{
				btn.onclick = mxUtils.bind(this, function(e)
				{
					e.stopPropagation();
					this.deleteFolder(btn.getAttribute('data-fid'), btn.getAttribute('data-fname'));
				});
			}));

			// 5. Open Diagram
			var openBtns = container.querySelectorAll('.diagOpenBtn');
			openBtns.forEach(mxUtils.bind(this, function(btn)
			{
				btn.onclick = mxUtils.bind(this, function()
				{
					var idx = parseInt(btn.getAttribute('data-idx'));
					var diag = filtered[idx];
					if (diag) this.openDiagram(diag);
				});
			}));

			// 6. Move Diagram
			var moveBtns = container.querySelectorAll('.diagMoveBtn');
			moveBtns.forEach(mxUtils.bind(this, function(btn)
			{
				btn.onclick = mxUtils.bind(this, function()
				{
					var diagId = btn.getAttribute('data-id');
					var curFid = btn.getAttribute('data-fid');
					this.showMoveDialog(diagId, curFid);
				});
			}));

			// 7. Delete Diagram
			var delDiagBtns = container.querySelectorAll('.diagDeleteBtn');
			delDiagBtns.forEach(mxUtils.bind(this, function(btn)
			{
				btn.onclick = mxUtils.bind(this, function()
				{
					this.deleteDiagram(btn.getAttribute('data-id'), btn.getAttribute('data-title'));
				});
			}));

			// 8. Search
			var searchInput = document.getElementById('diagSearchInput');
			if (searchInput)
			{
				searchInput.oninput = function()
				{
					var query = searchInput.value.toLowerCase().trim();
					var cards = container.querySelectorAll('.diagCard');
					cards.forEach(function(card)
					{
						var text = card.textContent.toLowerCase();
						card.style.display = (text.indexOf(query) >= 0) ? 'flex' : 'none';
					});
				};
			}
		},

		// Dialog to move diagram into another folder
		showMoveDialog: function(diagId, curFolderId)
		{
			var options = '<option value="">📄 Tanpa Folder (Root)</option>';
			for (var i = 0; i < this.folders.length; i++)
			{
				var f = this.folders[i];
				var sel = (f.id === curFolderId) ? ' selected' : '';
				options += '<option value="' + f.id + '"' + sel + '>📁 ' + mxUtils.htmlEntities(f.name) + '</option>';
			}

			var overlay = this.createModalOverlay('diagMoveModal');
			var modal = document.createElement('div');
			modal.style.cssText = 'background:#ffffff;border-radius:10px;width:340px;padding:20px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);font-family:sans-serif;';
			modal.innerHTML = '<div style="font-size:15px;font-weight:600;margin-bottom:12px;color:#111827;">Pindahkan ke Folder</div>' +
				'<select id="diagMoveSelect" style="width:100%;box-sizing:border-box;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;outline:none;">' +
				options +
				'</select>' +
				'<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">' +
				'<button id="cancelMoveBtn" style="padding:6px 12px;border:1px solid #d1d5db;background:#ffffff;border-radius:6px;cursor:pointer;font-size:13px;">Batal</button>' +
				'<button id="confirmMoveBtn" style="padding:6px 14px;background:#2563eb;color:#ffffff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">Pindahkan</button>' +
				'</div>';

			overlay.appendChild(modal);
			document.body.appendChild(overlay);

			document.getElementById('cancelMoveBtn').onclick = mxUtils.bind(this, this.closeModal);
			document.getElementById('confirmMoveBtn').onclick = mxUtils.bind(this, function()
			{
				var targetFid = document.getElementById('diagMoveSelect').value || null;
				this.closeModal();
				this.moveDiagram(diagId, targetFid);
			});
		},

		// Helper to create modal overlay
		createModalOverlay: function(id)
		{
			this.closeModal();
			var overlay = document.createElement('div');
			overlay.id = id || 'diagraminModalOverlay';
			overlay.className = 'diagraminModalOverlay';
			overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.45);backdrop-filter:blur(3px);z-index:99999;display:flex;align-items:center;justify-content:center;';
			overlay.onclick = mxUtils.bind(this, function(e)
			{
				if (e.target === overlay) this.closeModal();
			});
			return overlay;
		},

		closeModal: function()
		{
			var overlays = document.querySelectorAll('.diagraminModalOverlay');
			overlays.forEach(function(o) { o.remove(); });
		},

		// Toast Notification
		showToast: function(message, type)
		{
			var existing = document.getElementById('diagraminToast');
			if (existing) existing.remove();

			var toast = document.createElement('div');
			toast.id = 'diagraminToast';
			var bg = '#111827';
			if (type === 'error') bg = '#dc2626';
			if (type === 'success') bg = '#15803d';

			toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:100000;background:' + bg + ';color:#ffffff;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:500;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);display:flex;align-items:center;gap:8px;animation:diagraminFadeIn 0.2s ease;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
			toast.innerHTML = (type === 'success' ? '✓ ' : (type === 'error' ? '✕ ' : 'ℹ ')) + mxUtils.htmlEntities(message);

			document.body.appendChild(toast);
			setTimeout(function()
			{
				if (toast.parentNode) toast.remove();
			}, 3500);
		},

		// Keyboard Shortcuts (Ctrl+S / Cmd+S)
		installKeyHandlers: function()
		{
			window.addEventListener('keydown', mxUtils.bind(this, function(e)
			{
				if ((e.ctrlKey || e.metaKey) && e.key === 's')
				{
					if (window.DiagraminAuth && window.DiagraminAuth.currentUser != null)
					{
						e.preventDefault();
						e.stopPropagation();
						this.handleSaveAction();
					}
				}
			}), true);
		}
	};

	// Inject animations & styles
	var style = document.createElement('style');
	style.textContent = '@keyframes diagraminFadeIn { from { opacity:0; transform:scale(0.97); } to { opacity:1; transform:scale(1); } }';
	document.head.appendChild(style);

	// Immediate setup of dialogs and client nullification
	DiagraminCloud.nullifyExternalClients();
	DiagraminCloud.installCustomStorageDialog();

	// Hook EditorUi.prototype.init
	if (typeof EditorUi !== 'undefined' && EditorUi.prototype && !EditorUi.prototype._diagraminHooked)
	{
		EditorUi.prototype._diagraminHooked = true;
		var origEditorUiInit = EditorUi.prototype.init;
		EditorUi.prototype.init = function()
		{
			window.editorUi = this;
			var res = origEditorUiInit.apply(this, arguments);
			try
			{
				DiagraminCloud.init(this);
			}
			catch(e)
			{
				console.error('DiagraminCloud init error:', e);
			}
			return res;
		};
	}

	// Auto-initialize when editorUi is available
	var checkUiInterval = setInterval(function()
	{
		var ui = window.editorUi || (window.App && window.App.prototype && window.App.prototype.activeUi);
		if (ui)
		{
			clearInterval(checkUiInterval);
			DiagraminCloud.init(ui);
		}
	}, 150);

	// Fallback initialize on load
	window.addEventListener('load', function()
	{
		setTimeout(function()
		{
			var ui = window.editorUi || (window.App && window.App.prototype && window.App.prototype.activeUi);
			if (ui) DiagraminCloud.init(ui);
		}, 600);
	});

})();
