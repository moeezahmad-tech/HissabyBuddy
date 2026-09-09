import { useState, useEffect, useCallback } from 'react';

export const APP_VERSION = 'v2.4.0';
export const APP_RELEASE_CHANNEL = 'PWA Production';

export function useAppUpdate() {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<string | null>(() => {
    try {
      return localStorage.getItem('hissaby_last_update_check');
    } catch {
      return null;
    }
  });
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    const checkExistingRegistration = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;

        // If there's already a worker waiting, update is available immediately
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setIsUpdateAvailable(true);
        }

        // Listen for new updates found
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker);
                setIsUpdateAvailable(true);
              }
            });
          }
        });
      } catch (err) {
        console.warn('Service worker check error:', err);
      }
    };

    checkExistingRegistration();

    // Check periodically every 20 minutes
    const interval = setInterval(async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
        }
      } catch {}
    }, 20 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const checkForUpdate = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          if (registration.waiting) {
            setWaitingWorker(registration.waiting);
            setIsUpdateAvailable(true);
            setLastChecked(nowStr);
            try { localStorage.setItem('hissaby_last_update_check', nowStr); } catch {}
            setIsChecking(false);
            return true;
          }
        }
      }

      // Check remote asset header or ping version endpoint if available
      try {
        const res = await fetch(`/index.html?check_update=${Date.now()}`, {
          method: 'HEAD',
          cache: 'no-store'
        });
        const etag = res.headers.get('etag');
        const storedEtag = localStorage.getItem('hissaby_build_etag');
        if (etag && storedEtag && etag !== storedEtag) {
          setIsUpdateAvailable(true);
          setLastChecked(nowStr);
          try { localStorage.setItem('hissaby_last_update_check', nowStr); } catch {}
          setIsChecking(false);
          return true;
        }
        if (etag) {
          try { localStorage.setItem('hissaby_build_etag', etag); } catch {}
        }
      } catch {}

      // Short delay for user tactile feedback
      await new Promise((resolve) => setTimeout(resolve, 600));

      setLastChecked(nowStr);
      try { localStorage.setItem('hissaby_last_update_check', nowStr); } catch {}
      return false;
    } catch {
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const applyUpdate = useCallback(async () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }

    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {}
    }

    // Reload page to activate new bundle
    window.location.reload();
  }, [waitingWorker]);

  const forceRefresh = useCallback(async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }

      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {}

    window.location.href = window.location.pathname + '?v=' + Date.now();
  }, []);

  return {
    version: APP_VERSION,
    channel: APP_RELEASE_CHANNEL,
    isUpdateAvailable,
    isChecking,
    lastChecked,
    checkForUpdate,
    applyUpdate,
    forceRefresh,
    dismissUpdate: () => setIsUpdateAvailable(false)
  };
}
