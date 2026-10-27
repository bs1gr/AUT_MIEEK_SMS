import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// test data uses a schedule shape that does not map directly to the domain `Course` type

import {
  generateCourseScheduleICS,
  generateAllCoursesScheduleICS,
  downloadICS,
} from './calendarUtils';
import type { CourseSchedule } from './calendarUtils';

// jsdom has no URL.createObjectURL / revokeObjectURL; the downloadICS tests
// install these on the real URL constructor (Vitest 5 forwards global
// assignments to jsdom, so replacing `document` wholesale is no longer possible).
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

describe('calendarUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
  });

  describe('generateCourseScheduleICS', () => {
    const baseCourse = {
      course_code: 'CS101',
      course_name: 'Introduction to Programming',
      semester: 'Spring 2024',
      teaching_schedule: [
        {
          day: 'Monday',
          startTime: '09:00',
          endTime: '11:00',
          location: 'Room 101',
        },
        {
          day: 'Wednesday',
          startTime: '14:00',
          endTime: '16:00',
          location: 'Lab A',
        },
      ],
    };

    it('generates valid ICS file structure', () => {
      const result = generateCourseScheduleICS(baseCourse);

      expect(result).toContain('BEGIN:VCALENDAR');
      expect(result).toContain('VERSION:2.0');
      expect(result).toContain('END:VCALENDAR');
      expect(result).toContain('BEGIN:VEVENT');
      expect(result).toContain('END:VEVENT');
    });

    it('includes course information in summary', () => {
      const result = generateCourseScheduleICS(baseCourse);

      expect(result).toContain('CS101');
      expect(result).toContain('Introduction to Programming');
    });

    it('includes location information', () => {
      const result = generateCourseScheduleICS(baseCourse);

      expect(result).toContain('LOCATION:Room 101');
      expect(result).toContain('LOCATION:Lab A');
    });

    it('generates recurrence rules for weekly events', () => {
      const result = generateCourseScheduleICS(baseCourse);

      expect(result).toContain('RRULE:FREQ=WEEKLY');
      expect(result).toContain('BYDAY=MO');
      expect(result).toContain('BYDAY=WE');
    });

    it('formats time correctly in ICS format', () => {
      const result = generateCourseScheduleICS(baseCourse);

      expect(result).toContain('T090000');
      expect(result).toContain('T110000');
      expect(result).toContain('T140000');
      expect(result).toContain('T160000');
    });

    it('handles Greek day names', () => {
      const greekCourse = {
        ...baseCourse,
        teaching_schedule: [
          {
            day: 'Δευτέρα',
            startTime: '10:00',
            endTime: '12:00',
          },
          {
            day: 'Τετάρτη',
            startTime: '15:00',
            endTime: '17:00',
          },
        ],
      };

      const result = generateCourseScheduleICS(greekCourse);

      expect(result).toContain('BYDAY=MO');
      expect(result).toContain('BYDAY=WE');
    });

    it('handles schedule without location', () => {
      const courseWithoutLocation = {
        ...baseCourse,
        teaching_schedule: [
          {
            day: 'Tuesday',
            startTime: '10:00',
            endTime: '12:00',
          },
        ],
      };

      const result = generateCourseScheduleICS(courseWithoutLocation);

      expect(result).toContain('BEGIN:VEVENT');
      expect(result).not.toContain('LOCATION:');
    });

    it('throws error for course without teaching schedule', () => {
      const courseWithoutSchedule = {
        course_code: 'CS101',
        course_name: 'Test Course',
        semester: 'Spring 2024',
      };

      expect(() => generateCourseScheduleICS(courseWithoutSchedule)).toThrow(
        'No teaching schedule available'
      );
    });

    it('throws error for course with empty teaching schedule', () => {
      const courseWithEmptySchedule = {
        ...baseCourse,
        teaching_schedule: [],
      };

      expect(() => generateCourseScheduleICS(courseWithEmptySchedule)).toThrow(
        'No teaching schedule available'
      );
    });

    it('uses custom semester dates when provided', () => {
      const startDate = new Date(2024, 8, 1); // Sept 1, 2024
      const endDate = new Date(2024, 11, 20); // Dec 20, 2024

      const result = generateCourseScheduleICS(baseCourse, startDate, endDate);

      expect(result).toContain('20241220');
    });

    it('generates unique UIDs for each event', () => {
      const result = generateCourseScheduleICS(baseCourse);
      const uidMatches = result.match(/UID:[^\r\n]+/g);

      expect(uidMatches).toBeTruthy();
      expect(uidMatches!.length).toBeGreaterThan(0);

      // UIDs should be unique
      const uids = new Set(uidMatches);
      expect(uids.size).toBe(uidMatches!.length);
    });

    it('escapes special characters in text fields', () => {
      const courseWithSpecialChars = {
        course_code: 'CS101',
        course_name: 'Programming; Data Structures, Algorithms',
        semester: 'Spring 2024',
        teaching_schedule: [
          {
            day: 'Monday',
            startTime: '09:00',
            endTime: '11:00',
            location: 'Room 101; Building A',
          },
        ],
      };

      const result = generateCourseScheduleICS(courseWithSpecialChars);

      expect(result).toContain('\\;');
      expect(result).toContain('\\,');
    });

    it('handles all days of the week', () => {
      const fullWeekCourse = {
        ...baseCourse,
        teaching_schedule: [
          { day: 'Monday', startTime: '09:00', endTime: '10:00' },
          { day: 'Tuesday', startTime: '09:00', endTime: '10:00' },
          { day: 'Wednesday', startTime: '09:00', endTime: '10:00' },
          { day: 'Thursday', startTime: '09:00', endTime: '10:00' },
          { day: 'Friday', startTime: '09:00', endTime: '10:00' },
          { day: 'Saturday', startTime: '09:00', endTime: '10:00' },
          { day: 'Sunday', startTime: '09:00', endTime: '10:00' },
        ],
      };

      const result = generateCourseScheduleICS(fullWeekCourse);

      expect(result).toContain('BYDAY=MO');
      expect(result).toContain('BYDAY=TU');
      expect(result).toContain('BYDAY=WE');
      expect(result).toContain('BYDAY=TH');
      expect(result).toContain('BYDAY=FR');
      expect(result).toContain('BYDAY=SA');
      expect(result).toContain('BYDAY=SU');
    });
  });

  describe('generateAllCoursesScheduleICS', () => {
    const courses = [
      {
        course_code: 'CS101',
        course_name: 'Programming',
        semester: 'Spring 2024',
        teaching_schedule: [
          {
            day: 'Monday',
            startTime: '09:00',
            endTime: '11:00',
          },
        ],
      },
      {
        course_code: 'MATH201',
        course_name: 'Calculus',
        semester: 'Spring 2024',
        teaching_schedule: [
          {
            day: 'Tuesday',
            startTime: '10:00',
            endTime: '12:00',
          },
        ],
      },
      {
        course_code: 'PHY301',
        course_name: 'Physics',
        semester: 'Spring 2024',
        // No teaching schedule
      },
    ];

    it('generates ICS for multiple courses', () => {
      const result = generateAllCoursesScheduleICS(courses);

      expect(result).toContain('BEGIN:VCALENDAR');
      expect(result).toContain('CS101');
      expect(result).toContain('MATH201');
      expect(result).not.toContain('PHY301'); // No schedule
    });

    it('includes all courses with schedules', () => {
      const result = generateAllCoursesScheduleICS(courses);
      const eventCount = (result.match(/BEGIN:VEVENT/g) || []).length;

      expect(eventCount).toBe(2); // Only CS101 and MATH201
    });

    it('throws error when no courses have schedules', () => {
      const coursesWithoutSchedules = [
        {
          course_code: 'CS101',
          course_name: 'Programming',
          semester: 'Spring 2024',
        },
      ];

      expect(() => generateAllCoursesScheduleICS(coursesWithoutSchedules)).toThrow(
        'No teaching schedules available'
      );
    });

    it('handles empty courses array', () => {
      expect(() => generateAllCoursesScheduleICS([])).toThrow(
        'No teaching schedules available'
      );
    });

    it('uses custom semester dates for all courses', () => {
      const startDate = new Date(2024, 8, 1);
      const endDate = new Date(2024, 11, 20);

      const result = generateAllCoursesScheduleICS(courses as CourseSchedule[], startDate, endDate);

      expect(result).toContain('20241220');
    });

    it('sets calendar name for all courses', () => {
      const result = generateAllCoursesScheduleICS(courses as CourseSchedule[]);

      expect(result).toContain('X-WR-CALNAME:All Courses Teaching Schedule');
    });
  });

  describe('downloadICS', () => {
    const urlCtor = URL as unknown as Record<string, unknown>;
    let createElementSpy: ReturnType<typeof vi.spyOn>;
    let appendChildSpy: ReturnType<typeof vi.spyOn>;
    let removeChildSpy: ReturnType<typeof vi.spyOn>;
    let clickSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      urlCtor.createObjectURL = mockCreateObjectURL;
      urlCtor.revokeObjectURL = mockRevokeObjectURL;
      createElementSpy = vi.spyOn(document, 'createElement');
      appendChildSpy = vi.spyOn(document.body, 'appendChild');
      removeChildSpy = vi.spyOn(document.body, 'removeChild');
      // jsdom logs "Not implemented: navigation" for a download click; keep it inert.
      clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
      delete urlCtor.createObjectURL;
      delete urlCtor.revokeObjectURL;
    });

    const createdLink = () => createElementSpy.mock.results[0].value as HTMLAnchorElement;

    it('creates blob with correct content type', () => {
      downloadICS('ICS content', 'test.ics');

      expect(createElementSpy).toHaveBeenCalledWith('a');
      const blob = mockCreateObjectURL.mock.calls[0][0] as Blob;
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/calendar;charset=utf-8');
    });

    it('sets correct filename with .ics extension', () => {
      downloadICS('ICS content', 'schedule');

      expect(createdLink().download).toBe('schedule.ics');
    });

    it('preserves .ics extension if already provided', () => {
      downloadICS('ICS content', 'schedule.ics');

      expect(createdLink().download).toBe('schedule.ics');
    });

    it('triggers click and cleanup', () => {
      downloadICS('ICS content', 'test.ics');

      const link = createdLink();
      expect(link.href).toBe('blob:mock-url');
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(appendChildSpy).toHaveBeenCalledWith(link);
      expect(removeChildSpy).toHaveBeenCalledWith(link);
      expect(document.body.contains(link)).toBe(false);
    });

    it('revokes the object URL after the click', () => {
      downloadICS('ICS content', 'test.ics');

      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });

  describe('edge cases', () => {
    it('handles time formats with AM/PM', () => {
      const course = {
        course_code: 'CS101',
        course_name: 'Programming',
        semester: 'Spring 2024',
        teaching_schedule: [
          {
            day: 'Monday',
            startTime: '9:00 AM',
            endTime: '11:00 AM',
          },
        ],
      };

      const result = generateCourseScheduleICS(course);
      expect(result).toContain('T090000');
    });

    it('handles newlines in course descriptions', () => {
      const course = {
        course_code: 'CS101',
        course_name: 'Programming\nBasics',
        semester: 'Spring 2024',
        teaching_schedule: [
          {
            day: 'Monday',
            startTime: '09:00',
            endTime: '11:00',
          },
        ],
      };

      const result = generateCourseScheduleICS(course);
      expect(result).toContain('\\n');
    });

    it('handles very long course names', () => {
      const course = {
        course_code: 'CS101',
        course_name: 'A'.repeat(200),
        semester: 'Spring 2024',
        teaching_schedule: [
          {
            day: 'Monday',
            startTime: '09:00',
            endTime: '11:00',
          },
        ],
      };

      const result = generateCourseScheduleICS(course);
      expect(result).toContain('A'.repeat(200));
    });
  });
});
