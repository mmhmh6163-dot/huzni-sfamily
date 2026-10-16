// Arizona AI — PWA registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('[PWA] Service worker registered:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] SW registration failed:', err);
      });
  });
}

// Install prompt handling — show custom "Install App" button
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('[PWA] Installable');

  // Show a floating install banner
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.style.display = 'flex';
});

window.pwaInstall = function () {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then((choice) => {
    if (choice.outcome === 'accepted') {
      console.log('[PWA] User installed');
    }
    deferredPrompt = null;
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.style.display = 'none';
  });
};

window.addEventListener('appinstalled', () => {
  console.log('[PWA] Installed successfully');
});
