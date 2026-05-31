/**
 * Lite Mode Detection
 * Dynamic: window.pywebview is injected by PyWebView before page load
 * Check early (on first import) and cache result
 */

let _isLiteModeCache: boolean | null = null;

export function getIsLiteMode(): boolean {
  if (typeof window === 'undefined') return false;
  if (_isLiteModeCache !== null) return _isLiteModeCache;

  // Check for PyWebView bridge - available immediately on Windows
  const isLite = !!(window as any).pywebview;
  _isLiteModeCache = isLite;

  if (isLite) {
    console.log('[lite-mode] PyWebView bridge detected');
  }
  return isLite;
}

// Evaluate on first import - PyWebView injects window.pywebview synchronously
export const IS_LITE_MODE = getIsLiteMode();

export function getLiteApiBaseUrl(): string {
  return 'http://127.0.0.1:8765/api/v1';
}
