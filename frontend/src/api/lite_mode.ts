/**
 * Lite Mode Detection and Configuration
 * Groundwork for Week 2 PyWebView bridge migration.
 */

export const IS_LITE_MODE = typeof window !== 'undefined' && !!(window as any).pywebview;

export function getLiteApiBaseUrl(): string {
  return 'http://127.0.0.1:8765/api/v1';
}
