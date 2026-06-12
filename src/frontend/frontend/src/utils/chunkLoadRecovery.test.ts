import { describe, expect, it, vi } from 'vitest';
import { isChunkLoadError, recoverFromChunkLoadError } from './chunkLoadRecovery';

class MemoryStorage {
  private readonly map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe('chunkLoadRecovery', () => {
  it('detects dynamic import fetch failures', () => {
    const err = new TypeError('Failed to fetch dynamically imported module: /assets/chunk.js');
    expect(isChunkLoadError(err)).toBe(true);
  });

  it('does not treat generic errors as chunk load errors', () => {
    expect(isChunkLoadError(new Error('Network request failed'))).toBe(false);
    expect(isChunkLoadError('Something else broke')).toBe(false);
  });

  it('reloads once for chunk load failure and throttles immediate repeats', () => {
    const storage = new MemoryStorage();
    const reload = vi.fn();
    const now = vi.fn()
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1010)
      .mockReturnValueOnce(40000);

    const err = new TypeError('Failed to fetch dynamically imported module: /assets/chunk.js');

    expect(recoverFromChunkLoadError(err, { storage, reload, now })).toBe(true);
    expect(recoverFromChunkLoadError(err, { storage, reload, now })).toBe(false);
    expect(recoverFromChunkLoadError(err, { storage, reload, now })).toBe(true);

    expect(reload).toHaveBeenCalledTimes(2);
  });
});
