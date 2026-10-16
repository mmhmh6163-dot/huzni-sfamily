// ============================================================
// Arizona AI — PWA Registration v2
// Enhanced: auto-update, iOS support, install tracking
// ============================================================

(function () {
  'use strict';

  // ---- Config ----
  const SW_PATH = '/sw.js';
  const SW_SCOPE = '/';
  const INSTALL_BANNER_ID = 'pwa-install-banner';
  const UPDATE_BANNER_ID = 'pwa-update-banner';

  // ---- Detect platform ----
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isAndroid = /android/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  console.log('[PWA] Platform:', { isIOS, isAndroid, isStandalone });

  // ============================================================
  // 1. SERVICE WORKER REGISTRATION
  // ============================================================
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register(SW_PATH, { scope: SW_SCOPE })
        .then((reg) => {
          console.log('[PWA] SW registered. Scope:', reg.scope);

          // ---- Check for updates every 60s ----
          setInterval(() => reg.update(), 60 * 1000);

          // ---- Listen for new SW waiting to activate ----
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            console.log('[PWA] New SW installing…');

            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                console.log('[PWA] Update ready — showing banner');
                showUpdateBanner(reg);
              }
            });
          });
        })
        .catch((err) => {
          console.warn('[PWA] SW registration failed:', err);
        });

      // ---- Reload page when new SW takes control ----
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        console.log('[PWA] Controller changed — reloading');
        window.location.reload();
      });
    });
  } else {
    console.warn('[PWA] Service Worker not supported in this browser');
  }

  // ============================================================
  // 2. INSTALL PROMPT (Android / Chrome / Edge)
  // ============================================================
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] Installable — banner available');

    // Only show banner if not already installed
    if (!isStandalone) {
      showInstallBanner();
    }
  });

  // ---- Public function: trigger install ----
  window.pwaInstall = function () {
    if (!deferredPrompt) {
      console.log('[PWA] No install prompt available');
      // Fallback: show manual instructions
      if (isIOS) showIOSInstructions();
      return;
    }

    deferredPrompt.prompt();

    deferredPrompt.userChoice.then((choice) => {
      console.log('[PWA] User choice:', choice.outcome);

      if (choice.outcome === 'accepted') {
        trackEvent('pwa_install_accepted');
      } else {
        trackEvent('pwa_install_dismissed');
      }

      deferredPrompt = null;
      hideBanner(INSTALL_BANNER_ID);
    });
  };

  // ---- Track successful install ----
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully ✅');
    trackEvent('pwa_installed');
    deferredPrompt = null;
    hideBanner(INSTALL_BANNER_ID);
  });

  // ============================================================
  // 3. BANNER MANAGEMENT
  // ============================================================
  function showInstallBanner() {
    const banner = document.getElementById(INSTALL_BANNER_ID);
    if (banner) {
      banner.style.display = 'flex';
      banner.classList.add('show');
    }
  }

  function showUpdateBanner(reg) {
    // Remove old one if exists
    let banner = document.getElementById(UPDATE_BANNER_ID);
    if (banner) banner.remove();

    banner = document.createElement('div');
    banner.id = UPDATE_BANNER_ID;
    banner.style.cssText = `
      position: fixed;
      bottom: 20px; left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #FF6B35, #7c3aed);
      color: #fff;
      padding: 12px 18px;
      border-radius: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px; font-weight: 600;
      display: flex; align-items: center; gap: 12px;
      box-shadow: 0 12px 40px rgba(0,0,0,.4);
      z-index: 99999;
      max-width: 90vw;
      cursor: pointer;
      animation: slideUpBanner .3s ease;
    `;
    banner.innerHTML = `
      <i class="fas fa-sync-alt"></i>
      <span>New version available — tap to update</span>
    `;
    banner.onclick = () => {
      if (reg.waiting) {
        reg.waiting.postMessage('SKIP_WAITING');
      }
      banner.remove();
    };

    document.body.appendChild(banner);
  }

  function hideBanner(id) {
    const banner = document.getElementById(id);
    if (banner) {
      banner.classList.remove('show');
      banner.style.display = 'none';
    }
  }

  // ============================================================
  // 4. iOS-SPECIFIC HELP
  // ============================================================
  function showIOSInstructions() {
    if (document.getElementById('ios-install-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'ios-install-modal';
    modal.style.cssText = `
      position: fixed; inset: 0;
      background: rgba(0,0,0,.85);
      backdrop-filter: blur(8px);
      z-index: 99999;
      display: flex; align-items: flex-end; justify-content: center;
      padding: 20px;
      animation: fadeInModal .2s ease;
    `;
    modal.innerHTML = `
      <div style="
        background: #151515;
        border-radius: 20px;
        padding: 24px 20px;
        max-width: 480px; width: 100%;
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        position: relative;
      ">
        <button id="close-ios-modal" style="
          position: absolute; top: 12px; right: 12px;
          width: 32px; height: 32px; border-radius: 50%;
          background: rgba(255,255,255,.1); border: none;
          color: #fff; font-size: 16px; cursor: pointer;
        ">✕</button>

        <div style="text-align:center; margin-bottom: 18px;">
          <div style="
            width: 70px; height: 70px; border-radius: 18px;
            background: linear-gradient(135deg,#FF6B35,#7c3aed);
            display: inline-flex; align-items: center; justify-content: center;
            font-size: 30px; margin-bottom: 12px;
          ">📱</div>
          <h3 style="margin: 0 0 6px; font-size: 18px;">Install Arizona AI</h3>
          <p style="margin: 0; color: rgba(255,255,255,.6); font-size: 13px;">
            Add to your iPhone home screen
          </p>
        </div>

        <div style="
          background: rgba(255,107,53,.1);
          border: 1px solid rgba(255,107,53,.25);
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 12px;
        ">
          <div style="display:flex; gap:12px; margin-bottom:14px; align-items:center;">
            <div style="
              width:32px; height:32px; border-radius:50%;
              background:#FF6B35; color:#fff;
              display:flex; align-items:center; justify-content:center;
              font-weight:800; flex-shrink:0;
            ">1</div>
            <div style="font-size:14px;">
              Tap the <strong>Share</strong> button
              <span style="font-size:18px; margin-left:4px;">⎙</span>
              at the bottom of Safari
            </div>
          </div>
          <div style="display:flex; gap:12px; margin-bottom:14px; align-items:center;">
            <div style="
              width:32px; height:32px; border-radius:50%;
              background:#FF6B35; color:#fff;
              display:flex; align-items:center; justify-content:center;
              font-weight:800; flex-shrink:0;
            ">2</div>
            <div style="font-size:14px;">
              Scroll down and tap <strong>Add to Home Screen</strong>
            </div>
          </div>
          <div style="display:flex; gap:12px; align-items:center;">
            <div style="
              width:32px; height:32px; border-radius:50%;
              background:#FF6B35; color:#fff;
              display:flex; align-items:center; justify-content:center;
              font-weight:800; flex-shrink:0;
            ">3</div>
            <div style="font-size:14px;">
              Tap <strong>Add</strong> in the top-right corner
            </div>
          </div>
        </div>

        <p style="
          font-size:11px; color:rgba(255,255,255,.4);
          text-align:center; margin: 12px 0 0;
        ">
          Works only in Safari (not Chrome on iOS)
        </p>
      </div>
      <style>
        @keyframes fadeInModal { from { opacity: 0; } }
      </style>
    `;

    document.body.appendChild(modal);

    document.getElementById('close-ios-modal').onclick = () => {
      modal.remove();
    };
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
  }

  // Expose for manual trigger
  window.pwaShowIOSHelp = showIOSInstructions;

  // ============================================================
  // 5. AUTO-SHOW iOS HELPER (if user is on iOS Safari)
  // ============================================================
  if (isIOS && !isStandalone) {
    // Show after 5 seconds, only once per session
    setTimeout(() => {
      if (!sessionStorage.getItem('ios-help-shown')) {
        sessionStorage.setItem('ios-help-shown', '1');
        // Uncomment the next line to auto-show iOS help:
        // showIOSInstructions();
      }
    }, 5000);
  }

  // ============================================================
  // 6. DETECT INSTALL STATE CHANGES
  // ============================================================
  window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
    if (e.matches) {
      console.log('[PWA] Switched to standalone mode');
      trackEvent('pwa_entered_standalone');
    }
  });

  // ============================================================
  // 7. ANALYTICS HELPER (no-op if no analytics set up)
  // ============================================================
  function trackEvent(name, data) {
    if (typeof gtag === 'function') {
      gtag('event', name, data);
    } else if (typeof window.plausible === 'function') {
      window.plausible(name, { props: data });
    }
    // Log always
    console.log('[PWA Event]', name, data || '');
  }

})();
