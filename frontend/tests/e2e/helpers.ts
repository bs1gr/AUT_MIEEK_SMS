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
  const apiBase = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8000';

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
  console.log(`🔐 [E2E LOGIN] Starting UI login for: ${email}`);

  // Capture console messages
  const consoleLogs: string[] = [];
  page.on('console', (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));

  // Capture errors
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.toString()));

  // Navigate to login page
  console.log(`🔐 [E2E LOGIN] Navigating to /`);
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });

  console.log(`🔐 [E2E LOGIN] Current URL: ${page.url()}`);
  console.log(`🔐 [E2E LOGIN] Page title: ${await page.title()}`);

  // Wait for login form with extended timeout
  console.log(`🔐 [E2E LOGIN] Waiting for email input...`);
  try {
    await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });
  } catch (error) {
    console.error(`❌ [E2E LOGIN] Email input not found!`);
    console.error(`Current page HTML (first 2000 chars):\n${(await page.content()).substring(0, 2000)}`);
    console.error(`Console logs:`, consoleLogs);
    console.error(`Page errors:`, pageErrors);
    throw new Error(`Email input not visible: ${error}`);
  }

  console.log(`🔐 [E2E LOGIN] Filling credentials...`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  console.log(`🔐 [E2E LOGIN] Submitting form...`);
  await page.click('button[type="submit"]');

  // Wait for successful navigation with detailed error
  console.log(`🔐 [E2E LOGIN] Waiting for redirect to dashboard...`);
  try {
    await page.waitForURL(/\/dashboard|\/students|\/home/, { timeout: 15000 });
    console.log(`✅ [E2E LOGIN] Login successful! Current URL: ${page.url()}`);
  } catch (error) {
    console.error(`❌ [E2E LOGIN] Navigation failed!`);
    console.error(`Current URL: ${page.url()}`);
    console.error(`Page title: ${await page.title()}`);
    console.error(`Console logs:`, consoleLogs);
    console.error(`Page errors:`, pageErrors);

    // Check for error messages on page
    const pageText = await page.textContent('body').catch(() => '');
    const errorMessages = pageText.match(/error|invalid|fail|wrong/gi) || [];
    if (errorMessages.length > 0) {
      console.error(`Potential error messages found:`, errorMessages);
    }

    throw new Error(`Login navigation timeout: ${error}`);
  }

  // Wait for dashboard to be fully loaded
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() =>
    console.warn('⚠️  [E2E LOGIN] Network idle timeout (continuing anyway)')
  );
}

