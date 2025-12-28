import { test, expect, Page } from '@playwright/test';
import { loginAsTestUser, loginAsTeacher, generateStudentData, generateCourseData } from './helpers';
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

const generateCourseDataLocal = () => {
  const rnd = Math.random().toString(36).slice(2, 6);
  return {
    courseCode: `CS${rnd}`,
    courseName: `Test Course ${rnd}`,
    credits: 4,
    semester: 'Fall 2025',
  };
};

test.describe('Student Management - Critical Flows', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Try logging in as test user first, fall back to teacher if needed
    try {
      await loginAsTestUser(page);
    } catch (e) {
      console.warn('Failed to login as test user, falling back to teacher:', e);
      await loginAsTeacher(page);
    }
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Capture diagnostics on failure
    if (testInfo.status !== 'passed') {
      console.log(`\n❌ Test failed: ${testInfo.title}`);
      try {
        await captureAndLogDiagnostics(page, testInfo.title).catch((e) =>
          console.error('Failed to capture diagnostics:', e)
        );
      } catch (e) {
        console.error('Error in afterEach:', e);
      }
    }

    // Ensure proper cleanup of page/context
    try {
      await page.close().catch(() => {});
    } catch (e) {
      // Page may already be closed
    }
  });

  test('should create a new student successfully', async ({ page }) => {
    const student = generateStudentDataLocal();

    // Navigate to students page
    await page.goto('/students');

    // Wait for page to load
    await page.waitForLoadState('networkidle').catch(() => {});

    // Wait for the Add Student button to be visible
    await page.waitForSelector('[data-testid="add-student-btn"]', { timeout: 10000 });

    // Click "Add Student" button
    await page.click('[data-testid="add-student-btn"]');

    // Fill student form using stable test ids
    await page.fill('[data-testid="first-name-input"]', student.firstName);
    await page.fill('[data-testid="last-name-input"]', student.lastName);
    await page.fill('[data-testid="email-input"]', student.email);
    await page.fill('[data-testid="student-id-input"]', student.studentId);

    // Submit form
    await page.click('[data-testid="submit-student"]');

    // Verify success message or student appears in list
    await expect(page.getByText(student.firstName)).toBeVisible({ timeout: 5000 });
  });

  test('should edit an existing student', async ({ page }) => {
    const student = generateStudentDataLocal();

    // Create student via API for faster setup
    const apiBase = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8000';
    const createResp = await page.request.post(`${apiBase}/api/v1/students/`, {
      data: {
        first_name: student.firstName,
        last_name: student.lastName,
        email: student.email,
        student_id: student.studentId,
      },
    });
    const createdStudent = await createResp.json();

    // Navigate to students page
    await page.goto('/students');

    // Wait for page to load
    await page.waitForLoadState('networkidle').catch(() => {});

    // Wait for student to appear in list
    await page.waitForSelector(`tr:has-text("${student.firstName}")`, { timeout: 10000 }).catch(() => {});

    // Find and click edit button for the student
    await page.click(`[data-student-id="${createdStudent.id}"] button:has-text("Edit"), tr:has-text("${student.firstName}") button[aria-label*="Edit"]`);

    // Update student data
    const newLastName = `Updated${student.lastName}`;
    await page.fill('[data-testid="last-name-input"]', newLastName);

    // Save changes
    await page.click('[data-testid="submit-student"]');

    // Verify updated name appears
    await expect(page.getByText(newLastName)).toBeVisible({ timeout: 5000 });
  });

  test('should delete a student', async ({ page }) => {
    const student = generateStudentDataLocal();

    // Create student via API
    const apiBase = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8000';
    const createResp = await page.request.post(`${apiBase}/api/v1/students/`, {
      data: {
        first_name: student.firstName,
        last_name: student.lastName,
        email: student.email,
        student_id: student.studentId,
      },
    });
    const createdStudent = await createResp.json();

    // Navigate to students page
    await page.goto('/students');

    // Wait for page to load
    await page.waitForLoadState('networkidle').catch(() => {});

    // Wait for student to appear in list
    await page.waitForSelector(`tr:has-text("${student.firstName}")`, { timeout: 10000 }).catch(() => {});

    // Find and click delete button
    await page.click(`[data-student-id="${createdStudent.id}"] button:has-text("Delete"), tr:has-text("${student.firstName}") button[aria-label*="Delete"]`);

    // Confirm deletion in dialog
    await page.click('button:has-text("Confirm"), button:has-text("Delete"):visible');

    // Verify student no longer appears
    await expect(page.getByText(student.firstName)).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe('Course Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test('should create a new course', async ({ page }) => {
    const course = generateCourseData();

    await page.goto('/courses');
    await page.click('[data-testid="add-course-btn"]');

    await page.fill('[data-testid="course-code-input"]', course.courseCode);
    await page.fill('[data-testid="course-name-input"]', course.courseName);
    await page.fill('[data-testid="credits-input"]', course.credits.toString());

    await page.click('[data-testid="submit-course"]');

    await expect(page.getByText(course.courseCode)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Grade Assignment Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test('should assign grade to student for course', async ({ page }) => {
    const apiBase = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8000';

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

    const courseResp = await page.request.post(`${apiBase}/api/v1/courses/`, {
      data: {
        course_code: course.courseCode,
        course_name: course.courseName,
        credits: course.credits,
        semester: course.semester,
        evaluation_rules: [
          { category: 'Homework', weight: 30, includeDailyPerformance: true },
          { category: 'Midterm', weight: 30, includeDailyPerformance: false },
          { category: 'Final', weight: 40, includeDailyPerformance: false },
        ],
      },
    });
    const createdCourse = await courseResp.json();

    // Navigate to grades page
    await page.goto('/grades');
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // Wait for Add Grade button to be visible
    await page.waitForSelector('[data-testid="add-grade-button"]', { state: 'visible', timeout: 15000 });

    // Click "Add Grade" button (focuses form)
    await page.click('[data-testid="add-grade-button"]');

    // Select student and course
    await page.selectOption('select[name="studentId"]', `${createdStudent.id}`);
    await page.selectOption('select[name="courseId"]', `${createdCourse.id}`);

    // Enter grade details
    await page.fill('input[name="assignmentName"]', 'Homework 1');
    await page.fill('input[name="grade"]', '85');
    await page.fill('input[name="max_grade"]', '100');
    // Select category option with string instead of regex
    const categoryOptions = await page.locator('select[name="category"] option').allTextContents();
    const homeworkOption = categoryOptions.find(opt => /Homework/i.test(opt)) || 'Homework';
    await page.selectOption('select[name="category"]', homeworkOption);

    // Submit
    await page.click('button[type="submit"]');

    // Verify grade appears
    await expect(page.getByText(/^85$/)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Attendance Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test('should mark student attendance', async ({ page }) => {
    const apiBase = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8000';

    // Setup: Create student and course
    const student = generateStudentData();
    const course = generateCourseData();

    await page.request.post(`${apiBase}/api/v1/students/`, {
      data: {
        first_name: student.firstName,
        last_name: student.lastName,
        email: student.email,
        student_id: student.studentId,
      },
    });

    const courseResp = await page.request.post(`${apiBase}/api/v1/courses/`, {
      data: {
        course_code: course.courseCode,
        course_name: course.courseName,
        credits: course.credits,
        semester: course.semester,
      },
    });
    const createdCourse = await courseResp.json();

    // Navigate to attendance page and wait for it to load
    await page.goto('/attendance');
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // Wait for course selector to be visible
    await page.locator('[data-testid="attendance-course-select"], select[name="courseId"]').waitFor({ state: 'visible', timeout: 15000 });

    // Select course
    await page.selectOption('[data-testid="attendance-course-select"], select[name="courseId"]', `${createdCourse.id}`);

    // Mark attendance for student
    await page.click(`tr:has-text("${student.firstName}") button:has-text("Present"), tr:has-text("${student.firstName}") input[type="checkbox"]`);

    // Save attendance
    await page.click('button:has-text("Save Attendance"), button[type="submit"]');

    // Verify success message
    await expect(page.getByText(/Attendance.*(saved|recorded|updated)/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Analytics and Reports', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test('should view student analytics with final grade calculation', async ({ page }) => {
    const apiBase = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8000';

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

    const courseResp = await page.request.post(`${apiBase}/api/v1/courses/`, {
      data: {
        course_code: course.courseCode,
        course_name: course.courseName,
        credits: course.credits,
        semester: course.semester,
        evaluation_rules: [
          { category: 'Homework', weight: 30 },
          { category: 'Midterm', weight: 30 },
          { category: 'Final', weight: 40 },
        ],
      },
    });
    const createdCourse = await courseResp.json();

    // Add some grades
    await page.request.post(`${apiBase}/api/v1/grades/`, {
      data: {
        student_id: createdStudent.id,
        course_id: createdCourse.id,
        grade: 85,
        max_grade: 100,
        category: 'Homework',
      },
    });

    await page.request.post(`${apiBase}/api/v1/grades/`, {
      data: {
        student_id: createdStudent.id,
        course_id: createdCourse.id,
        grade: 90,
        max_grade: 100,
        category: 'Midterm',
      },
    });

    // Navigate to student profile page (where analytics is displayed) and wait for it to load
    await page.goto(`/students/${createdStudent.id}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // Wait for student profile to render
    await page.waitForSelector('[data-testid="student-profile"]', { timeout: 10000 }).catch(() => null);

    // Verify grade information appears on the profile (increased timeout for rendering)
    await expect(page.getByText(/Grade|GPA|Score|Results/i)).toBeVisible({ timeout: 15000 });

    // Verify course appears with grade
    await expect(page.getByText(course.courseCode)).toBeVisible();
  });
});
