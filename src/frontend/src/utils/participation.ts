/**
 * Class Participation and its participation observations (ΜΙΕΕΚ, owner's decisions 2026-10-13).
 *
 * Each attended day is worth an equal slice of Class Participation. The most severe observation
 * ticked that day in Attendance takes its `deduction_percent` of the slice (defaults below, by
 * severity, editable per course in the Courses tab); the rest of the slice is credit for being
 * present. Never more than Class Participation earned. The observations are stored as rules with
 * weight 0, so Class Participation keeps its whole share. Over the Class Participation absence
 * limit that share counts as 0 and nothing is deducted
 * (backend: AnalyticsService.observation_default_percent).
 */
export const CLASS_PARTICIPATION = 'Class Participation';

/** Most severe first. */
export const SPECIAL_PARTICIPATION_CATEGORIES = [
  'No participation',
  'Minor participation (mobile usage)',
  'Minor participation',
] as const;

export type SpecialParticipationCategory = (typeof SPECIAL_PARTICIPATION_CATEGORIES)[number];

/** Translation key of each observation's label. */
export const SPECIAL_PARTICIPATION_LABEL_KEYS: Record<SpecialParticipationCategory, string> = {
  'No participation': 'noParticipationOption',
  'Minor participation': 'minorParticipationOption',
  'Minor participation (mobile usage)': 'minorParticipationMobileOption',
};

export const isSpecialParticipation = (canonicalCategory: string): canonicalCategory is SpecialParticipationCategory =>
  (SPECIAL_PARTICIPATION_CATEGORIES as readonly string[]).includes(canonicalCategory);

/** Share of a day's participation each observation takes (percent). */
export type ObservationDeductions = Record<SpecialParticipationCategory, number>;

export const DEFAULT_DEDUCTION_PERCENTS: ObservationDeductions = {
  'No participation': 60,
  'Minor participation (mobile usage)': 40,
  'Minor participation': 20,
};

const toNumber = (value: unknown) => parseFloat(String(value ?? '').replace(',', '.')) || 0;

type StoredRule = { category: string; weight?: string | number; deduction_percent?: string | number };

/**
 * Splits stored rules into the weighted rules and the observations' percentages (the default
 * where a course has none). Sub-weights saved under the old layout (carved out of Class
 * Participation) go back into Class Participation, as the backend does when grading.
 */
export const splitParticipationRules = <R extends StoredRule>(
  rules: R[],
  canonical: (category: string) => string,
): { rules: R[]; deductions: ObservationDeductions } => {
  const deductions: ObservationDeductions = { ...DEFAULT_DEDUCTION_PERCENTS };
  const weighted: R[] = [];
  let returnedWeight = 0;
  rules.forEach((rule) => {
    const category = canonical(String(rule.category || ''));
    if (isSpecialParticipation(category)) {
      if (rule.deduction_percent !== undefined && rule.deduction_percent !== null && rule.deduction_percent !== '') {
        deductions[category] = Math.min(100, Math.max(0, toNumber(rule.deduction_percent)));
      }
      returnedWeight += Math.max(0, toNumber(rule.weight));
    } else {
      weighted.push({ ...rule });
    }
  });
  const participation = weighted.find((r) => canonical(String(r.category || '')) === CLASS_PARTICIPATION);
  if (participation && returnedWeight > 0) {
    participation.weight = Number((toNumber(participation.weight) + returnedWeight).toFixed(2));
  }
  return { rules: weighted, deductions };
};
