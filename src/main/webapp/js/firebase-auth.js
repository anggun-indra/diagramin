/**
 * Firebase Authentication Integration for Diagramin (draw.io)
 * Project: kuliah-23 | Web App: diagramin
 */
(function()
{
	// Firebase Web App Configuration for 'diagramin'
	window.FIREBASE_CONFIG = {
		apiKey: "AIzaSyDDeJD2dbsreV3v0ABFdtgbjFf-vOzNMwU",
		authDomain: "kuliah-23.firebaseapp.com",
		projectId: "kuliah-23",
		storageBucket: "kuliah-23.firebasestorage.app",
		messagingSenderId: "994015147337",
		appId: "1:994015147337:web:fb9664a039873fffb75698",
		measurementId: "G-N2YN089HZ4"
	};

	// SVG Icons
	var SOLAR_USER_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>';
	var GOOGLE_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" style="vertical-align:middle;margin-right:8px;"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>';
	var LOGOUT_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';

	// Local user cache for instantaneous render
	var cachedUser = null;
	try
	{
		var stored = localStorage.getItem('diagramin_user');
		if (stored) cachedUser = JSON.parse(stored);
	}
	catch(e) {}

	window.DiagraminAuth = {
		currentUser: cachedUser,
		initialized: false,
		widgetElement: null,
		activeUi: null,
		callbacks: [],

		onAuthStateChanged: function(cb)
		{
			if (typeof cb === 'function')
			{
				this.callbacks.push(cb);
				if (this.initialized) cb(this.currentUser);
			}
		},

		notifyListeners: function()
		{
			for (var i = 0; i < this.callbacks.length; i++)
			{
				try
				{
					this.callbacks[i](this.currentUser);
				}
				catch (e)
				{
					console.error("Auth listener error:", e);
				}
			}
		},

		init: function()
		{
			if (this.initialized) return;

			// Dynamically load Firebase SDK if not already in document
			if (typeof firebase === 'undefined' || !firebase.auth)
			{
				this.loadFirebaseSDK(mxUtils.bind(this, function()
				{
					this.setupFirebase();
				}));
			}
			else
			{
				this.setupFirebase();
			}

			// Mount the Auth UI button
			this.mountAuthButton();
		},

		loadFirebaseSDK: function(onLoaded)
		{
			var loadScript = function(src, next)
			{
				var script = document.createElement('script');
				script.src = src;
				script.onload = next;
				script.onerror = function()
				{
					console.warn("Could not load Firebase script from CDN: " + src);
				};
				document.head.appendChild(script);
			};

			loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js', function()
			{
				loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js', function()
				{
					if (onLoaded) onLoaded();
				});
			});
		},

		setupFirebase: function()
		{
			try
			{
				if (typeof firebase === 'undefined') return;

				if (!firebase.apps.length)
				{
					firebase.initializeApp(window.FIREBASE_CONFIG);
				}
				
				var auth = firebase.auth();
				auth.onAuthStateChanged(mxUtils.bind(this, function(user)
				{
					this.currentUser = user;
					this.initialized = true;

					if (user)
					{
						try
						{
							localStorage.setItem('diagramin_user', JSON.stringify({
								uid: user.uid,
								displayName: user.displayName,
								email: user.email,
								photoURL: user.photoURL
							}));
						}
						catch(e) {}
					}
					else
					{
						try { localStorage.removeItem('diagramin_user'); } catch(e) {}
					}

					this.updateHeaderUI();
					this.notifyListeners();
				}));
			}
			catch (err)
			{
				console.error("Firebase init failed:", err);
			}
		},

		signInWithGoogle: function(onSuccess, onError)
		{
			if (typeof firebase === 'undefined' || !firebase.auth)
			{
				if (onError) onError({ message: "Firebase SDK belum siap. Periksa koneksi internet." });
				return;
			}
			var provider = new firebase.auth.GoogleAuthProvider();
			firebase.auth().signInWithPopup(provider)
				.then(mxUtils.bind(this, function(result)
				{
					this.currentUser = result.user;
					this.updateHeaderUI();
					if (onSuccess) onSuccess(result.user);
				}))
				.catch(function(error)
				{
					console.error("Google Sign-In Error:", error);
					if (onError) onError(error);
				});
		},

		signInWithEmail: function(email, password, onSuccess, onError)
		{
			if (typeof firebase === 'undefined' || !firebase.auth)
			{
				if (onError) onError({ message: "Firebase SDK belum siap." });
				return;
			}
			firebase.auth().signInWithEmailAndPassword(email, password)
				.then(mxUtils.bind(this, function(result)
				{
					this.currentUser = result.user;
					this.updateHeaderUI();
					if (onSuccess) onSuccess(result.user);
				}))
				.catch(function(error)
				{
					if (onError) onError(error);
				});
		},

		registerWithEmail: function(email, password, onSuccess, onError)
		{
			if (typeof firebase === 'undefined' || !firebase.auth)
			{
				if (onError) onError({ message: "Firebase SDK belum siap." });
				return;
			}
			firebase.auth().createUserWithEmailAndPassword(email, password)
				.then(mxUtils.bind(this, function(result)
				{
					this.currentUser = result.user;
					this.updateHeaderUI();
					if (onSuccess) onSuccess(result.user);
				}))
				.catch(function(error)
				{
					if (onError) onError(error);
				});
		},

		signOut: function(onSuccess, onError)
		{
			if (typeof firebase === 'undefined' || !firebase.auth)
			{
				this.currentUser = null;
				try { localStorage.removeItem('diagramin_user'); } catch(e) {}
				this.updateHeaderUI();
				if (onSuccess) onSuccess();
				return;
			}
			firebase.auth().signOut()
				.then(mxUtils.bind(this, function()
				{
					this.currentUser = null;
					try { localStorage.removeItem('diagramin_user'); } catch(e) {}
					this.updateHeaderUI();
					if (onSuccess) onSuccess();
				}))
				.catch(function(error)
				{
					if (onError) onError(error);
				});
		},

		mountAuthButton: function(uiInstance)
		{
			if (uiInstance) this.activeUi = uiInstance;

			var existing = document.getElementById('diagraminAuthWidget');
			var widget = existing || document.createElement('div');
			if (!existing)
			{
				widget.id = 'diagraminAuthWidget';
				widget.style.cssText = 'display:inline-flex;align-items:center;z-index:9000;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:13px;pointer-events:auto;user-select:none;margin:0;height:32px;';
			}

			// Target container discovery
			var bc = (this.activeUi && this.activeUi.buttonContainer) || document.querySelector('.geButtonContainer');
			var sketchMenubar = (this.activeUi && this.activeUi.sketchMenubarElt) || document.querySelector('.geToolbarContainer');
			var menubar = (this.activeUi && this.activeUi.menubar && this.activeUi.menubar.container) || document.querySelector('.geMenubar');

			if (bc)
			{
				bc.style.display = 'inline-flex';
				bc.style.alignItems = 'center';
				bc.style.gap = '8px';

				if (widget.parentNode !== bc)
				{
					if (widget.parentNode) widget.parentNode.removeChild(widget);
					bc.appendChild(widget);
				}
				widget.style.position = '';
				widget.style.top = '';
				widget.style.right = '';
				widget.style.float = '';
				widget.style.margin = '0';
			}
			else if (sketchMenubar)
			{
				if (widget.parentNode !== sketchMenubar)
				{
					if (widget.parentNode) widget.parentNode.removeChild(widget);
					if (sketchMenubar.firstChild)
					{
						sketchMenubar.insertBefore(widget, sketchMenubar.firstChild);
					}
					else
					{
						sketchMenubar.appendChild(widget);
					}
				}
				widget.style.margin = '0 6px';
			}
			else if (menubar)
			{
				var innerBc = menubar.querySelector('.geButtonContainer');
				if (innerBc)
				{
					innerBc.style.display = 'inline-flex';
					innerBc.style.alignItems = 'center';
					innerBc.style.gap = '8px';
					if (widget.parentNode !== innerBc)
					{
						if (widget.parentNode) widget.parentNode.removeChild(widget);
						innerBc.appendChild(widget);
					}
					widget.style.position = '';
					widget.style.float = '';
					widget.style.margin = '0';
				}
				else
				{
					if (widget.parentNode !== menubar)
					{
						if (widget.parentNode) widget.parentNode.removeChild(widget);
						menubar.appendChild(widget);
					}
					widget.style.float = 'right';
					widget.style.margin = '2px 12px 0 0';
				}
			}
			else
			{
				if (widget.parentNode !== document.body)
				{
					widget.style.position = 'fixed';
					widget.style.top = '12px';
					widget.style.right = '16px';
					document.body.appendChild(widget);
				}
			}

			this.widgetElement = widget;
			this.updateHeaderUI();

			// Persistent watcher to ensure docking into buttonContainer as Draw.io initializes
			if (!this._dockTimer)
			{
				var self = this;
				this._dockTimer = setInterval(function()
				{
					var targetBc = (self.activeUi && self.activeUi.buttonContainer) || document.querySelector('.geButtonContainer');
					if (targetBc && widget.parentNode !== targetBc)
					{
						targetBc.style.display = 'inline-flex';
						targetBc.style.alignItems = 'center';
						targetBc.style.gap = '8px';
						if (widget.parentNode) widget.parentNode.removeChild(widget);
						targetBc.appendChild(widget);
						widget.style.position = '';
						widget.style.top = '';
						widget.style.right = '';
						widget.style.float = '';
						widget.style.margin = '0';
						self.updateHeaderUI();
					}
				}, 250);

				setTimeout(function()
				{
					if (self._dockTimer)
					{
						clearInterval(self._dockTimer);
						self._dockTimer = null;
					}
				}, 10000);
			}
		},

		updateHeaderUI: function()
		{
			var widget = this.widgetElement || document.getElementById('diagraminAuthWidget');
			var user = this.currentUser;
			var isLoggedIn = (user != null);

			// 1. Manage Share Button Visibility (STRICTLY only when logged in!)
			var shareBtn = (this.activeUi && this.activeUi.shareButton) || document.querySelector('.geButtonContainer .gePrimaryBtn');
			if (shareBtn)
			{
				if (isLoggedIn)
				{
					shareBtn.style.setProperty('display', 'inline-flex', 'important');
					shareBtn.style.alignItems = 'center';
					shareBtn.style.height = '32px';
					shareBtn.style.margin = '0';
					shareBtn.style.borderRadius = '6px';

					// Attach Diagramin Share Dialog if not already attached
					if (!shareBtn._diagraminShareInstalled)
					{
						shareBtn._diagraminShareInstalled = true;
						shareBtn.onclick = mxUtils.bind(this, function(e)
						{
							if (e) mxEvent.consume(e);
							DiagraminAuth.showShareDialog();
						});
					}
				}
				else
				{
					shareBtn.style.setProperty('display', 'none', 'important');
				}
			}

			// In Simple theme: check shareElt
			var shareElt = (this.activeUi && this.activeUi.shareElt) || document.querySelector('.geToolbarContainer .geItem[title*="Share"], .geToolbarContainer .geItem[title*="share"]');
			if (shareElt)
			{
				shareElt.style.display = isLoggedIn ? '' : 'none';
			}

			if (!widget) return;

			if (!isLoggedIn)
			{
				// LOGGED OUT STATE: Prominent, perfectly aligned Masuk Button
				widget.innerHTML = 
					'<button id="diagraminLoginBtn" title="Masuk dengan Firebase (Google / Email)" style="' +
					'display:inline-flex;align-items:center;gap:6px;' +
					'background:#1a73e8;color:#ffffff;border:none;' +
					'padding:0 14px;height:32px;border-radius:6px;font-weight:600;font-size:13px;' +
					'cursor:pointer;line-height:32px;box-shadow:0 1px 2px rgba(0,0,0,0.15);' +
					'transition:background 0.15s ease,transform 0.1s ease;' +
					'outline:none;box-sizing:border-box;' +
					'">' +
					SOLAR_USER_ICON +
					'<span>Masuk</span>' +
					'</button>';

				var btn = document.getElementById('diagraminLoginBtn');
				if (btn)
				{
					btn.onmouseover = function() { this.style.background = '#1557b0'; };
					btn.onmouseout = function() { this.style.background = '#1a73e8'; };
					btn.onclick = mxUtils.bind(this, function(e)
					{
						if (e) e.stopPropagation();
						this.showAuthDialog();
					});
				}
			}
			else
			{
				// LOGGED IN STATE: User Profile Avatar & Name Pill
				var name = user.displayName || (user.email ? user.email.split('@')[0] : 'Pengguna');
				var avatarHtml = '';
				if (user.photoURL)
				{
					avatarHtml = '<img src="' + user.photoURL + '" style="width:24px;height:24px;border-radius:50%;object-fit:cover;vertical-align:middle;" />';
				}
				else
				{
					avatarHtml = '<div style="width:24px;height:24px;border-radius:50%;background:#1a73e8;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;vertical-align:middle;">' +
						(name.charAt(0).toUpperCase()) + '</div>';
				}

				widget.innerHTML = 
					'<div id="diagraminUserBtn" title="Akun: ' + (user.email || name) + '" style="' +
					'display:inline-flex;align-items:center;gap:6px;' +
					'background:light-dark(rgba(26,115,232,0.08), rgba(255,255,255,0.08));color:inherit;' +
					'border:1px solid light-dark(rgba(26,115,232,0.25), rgba(255,255,255,0.18));' +
					'padding:0 10px 0 4px;height:32px;box-sizing:border-box;border-radius:16px;font-weight:500;font-size:13px;' +
					'cursor:pointer;line-height:32px;transition:background 0.15s ease;' +
					'">' +
					avatarHtml +
					'<span style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + name + '</span>' +
					'<span style="font-size:10px;opacity:0.7;margin-left:2px;">&#9660;</span>' +
					'</div>';

				var userBtn = document.getElementById('diagraminUserBtn');
				if (userBtn)
				{
					userBtn.onmouseover = function() { this.style.background = 'light-dark(rgba(26,115,232,0.16), rgba(255,255,255,0.15))'; };
					userBtn.onmouseout = function() { this.style.background = 'light-dark(rgba(26,115,232,0.08), rgba(255,255,255,0.08))'; };
					userBtn.onclick = mxUtils.bind(this, function(e)
					{
						if (e) e.stopPropagation();
						this.toggleUserDropdown();
					});
				}
			}
		},

		updateUI: function()
		{
			this.updateHeaderUI();
		},

		showShareDialog: function()
		{
			var existing = document.getElementById('diagraminShareModal');
			if (existing) existing.parentNode.removeChild(existing);

			var overlay = document.createElement('div');
			overlay.id = 'diagraminShareModal';
			overlay.style.cssText = 
				'position:fixed;top:0;left:0;width:100%;height:100%;' +
				'background:rgba(0,0,0,0.5);backdrop-filter:blur(3px);' +
				'display:flex;align-items:center;justify-content:center;' +
				'z-index:100000;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

			var card = document.createElement('div');
			card.style.cssText = 
				'position:relative;width:440px;max-width:92%;background:#ffffff;color:#202124;' +
				'border-radius:12px;box-shadow:0 16px 36px rgba(0,0,0,0.25);padding:24px;' +
				'box-sizing:border-box;';

			if (document.body.classList.contains('geDarkMode'))
			{
				card.style.background = '#282828';
				card.style.color = '#e0e0e0';
			}

			// Generate Shareable Link
			var shareUrl = window.location.href;
			try
			{
				if (this.activeUi && this.activeUi.createLink)
				{
					shareUrl = this.activeUi.createLink(null, null, true, true);
				}
			}
			catch(e)
			{
				console.warn('Could not generate self-contained link:', e);
			}

			card.innerHTML = 
				'<button id="diaCloseShareBtn" style="position:absolute;top:14px;right:14px;background:none;border:none;font-size:18px;cursor:pointer;opacity:0.6;line-height:1;color:inherit;">&#x2715;</button>' +
				'<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">' +
				'<div style="width:36px;height:36px;border-radius:8px;background:rgba(26,115,232,0.1);display:flex;align-items:center;justify-content:center;color:#1a73e8;">' +
				'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>' +
				'</div>' +
				'<div>' +
				'<h3 style="margin:0;font-size:17px;font-weight:600;">Bagikan Diagram</h3>' +
				'<p style="margin:2px 0 0 0;font-size:12px;opacity:0.7;">Diagramin Online (Firebase: kuliah-23)</p>' +
				'</div>' +
				'</div>' +
				
				'<div style="margin:16px 0 8px 0;">' +
				'<label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;">Tautan Langsung (Direct Link)</label>' +
				'<div style="display:flex;gap:6px;">' +
				'<input id="diaShareUrlInput" readonly type="text" value="' + shareUrl + '" style="flex:1;padding:8px 10px;border:1px solid #ccc;border-radius:6px;font-size:12px;background:rgba(0,0,0,0.03);color:inherit;outline:none;" />' +
				'<button id="diaCopyLinkBtn" style="padding:8px 14px;background:#1a73e8;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:4px;">' +
				'<span>Salin Tautan</span>' +
				'</button>' +
				'</div>' +
				'</div>' +

				'<div style="margin:20px 0 8px 0;">' +
				'<label style="display:block;font-size:12px;font-weight:600;margin-bottom:8px;">Ekspor Cepat</label>' +
				'<div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:8px;">' +
				'<button id="diaExpPng" style="padding:8px 4px;border:1px solid #dadce0;border-radius:6px;background:inherit;color:inherit;font-size:12px;font-weight:500;cursor:pointer;text-align:center;">PNG</button>' +
				'<button id="diaExpSvg" style="padding:8px 4px;border:1px solid #dadce0;border-radius:6px;background:inherit;color:inherit;font-size:12px;font-weight:500;cursor:pointer;text-align:center;">SVG</button>' +
				'<button id="diaExpXml" style="padding:8px 4px;border:1px solid #dadce0;border-radius:6px;background:inherit;color:inherit;font-size:12px;font-weight:500;cursor:pointer;text-align:center;">XML</button>' +
				'<button id="diaExpPdf" style="padding:8px 4px;border:1px solid #dadce0;border-radius:6px;background:inherit;color:inherit;font-size:12px;font-weight:500;cursor:pointer;text-align:center;">PDF</button>' +
				'</div>' +
				'</div>' +

				'<div style="margin-top:20px;text-align:right;">' +
				'<button id="diaCloseShareBtn2" style="padding:8px 16px;background:#f1f3f4;color:#3c4043;border:1px solid #dadce0;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;">Tutup</button>' +
				'</div>';

			overlay.appendChild(card);
			document.body.appendChild(overlay);

			var closeModal = function()
			{
				if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
			};

			document.getElementById('diaCloseShareBtn').onclick = closeModal;
			document.getElementById('diaCloseShareBtn2').onclick = closeModal;

			// Copy link handler
			var copyBtn = document.getElementById('diaCopyLinkBtn');
			var urlInput = document.getElementById('diaShareUrlInput');
			copyBtn.onclick = function()
			{
				urlInput.select();
				if (navigator.clipboard && navigator.clipboard.writeText)
				{
					navigator.clipboard.writeText(shareUrl).then(function()
					{
						copyBtn.innerHTML = '<span>&#x2714; Tersalin!</span>';
						copyBtn.style.background = '#188038';
						setTimeout(function()
						{
							copyBtn.innerHTML = '<span>Salin Tautan</span>';
							copyBtn.style.background = '#1a73e8';
						}, 2000);
					});
				}
				else
				{
					document.execCommand('copy');
					copyBtn.innerHTML = '<span>&#x2714; Tersalin!</span>';
					copyBtn.style.background = '#188038';
				}
			};

			// Export actions
			var self = this;
			var triggerAction = function(actionName)
			{
				if (self.activeUi && self.activeUi.actions && self.activeUi.actions.get(actionName))
				{
					closeModal();
					self.activeUi.actions.get(actionName).funct();
				}
			};

			document.getElementById('diaExpPng').onclick = function() { triggerAction('exportPng'); };
			document.getElementById('diaExpSvg').onclick = function() { triggerAction('exportSvg'); };
			document.getElementById('diaExpXml').onclick = function() { triggerAction('exportXml'); };
			document.getElementById('diaExpPdf').onclick = function() { triggerAction('exportPdf'); };
		},

		toggleUserDropdown: function()
		{
			var existing = document.getElementById('diagraminUserDropdown');
			if (existing)
			{
				existing.parentNode.removeChild(existing);
				return;
			}

			var widget = this.widgetElement || document.getElementById('diagraminAuthWidget');
			var rect = widget ? widget.getBoundingClientRect() : { bottom: 40, right: 100 };

			var dropdown = document.createElement('div');
			dropdown.id = 'diagraminUserDropdown';
			dropdown.style.cssText = 
				'position:fixed;top:' + (rect.bottom + 6) + 'px;right:' + (Math.max(12, window.innerWidth - rect.right)) + 'px;' +
				'min-width:260px;background:#ffffff;color:#202124;border-radius:10px;' +
				'box-shadow:0 8px 24px rgba(0,0,0,0.18);border:1px solid #e0e0e0;padding:16px;' +
				'z-index:99999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:13px;';

			if (document.body.classList.contains('geDarkMode'))
			{
				dropdown.style.background = '#282828';
				dropdown.style.color = '#e0e0e0';
				dropdown.style.borderColor = '#444';
			}

			var user = this.currentUser || {};
			var name = user.displayName || 'Pengguna';
			var email = user.email || '';

			var photoHtml = '';
			if (user.photoURL)
			{
				photoHtml = '<img src="' + user.photoURL + '" style="width:48px;height:48px;border-radius:50%;object-fit:cover;" />';
			}
			else
			{
				photoHtml = '<div style="width:48px;height:48px;border-radius:50%;background:#1a73e8;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:20px;">' +
					(name.charAt(0).toUpperCase()) + '</div>';
			}

			dropdown.innerHTML = 
				'<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">' +
				photoHtml +
				'<div style="overflow:hidden;">' +
				'<div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + name + '</div>' +
				'<div style="font-size:12px;opacity:0.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + email + '</div>' +
				'<div style="font-size:11px;color:#188038;font-weight:500;margin-top:2px;">&#9679; Firebase: kuliah-23</div>' +
				'</div>' +
				'</div>' +
				'<button id="diaOpenMyFilesBtn" style="width:100%;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 12px;background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;margin-bottom:8px;">' +
				'<span>📁 Diagram Saya &amp; Folder</span>' +
				'</button>' +
				'<hr style="border:none;border-top:1px solid rgba(128,128,128,0.25);margin:10px 0;" />' +
				'<button id="diaSignOutBtn" style="width:100%;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 12px;background:#fce8e6;color:#c5221f;border:1px solid #fad2cf;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;">' +
				LOGOUT_ICON +
				'<span>Keluar (Logout)</span>' +
				'</button>';

			document.body.appendChild(dropdown);

			var myFilesBtn = document.getElementById('diaOpenMyFilesBtn');
			if (myFilesBtn)
			{
				myFilesBtn.onclick = mxUtils.bind(this, function()
				{
					if (dropdown.parentNode) dropdown.parentNode.removeChild(dropdown);
					if (window.DiagraminCloud)
					{
						window.DiagraminCloud.showFileManagerDialog();
					}
				});
			}

			var signOutBtn = document.getElementById('diaSignOutBtn');
			if (signOutBtn)
			{
				signOutBtn.onclick = mxUtils.bind(this, function()
				{
					this.signOut(function()
					{
						if (dropdown.parentNode) dropdown.parentNode.removeChild(dropdown);
					});
				});
			}

			var closeHandler = function(e)
			{
				if (!dropdown.contains(e.target) && (!widget || !widget.contains(e.target)))
				{
					if (dropdown.parentNode) dropdown.parentNode.removeChild(dropdown);
					document.removeEventListener('click', closeHandler);
				}
			};
			setTimeout(function()
			{
				document.addEventListener('click', closeHandler);
			}, 10);
		},

		showAuthDialog: function()
		{
			var existing = document.getElementById('diagraminAuthModal');
			if (existing) existing.parentNode.removeChild(existing);

			var overlay = document.createElement('div');
			overlay.id = 'diagraminAuthModal';
			overlay.style.cssText = 
				'position:fixed;top:0;left:0;width:100%;height:100%;' +
				'background:rgba(0,0,0,0.5);backdrop-filter:blur(3px);' +
				'display:flex;align-items:center;justify-content:center;' +
				'z-index:100000;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

			var card = document.createElement('div');
			card.style.cssText = 
				'position:relative;width:380px;max-width:90%;background:#ffffff;color:#202124;' +
				'border-radius:12px;box-shadow:0 16px 36px rgba(0,0,0,0.25);padding:28px 24px;' +
				'box-sizing:border-box;';

			if (document.body.classList.contains('geDarkMode'))
			{
				card.style.background = '#282828';
				card.style.color = '#e0e0e0';
			}

			card.innerHTML = 
				'<button id="diaCloseModalBtn" style="position:absolute;top:14px;right:14px;background:none;border:none;font-size:18px;cursor:pointer;opacity:0.6;line-height:1;color:inherit;">&#x2715;</button>' +
				'<h2 style="margin:0 0 4px 0;font-size:20px;font-weight:600;text-align:center;">Masuk ke Diagramin</h2>' +
				'<p style="margin:0 0 20px 0;font-size:12px;opacity:0.7;text-align:center;">Firebase Project: kuliah-23 (diagramin)</p>' +
				
				// Google Button
				'<button id="diaGoogleBtn" style="width:100%;display:flex;align-items:center;justify-content:center;padding:10px 16px;border:1px solid #dadce0;border-radius:8px;background:#ffffff;color:#3c4043;font-size:14px;font-weight:500;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.06);margin-bottom:16px;">' +
				GOOGLE_ICON +
				'<span>Lanjutkan dengan Google</span>' +
				'</button>' +
				
				// Divider
				'<div style="display:flex;align-items:center;margin:16px 0;gap:12px;opacity:0.6;font-size:12px;">' +
				'<div style="flex:1;height:1px;background:currentColor;"></div>' +
				'<span>atau dengan email</span>' +
				'<div style="flex:1;height:1px;background:currentColor;"></div>' +
				'</div>' +
				
				// Error message
				'<div id="diaAuthError" style="display:none;background:#fde8e8;color:#9b1c1c;padding:8px 12px;border-radius:6px;font-size:12px;margin-bottom:14px;border:1px solid #f8b4b4;"></div>' +
				
				// Email Input
				'<div style="margin-bottom:12px;">' +
				'<label style="display:block;font-size:12px;font-weight:500;margin-bottom:4px;opacity:0.9;">Email</label>' +
				'<input id="diaEmailInput" type="email" placeholder="nama@email.com" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1px solid #ccc;border-radius:6px;font-size:14px;background:inherit;color:inherit;" />' +
				'</div>' +
				
				// Password Input
				'<div style="margin-bottom:18px;">' +
				'<label style="display:block;font-size:12px;font-weight:500;margin-bottom:4px;opacity:0.9;">Kata Sandi</label>' +
				'<input id="diaPassInput" type="password" placeholder="Minimal 6 karakter" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1px solid #ccc;border-radius:6px;font-size:14px;background:inherit;color:inherit;" />' +
				'</div>' +
				
				// Buttons
				'<div style="display:flex;gap:10px;">' +
				'<button id="diaEmailLoginBtn" style="flex:1;padding:10px;background:#1a73e8;color:#ffffff;border:none;border-radius:6px;font-weight:600;font-size:14px;cursor:pointer;">Masuk</button>' +
				'<button id="diaEmailRegBtn" style="flex:1;padding:10px;background:transparent;color:inherit;border:1px solid #ccc;border-radius:6px;font-weight:500;font-size:14px;cursor:pointer;">Daftar</button>' +
				'</div>' +
				
				// Footer
				'<div style="text-align:center;margin-top:16px;">' +
				'<a id="diaCancelAuth" style="font-size:12px;opacity:0.75;cursor:pointer;text-decoration:underline;">Lanjutkan sebagai Tamu (Mode Offline)</a>' +
				'</div>';

			overlay.appendChild(card);
			document.body.appendChild(overlay);

			var errDiv = document.getElementById('diaAuthError');
			var emailInput = document.getElementById('diaEmailInput');
			var passInput = document.getElementById('diaPassInput');

			var showError = function(msg)
			{
				errDiv.innerText = msg;
				errDiv.style.display = 'block';
			};

			var closeModal = function()
			{
				if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
			};

			document.getElementById('diaCloseModalBtn').onclick = closeModal;
			document.getElementById('diaCancelAuth').onclick = closeModal;

			// Google Sign-In
			document.getElementById('diaGoogleBtn').onclick = mxUtils.bind(this, function()
			{
				this.signInWithGoogle(function()
				{
					closeModal();
				}, function(err)
				{
					showError(err.message || 'Login Google gagal');
				});
			});

			// Email Login
			document.getElementById('diaEmailLoginBtn').onclick = mxUtils.bind(this, function()
			{
				if (!emailInput.value || !passInput.value)
				{
					showError('Silakan isi email dan kata sandi.');
					return;
				}
				this.signInWithEmail(emailInput.value, passInput.value, function()
				{
					closeModal();
				}, function(err)
				{
					showError(err.message || 'Login gagal.');
				});
			});

			// Email Register
			document.getElementById('diaEmailRegBtn').onclick = mxUtils.bind(this, function()
			{
				if (!emailInput.value || !passInput.value)
				{
					showError('Silakan isi email dan kata sandi untuk mendaftar.');
					return;
				}
				this.registerWithEmail(emailInput.value, passInput.value, function()
				{
					closeModal();
				}, function(err)
				{
					showError(err.message || 'Pendaftaran gagal.');
				});
			});
		}
	};

	// Monkey-patch App.prototype.updateButtonContainer to enforce share button visibility
	if (typeof App !== 'undefined' && App.prototype)
	{
		var origUpdateBtnContainer = App.prototype.updateButtonContainer;
		App.prototype.updateButtonContainer = function()
		{
			origUpdateBtnContainer.apply(this, arguments);
			if (window.DiagraminAuth)
			{
				window.DiagraminAuth.updateHeaderUI();
			}
		};
	}

	// Start Firebase Auth Setup
	DiagraminAuth.init();

	// Integrate with Draw.io Plugin lifecycle
	if (typeof window.Draw === 'undefined')
	{
		window.Draw = {};
	}
	var existingLoadPlugin = window.Draw.loadPlugin;
	window.Draw.loadPlugin = function(cb)
	{
		if (existingLoadPlugin) existingLoadPlugin(cb);
		else if (typeof App !== 'undefined' && App.DrawPlugins) App.DrawPlugins.push(cb);
	};

	window.Draw.loadPlugin(function(ui)
	{
		DiagraminAuth.activeUi = ui;
		DiagraminAuth.mountAuthButton(ui);

		// Action registration
		if (ui.actions)
		{
			ui.actions.addAction('diagraminAuth...', function()
			{
				DiagraminAuth.showAuthDialog();
			});
			ui.actions.addAction('diagraminShare...', function()
			{
				DiagraminAuth.showShareDialog();
			});
		}

		// Menus registration
		if (ui.menus)
		{
			var helpMenu = ui.menus.get('help');
			if (helpMenu)
			{
				var oldHelpFunct = helpMenu.funct;
				helpMenu.funct = function(menu, parent)
				{
					oldHelpFunct.apply(this, arguments);
					ui.menus.addMenuItems(menu, ['-', 'diagraminAuth...'], parent);
				};
			}

			var fileMenu = ui.menus.get('file');
			if (fileMenu)
			{
				var oldFileFunct = fileMenu.funct;
				fileMenu.funct = function(menu, parent)
				{
					oldFileFunct.apply(this, arguments);
					ui.menus.addMenuItems(menu, ['-', 'diagraminAuth...'], parent);
				};
			}
		}
	});

	// If page is already loaded or loading, ensure button is mounted
	if (document.readyState === 'complete' || document.readyState === 'interactive')
	{
		DiagraminAuth.mountAuthButton();
	}
	else
	{
		window.addEventListener('DOMContentLoaded', function()
		{
			DiagraminAuth.mountAuthButton();
		});
	}
})();
