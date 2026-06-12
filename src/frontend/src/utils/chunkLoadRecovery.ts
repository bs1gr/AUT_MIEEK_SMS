const CHUNK_RECOVERY_KEY = 'sms:chunk-load-reload-ts';
const CHUNK_RECOVERY_COOLDOWN_MS = 30_000;

const CHUNK_ERROR_PATTERNS: RegExp[] = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /ChunkLoadError/i,
  /Loading chunk\s+\S+\s+failed/i,
  /dynamically imported module/i,
];

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message || '';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const candidate = (error as { message?: unknown }).message;
    if (typeof candidate === 'string') {
      return candidate;
    }
  }

  return '';
}

export function isChunkLoadError(error: unknown): boolean {
  const message = toErrorMessage(error);
  if (!message) {
    return false;
  }

  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

type RecoveryOptions = {
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
  reload?: () => void;
  now?: () => number;
};

async function purgeStalePwaState(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    // Best effort only.
  }

  try {
    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }
  } catch {
    // Best effort only.
  }
}

export function recoverFromChunkLoadError(error: unknown, options?: RecoveryOptions): boolean {
  if (!isChunkLoadError(error)) {
    return false;
  }

  const hasInjectedAdapters = Boolean(options?.storage && options?.reload);
  if (typeof window === 'undefined' && !hasInjectedAdapters) {
    return false;
  }

  const storage = options?.storage ?? window.sessionStorage;
  const reload = options?.reload ?? (() => window.location.reload());
  const now = options?.now?.() ?? Date.now();

  let shouldReload = true;
  try {
    const raw = storage.getItem(CHUNK_RECOVERY_KEY);
    const previousTs = raw ? Number.parseInt(raw, 10) : Number.NaN;
    if (Number.isFinite(previousTs) && now - previousTs < CHUNK_RECOVERY_COOLDOWN_MS) {
      shouldReload = false;
    }
  } catch {
    // Best effort: if storage is unavailable, still try one reload.
  }

  if (!shouldReload) {
    return false;
  }

  try {
    storage.setItem(CHUNK_RECOVERY_KEY, String(now));
  } catch {
    // Ignore storage write issues.
  }

  if (options?.reload) {
    reload();
    return true;
  }

  void purgeStalePwaState().finally(() => {
    reload();
  });

  return true;
}
