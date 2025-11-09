// Polyfill import.meta.env for Jest
if (!globalThis.importMetaEnvPatched) {
  Object.defineProperty(globalThis, 'import', {
    value: { meta: { env: { VITE_API_URL: '/api/v1' } } },
    configurable: true,
  });
  globalThis.importMetaEnvPatched = true;
}
