/**
 * Generate a locally-unique id (offline-queue items, client-side keys — not
 * a security credential). Uses crypto.getRandomValues when available; falls
 * back to Math.random only in environments without a Web Crypto API (e.g.
 * older test runners), which CodeQL's js/insecure-randomness rule otherwise
 * flags as insecure randomness reaching downstream consumers.
 */
export function generateLocalId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const array = new Uint32Array(2);
    crypto.getRandomValues(array);
    const suffix = Array.from(array, (val) => val.toString(36)).join('');
    return `${Date.now()}-${suffix}`;
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
