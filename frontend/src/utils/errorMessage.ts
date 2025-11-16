export function getErrorMessage(source: unknown, fallback: string): string {
  if (source === null || source === undefined) {
    return fallback;
  }

  if (typeof source === 'string') {
    return source.trim() || fallback;
  }

  if (source instanceof Error) {
    return source.message || fallback;
  }

  if (typeof source === 'object') {
    const candidate = (source as { message?: unknown; detail?: unknown; error?: unknown }).message
      ?? (source as { detail?: unknown }).detail
      ?? (source as { error?: unknown }).error;

    if (typeof candidate === 'string') {
      return candidate.trim() || fallback;
    }

    if (Array.isArray(candidate)) {
      const joined = candidate.map((item) => String(item)).join(', ');
      return joined || fallback;
    }

    try {
      const serialized = JSON.stringify(source);
      if (serialized && serialized !== '{}') {
        return serialized;
      }
    } catch {
      // ignore serialization issues and use fallback below
    }
  }

  return fallback;
}
