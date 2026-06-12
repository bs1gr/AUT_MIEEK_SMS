/**
 * Safe navigation helper that avoids jsdom "navigation to another Document" errors in tests.
 *
 * In the browser this will perform a normal navigation. In the test environment we swallow
 * the navigation attempt so vitest/jsdom don't throw unhandled errors.
 */
export function safeNavigate(url: string | URL | undefined | null): void {
  if (!url) return;
  if (typeof window === 'undefined' || !window.location) return;

  const href = typeof url === 'string' ? url : url.toString();
  const isTestEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

  if (isTestEnv) {
    return; // Skip navigation entirely in vitest/jsdom
  }

  try {
    if (typeof window.location.assign === 'function') {
      window.location.assign(href);
    } else {
      // Fallback setter in case assign is unavailable (should be rare)
      window.location.href = href;
    }
  } catch {
    // Silent catch - navigation blocked by browser
  }
}
