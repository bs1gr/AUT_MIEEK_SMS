export function getErrorMessage(source: unknown, fallback: string): string {
  if (source === null || source === undefined) {
    return fallback;
  }

  const hasOwn = (obj: object, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);

  const extractCandidate = (value: unknown): { found: boolean; value: unknown } => {
    if (!value || typeof value !== 'object') {
      return { found: false, value: undefined };
    }

    const obj = value as {
      response?: {
        data?: {
          error?: { message?: unknown; detail?: unknown; code?: unknown };
          detail?: unknown;
          message?: unknown;
          error?: unknown;
        };
      };
      message?: unknown;
      detail?: unknown;
      error?: unknown;
    };

    const responseData = obj.response?.data;
    const nestedError = responseData?.error;

    if (nestedError && typeof nestedError === 'object' && hasOwn(nestedError as object, 'message')) {
      return { found: true, value: (nestedError as { message?: unknown }).message };
    }
    if (responseData && typeof responseData === 'object' && hasOwn(responseData as object, 'detail')) {
      return { found: true, value: responseData.detail };
    }
    if (responseData && typeof responseData === 'object' && hasOwn(responseData as object, 'message')) {
      return { found: true, value: responseData.message };
    }
    if (responseData && typeof responseData === 'object' && hasOwn(responseData as object, 'error')) {
      return { found: true, value: responseData.error };
    }
    if (hasOwn(obj, 'message')) {
      return { found: true, value: obj.message };
    }
    if (hasOwn(obj, 'detail')) {
      return { found: true, value: obj.detail };
    }
    if (hasOwn(obj, 'error')) {
      return { found: true, value: obj.error };
    }

    return { found: false, value: undefined };
  };

  const toMessage = (candidate: unknown): string | null => {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      return trimmed || null;
    }

    if (Array.isArray(candidate)) {
      const joined = candidate.map((item) => String(item)).join(', ');
      return joined || null;
    }

    return null;
  };

  const isExplicitlyEmptyCandidate = (candidate: unknown): boolean => {
    if (typeof candidate === 'string') {
      return candidate.trim().length === 0;
    }
    if (Array.isArray(candidate)) {
      return candidate.length === 0;
    }
    return false;
  };

  const nestedCandidate = extractCandidate(source);
  const nestedMessage = toMessage(nestedCandidate.value);
  if (nestedMessage) {
    return nestedMessage;
  }
  if (nestedCandidate.found && isExplicitlyEmptyCandidate(nestedCandidate.value)) {
    return fallback;
  }

  if (typeof source === 'string') {
    return source.trim() || fallback;
  }

  if (source instanceof Error) {
    return source.message || fallback;
  }

  if (typeof source === 'object') {
    const candidate = extractCandidate(source);
    const directMessage = toMessage(candidate.value);
    if (directMessage) {
      return directMessage;
    }
    if (candidate.found && isExplicitlyEmptyCandidate(candidate.value)) {
      return fallback;
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
