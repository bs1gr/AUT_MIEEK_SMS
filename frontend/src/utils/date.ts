/**
 * Date helpers for keeping calendar logic timezone-safe.
 * Always format using the browser's local timezone instead of UTC ISO strings.
 */

/**
 * Format a Date (or date-like string) to `YYYY-MM-DD` using the current locale timezone.
 */
export const formatLocalDate = (input: Date | string): string => {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) {
      return '';
    }

    const dateOnly = trimmed.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      return dateOnly;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return formatLocalDate(parsed);
    }

    return dateOnly;
  }

  const year = input.getFullYear();
  const month = String(input.getMonth() + 1).padStart(2, '0');
  const day = String(input.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeLabel = (label: string) => label.trim().toLowerCase();
const MONDAY_PREFIXES = ['mon', 'monday', 'mo', 'lun', 'lunes', 'lu', 'δε', 'δευ'];
const SUNDAY_PREFIXES = ['sun', 'sunday', 'su', 'κυ', 'κυρ'];

const labelMatches = (label: string, prefixes: string[]): boolean =>
  prefixes.some((prefix) => label.startsWith(prefix));

/**
 * Infer whether calendar UI should start the week on Monday based on localized day labels.
 */
export const inferWeekStartsOnMonday = (labels: string[], fallback = false): boolean => {
  const normalized = labels.map(normalizeLabel).filter(Boolean);
  if (!normalized.length) {
    return fallback;
  }

  const first = normalized[0];
  if (labelMatches(first, MONDAY_PREFIXES)) {
    return true;
  }
  if (labelMatches(first, SUNDAY_PREFIXES)) {
    return false;
  }

  const mondayIndex = normalized.findIndex((label) => labelMatches(label, MONDAY_PREFIXES));
  const sundayIndex = normalized.findIndex((label) => labelMatches(label, SUNDAY_PREFIXES));
  if (mondayIndex !== -1 && sundayIndex !== -1) {
    return mondayIndex < sundayIndex;
  }

  return fallback;
};
