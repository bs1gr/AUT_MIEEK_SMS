/**
 * Auto-activation utilities for course semester-based activation.
 * Replicates backend semester parsing logic from routers_courses.py.
 */

/**
 * Strip diacritics from Greek text for normalization.
 * Example: "Χειμερινό" → "Χειμερινο"
 */
function stripDiacritics(text: string): string {
  return text
    .normalize('NFD') // Decompose
    .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritics
    .normalize('NFC'); // Recompose
}

/**
 * Infer semester kind from semester string.
 * Returns 'winter', 'spring', or 'academic_year', or null if unrecognized.
 */
function inferSemesterKind(semester: string): 'winter' | 'spring' | 'academic_year' | null {
  if (!semester) return null;

  const lower = stripDiacritics(semester).toLowerCase();

  // Winter semester (Χειμερινό Εξάμηνο, Winter Semester, Fall Semester)
  if (
    lower.includes('winter') ||
    lower.includes('χειμερινο') ||
    lower.includes('fall') ||
    lower.includes('autumn')
  ) {
    return 'winter';
  }

  // Spring semester (Εαρινό Εξάμηνο, Spring Semester)
  if (lower.includes('spring') || lower.includes('εαρινο')) {
    return 'spring';
  }

  // Academic year (Ακαδημαϊκό Έτος, Academic Year)
  if (lower.includes('academic')) {
    return 'academic_year';
  }

  return null;
}

/**
 * Extract 4-digit year from semester string.
 * Example: "Winter Semester 2025" → 2025
 */
function extractYear(semester: string): number | null {
  const match = semester.match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Compute semester date range based on kind and year.
 * Returns [startDate, endDate] or null if invalid.
 */
function semesterDateRange(
  kind: 'winter' | 'spring' | 'academic_year',
  year: number
): [Date, Date] | null {
  if (!year || year < 2000 || year > 2100) return null;

  switch (kind) {
    case 'winter':
      // Sept 15 of year → Jan 30 of year+1
      return [new Date(year, 8, 15), new Date(year + 1, 0, 30)]; // Month is 0-indexed

    case 'spring':
      // Feb 1 of year → June 30 of year
      return [new Date(year, 1, 1), new Date(year, 5, 30)];

    case 'academic_year':
      // Sept 1 of year → June 30 of year+1
      return [new Date(year, 8, 1), new Date(year + 1, 5, 30)];

    default:
      return null;
  }
}

/**
 * Compute auto-activation status based on semester string and current date.
 * Returns:
 * - true: Course should be active (today within semester range)
 * - false: Course should be inactive (today outside semester range)
 * - null: Auto-activation does not apply (unrecognized semester format)
 */
export function computeAutoActivation(semester: string, today: Date = new Date()): boolean | null {
  if (!semester) return null;

  const kind = inferSemesterKind(semester);
  if (!kind) return null;

  const year = extractYear(semester);
  if (!year) return null;

  const range = semesterDateRange(kind, year);
  if (!range) return null;

  const [startDate, endDate] = range;

  // Normalize to compare dates only (ignore time)
  const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startNorm = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endNorm = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  return todayNorm >= startNorm && todayNorm <= endNorm;
}

/**
 * Get human-readable auto-activation status for UI display.
 * Returns label and hint text for translation.
 */
export function getAutoActivationStatus(
  semester: string
): { label: string; hint: string; isActive: boolean | null } {
  const isActive = computeAutoActivation(semester);

  if (isActive === null) {
    return {
      label: 'autoActivationNotApplicable',
      hint: 'autoActivationNotApplicableHint',
      isActive: null,
    };
  }

  if (isActive) {
    return {
      label: 'autoActivationActive',
      hint: 'autoActivationActiveHint',
      isActive: true,
    };
  }

  return {
    label: 'autoActivationInactive',
    hint: 'autoActivationInactiveHint',
    isActive: false,
  };
}
