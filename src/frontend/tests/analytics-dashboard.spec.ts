import { test, expect, type Page } from '@playwright/test';
import {
  TestDataTracker,
  createCourseViaAPI,
  createGradeViaAPI,
  createStudentViaAPI,
  enrollStudentViaAPI,
  generateCourseData,
  generateStudentData,
  loginViaAPI,
} from './e2e/helpers';

/**
 * Analytics page (rebuilt 2026-10-07 on GET /analytics/overview and
 * /analytics/student/{id}/overview).
 *
 * The previous version of this spec was almost entirely vacuous (assertions such as
 * `expect(x === true || x === false)` or "the body is visible"); the one real check, the
 * card titles, failed once the page was rebuilt. Every test here creates its own data and
 * asserts a value the page has to compute.
 */

let tracker: TestDataTracker;

const openAnalytics = async (page: Page) => {
  await page.goto('/#/analytics');
  await page.waitForLoadState('load');
  await expect(page.getByRole('heading', { name: 'Analytics Dashboard' })).toBeVisible({ timeout: 15_000 });
};

/** A course with the helper's default rules (Homework 30, Midterm 30, Final 40). */
const makeCourse = async (page: Page) => {
  const data = generateCourseData();
  const course = await createCourseViaAPI(page, data);
  tracker.track('courses', course.id);
  return { ...course, name: data.courseName as string };
};

const makeStudent = async (page: Page, ...courseIds: number[]) => {
  const data = generateStudentData();
  const student = await createStudentViaAPI(page, data);
  tracker.track('students', student.id);
  for (const courseId of courseIds) {
    await enrollStudentViaAPI(page, courseId, student.id);
    tracker.trackEnrollment(courseId, student.id);
  }
  return { ...student, name: `${data.firstName} ${data.lastName}` };
};

const grade = async (page: Page, studentId: number, courseId: number, value: number, category: string) => {
  const created = await createGradeViaAPI(page, studentId, courseId, value, 100, category, `E2E ${category}`);
  tracker.track('grades', created.id);
};

const optionTexts = (page: Page, testId: string) =>
  page.getByTestId(testId).locator('option').allTextContents();

test.describe('Analytics page', () => {
  test.beforeEach(async ({ page }) => {
    tracker = new TestDataTracker(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await loginViaAPI(page, 'test@example.com', 'Test@Pass123'); // pragma: allowlist secret
  });

  test.afterEach(async () => {
    await tracker.cleanup();
  });

  test('loads with four summary cards and no errors', async ({ page }) => {
    const failures: string[] = [];
    page.on('pageerror', (error) => failures.push(error.message));
    page.on('response', (response) => {
      if (response.url().includes('/api/') && response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
    });

    await openAnalytics(page);
    await expect(page.getByTestId('summary-card')).toHaveCount(4);
    await expect(page.getByTestId('summary-card').first()).toContainText('Enrolled Courses');
    await expect(page.locator('[role="alert"]')).toHaveCount(0);
    expect(failures).toEqual([]);
  });

  test("offers only the selected student's courses, with a dash while nothing is graded", async ({ page }) => {
    const enrolled = await makeCourse(page);
    const other = await makeCourse(page);
    const student = await makeStudent(page, enrolled.id);

    await openAnalytics(page);
    await page.getByTestId('analytics-student-select').selectOption({ label: student.name });

    await expect.poll(() => optionTexts(page, 'analytics-course-select')).toEqual(['All courses', enrolled.name]);
    expect(await optionTexts(page, 'analytics-course-select')).not.toContain(other.name);

    const row = page.getByTestId('analytics-student-courses').locator('tr', { hasText: enrolled.name });
    await expect(row).toContainText('—');
    await expect(row).not.toContainText('0.0%');
  });

  test("computes the final grade from the course's evaluation rules", async ({ page }) => {
    const course = await makeCourse(page);
    const student = await makeStudent(page, course.id);
    // Homework 70 (30%) and Final 80 (40%); Midterm not graded yet, so the 70% done is scaled:
    // (70*30 + 80*40) / 70 = 75.71...
    await grade(page, student.id, course.id, 70, 'Homework');
    await grade(page, student.id, course.id, 80, 'Final');

    await openAnalytics(page);
    await page.getByTestId('analytics-student-select').selectOption({ label: student.name });
    await expect.poll(() => optionTexts(page, 'analytics-course-select')).toContain(course.name);
    await page.getByTestId('analytics-course-select').selectOption({ label: course.name });

    const finalCard = page.getByTestId('summary-card').first();
    await expect(finalCard).toContainText('Final Grade');
    await expect(finalCard).toContainText('75.7%');
    await expect(page.getByTestId('analytics-grade-list').locator('tbody tr')).toHaveCount(2);
  });

  test('class view lists a failing student under Needs Attention, with the course', async ({ page }) => {
    const course = await makeCourse(page);
    const failing = await makeStudent(page, course.id);
    await grade(page, failing.id, course.id, 20, 'Final');

    await openAnalytics(page);
    await page.getByRole('button', { name: 'Class Analytics' }).click();

    const atRisk = page.getByTestId('analytics-at-risk');
    const row = atRisk.locator('tr', { hasText: failing.name });
    await expect(row).toBeVisible();
    await expect(row).toContainText(course.name);
    await expect(row).toContainText('20.0%');
  });

  test('is translated in Greek', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'el'));
    await page.goto('/#/analytics');
    // A hash change does not reload the page, so the init script needs a real navigation.
    await page.reload();
    await expect(page.getByRole('button', { name: 'Αναλυτικά Τάξης' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('summary-card').first()).toContainText('Εγγεγραμμένα Μαθήματα');
    expect(await page.locator('body').innerText()).not.toMatch(/analytics\.[a-z]/);
  });
});