export async function loginViaAPI(page: Page, email: string, password: string) {
  console.log(`🔐 [E2E API LOGIN] Starting API login for: ${email}`);
  const apiBase = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8000';

  console.log(`🔐 [E2E API LOGIN] API Base: ${apiBase}`);
  console.log(`🔐 [E2E API LOGIN] Attempting POST to ${apiBase}/api/v1/auth/login`);

  // Get JWT token from login endpoint
  const response = await page.request.post(`${apiBase}/api/v1/auth/login`, {
    data: { email, password },
  });

  console.log(`🔐 [E2E API LOGIN] Response status: ${response.status()}`);

  if (!response.ok()) {
    const text = await response.text().catch(() => 'Unable to read response');
    console.error(`❌ [E2E API LOGIN] Login failed!`);
    console.error(`Status: ${response.status()}`);
    console.error(`Response: ${text}`);
    throw new Error(`Login failed: ${response.status()} - ${text}`);
  }

  const data = await response.json();
  console.log(`🔐 [E2E API LOGIN] Login response keys: ${Object.keys(data).join(', ')}`);

  const token = data?.access_token;

  if (!token) {
    console.error(`❌ [E2E API LOGIN] No access token in response!`);
    console.error(`Response data: ${JSON.stringify(data)}`);
    throw new Error('No access token in login response');
  }

  console.log(`✅ [E2E API LOGIN] Token received (length: ${token.length})`);

  // Fetch user profile with the token to get user object
  console.log(`🔐 [E2E API LOGIN] Fetching user profile from /auth/me...`);
  const meResponse = await page.request.get(`${apiBase}/api/v1/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!meResponse.ok()) {
    const text = await meResponse.text().catch(() => 'Unable to read response');
    console.error(`❌ [E2E API LOGIN] Failed to fetch user profile!`);
    console.error(`Status: ${meResponse.status()}`);
    console.error(`Response: ${text}`);
    throw new Error(`Failed to fetch user: ${meResponse.status()} - ${text}`);
  }

  const userData = await meResponse.json();
  console.log(`✅ [E2E API LOGIN] User profile fetched: ${userData?.email}`);

  // Navigate to home first
  console.log(`🔐 [E2E API LOGIN] Navigating to / to set token and user...`);
  await page.goto('/');

  // Then inject both token and user into localStorage
  console.log(`🔐 [E2E API LOGIN] Injecting token and user into localStorage...`);
  await page.evaluate(({ token: t, user }) => {
    try {
      window.localStorage.setItem('sms_access_token', t);
      window.localStorage.setItem('sms_user_v1', JSON.stringify(user));
      console.log('[E2E] Token and user set in localStorage');
      console.log('[E2E] User:', JSON.stringify(user));
    } catch (e) {
      console.error('[E2E] Failed to set token/user:', e);
      throw e;
    }
  }, { token, user: userData });

  // Navigate to dashboard after token is set
  console.log(`🔐 [E2E API LOGIN] Navigating to /dashboard...`);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  console.log(`🔐 [E2E API LOGIN] Current URL: ${page.url()}`);

  // Wait for content to load
  await page.waitForSelector('body', { timeout: 10000 }).catch(() => {
    console.warn('⚠️  [E2E API LOGIN] Body selector timeout (continuing anyway)');
  });

  console.log(`✅ [E2E API LOGIN] Login complete!`);
}

export async function loginAsTeacher(page: Page): Promise<TestUser> {
  const user = generateTeacherUser();

  try {
    await registerUser(page, user);
    await loginViaAPI(page, user.email, user.password);
    return user;
  } catch (error) {
    console.error('Login as teacher failed:', error);
    throw error;
  }
}

export async function loginAsTestUser(page: Page): Promise<TestUser> {
  const testUser: TestUser = {
    email: 'test@example.com',
    password: 'Test@Pass123', // pragma: allowlist secret
    fullName: 'Test User',
    role: 'admin',
  };

  console.log('\n=== LOGGING IN AS TEST USER ===');
  console.log(`Email: ${testUser.email}`);
  console.log(`Role: ${testUser.role}`);
  console.log('================================\n');

  try {
    // First, verify the test user exists via API
    const apiBase = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8000';
    console.log(`🔍 [E2E] Verifying test user exists at ${apiBase}`);

    const loginResponse = await page.request.post(`${apiBase}/api/v1/auth/login`, {
      data: { email: testUser.email, password: testUser.password },
    }).catch((err) => {
      console.error(`❌ [E2E] Pre-login API test failed:`, err);
      return null;
    });

    if (loginResponse && loginResponse.ok()) {
      console.log(`✅ [E2E] Test user verified via API (status: ${loginResponse.status()})`);
      // Use API login since we know it works
      await loginViaAPI(page, testUser.email, testUser.password);
    } else {
      console.warn(`⚠️  [E2E] API pre-check failed, falling back to UI login`);
      if (loginResponse) {
        console.warn(`API Response: ${loginResponse.status()} - ${await loginResponse.text().catch(() => 'N/A')}`);
      }
      // Use UI login for better reliability
      await loginViaUI(page, testUser.email, testUser.password);
    }

    console.log(`✅ [E2E] Test user logged in successfully\n`);
    return testUser;
  } catch (error) {
    console.error('\n❌ [E2E] Login as test user FAILED');
    console.error('Error:', error);
    console.error('This may indicate:');
    console.error('  1. Test user was not seeded properly');
    console.error('  2. Auth endpoint is not responding');
    console.error('  3. Frontend is not loading correctly');
    console.error('  4. Password validation requirements changed\n');
    throw error;
  }
}

// API helpers for test data setup
export async function createStudentViaAPI(page: Page, student: TestStudent) {
  const apiBase = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8000';

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
  const apiBase = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8000';

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
  const apiBase = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8000';

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
  const apiBase = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8000';

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
  const apiBase = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8000';

  await page.request.delete(`${apiBase}/api/v1/${resourceType}/${id}`);
}
