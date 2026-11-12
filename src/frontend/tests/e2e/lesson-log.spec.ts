import { test, expect, type Page } from '@playwright/test';
import {
  loginAsTrackedTeacher,
  enrollStudentViaAPI,
  generateStudentData,
  generateCourseData,
  getApiBase,
  TestDataTracker,
} from './helpers';

/**
 * Lesson log: the material covered and the teacher's notes for a teaching period.
 *
 * Drives the real page against the real backend: nothing is clicked to save, the text must reach
 * the database by itself, survive a reload, and be editable afterwards from the course history.
 */

let tracker: TestDataTracker;

type StoredLog = { id: number; period_number: number; material_covered: string | null; teacher_notes: string | null };

async function storedLogs(page: Page, courseId: number): Promise<StoredLog[]> {
  const response = await page.request.get(`${getApiBase()}/api/v1/lesson-logs/`, { params: { course_id: courseId } });
  expect(response.ok(), `GET /lesson-logs/ -> ${response.status()}`).toBeTruthy();
  return (await response.json()).items as StoredLog[];
}

// The page starts without a course or a date; pick the course, then the first selectable day.
async function openCourseDay(page: Page, courseId: number) {
  await page.goto('/#/attendance');
  await page.reload(); // discards the app's cached course list, which would miss the new course
  await page.waitForLoadState('networkidle').catch(() => {});

  const courseSelect = page.getByTestId('attendance-course-select');
  await expect(courseSelect).toBeVisible({ timeout: 15000 });
  await expect(courseSelect.locator(`option[value="${courseId}"]`)).toHaveCount(1, { timeout: 15000 });
  await courseSelect.selectOption(`${courseId}`);
  await page.locator('div.grid-cols-7 > button:not([disabled])').first().click();
  await expect(page.getByTestId('lesson-log-card')).toBeVisible({ timeout: 15000 });
}

test.describe('Lesson log', () => {
  test.beforeEach(async ({ page }) => {
    tracker = new TestDataTracker(page);
    await loginAsTrackedTeacher(page, tracker);
  });

  test.afterEach(async () => {
    await tracker.cleanup();
  });

  test('saves by itself, survives a reload, and can be corrected from the history', async ({ page }) => {
    const apiBase = getApiBase();
    const student = generateStudentData();
    const course = generateCourseData();

    const studentResp = await page.request.post(`${apiBase}/api/v1/students/`, {
      data: {
        first_name: student.firstName,
        last_name: student.lastName,
        email: student.email,
        student_id: student.studentId,
      },
    });
    const createdStudent = await studentResp.json();
    tracker.track('students', createdStudent.id);

    const courseResp = await page.request.post(`${apiBase}/api/v1/courses/`, {
      data: {
        course_code: course.courseCode,
        course_name: course.courseName,
        credits: course.credits,
        semester: course.semester,
        is_active: course.isActive,
      },
    });
    const createdCourse = await courseResp.json();
    tracker.track('courses', createdCourse.id);

    // An enrolled student is what makes the course selectable on the Attendance page.
    await enrollStudentViaAPI(page, createdCourse.id, createdStudent.id);
    tracker.trackEnrollment(createdCourse.id, createdStudent.id);

    await openCourseDay(page, createdCourse.id);

    // Nothing is saved before anything is typed.
    const material = page.getByTestId('lesson-log-material');
    const notes = page.getByTestId('lesson-log-notes');
    await expect(material).toBeEnabled({ timeout: 15000 }); // enabled once the stored text has loaded
    expect(await storedLogs(page, createdCourse.id)).toHaveLength(0);

    // Type into both boxes and do not click anything: the autosave has to do it.
    await material.fill('Κεφάλαιο 1: Διανύσματα\n• ορισμοί\n• πράξεις');
    await notes.fill('Ran out of time, repeat the examples');
    await expect(page.getByTestId('lesson-log-status')).toContainText(/Saved|Αποθηκεύτηκε/, { timeout: 15000 });

    const [saved] = await storedLogs(page, createdCourse.id);
    expect(saved).toMatchObject({
      period_number: 1,
      material_covered: 'Κεφάλαιο 1: Διανύσματα\n• ορισμοί\n• πράξεις',
      teacher_notes: 'Ran out of time, repeat the examples',
    });

    // A fresh page load shows the same text for the same course and day.
    await openCourseDay(page, createdCourse.id);
    await expect(page.getByTestId('lesson-log-material')).toHaveValue('Κεφάλαιο 1: Διανύσματα\n• ορισμοί\n• πράξεις');
    await expect(page.getByTestId('lesson-log-notes')).toHaveValue('Ran out of time, repeat the examples');

    // The course history lists the entry and edits it in place.
    await page.getByTestId('lesson-log-history-toggle').click();
    await expect(page.getByTestId(`lesson-log-row-${saved.id}`)).toContainText('Κεφάλαιο 1: Διανύσματα');
    await page.getByTestId(`lesson-log-row-${saved.id}-toggle`).click();
    const rowMaterial = page.getByTestId(`lesson-log-row-${saved.id}-material`);
    await expect(rowMaterial).toBeEnabled({ timeout: 15000 });
    await rowMaterial.fill('Corrected from the history');
    await rowMaterial.blur();

    await expect
      .poll(async () => (await storedLogs(page, createdCourse.id))[0]?.material_covered, { timeout: 15000 })
      .toBe('Corrected from the history');
    // Only the edited box changed; the teacher's notes were not touched.
    expect((await storedLogs(page, createdCourse.id))[0].teacher_notes).toBe('Ran out of time, repeat the examples');
  });
});
