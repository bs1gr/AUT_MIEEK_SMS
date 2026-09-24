import { Page, expect, request as playwrightRequest } from '@playwright/test';
import type { Course } from '@/types';
import { recordCreatedUser } from './created-users';

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
  isActive: boolean;
}

export interface TestUser {
  email: string;
  password: string;
  fullName: string;
  role?: string;
}

const normalizeHttpUrl = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    return trimmed.replace(/\/+$/, '');
  } catch {
    return null;
  }
};

// Exported so specs that call the API directly use the same origin rules as loginViaAPI.
// Several specs used to compute their own `process.env.PLAYWRIGHT_BASE_URL ||
// 'http://localhost:8000'`, which (a) points API calls at the *frontend* whenever
// PLAYWRIGHT_BASE_URL is set, and (b) otherwise uses a different hostname from the page, so
// cookie-authenticated calls break under a strict AUTH_MODE.
export const getApiBase = () => {
  const explicitApiBase = normalizeHttpUrl(process.env.PLAYWRIGHT_API_BASE_URL);
  if (explicitApiBase) {
    return explicitApiBase;
  }

  const uiBase = normalizeHttpUrl(process.env.PLAYWRIGHT_BASE_URL);
  if (uiBase) {
    try {
      const parsed = new URL(uiBase);
      // Docker/production mode usually serves both UI and API from same origin.
      if (parsed.port === '8080' || parsed.port === '80' || parsed.port === '443') {
        return `${parsed.protocol}//${parsed.host}`;
      }
      // Native mode: derive the backend origin from the same hostname as the
      // page. Cookies (e.g. the HttpOnly refresh_token set by loginViaAPI) are
      // scoped per-origin, so hardcoding a different hostname here than the
      // one PLAYWRIGHT_BASE_URL points the browser at silently breaks any
      // flow relying on that cookie reaching the page's own requests.
      return `${parsed.protocol}//${parsed.hostname}:8000`;
    } catch {
      // Fall through to native default.
    }
  }

  // Native mode default: backend API on 8000, frontend on 5173, same host.
  return 'http://127.0.0.1:8000';
};

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

/**
 * A semester label that reads as the current one, rather than a hardcoded year that goes stale.
 *
 * The label is cosmetic: a course's `is_active` is derived from its enrollments
 * (backend/services/course_activation.py), not its semester. A new course is always created
 * **inactive** and becomes active once a student is enrolled — the grading and attendance
 * views only list active courses, so a spec must enroll a student (enrollStudentViaAPI)
 * before expecting its course to appear there.
 */
const currentSemesterLabel = (today: Date = new Date()): string => {
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // 1-12
  const day = today.getDate();

  if (month > 9 || (month === 9 && day >= 15) || month === 10 || month === 11 || month === 12) {
    return `Fall ${year}`;
  }
  if (month === 1 && day <= 30) return `Fall ${year - 1}`;
  if (month >= 2 && month <= 6) return `Spring ${year}`;
  // Between semesters (July to mid-September): no window is open, so the label is only cosmetic
  // and `isActive` below is what keeps the course visible.
  return `Fall ${year}`;
};

