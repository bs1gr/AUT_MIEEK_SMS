import type { ScheduleChangePreview, ScheduleChangeTotals } from '@/api/api';

/**
 * True when saving a Teaching Schedule would change the course's absence limits (plan todo 69):
 * the periods in the semester, the absences allowed before failing, or those before the Class
 * Participation share is lost. A course without enrolled students has nobody to warn about.
 */
export const scheduleChangeNeedsWarning = (preview: ScheduleChangePreview): boolean => {
  if (preview.enrolled_students <= 0) return false;
  const fields: Array<keyof ScheduleChangeTotals> = ['scheduled_periods', 'allowed_absences', 'participation_allowed_absences'];
  return fields.some((field) => preview.before[field] !== preview.after[field]);
};
