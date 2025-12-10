import { test, expect, Page } from '@playwright/test';

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

// Test data generators
const generateStudentData = () => {
  const rnd = Math.random().toString(36).slice(2, 8);
  return {
    firstName: `Test${rnd}`,
    lastName: `Student${rnd}`,
    email: `student-${rnd}@test.edu`,
    studentId: `SID${rnd}`,
  };
};

const generateCourseData = () => {
  const rnd = Math.random().toString(36).slice(2, 6);
  return {
    courseCode: `CS${rnd}`,
    courseName: `Test Course ${rnd}`,
    credits: 4,
    semester: 'Fall 2025',
  };
};

// Helper to login as admin/teacher
async function loginAsTeacher(page: Page) {
  const apiBase = process.env.E2E_API_BASE || 'http://localhost:8000';
  
  // Register a teacher account
  const rnd = Math.random().toString(36).slice(2, 8);
  const email = `teacher-${rnd}@test.edu`;
  const password = 'Teacher-Pass-1!';

  await page.request.post(`${apiBase}/api/v1/auth/register`, {
    data: { email, password, full_name: 'E2E Teacher', role: 'teacher' },
  });

  // Login via UI
  await page.goto('/');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for navigation to dashboard
  await page.waitForURL(/\/dashboard|\/students/, { timeout: 5000 });
}

test.describe('Student Management - Critical Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean state and authenticated
    await loginAsTeacher(page);
  });

  test('should create a new student successfully', async ({ page }) => {
    const student = generateStudentData();

    // Navigate to students page
    await page.goto('/students');
    
    // Click "Add Student" button
    await page.click('button:has-text("Add Student"), button:has-text("New Student")');
    
    // Fill student form
    await page.fill('input[name="firstName"]', student.firstName);
    await page.fill('input[name="lastName"]', student.lastName);
    await page.fill('input[name="email"]', student.email);
    await page.fill('input[name="studentId"], input[name="student_id"]', student.studentId);
    
    // Submit form
    await page.click('button[type="submit"]:has-text("Create"), button:has-text("Save")');
    
    // Verify success message or student appears in list
    await expect(page.getByText(student.firstName)).toBeVisible({ timeout: 5000 });
  });

  test('should edit an existing student', async ({ page }) => {
    const student = generateStudentData();
    
    // Create student via API for faster setup
    const apiBase = process.env.E2E_API_BASE || 'http://localhost:8000';
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
    
    // Find and click edit button for the student
    await page.click(`[data-student-id="${createdStudent.id}"] button:has-text("Edit"), tr:has-text("${student.firstName}") button[aria-label*="Edit"]`);
    
    // Update student data
    const newLastName = `Updated${student.lastName}`;
    await page.fill('input[name="lastName"]', newLastName);
    
    // Save changes
    await page.click('button[type="submit"]:has-text("Update"), button:has-text("Save")');
    
    // Verify updated name appears
    await expect(page.getByText(newLastName)).toBeVisible({ timeout: 5000 });
  });

  test('should delete a student', async ({ page }) => {
    const student = generateStudentData();
    
    // Create student via API
    const apiBase = process.env.E2E_API_BASE || 'http://localhost:8000';
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
    await page.click('button:has-text("Add Course"), button:has-text("New Course")');
    
    await page.fill('input[name="courseCode"], input[name="course_code"]', course.courseCode);
    await page.fill('input[name="courseName"], input[name="course_name"]', course.courseName);
    await page.fill('input[name="credits"]', course.credits.toString());
    await page.fill('input[name="semester"]', course.semester);
    
    await page.click('button[type="submit"]:has-text("Create"), button:has-text("Save")');
    
    await expect(page.getByText(course.courseCode)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Grade Assignment Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test('should assign grade to student for course', async ({ page }) => {
    const apiBase = process.env.E2E_API_BASE || 'http://localhost:8000';
    
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
    await studentResp.json();
    
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
    await courseResp.json();

    // Navigate to grades page
    await page.goto('/grades');
    
    // Click "Add Grade" or similar button
    await page.click('button:has-text("Add Grade"), button:has-text("New Grade")');
    
    // Select student and course
    await page.click('select[name="studentId"], [role="combobox"]:has-text("Select student")');
    await page.click(`text=${student.firstName}`);
    
    await page.click('select[name="courseId"], [role="combobox"]:has-text("Select course")');
    await page.click(`text=${course.courseCode}`);
    
    // Enter grade details
    await page.fill('input[name="grade"]', '85');
    await page.fill('input[name="maxGrade"], input[name="max_grade"]', '100');
    await page.click('select[name="category"]');
    await page.click('option:has-text("Homework"), [role="option"]:has-text("Homework")');
    
    // Submit
    await page.click('button[type="submit"]:has-text("Create"), button:has-text("Save")');
    
    // Verify grade appears
    await expect(page.getByText(/^85$/)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Attendance Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test('should mark student attendance', async ({ page }) => {
    const apiBase = process.env.E2E_API_BASE || 'http://localhost:8000';
    
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
    
    await page.request.post(`${apiBase}/api/v1/courses/`, {
      data: {
        course_code: course.courseCode,
        course_name: course.courseName,
        credits: course.credits,
        semester: course.semester,
      },
    });

    // Navigate to attendance page
    await page.goto('/attendance');
    
    // Select course
    await page.click('select[name="courseId"], [role="combobox"]:has-text("Select course")');
    await page.click(`text=${course.courseCode}`);
    
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
    const apiBase = process.env.E2E_API_BASE || 'http://localhost:8000';
    
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

    // Navigate to analytics page
    await page.goto(`/analytics/student/${createdStudent.id}`);
    
    // Verify final grade calculation appears
    await expect(page.getByText(/Final Grade|Overall GPA|Grade Summary/i)).toBeVisible({ timeout: 5000 });
    
    // Verify course appears with grade
    await expect(page.getByText(course.courseCode)).toBeVisible();
  });
});
