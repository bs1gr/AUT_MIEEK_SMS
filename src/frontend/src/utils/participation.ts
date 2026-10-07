/**
 * Class Participation and its special sub-weights (ΜΙΕΕΚ, owner's decision 2026-10-07).
 *
 * A course's Class Participation share (e.g. 10%) is split in the Courses tab between the normal
 * per-period participation ratings and these observations, recorded per period in Attendance.
 * They are stored as separate evaluation rules (Class Participation keeps the remainder), so
 * the final-grade calculation is unchanged. Over the Class Participation absence limit the
 * whole share counts as 0 (backend: AnalyticsService.participation_categories).
 */
export const CLASS_PARTICIPATION = 'Class Participation';

export const SPECIAL_PARTICIPATION_CATEGORIES = [
  'No participation',
  'Minor participation',
  'Minor participation (mobile usage)',
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