export const generateCourseData = (): TestCourse => {
  const rnd = generateRandomString().slice(0, 4).toUpperCase();
  return {
    courseCode: `CS${rnd}`,
    courseName: `Test Course ${rnd}`,
    credits: 4,
    semester: currentSemesterLabel(),
    // Ignored by the backend (is_active is derived from enrollments); kept for the payload shape
    isActive: true,
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
  const apiBase = getApiBase();

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

  // Registration response may be wrapped; return full JSON for caller flexibility
  const created = await response.json();

  // Record it so the run can delete the account again, whichever spec created it - see
  // created-users.ts and playwright-global-teardown.ts.
  const payload = (created && (created as { data?: unknown }).data) || created;
  recordCreatedUser((payload as { id?: number })?.id, user.email);

  return created;
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
    const pageText = (await page.textContent('body').catch(() => '')) ?? '';
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
  const apiBase = getApiBase();

  // 1. POST /auth/login via page.request — page.request shares the BrowserContext
  //    cookie jar, so the HttpOnly refresh_token cookie set by the backend is
  //    stored in the browser and sent on subsequent same-origin requests.
  const response = await page.request.post(`${apiBase}/api/v1/auth/login`, {
    data: { email, password },
  });
  if (!response.ok()) {
    const text = await response.text().catch(() => 'N/A');
    throw new Error(`API login failed: ${response.status()} — ${text}`);
  }
  const data = await response.json();
  const token: string = data.access_token ?? data.data?.access_token;
  if (!token) throw new Error('No access_token in login response');

  // 2. Fetch user profile using the access token.
  const meResp = await page.request.get(`${apiBase}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!meResp.ok()) throw new Error(`/auth/me failed: ${meResp.status()}`);
  const meJson = await meResp.json();
  const userData: unknown = meJson.data ?? meJson;

  // 3. Inject sms_user_v1 into localStorage before React initialises.
  //    addInitScript fires at document_start — before any module code runs.
  //    AuthContext reads sms_user_v1 in its useState() initialiser.  Combined
  //    with the HttpOnly cookie from step 1, the autoLogin effect will call
  //    refreshAccessToken() → succeed → user is authenticated without any
  //    backdoor in production code.
  await page.addInitScript((u: unknown) => {
    try { localStorage.setItem('sms_user_v1', JSON.stringify(u)); } catch {}
  }, userData);

  // 4. Navigate.  React mounts, AuthContext sees user+no in-memory token →
  //    calls refreshAccessToken() which uses the HttpOnly cookie → succeeds →
  //    isInitializing=false → AuthPage redirects to /dashboard.
  await page.goto('/');
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });

  return userData;
}

/**
 * The role the server actually gave this session, read from the profile the app stored.
 *
 * Works after either login path, and is the only trustworthy source: a role written into a
 * fixture object is just a label, and says nothing about the account in the database.
 */
export async function getLoggedInRole(page: Page): Promise<string | undefined> {
  const stored = await page.evaluate(() => {
    try {
      return localStorage.getItem('sms_user_v1');
    } catch {
      return null;
    }
  });

  if (!stored) return undefined;

  try {
    const parsed = JSON.parse(stored) as { role?: string; data?: { role?: string } };
    return parsed.role ?? parsed.data?.role;
  } catch {
    return undefined;
  }
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

/**
 * Log in as the shared `test@example.com` fixture account.
 *
 * The returned `role` is whatever the server says, read back after login — it is deliberately
 * not declared up front. This used to claim `role: 'admin'`, while the account is a *teacher*
 * in at least one environment, so specs assuming admin rights behaved differently depending on
 * where they ran, and the fixture object hid it. A spec that needs admin rights must say so
 * with `expectRole(page, 'admin')` (or use `loginAsAdmin`) rather than trust this label.
 */
export async function loginAsTestUser(page: Page): Promise<TestUser> {
  const testUser: TestUser = {
    email: 'test@example.com',
    password: 'Test@Pass123', // pragma: allowlist secret
    fullName: 'Test User',
  };

  console.log('\n=== LOGGING IN AS TEST USER ===');
  console.log(`Email: ${testUser.email}`);
  console.log('================================\n');

  try {
    // First, verify the test user exists via API
    const apiBase = getApiBase();
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

    testUser.role = await getLoggedInRole(page);
    console.log(`✅ [E2E] Test user logged in successfully (role: ${testUser.role ?? 'unknown'})\n`);
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
  const apiBase = getApiBase();

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

  const json = await response.json();
  return (json && (json as any).success === false) ? Promise.reject(new Error((json as any).error?.message || 'API error')) : ((json && (json as any).data) || json);
}

export async function createCourseViaAPI(page: Page, course: TestCourse, evaluationRules?: Course['evaluation_rules']) {
  const apiBase = getApiBase();

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
      is_active: course.isActive,
      evaluation_rules: evaluationRules || defaultRules,
    },
  });

  if (!response.ok()) {
    throw new Error(`Create course failed: ${response.status()}`);
  }

  const json = await response.json();
  return (json && (json as any).success === false) ? Promise.reject(new Error((json as any).error?.message || 'API error')) : ((json && (json as any).data) || json);
}

/**
 * Enrol a student in a course.
 *
 * The endpoint is `POST /enrollments/course/{course_id}` with a `student_ids` list. Specs used
 * to post `{student_id, course_id, semester}` to `/enrollments/` - a route that only accepts
 * GET - and swallow the resulting 405 with `.catch(() => {})`, so no E2E enrolment had ever
 * actually happened. That left students missing from the course lists the tests then searched,
 * which is what the "Could not find matching course option" fallbacks were working around.
 */
export async function enrollStudentViaAPI(page: Page, courseId: number, studentId: number) {
  const apiBase = getApiBase();

  const response = await page.request.post(`${apiBase}/api/v1/enrollments/course/${courseId}`, {
    data: { student_ids: [studentId] },
  });

  if (!response.ok()) {
    const text = await response.text().catch(() => 'N/A');
    throw new Error(`Enroll student failed: ${response.status()} — ${text}`);
  }

  return response.json();
}

export async function createGradeViaAPI(
  page: Page,
  studentId: number,
  courseId: number,
  grade: number,
  maxGrade: number = 100,
  category: string = 'Homework',
  // Required by the API: without it the request is rejected with 422.
  assignmentName: string = 'E2E Assignment'
) {
  const apiBase = getApiBase();

  const response = await page.request.post(`${apiBase}/api/v1/grades/`, {
    data: {
      student_id: studentId,
      course_id: courseId,
      assignment_name: assignmentName,
      grade,
      max_grade: maxGrade,
      category,
      date_assigned: new Date().toISOString().split('T')[0],
    },
  });

  if (!response.ok()) {
    throw new Error(`Create grade failed: ${response.status()}`);
  }

  const json = await response.json();
  return (json && (json as any).success === false) ? Promise.reject(new Error((json as any).error?.message || 'API error')) : ((json && (json as any).data) || json);
}

export async function createAttendanceViaAPI(
  page: Page,
  studentId: number,
  courseId: number,
  status: 'Present' | 'Absent' | 'Late' = 'Present',
  date?: string
) {
  const apiBase = getApiBase();

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

  const json = await response.json();
  return (json && (json as any).success === false) ? Promise.reject(new Error((json as any).error?.message || 'API error')) : ((json && (json as any).data) || json);
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

/**
 * Admin credentials to try, most specific first.
 *
 * Environments differ: `admin@example.com` is the seeded admin in some, while a Native or
 * SMS_Lite install has `admin@sms-lite.app`. Set PLAYWRIGHT_ADMIN_EMAIL and
 * PLAYWRIGHT_ADMIN_PASSWORD to pin it explicitly.
 */
const adminCredentialCandidates = (): Array<[string, string]> => {
  const configured: Array<[string | undefined, string | undefined]> = [
    [process.env.PLAYWRIGHT_ADMIN_EMAIL, process.env.PLAYWRIGHT_ADMIN_PASSWORD],
    ['admin@example.com', 'YourSecurePassword123!'], // pragma: allowlist secret
    ['admin@sms-lite.app', 'AdminPassword123!'], // pragma: allowlist secret
  ];
  return configured.filter((pair): pair is [string, string] => Boolean(pair[0] && pair[1]));
};

// undefined = not looked up yet, null = no working credentials in this environment.
let cachedAdminToken: string | null | undefined;

/**
 * An admin access token, or null when none of the candidates work.
 *
 * Uses its own request context rather than the page's, so logging in as admin cannot disturb
 * the session cookie of whoever the test is signed in as.
 */
export async function getAdminToken(): Promise<string | null> {
  if (cachedAdminToken !== undefined) return cachedAdminToken;

  const apiBase = getApiBase();
  const context = await playwrightRequest.newContext();
  try {
    for (const [email, password] of adminCredentialCandidates()) {
      try {
        const resp = await context.post(`${apiBase}/api/v1/auth/login`, { data: { email, password } });
        if (!resp.ok()) continue;
        const data = await resp.json();
        const token: string | undefined = data.access_token ?? data.data?.access_token;
        if (token) {
          cachedAdminToken = token;
          return token;
        }
      } catch {
        // Try the next candidate.
      }
    }
  } finally {
    await context.dispose();
  }

  cachedAdminToken = null;
  return null;
}

// Quick admin login helper
export async function loginAsAdmin(page: Page) {
  const apiBase = getApiBase();

  for (const [email, password] of adminCredentialCandidates()) {
    const probe = await page.request.post(`${apiBase}/api/v1/auth/login`, { data: { email, password } });
    if (probe.ok()) {
      await loginViaAPI(page, email, password);
      return;
    }
  }

  throw new Error(
    'No working admin credentials. Tried: ' +
      adminCredentialCandidates().map(([e]) => e).join(', ') +
      '. Set PLAYWRIGHT_ADMIN_EMAIL and PLAYWRIGHT_ADMIN_PASSWORD for this environment.'
  );
}

/**
 * Fail the test unless the session really has the role it needs.
 *
 * Specs used to assume `loginAsTestUser` produced an admin because its fixture object said so.
 * Asserting against the server's answer turns "this environment's account has a different role"
 * into an explicit failure instead of a confusing one somewhere further down the test.
 */
export async function expectRole(page: Page, role: string) {
  const actual = await getLoggedInRole(page);
  expect(
    actual,
    `This test needs a "${role}" session, but the logged-in account is "${actual ?? 'unknown'}". ` +
      `Check the account's role in the database this run points at.`
  ).toBe(role);
}

// Cleanup helpers
export async function cleanupTestData(page: Page, resourceType: string, id: number) {
  const apiBase = getApiBase();

  await page.request.delete(`${apiBase}/api/v1/${resourceType}/${id}`);
}

type TrackedKind = 'grades' | 'attendance' | 'students' | 'courses' | 'users';

// Deleted in this order, so rows that reference others go first.
const CLEANUP_ORDER: TrackedKind[] = ['grades', 'attendance', 'students', 'courses', 'users'];

const DELETE_PATH: Record<TrackedKind, (id: number) => string> = {
  grades: (id) => `/api/v1/grades/${id}`,
  attendance: (id) => `/api/v1/attendance/${id}`,
  students: (id) => `/api/v1/students/${id}`,
  courses: (id) => `/api/v1/courses/${id}`,
  users: (id) => `/api/v1/admin/users/${id}`,
};

/**
 * Remembers what a test created so it can be deleted again afterwards.
 *
 * E2E runs used to leak every row they made into whatever database they ran against: one
 * three-spec run on 2026-09-17 left 5 students, 3 courses and 4 teacher accounts behind, and
 * 234 accumulated accounts had to be cleared by hand the day before. Register a tracker in
 * `beforeEach` and call `cleanup()` in `afterEach`.
 *
 * Cleanup is best-effort and never fails a test — a failed delete is reported loudly instead,
 * because a passing test that reports nothing is how the leak went unnoticed in the first
 * place. It also cannot help a run that crashes outright; that is what pointing E2E at a
 * disposable database will fix.
 */
export class TestDataTracker {
  private readonly page: Page;
  private readonly created: Array<{ kind: TrackedKind; id: number }> = [];
  private readonly enrollments: Array<{ courseId: number; studentId: number }> = [];

  constructor(page: Page) {
    this.page = page;
  }

  track(kind: TrackedKind, id: number | string | undefined | null): void {
    const numeric = typeof id === 'string' ? Number(id) : id;
    if (typeof numeric !== 'number' || !Number.isFinite(numeric)) {
      console.warn(`⚠️  [E2E CLEANUP] Ignoring un-trackable ${kind} id: ${String(id)}`);
      return;
    }
    this.created.push({ kind, id: numeric });
  }

  trackEnrollment(courseId: number, studentId: number): void {
    this.enrollments.push({ courseId, studentId });
  }

  async cleanup(): Promise<void> {
    const apiBase = getApiBase();
    const failures: string[] = [];

    // Enrollments first: they reference both a student and a course.
    for (const { courseId, studentId } of this.enrollments.reverse()) {
      const path = `/api/v1/enrollments/course/${courseId}/student/${studentId}`;
      try {
        const resp = await this.page.request.delete(`${apiBase}${path}`);
        if (!resp.ok() && resp.status() !== 404) failures.push(`${path} → ${resp.status()}`);
      } catch (err) {
        failures.push(`${path} → ${String(err)}`);
      }
    }

    // Deleting a user account needs "users:manage", which the teacher accounts these tests log
    // in as do not have - a teacher deleting its own account gets 403. So accounts are removed
    // with an admin token when one is available.
    const needsAdmin = this.created.some((item) => item.kind === 'users');
    const adminToken = needsAdmin ? await getAdminToken() : null;

    for (const kind of CLEANUP_ORDER) {
      // Newest first, so a row created later cannot block deleting an earlier one.
      const ids = this.created.filter((item) => item.kind === kind).map((item) => item.id).reverse();
      if (kind === 'users' && ids.length > 0 && !adminToken) {
        failures.push(
          `${ids.length} test account(s) (ids ${ids.join(', ')}) — no admin credentials, so they ` +
            `stay in the database. Set PLAYWRIGHT_ADMIN_EMAIL and PLAYWRIGHT_ADMIN_PASSWORD.`
        );
        continue;
      }
      for (const id of ids) {
        const path = DELETE_PATH[kind](id);
        try {
          const resp = await this.page.request.delete(`${apiBase}${path}`, {
            headers: kind === 'users' && adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
          });
          // 404 is fine: the test may already have deleted it, which is the point of some specs.
          if (!resp.ok() && resp.status() !== 404) failures.push(`${path} → ${resp.status()}`);
        } catch (err) {
          failures.push(`${path} → ${String(err)}`);
        }
      }
    }

    this.created.length = 0;
    this.enrollments.length = 0;

    if (failures.length > 0) {
      console.warn(
        `⚠️  [E2E CLEANUP] ${failures.length} test record(s) could not be deleted and are now ` +
          `left in the database:\n  ${failures.join('\n  ')}`
      );
    }
  }
}

/** Register a user and remember it, so the account is deleted when the test finishes. */
export async function registerTrackedUser(page: Page, tracker: TestDataTracker, user: TestUser) {
  const created = await registerUser(page, user);
  const payload = (created && (created as { data?: unknown }).data) || created;
  tracker.track('users', (payload as { id?: number })?.id);
  return payload;
}

/** Log in as a fresh teacher whose account is deleted when the test finishes. */
export async function loginAsTrackedTeacher(page: Page, tracker: TestDataTracker): Promise<TestUser> {
  const user = generateTeacherUser();
  await registerTrackedUser(page, tracker, user);
  await loginViaAPI(page, user.email, user.password);
  user.role = await getLoggedInRole(page);
  return user;
}
