/**
 * Calendar Utilities
 * Generate ICS (iCalendar) files for teaching schedules
 */

export interface ScheduleEvent {
  day: string;
  startTime: string;
  endTime: string;
  location?: string;
}

export interface CourseSchedule {
  course_code: string;
  course_name: string;
  semester: string;
  teaching_schedule?: ScheduleEvent[];
}

/**
 * Convert day name to RRULE day code
 */
function getDayCode(day: string): string {
  const dayMap: Record<string, string> = {
    'monday': 'MO',
    'tuesday': 'TU',
    'wednesday': 'WE',
    'thursday': 'TH',
    'friday': 'FR',
    'saturday': 'SA',
    'sunday': 'SU',
    'δευτέρα': 'MO',
    'τρίτη': 'TU',
    'τετάρτη': 'WE',
    'πέμπτη': 'TH',
    'παρασκευή': 'FR',
    'σάββατο': 'SA',
    'κυριακή': 'SU',
  };
  return dayMap[day.toLowerCase()] || 'MO';
}

/**
 * Get next occurrence of a specific day from a start date
 */
function getNextDayOccurrence(startDate: Date, targetDay: string): Date {
  const dayCode = getDayCode(targetDay);
  const dayIndex = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].indexOf(dayCode);

  const result = new Date(startDate);
  const currentDay = result.getDay();
  const daysUntilTarget = (dayIndex - currentDay + 7) % 7;

  if (daysUntilTarget === 0 && result.getTime() === startDate.getTime()) {
    // If it's the same day and we haven't moved forward yet, use today
    return result;
  }

  result.setDate(result.getDate() + daysUntilTarget);
  return result;
}

/**
 * Format time string to HHMMSS format
 */
function formatTimeForICS(time: string): string {
  // Handle formats like "09:00", "9:00 AM", etc.
  const cleaned = time.replace(/[^0-9:]/g, '');
  const [hours, minutes] = cleaned.split(':').map(s => s.padStart(2, '0'));
  return `${hours}${minutes}00`;
}

/**
 * Format date to ICS format (YYYYMMDD)
 */
function formatDateForICS(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Format datetime to ICS format (YYYYMMDDTHHmmssZ)
 */
function formatDateTimeForICS(date: Date, time: string): string {
  return `${formatDateForICS(date)}T${formatTimeForICS(time)}`;
}

/**
 * Generate a unique ID for calendar events
 */
function generateUID(): string {
  // Generates a cryptographically secure unique identifier for ICS events
  // Uses window.crypto.getRandomValues for secure randomness
  const array = new Uint32Array(4);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array);
    return (
      Array.from(array, val => val.toString(36)).join('') +
      Date.now().toString(36)
    );
  } else {
    // Fallback: use Date.now and Math.random (should not happen in modern browsers)
    return (
      Math.random().toString(36).substr(2, 9) +
      Date.now().toString(36)
    );
  }
}

/**
 * Escape special characters for ICS format
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generate ICS file content for a course teaching schedule
 */
export function generateCourseScheduleICS(
  course: CourseSchedule,
  semesterStartDate?: Date,
  semesterEndDate?: Date
): string {
  const schedule = course.teaching_schedule || [];

  if (schedule.length === 0) {
    throw new Error('No teaching schedule available for this course');
  }

  // Default semester dates if not provided
  const startDate = semesterStartDate || new Date();
  const endDate = semesterEndDate || new Date(startDate.getTime() + 120 * 24 * 60 * 60 * 1000); // ~4 months

  const events: string[] = [];

  schedule.forEach((event) => {
    const eventStartDate = getNextDayOccurrence(startDate, event.day);
    const uid = generateUID();
    const summary = escapeICSText(`${course.course_code} - ${course.course_name}`);
    const location = event.location ? escapeICSText(event.location) : '';
    const description = escapeICSText(
      `Course: ${course.course_name}\\nCode: ${course.course_code}\\nSemester: ${course.semester}`
    );

    // Create VEVENT with recurrence rule
    const rrule = `FREQ=WEEKLY;UNTIL=${formatDateForICS(endDate)}T235959Z;BYDAY=${getDayCode(event.day)}`;

    const vevent = [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${formatDateTimeForICS(new Date(), '00:00:00')}`,
      `DTSTART:${formatDateTimeForICS(eventStartDate, event.startTime)}`,
      `DTEND:${formatDateTimeForICS(eventStartDate, event.endTime)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      location ? `LOCATION:${location}` : null,
      `RRULE:${rrule}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'END:VEVENT',
    ].filter(Boolean).join('\r\n');

    events.push(vevent);
  });

  // Build complete ICS file
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Student Management System//Teaching Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICSText(`${course.course_code} - ${course.course_name}`)}`,
    'X-WR-TIMEZONE:Europe/Athens',
    'X-WR-CALDESC:Teaching schedule for course',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  return icsContent;
}

/**
 * Generate ICS file for all courses
 */
export function generateAllCoursesScheduleICS(
  courses: CourseSchedule[],
  semesterStartDate?: Date,
  semesterEndDate?: Date
): string {
  const coursesWithSchedule = courses.filter(c => c.teaching_schedule && c.teaching_schedule.length > 0);

  if (coursesWithSchedule.length === 0) {
    throw new Error('No teaching schedules available');
  }

  const startDate = semesterStartDate || new Date();
  const endDate = semesterEndDate || new Date(startDate.getTime() + 120 * 24 * 60 * 60 * 1000);

  const events: string[] = [];

  coursesWithSchedule.forEach((course) => {
    const schedule = course.teaching_schedule || [];

    schedule.forEach((event) => {
      const eventStartDate = getNextDayOccurrence(startDate, event.day);
      const uid = generateUID();
      const summary = escapeICSText(`${course.course_code} - ${course.course_name}`);
      const location = event.location ? escapeICSText(event.location) : '';
      const description = escapeICSText(
        `Course: ${course.course_name}\\nCode: ${course.course_code}\\nSemester: ${course.semester}`
      );

      const rrule = `FREQ=WEEKLY;UNTIL=${formatDateForICS(endDate)}T235959Z;BYDAY=${getDayCode(event.day)}`;

      const vevent = [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${formatDateTimeForICS(new Date(), '00:00:00')}`,
        `DTSTART:${formatDateTimeForICS(eventStartDate, event.startTime)}`,
        `DTEND:${formatDateTimeForICS(eventStartDate, event.endTime)}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        location ? `LOCATION:${location}` : null,
        `RRULE:${rrule}`,
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'END:VEVENT',
      ].filter(Boolean).join('\r\n');

      events.push(vevent);
    });
  });

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Student Management System//Teaching Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:All Courses Teaching Schedule',
    'X-WR-TIMEZONE:Europe/Athens',
    'X-WR-CALDESC:Complete teaching schedule for all courses',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  return icsContent;
}

/**
 * Download ICS file
 */
export function downloadICS(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  setTimeout(() => URL.revokeObjectURL(link.href), 100);
}
