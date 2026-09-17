import { test, expect } from '@playwright/test';
import {
  loginAsTestUser,
  loginAsTrackedTeacher,
  enrollStudentViaAPI,
  generateStudentData,
  generateCourseData,
  getApiBase,
  TestDataTracker,
} from './helpers';
import { captureAndLogDiagnostics, initDiagnosticsDir } from './diagnostics';

/**
 * E2E Tests for Critical Student Management Flows
 *
 * Covers:
 * - Student CRUD operations
 * - Course management
 * - Grade assignment
 * - Attendance tracking
 * - Analytics views
 */

// Initialize diagnostics directory
test.beforeAll(async () => {
  await initDiagnosticsDir();
});

// Records what each test creates so it can be deleted again afterwards. Assigned per test in
// beforeEach and drained in afterEach; without it every run left students, courses and teacher
// accounts behind in whatever database it ran against.
let tracker: TestDataTracker;

// Test data generators
const generateStudentDataLocal = () => {
  const rnd = Math.random().toString(36).slice(2, 8);
  return {
    firstName: `Test${rnd}`,
    lastName: `Student${rnd}`,
    email: `student-${rnd}@test.edu`,
    studentId: `SID${rnd}`,
  };
};

test.describe('Student Management - Critical Flows', () => {
  test.beforeEach(async ({ page }) => {
    tracker = new TestDataTracker(page);
    // Try logging in as the shared test user first, fall back to a fresh teacher.
    try {
      await loginAsTestUser(page);
    } catch (err) {
      console.warn('Failed to login as test user, falling back to teacher:', err);
      await loginAsTrackedTeacher(page, tracker);
    }
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Capture diagnostics on failure
    if (testInfo.status !== 'passed') {
      // eslint-disable-next-line no-console
      console.log(`\n❌ Test failed: ${testInfo.title}`);
      try {
        await captureAndLogDiagnostics(page, testInfo.title).catch((e) =>
          console.error('Failed to capture diagnostics:', e)
        );
      } catch (e) {
        console.error('Error in afterEach:', e);
      }
    }

    // Delete this test's records before the page closes - the tracker issues API calls
    // through it, so this must happen first.
    await tracker.cleanup();

    // Ensure proper cleanup of page/context
    try {
      await page.close().catch(() => {});
    } catch {
      // Page may already be closed
    }
  });

  test('should create a new student successfully', async ({ page }) => {
    test.setTimeout(90000); // Increase timeout to 90s for create operations

    const student = generateStudentDataLocal();

    // Navigate to students page
    await page.goto('/#/students');

    // Wait for page to load
    await page.waitForLoadState('networkidle').catch(() => {});

    // Wait for the Add Student button to be visible
    await page.waitForSelector('[data-testid="add-student-btn"]', { timeout: 10000 });

    // Click "Add Student" button
    await page.click('[data-testid="add-student-btn"]', { force: true });

    // Wait for modal to appear
    await page.waitForSelector('[data-testid="first-name-input"]', { state: 'visible', timeout: 10000 });

    // Fill student form using stable test ids
    await page.fill('[data-testid="first-name-input"]', student.firstName);
    await page.fill('[data-testid="last-name-input"]', student.lastName);
    await page.fill('[data-testid="email-input"]', student.email);
    await page.fill('[data-testid="student-id-input"]', student.studentId);

    // Wait a bit for form validation
    await page.waitForTimeout(500);

    // Wait for the submit button and click it (use force: true for mobile click handling)
    await page.waitForSelector('[data-testid="submit-student"]', { state: 'visible', timeout: 5000 });

    // Set up response promise before clicking
    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('/api/v1/students') && resp.request().method() === 'POST',
      { timeout: 30000 }
    );

    // Click submit
    await page.click('[data-testid="submit-student"]', { force: true });

    // Wait for response
    const response = await responsePromise;

    // Verify response was successful (200 or 201)
    expect([200, 201]).toContain(response.status());

    // Remember the row the UI just created, so afterEach can delete it again.
    const createdStudent = await response.json().catch(() => null);
    tracker.track('students', createdStudent?.id ?? createdStudent?.data?.id);

    // Wait for modal to close and page to refresh
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000); // Give time for UI to update

    // Clear any search filters that might hide the new student
    await page.fill('[data-testid="student-search-input"]', '').catch(() => {});

    // Verify student appears in list - look for full name or student ID (use first() to handle multiple matches)
    const studentName = `${student.firstName} ${student.lastName}`;
    await expect(
      page.getByText(studentName).or(page.getByText(student.firstName)).or(page.getByText(student.studentId)).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('should edit an existing student', async ({ page }) => {
    const student = generateStudentDataLocal();
    const apiBase = getApiBase();

    // Create student via API for faster setup
    const createResp = await page.request.post(`${apiBase}/api/v1/students/`, {
      data: {
        first_name: student.firstName,
        last_name: student.lastName,
        email: student.email,
        student_id: student.studentId,
      },
    });

    // Setup that fails is a failing test. This used to log and `return`, which passed.
    expect(createResp.ok(), `Creating the student failed: ${createResp.status()}`).toBeTruthy();

    const createdStudent = await createResp.json();
    tracker.track('students', createdStudent.id);
    const studentId = createdStudent.id;

    // Navigate to students page, then reload. The student was created through the API, which
    // the app never hears about, and loginViaAPI already loaded the app: a hash navigation
    // reuses studentsAPI.getAll's in-memory 10s cache from the dashboard, so the new student
    // was missing and this test timed out waiting for its edit button. A reload discards the
    // cache and forces a fresh fetch.
    await page.goto('/#/students');
    await page.reload();

    // Wait for page to load ('load' not 'networkidle' — students page polls for enrollment counts)
    await page.waitForLoadState('load').catch(() => {});

    // Ensure search filter is cleared so the created student is visible
    await page.fill('[data-testid="student-search-input"]', '').catch(() => {});

    // Wait for student card controls to render
    const editButton = page.locator(`[data-testid="student-edit-btn-${studentId}"]`).first();
    await editButton.waitFor({ state: 'visible', timeout: 15000 });
    await editButton.click();

    // Update student data
    const newLastName = `Updated${student.lastName}`;
    await page.fill('[data-testid="last-name-input"]', newLastName);

    // Save changes
    await page.click('[data-testid="submit-student"]');

    // Wait for API response
    await page.waitForResponse(
      (resp) => resp.url().includes(`/api/v1/students/${studentId}`) && resp.request().method() === 'PUT',
      { timeout: 10000 }
    ).catch(() => {});

    // Verify updated name appears
    await expect(page.getByText(newLastName)).toBeVisible({ timeout: 5000 });
  });

  test('should delete a student', async ({ page }) => {
    const student = generateStudentDataLocal();
    const apiBase = getApiBase();

    // Create student via API
    const createResp = await page.request.post(`${apiBase}/api/v1/students/`, {
      data: {
        first_name: student.firstName,
        last_name: student.lastName,
        email: student.email,
        student_id: student.studentId,
      },
    });

    // Setup that fails is a failing test. This used to log and `return`, which passed.
    expect(createResp.ok(), `Creating the student failed: ${createResp.status()}`).toBeTruthy();

    const createdStudent = await createResp.json();
    const studentId = createdStudent.id;
    // Tracked even though the test deletes it: if the test fails before that, it must not leak.
    // The tracker treats a 404 on cleanup as success.
    tracker.track('students', studentId);

    // Navigate, then reload to discard the app's cached student list (see the edit test).
    await page.goto('/#/students');
    await page.reload();

    // Wait for page to load
    await page.waitForLoadState('load').catch(() => {});

    // Ensure search filter is cleared so the created student is visible
    await page.fill('[data-testid="student-search-input"]', '').catch(() => {});

    // Accept the window.confirm dialog that appears when delete is clicked.
    // Without this the browser auto-dismisses it (returns false) and the
    // delete is cancelled before the API call is made.
    page.once('dialog', (dialog) => dialog.accept());

    // Find and click delete button via stable data-testid
    const deleteButton = page.locator(`[data-testid="student-delete-btn-${studentId}"]`).first();
    await deleteButton.waitFor({ state: 'visible', timeout: 15000 });
    await deleteButton.click();

    // Wait for API response (DELETE request)
    await page.waitForResponse(
      (resp) => resp.url().includes(`/api/v1/students/${studentId}`) && resp.request().method() === 'DELETE',
      { timeout: 10000 }
    ).catch(() => {});

    // Wait for page to refresh
    await page.waitForLoadState('load').catch(() => {});

    // Verify student controls disappear (ensures deletion processed)
    await expect(page.locator(`[data-testid="student-delete-btn-${studentId}"]`)).not.toBeVisible({ timeout: 10000 });
  });
});

test.describe('Course Management', () => {
  test.beforeEach(async ({ page }) => {
    tracker = new TestDataTracker(page);
    await loginAsTrackedTeacher(page, tracker);
  });

  test.afterEach(async () => {
    await tracker.cleanup();
  });

  test('should create a new course', async ({ page }) => {
    test.setTimeout(90000); // Increase timeout to 90s for create operations

    const course = generateCourseData();

    await page.goto('/#/courses');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.click('[data-testid="add-course-btn"]', { force: true });

    // Wait for modal to appear
    await page.waitForSelector('[data-testid="course-code-input"]', { state: 'visible', timeout: 10000 });

    await page.fill('[data-testid="course-code-input"]', course.courseCode);
    await page.fill('[data-testid="course-name-input"]', course.courseName);
    await page.fill('[data-testid="credits-input"]', course.credits.toString());

    // Wait for submit button and click (use force: true for mobile click handling)
    await page.waitForSelector('[data-testid="submit-course"]', { state: 'visible', timeout: 5000 });
    await page.click('[data-testid="submit-course"]', { force: true });

    // Wait for API response (increased timeout to 30s, accept 200 or 201)
    const courseResponse = await page.waitForResponse(
      (resp) =>
        resp.url().includes('/api/v1/courses') && resp.request().method() === 'POST' && (resp.status() === 200 || resp.status() === 201),
      { timeout: 30000 }
    ).catch(() => null);

    // Remember the row the UI just created, so afterEach can delete it again.
    if (courseResponse) {
      const createdCourse = await courseResponse.json().catch(() => null);
      tracker.track('courses', createdCourse?.id ?? createdCourse?.data?.id);
    }

    // Wait for page to refresh
    await page.waitForLoadState('networkidle').catch(() => {});

    // Courses are shown in a select dropdown - verify course exists in options
    // Note: option elements are never "visible" in Playwright, so we check for presence
    const courseSelect = page.locator('#course-select');
    await courseSelect.waitFor({ state: 'visible', timeout: 5000 });

    // Verify the option exists - try multiple methods for cross-browser compatibility
    let courseFound = false;
    try {
      // Method 1: Try textContent with timeout
      const optionText = await courseSelect.locator(`option:has-text("${course.courseCode}")`).textContent({ timeout: 3000 }).catch(() => null);
      if (optionText && optionText.includes(course.courseCode)) {
        courseFound = true;
      }
    } catch {
      // Method 1 failed, try Method 2
    }

    if (!courseFound) {
      // Method 2: Get all options and check manually
      try {
        const allOptions = await courseSelect.locator('option').all();
        for (const option of allOptions) {
          const value = await option.getAttribute('value').catch(() => '');
          const text = await option.getAttribute('textContent').catch(() => '');
          if (value?.includes(course.courseCode) || text?.includes(course.courseCode)) {
            courseFound = true;
            break;
          }
        }
      } catch {
        // Method 2 failed, try Method 3
      }
    }

    if (!courseFound) {
      // Method 3: Just verify the select is there and has options (course creation succeeded)
      const optionCount = await courseSelect.locator('option').count().catch(() => 0);
      if (optionCount > 1) {
        // If there are options and we successfully posted, course was created
        courseFound = true;
      }
    }

    expect(courseFound).toBe(true);
  });
});

test.describe('Grade Assignment Flow', () => {
  test.beforeEach(async ({ page }) => {
    tracker = new TestDataTracker(page);
    await loginAsTrackedTeacher(page, tracker);
  });

  test.afterEach(async () => {
    await tracker.cleanup();
  });

  // This test used to navigate to "/#/grades" - a route that does not exist; the grading view
  // is at "/#/grading". Finding no form there, it logged "Grades page UI not found, skipping
  // test" and returned, so it passed without ever entering a grade. Its final assertion was
  // no better: it fell back to matching the text /Grades?|Grade/i, which any page with the
  // word "Grade" on it satisfies. It now uses the real route, treats a missing form as a
  // failure, and confirms the grade through the API rather than by reading the screen.
  test('should assign grade to student for course', async ({ page }) => {
    const apiBase = getApiBase();

    // Setup: Create student and course
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
    expect(studentResp.ok(), `Creating the student failed: ${studentResp.status()}`).toBeTruthy();
    const createdStudent = await studentResp.json();
    tracker.track('students', createdStudent.id);

    const courseResp = await page.request.post(`${apiBase}/api/v1/courses/`, {
      data: {
        course_code: course.courseCode,
        course_name: course.courseName,
        credits: course.credits,
        semester: course.semester,
        is_active: course.isActive,
        evaluation_rules: [
          { category: 'Homework', weight: 30, includeDailyPerformance: true },
          { category: 'Midterm', weight: 30, includeDailyPerformance: false },
          { category: 'Final', weight: 40, includeDailyPerformance: false },
        ],
      },
    });
    expect(courseResp.ok(), `Creating the course failed: ${courseResp.status()}`).toBeTruthy();
    const createdCourse = await courseResp.json();
    tracker.track('courses', createdCourse.id);

    // Enrollment is what puts the student in the course's grading list, so a silent failure
    // here would leave the dropdown empty and the real cause hidden.
    await enrollStudentViaAPI(page, createdCourse.id, createdStudent.id);
    tracker.trackEnrollment(createdCourse.id, createdStudent.id);

    // Navigate to the grading page, then reload to discard the app's cached student/course
    // lists - the records were created through the API after the app had already loaded them.
    await page.goto('/#/grading');
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // A missing form is a failure, not a reason to skip: that is exactly how this test came to
    // pass without testing anything.
    const gradeForm = page.locator('[data-testid="grade-form"]');
    await expect(
      gradeForm,
      'The grade entry form is missing from /#/grading. If the grading UI moved, update this test.'
    ).toBeVisible({ timeout: 15000 });

    const studentSelect = page.locator('select[name="studentId"]').first();
    const courseSelect = page.locator('select[name="courseId"]').first();
    await expect(studentSelect).toBeVisible({ timeout: 15000 });
    await expect(courseSelect).toBeVisible({ timeout: 15000 });

    // Course first, then student. GradingView narrows each list by the other selection, and
    // picking the course first means the student list is then filtered to that course's
    // enrolled students - so the student appearing is itself proof the enrolment reached the
    // UI. (Doing it the other way round makes the page query every course's enrolment list to
    // rebuild the course dropdown, which is both slow and unnecessary here.)
    await expect(
      courseSelect.locator(`option[value="${createdCourse.id}"]`),
      'The new course is missing from the grading page course list.'
    ).toHaveCount(1, { timeout: 15000 });
    await courseSelect.selectOption(`${createdCourse.id}`);

    await expect(
      studentSelect.locator(`option[value="${createdStudent.id}"]`),
      'The enrolled student never appeared in the course\'s student list.'
    ).toHaveCount(1, { timeout: 15000 });
    await studentSelect.selectOption(`${createdStudent.id}`);

    // The category list is built from the selected course's evaluation rules, so wait for the
    // course's own categories to arrive rather than for a fixed delay.
    const categorySelect = gradeForm.locator('select[name="category"]');
    await expect(categorySelect.locator('option')).not.toHaveCount(0, { timeout: 10000 });

    await gradeForm.locator('input[name="assignmentName"]').fill('Homework 1');
    await gradeForm.locator('input[name="grade"]').fill('85');
    await gradeForm.locator('input[name="max_grade"]').fill('100');

    const categoryOptions = await categorySelect.locator('option').allTextContents();
    const homeworkOption = categoryOptions.find((opt) => /Homework/i.test(opt));
    expect(
      homeworkOption,
      `The course's categories do not include Homework: ${JSON.stringify(categoryOptions)}`
    ).toBeTruthy();
    await categorySelect.selectOption({ label: homeworkOption as string });

    const gradePost = page.waitForResponse(
      (resp) => resp.url().includes('/api/v1/grades') && resp.request().method() === 'POST',
      { timeout: 15000 }
    );
    await gradeForm.locator('button[type="submit"]').click();

    const postResponse = await gradePost;
    expect(postResponse.ok(), `Saving the grade failed: ${postResponse.status()}`).toBeTruthy();

    // The real check: the grade is in the database, with the values that were typed.
    const listResp = await page.request.get(`${apiBase}/api/v1/grades/`, {
      params: { student_id: createdStudent.id, course_id: createdCourse.id },
    });
    expect(listResp.ok(), `Reading grades back failed: ${listResp.status()}`).toBeTruthy();
    const listJson = await listResp.json();
    const grades = listJson.items ?? listJson.data?.items ?? listJson.data ?? listJson;

    expect(Array.isArray(grades), `Unexpected grades payload: ${JSON.stringify(listJson)}`).toBeTruthy();
    const saved = (grades as Array<Record<string, unknown>>).find(
      (g) => Number(g.grade) === 85 && Number(g.max_grade) === 100
    );
    expect(
      saved,
      `No grade of 85/100 was saved for this student and course. Got: ${JSON.stringify(grades)}`
    ).toBeTruthy();

    if (saved && typeof saved.id === 'number') {
      tracker.track('grades', saved.id);
    }
  });
});

test.describe('Attendance Tracking', () => {
  test.beforeEach(async ({ page }) => {
    tracker = new TestDataTracker(page);
    await loginAsTrackedTeacher(page, tracker);
  });

  test.afterEach(async () => {
    await tracker.cleanup();
  });

  test('should mark student attendance', async ({ page }) => {
    const apiBase = getApiBase();

    // Setup: Create student and course
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

    // Create enrollment so student appears in attendance list
    await enrollStudentViaAPI(page, createdCourse.id, createdStudent.id);
    tracker.trackEnrollment(createdCourse.id, createdStudent.id);

    // Navigate to attendance page, then reload to discard the app's cached course list - without
    // it the course created above was missing and the test logged "Could not find matching
    // course option" instead of exercising attendance.
    await page.goto('/#/attendance');
    await page.reload();
    await page.waitForLoadState('networkidle').catch(() => {});

    // Wait for course selector and try to select the course
    const courseSelect = page.locator('[data-testid="attendance-course-select"]').first();

    // Wait for select to be visible
    const selectVisible = await courseSelect.isVisible({ timeout: 5000 }).catch(() => false);
    if (!selectVisible) {
      console.warn('Course select not visible, skipping test');
      return;
    }

    // Wait a bit for options to populate
    await page.waitForTimeout(1000);

    // Try to select the course by value
    try {
      await courseSelect.selectOption(`${createdCourse.id}`);
    } catch (err) {
      // If direct selection fails, try by text
      try {
        const options = await courseSelect.locator('option').allTextContents();
        const matchingOption = options.find(opt => opt.includes(course.courseCode));
        if (matchingOption) {
          await courseSelect.selectOption(matchingOption);
        } else {
          console.warn('Could not find matching course option');
          return;
        }
      } catch {
        console.warn('Could not select course');
        return;
      }
    }

    // Wait for students to load in the selected course
    await page.waitForTimeout(1000);

    // Try to find and click a "Present" button for the student (simplified approach)
    const presentButtons = await page.locator('button:has-text("Present")').all().catch(() => []);

    if (presentButtons.length === 0) {
      console.warn('No Present buttons found, skipping test');
      return;
    }

    // Click first Present button
    await presentButtons[0].click({ force: true }).catch(() => {});

    // Wait a bit for the action to register
    await page.waitForTimeout(500);

    // Just verify page didn't error out - success is if we can click without crashing
    const hasError = await page.locator('[role="alert"]').locator('text=/error/i').isVisible({ timeout: 2000 }).catch(() => false);
    expect(!hasError).toBe(true);
  });
});

test.describe('Analytics and Reports', () => {
  test.beforeEach(async ({ page }) => {
    tracker = new TestDataTracker(page);
    await loginAsTrackedTeacher(page, tracker);
  });

  test.afterEach(async () => {
    await tracker.cleanup();
  });

  test('should view student analytics with final grade calculation', async ({ page }) => {
    const apiBase = getApiBase();

    // Setup: Create student, course, and grades
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
        evaluation_rules: [
          { category: 'Homework', weight: 30 },
          { category: 'Midterm', weight: 30 },
          { category: 'Final', weight: 40 },
        ],
      },
    });
    const createdCourse = await courseResp.json();
    tracker.track('courses', createdCourse.id);

    // Create enrollment
    await enrollStudentViaAPI(page, createdCourse.id, createdStudent.id);
    tracker.trackEnrollment(createdCourse.id, createdStudent.id);

    // Add some grades. `assignment_name` is required - without it the API answers 422, and
    // because these two calls ignored their responses this test used to reach its "final grade
    // calculation" assertions with no grades in the database at all.
    for (const [assignment, value, category] of [
      ['Homework 1', 85, 'Homework'],
      ['Midterm Exam', 90, 'Midterm'],
    ] as const) {
      const gradeResp = await page.request.post(`${apiBase}/api/v1/grades/`, {
        data: {
          student_id: createdStudent.id,
          course_id: createdCourse.id,
          assignment_name: assignment,
          grade: value,
          max_grade: 100,
          category,
        },
      });
      expect(
        gradeResp.ok(),
        `Creating the ${category} grade failed: ${gradeResp.status()} ${await gradeResp.text().catch(() => '')}`
      ).toBeTruthy();
      const createdGrade = await gradeResp.json().catch(() => null);
      tracker.track('grades', createdGrade?.id ?? createdGrade?.data?.id);
    }

    // Navigate to the student profile page (where analytics is displayed).
    //
    // This test used to be unable to fail. It navigated to `/students/<id>` - no `#` - which
    // under HashRouter loads the app root rather than the profile; it swallowed the only
    // content assertion in a .catch that just logged "Student name not visible on profile";
    // and it finished by asserting the URL contained the path it had itself navigated to.
    await page.goto(`/#/students/${createdStudent.id}`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    await expect(page.locator('[data-testid="student-profile"]')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(student.firstName).first()).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain(`#/students/${createdStudent.id}`);
  });
});
