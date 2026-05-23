(function () {
  let deferredPrompt = null;
  let refreshing = false;

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function getManualInstallText() {
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua)) {
      return 'To install on iPhone/iPad, tap Share, then Add to Home Screen.';
    }
    if (/Android/i.test(ua)) {
      return 'Use your browser menu and choose Install app or Add to Home screen.';
    }
    return 'Use your browser menu or address bar install icon to install this app.';
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return null;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            worker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return null;
    }
  }

  function initInstallButton(options) {
    const installBtn = document.getElementById(options.buttonId || 'installBtn');
    const unsupportedMsg = document.getElementById(options.messageId || 'unsupportedMsg');
    if (!installBtn) return;

    const appUrl = options.appUrl || '/login.html';

    function setMessage(text, isVisible) {
      if (!unsupportedMsg) return;
      unsupportedMsg.textContent = text;
      unsupportedMsg.style.display = isVisible ? 'block' : 'none';
    }

    function updateInstallUI() {
      installBtn.style.display = 'inline-flex';

      if (isStandalone()) {
        installBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Open App';
        setMessage('', false);
        return;
      }

      if (deferredPrompt) {
        installBtn.innerHTML = '<i class="fab fa-android"></i> Install App';
        setMessage('', false);
        return;
      }

      installBtn.innerHTML = '<i class="fas fa-mobile-screen-button"></i> Install App';
      setMessage(getManualInstallText(), false);
    }

    installBtn.addEventListener('click', async () => {
      if (isStandalone()) {
        window.location.href = appUrl;
        return;
      }

      if (!deferredPrompt) {
        setMessage(getManualInstallText(), true);
        return;
      }

      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      updateInstallUI();

      if (choice && choice.outcome === 'accepted') {
        setTimeout(() => {
          window.location.href = appUrl;
        }, 1000);
      }
    });

    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      deferredPrompt = event;
      updateInstallUI();
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      updateInstallUI();
      setTimeout(() => {
        window.location.href = appUrl;
      }, 500);
    });

    updateInstallUI();
  }

  window.AcePWA = {
    registerServiceWorker,
    initInstallButton,
    isStandalone
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerServiceWorker, { once: true });
  } else {
    registerServiceWorker();
  }
})();
