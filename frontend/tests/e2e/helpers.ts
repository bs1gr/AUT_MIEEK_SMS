import { Page, expect } from '@playwright/test';
import type { Course } from '@/types';

/**
 * E2E Test Helpers
 * Reusable utilities for Playwright tests
 */

export interface TestStudent {
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
}

export interface TestCourse {
  courseCode: string;
  courseName: string;
  credits: number;
  semester: string;
}

export interface TestUser {
  email: string;
  password: string;
  fullName: string;
  role?: string;
}

// Data generators
export const generateRandomString = (prefix: string = '') => {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}${rnd}`;
};

export const generateStudentData = (): TestStudent => {
  const rnd = generateRandomString();
  return {
    firstName: `Test${rnd}`,
    lastName: `Student${rnd}`,
    email: `student-${rnd}@test.edu`,
    studentId: `SID${rnd.toUpperCase()}`,
  };
};

export const generateCourseData = (): TestCourse => {
  const rnd = generateRandomString().slice(0, 4).toUpperCase();
  return {
    courseCode: `CS${rnd}`,
    courseName: `Test Course ${rnd}`,
    credits: 4,
    semester: 'Fall 2025',
  };
};

export const generateTeacherUser = (): TestUser => {
  const rnd = generateRandomString();
  return {
    email: `teacher-${rnd}@test.edu`,
    password: 'Teacher-Pass-1!', // pragma: allowlist secret
    fullName: `E2E Teacher ${rnd}`,
    role: 'teacher',
  };
};

// Authentication helpers
export async function registerUser(page: Page, user: TestUser) {
  const apiBase = process.env.E2E_API_BASE || 'http://localhost:8000';

  const response = await page.request.post(`${apiBase}/api/v1/auth/register`, {
    data: {
      email: user.email,
      password: user.password,
      full_name: user.fullName,
      ...(user.role && { role: user.role }),
    },
  });

  if (!response.ok()) {
    const text = await response.text().catch(() => 'Unknown error');
    throw new Error(`Registration failed: ${response.status()} - ${text}`);
  }

  return response.json();
}

export async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto('/');

  // Wait for login form
  await page.waitForSelector('input[type="email"]', { timeout: 5000 });

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for successful navigation
  await page.waitForURL(/\/dashboard|\/students|\/home/, { timeout: 10000 });
}

export async function loginAsTeacher(page: Page): Promise<TestUser> {
  const user = generateTeacherUser();

  try {
    await registerUser(page, user);
    await loginViaUI(page, user.email, user.password);
    return user;
  } catch (error) {
    console.error('Login as teacher failed:', error);
    throw error;
  }
}

// API helpers for test data setup
export async function createStudentViaAPI(page: Page, student: TestStudent) {
  const apiBase = process.env.E2E_API_BASE || 'http://localhost:8000';

  const response = await page.request.post(`${apiBase}/api/v1/students/`, {
    data: {
      first_name: student.firstName,
      last_name: student.lastName,
      email: student.email,
      student_id: student.studentId,
    },
  });

  if (!response.ok()) {
    throw new Error(`Create student failed: ${response.status()}`);
  }

  return response.json();
}

export async function createCourseViaAPI(page: Page, course: TestCourse, evaluationRules?: Course['evaluation_rules']) {
  const apiBase = process.env.E2E_API_BASE || 'http://localhost:8000';

  const defaultRules = [
    { category: 'Homework', weight: 30, includeDailyPerformance: true },
    { category: 'Midterm', weight: 30, includeDailyPerformance: false },
    { category: 'Final', weight: 40, includeDailyPerformance: false },
  ];

  const response = await page.request.post(`${apiBase}/api/v1/courses/`, {
    data: {
      course_code: course.courseCode,
      course_name: course.courseName,
      credits: course.credits,
      semester: course.semester,
      evaluation_rules: evaluationRules || defaultRules,
    },
  });

  if (!response.ok()) {
    throw new Error(`Create course failed: ${response.status()}`);
  }

  return response.json();
}

export async function createGradeViaAPI(
  page: Page,
  studentId: number,
  courseId: number,
  grade: number,
  maxGrade: number = 100,
  category: string = 'Homework'
) {
  const apiBase = process.env.E2E_API_BASE || 'http://localhost:8000';

  const response = await page.request.post(`${apiBase}/api/v1/grades/`, {
    data: {
      student_id: studentId,
      course_id: courseId,
      grade,
      max_grade: maxGrade,
      category,
      date_assigned: new Date().toISOString().split('T')[0],
    },
  });

  if (!response.ok()) {
    throw new Error(`Create grade failed: ${response.status()}`);
  }

  return response.json();
}

export async function createAttendanceViaAPI(
  page: Page,
  studentId: number,
  courseId: number,
  status: 'Present' | 'Absent' | 'Late' = 'Present',
  date?: string
) {
  const apiBase = process.env.E2E_API_BASE || 'http://localhost:8000';

  const response = await page.request.post(`${apiBase}/api/v1/attendance/`, {
    data: {
      student_id: studentId,
      course_id: courseId,
      date: date || new Date().toISOString().split('T')[0],
      status,
    },
  });

  if (!response.ok()) {
    throw new Error(`Create attendance failed: ${response.status()}`);
  }

  return response.json();
}

// UI interaction helpers
export async function fillForm(page: Page, fields: Record<string, string>) {
  for (const [name, value] of Object.entries(fields)) {
    const selector = `input[name="${name}"], textarea[name="${name}"]`;
    await page.fill(selector, value);
  }
}

export async function selectFromDropdown(page: Page, name: string, optionText: string) {
  // Try native select first
  const nativeSelect = page.locator(`select[name="${name}"]`);
  if (await nativeSelect.count() > 0) {
    await nativeSelect.selectOption({ label: optionText });
    return;
  }

  // Try custom combobox (Radix UI pattern)
  const combobox = page.locator(`[role="combobox"][name="${name}"], button[name="${name}"]`);
  if (await combobox.count() > 0) {
    await combobox.click();
    await page.click(`[role="option"]:has-text("${optionText}")`);
    return;
  }

  throw new Error(`Could not find dropdown for field: ${name}`);
}

export async function waitForToast(page: Page, messagePattern: string | RegExp) {
  const toastSelector = '[role="alert"], [data-sonner-toast], .toast, [class*="toast"]';
  await expect(page.locator(toastSelector).filter({ hasText: messagePattern })).toBeVisible({
    timeout: 5000,
  });
}

export async function waitForTableRow(page: Page, rowText: string) {
  await expect(page.locator(`tr:has-text("${rowText}")`)).toBeVisible({ timeout: 5000 });
}

// Cleanup helpers
export async function cleanupTestData(page: Page, resourceType: string, id: number) {
  const apiBase = process.env.E2E_API_BASE || 'http://localhost:8000';

  await page.request.delete(`${apiBase}/api/v1/${resourceType}/${id}`);
}
