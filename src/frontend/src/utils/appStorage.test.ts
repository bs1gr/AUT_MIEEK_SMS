import { beforeEach, describe, expect, it, vi } from 'vitest';

let nativePlatform = true;

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => nativePlatform },
}));

vi.mock('@capacitor/preferences', () => ({
  get Preferences() {
    return pluginProxy;
  },
}));

const store = new Map<string, string>();
const getSpy = vi.fn<(opts: { key: string }) => void>();
const setSpy = vi.fn<(opts: { key: string; value: string }) => void>();
const removeSpy = vi.fn<(opts: { key: string }) => void>();
/** Property names the runtime pulled off the plugin object. */
let propAccesses: string[] = [];

type PluginImpl = Record<string, (opts: never) => Promise<unknown>>;

/**
 * Mirrors `@capacitor/core`'s `registerPlugin` proxy: any property that isn't
 * an implemented method still resolves to a callable bridge stub, `then`
 * included. On a real device that stub rejects with
 * `"Preferences.then()" is not implemented on android`; here it throws
 * synchronously so a regression fails fast instead of hanging on the
 * never-settling promise the real bridge produces.
 */
function makePluginProxy(): Record<string, (opts: never) => Promise<unknown>> {
  const impl: PluginImpl = {
    get: (opts: never) => {
      const { key } = opts as unknown as { key: string };
      getSpy({ key });
      return Promise.resolve({ value: store.has(key) ? store.get(key)! : null });
    },
    set: (opts: never) => {
      const { key, value } = opts as unknown as { key: string; value: string };
      setSpy({ key, value });
      store.set(key, value);
      return Promise.resolve();
    },
    remove: (opts: never) => {
      const { key } = opts as unknown as { key: string };
      removeSpy({ key });
      store.delete(key);
      return Promise.resolve();
    },
  };

  return new Proxy({} as PluginImpl, {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      propAccesses.push(prop);
      if (prop in impl) return impl[prop];
      return () => {
        throw new Error(`"Preferences.${prop}()" is not implemented on android`);
      };
    },
  });
}

let pluginProxy = makePluginProxy();

async function loadAppStorage() {
  vi.resetModules();
  return import('./appStorage');
}

/** Lets queued `.then` callbacks in `_persistAsync` run. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  nativePlatform = true;
  store.clear();
  localStorage.clear();
  propAccesses = [];
  pluginProxy = makePluginProxy();
  vi.clearAllMocks();
});

describe('appStorage on Capacitor/Android', () => {
  it('never pulls `then` off the plugin proxy while loading it', async () => {
    store.set('sms_server_url', 'https://sms.example.test');
    const appStorage = await loadAppStorage();

    await appStorage.init();

    // The regression: returning the plugin proxy bare from an async function
    // makes promise resolution probe `.then`, which Capacitor answers with a
    // native call Android has no implementation for — killing Preferences.
    expect(propAccesses).not.toContain('then');
  });

  it('hydrates known keys from Preferences into the cache and localStorage', async () => {
    store.set('sms_server_url', 'https://sms.example.test');
    store.set('sms_local_mode', 'true');
    const appStorage = await loadAppStorage();

    await appStorage.init();

    expect(getSpy).toHaveBeenCalledWith({ key: 'sms_server_url' });
    expect(appStorage.getItem('sms_server_url')).toBe('https://sms.example.test');
    expect(appStorage.getItem('sms_local_mode')).toBe('true');
    expect(localStorage.getItem('sms_server_url')).toBe('https://sms.example.test');
  });

  it('writes through to Preferences after a successful init', async () => {
    const appStorage = await loadAppStorage();
    await appStorage.init();

    appStorage.setItem('sms_access_token', 'token-123');
    await flush();

    // Only reached when init marked Preferences ready — the bug left this off.
    expect(setSpy).toHaveBeenCalledWith({ key: 'sms_access_token', value: 'token-123' });
    expect(store.get('sms_access_token')).toBe('token-123');
    expect(appStorage.getItem('sms_access_token')).toBe('token-123');
  });

  it('removes from Preferences, cache and localStorage together', async () => {
    store.set('sms_access_token', 'token-123');
    const appStorage = await loadAppStorage();
    await appStorage.init();

    appStorage.removeItem('sms_access_token');
    await flush();

    expect(removeSpy).toHaveBeenCalledWith({ key: 'sms_access_token' });
    expect(appStorage.getItem('sms_access_token')).toBeNull();
    expect(localStorage.getItem('sms_access_token')).toBeNull();
  });

  it('falls back to localStorage when the native bridge is unusable', async () => {
    pluginProxy = new Proxy({} as PluginImpl, {
      get: () => () => {
        throw new Error('"Preferences.get()" is not implemented on android');
      },
    });
    const appStorage = await loadAppStorage();

    await expect(appStorage.init()).resolves.toBeUndefined();

    appStorage.setItem('sms_server_url', 'https://fallback.test');
    await flush();
    expect(appStorage.getItem('sms_server_url')).toBe('https://fallback.test');
    expect(setSpy).not.toHaveBeenCalled();
  });
});

describe('appStorage on web', () => {
  it('skips Preferences entirely and uses localStorage', async () => {
    nativePlatform = false;
    const appStorage = await loadAppStorage();

    await appStorage.init();
    appStorage.setItem('sms_server_url', 'https://web.test');
    await flush();

    expect(propAccesses).toEqual([]);
    expect(getSpy).not.toHaveBeenCalled();
    expect(setSpy).not.toHaveBeenCalled();
    expect(appStorage.getItem('sms_server_url')).toBe('https://web.test');
    expect(localStorage.getItem('sms_server_url')).toBe('https://web.test');
  });

  it('reads values written to localStorage by other code paths', async () => {
    nativePlatform = false;
    const appStorage = await loadAppStorage();
    localStorage.setItem('sms_server_type', 'tailscale');

    expect(appStorage.getItem('sms_server_type')).toBe('tailscale');
    expect(appStorage.getItem('sms_unknown_key')).toBeNull();
  });
});
