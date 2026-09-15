/**
 * Pure schedule / evaluation-rule helpers for the course editor.
 *
 * These were inline in CoursesView.tsx (a ~1070-line component), which left
 * the interesting parts untestable: the teaching-schedule normalization was
 * written out twice (once in loadCourseData, once inside
 * checkScheduleConflicts), and the time-overlap comparison that decides
 * whether two courses clash had no coverage at all.
 *
 * Note: a sibling `calculateEndTime` exists in
 * components/tools/printableSchedule.ts for the printable calendar. It takes
 * (start, periods, duration) and guards against unparseable input, whereas
 * this one takes an already-multiplied duration. They are deliberately left
 * separate rather than coupling features/courses to components/tools for a
 * few lines of time math.
 */

export type Rule = { category: string; weight: string | number; description?: string };
export type DaySchedule = { periods: number; start_time: string; duration: number };
export type TeachingScheduleItem = { day: string; periods: number; start_time: string; duration: number };

export type ScheduleOverlap = {
  day: string;
  time: string;
  conflictTime: string;
};

/** Applied when a day is switched on, and as the per-field fallback when normalizing. */
export const DEFAULT_DAY_SCHEDULE: DaySchedule = {
  periods: 1,
  start_time: '17:00',
  duration: 45,
};

/**
 * The backend stores teaching_schedule as a list of day objects, but older
 * records (and the editor's own state) use a day-keyed record. Accepts either
 * and always returns the keyed form.
 */
export const normalizeTeachingSchedule = (schedule: unknown): Record<string, DaySchedule> => {
  if (!schedule) return {};

  if (Array.isArray(schedule)) {
    const record: Record<string, DaySchedule> = {};
    (schedule as TeachingScheduleItem[]).forEach((item) => {
      if (item?.day) {
        record[item.day] = {
          periods: item.periods || DEFAULT_DAY_SCHEDULE.periods,
          start_time: item.start_time || DEFAULT_DAY_SCHEDULE.start_time,
          duration: item.duration || DEFAULT_DAY_SCHEDULE.duration,
        };
      }
    });
    return record;
  }

  return schedule as Record<string, DaySchedule>;
};

/** Inverse of normalizeTeachingSchedule — the shape the update endpoint expects. */
export const scheduleToList = (weeklySchedule: Record<string, DaySchedule>): TeachingScheduleItem[] =>
  Object.entries(weeklySchedule || {}).map(([day, cfg]) => ({
    day,
    periods: Number(cfg.periods) || 0,
    start_time: cfg.start_time || '08:00',
    duration: Number(cfg.duration) || 0,
  }));

/** Total weekly contact hours, to one decimal place (returned as a string, as the UI renders it). */
export const calculateTotalHours = (weeklySchedule: Record<string, DaySchedule>): string => {
  let total = 0;
  Object.values(weeklySchedule || {}).forEach((day) => {
    if (day.periods && day.duration) {
      total += (day.periods || 0) * ((day.duration || 0) / 60);
    }
  });
  return total.toFixed(1);
};

export const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

export const calculateEndTime = (startTime: string, durationMinutes: number): string => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
};

/**
 * Days where the two schedules run at overlapping times. Each side's occupied
 * span is start .. start + (duration x periods); two spans overlap when each
 * starts before the other ends.
 */
export const findScheduleOverlaps = (
  currentSchedule: Record<string, DaySchedule>,
  otherSchedule: Record<string, DaySchedule>
): ScheduleOverlap[] => {
  const overlaps: ScheduleOverlap[] = [];

  for (const [day, schedule] of Object.entries(currentSchedule || {})) {
    const other = (otherSchedule || {})[day];
    if (!other) continue;

    const currentStartMin = timeToMinutes(schedule.start_time);
    const currentEndMin = currentStartMin + schedule.duration * schedule.periods;
    const otherStartMin = timeToMinutes(other.start_time);
    const otherEndMin = otherStartMin + other.duration * other.periods;

    if (currentStartMin < otherEndMin && otherStartMin < currentEndMin) {
      overlaps.push({
        day,
        time: schedule.start_time,
        conflictTime: other.start_time,
      });
    }
  }

  return overlaps;
};

export const getTotalWeight = (rules: Rule[]): number =>
  (rules || []).reduce((sum, rule) => sum + (parseFloat(String(rule.weight)) || 0), 0);

/** Evaluation rules are valid when every row is filled in and the weights total 100%. */
export const isTotalWeightValid = (rules: Rule[]): boolean =>
  Math.abs(getTotalWeight(rules) - 100) < 0.01;
