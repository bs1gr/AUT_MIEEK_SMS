import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isCapacitorApp } from '@/utils/serverUrl';

/**
 * Handles the Android hardware back button inside the Capacitor WebView.
 *
 * Behaviour:
 *  - If there is browser history to pop, go back one step.
 *  - If already at the root (no history), prompt the user to confirm exit,
 *    then call App.exitApp().
 *
 * On non-Capacitor builds this hook is a no-op.
 */
export function useAndroidBackButton(): void {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isCapacitorApp()) return;

    let handle: { remove: () => void } | null = null;

    void import('@capacitor/app').then(({ App }) => {
      handle = App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          navigate(-1);
        } else {
          // Double-tap guard: require two taps within 2 s to exit
          const key = '__sms_back_tap__';
          const last = Number(sessionStorage.getItem(key) || 0);
          const now = Date.now();
          if (now - last < 2000) {
            sessionStorage.removeItem(key);
            void App.exitApp();
          } else {
            sessionStorage.setItem(key, String(now));
            // Fire a toast via CustomEvent that App.tsx can listen to if desired
            window.dispatchEvent(new CustomEvent('sms-back-exit-warning'));
          }
        }
      }) as unknown as { remove: () => void };
    });

    return () => {
      handle?.remove();
    };
  // Re-register when location changes so canGoBack reflects the new history state
  }, [navigate, location.pathname]);
}
