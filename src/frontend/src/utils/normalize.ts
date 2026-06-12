// Small helper to normalize responses that may be arrays or paginated objects
export function normalizeResponseToArray<T>(maybe: unknown): T[] {
  if (Array.isArray(maybe)) return maybe as unknown as T[];
  if (maybe && typeof maybe === 'object') {
    const obj = maybe as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as unknown as T[];
    if (Array.isArray(obj.results)) return obj.results as unknown as T[];
  }
  return [];
}

// Generic guard that ensures an unknown is returned as an array if possible
export function asArray<T>(maybe: unknown): T[] {
  return normalizeResponseToArray<T>(maybe);
}
