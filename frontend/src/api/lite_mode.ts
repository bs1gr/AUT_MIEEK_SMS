/**
 * Lite Mode - HTTP Server Mode for MVP
 * Using built-in HTTP server instead of PyWebView bridge
 * TODO: Enable direct bridge mode once auth is implemented
 */

export function getIsLiteMode(): boolean {
  // Using HTTP server mode for MVP - full app support
  return false;
}

export const IS_LITE_MODE = false;

export function getLiteApiBaseUrl(): string {
  return 'http://127.0.0.1:8765/api/v1';
}
