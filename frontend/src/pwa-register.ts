/**
 * PWA Service Worker Registration and Lifecycle Handler
 * Manages offline capabilities, caching strategies, and app updates
 */

interface AppUpdateEvent extends Event {
  detail?: {
    registration: ServiceWorkerRegistration;
  };
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.warn('✅ Service Worker registered successfully:', registration);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Every minute

        // Listen for update available
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker ready, notify user of update
                console.warn('🔄 App update available');
                dispatchEvent(
                  new CustomEvent('app-update-available', {
                    detail: { registration },
                  })
                );
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });

  // Listen for messages from service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    console.warn('📨 Message from Service Worker:', event.data);
  });

  // Handle app update event
  window.addEventListener('app-update-available', (event: AppUpdateEvent) => {
    const registration = event.detail?.registration;
    if (!registration) return;

    // Option to update now or later
    const updateNow = confirm(
      'A new version of Student Management System is available. Update now?'
    );

    if (updateNow && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  });
}

// Detect when service worker takes control after update
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.controller?.addEventListener('controllerchange', () => {
    console.warn('🔄 Service Worker updated and activated');
    window.location.reload();
  });
}

// Request Persistent Storage permission for offline data
if ('storage' in navigator && 'persist' in navigator.storage) {
  navigator.storage.persist().then((persistent) => {
    console.warn(`📦 Persistent storage ${persistent ? 'enabled' : 'disabled'}`);
  });
}

export {};
