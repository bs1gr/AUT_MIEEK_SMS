/**
 * sw-local-api.js — Local (offline) mode service worker
 *
 * Intercepts fetch calls to /api/v1/* on the same origin and serves them
 * entirely on-device using IndexedDB.  Only active when the app is in
 * "local mode" (sms_server_url = '/api/v1').
 *
 * Remote-mode requests go to a different origin and are never intercepted.
 *
 * Default credential: admin@sms-lite.app / AdminPassword123!
 */

'use strict';

// ── Constants ────────────────────────────────────────────────────────────────

const DB_NAME = 'sms_local_v1';
const DB_VERSION = 2;           // bump when schema changes
const JWT_SECRET = 'sms-local-offline-secret-v1';
const TOKEN_TTL_S = 60 * 60 * 8; // 8 hours

// ── IndexedDB ────────────────────────────────────────────────────────────────

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      function store(name, opts) {
        if (!db.objectStoreNames.contains(name)) return db.createObjectStore(name, opts);
        return ev.currentTarget.transaction.objectStore(name);
      }
      const users = store('users', { keyPath: 'id', autoIncrement: true });
      if (!users.indexNames.contains('email')) users.createIndex('email', 'email', { unique: true });

      const students = store('students', { keyPath: 'id', autoIncrement: true });
      if (!students.indexNames.contains('email')) students.createIndex('email', 'email', { unique: false });

      store('courses', { keyPath: 'id', autoIncrement: true });

      const grades = store('grades', { keyPath: 'id', autoIncrement: true });
      if (!grades.indexNames.contains('student_id')) grades.createIndex('student_id', 'student_id', { unique: false });
      if (!grades.indexNames.contains('course_id'))  grades.createIndex('course_id',  'course_id',  { unique: false });

      const att = store('attendance', { keyPath: 'id', autoIncrement: true });
      if (!att.indexNames.contains('student_id')) att.createIndex('student_id', 'student_id', { unique: false });
      if (!att.indexNames.contains('course_id'))  att.createIndex('course_id',  'course_id',  { unique: false });
      if (!att.indexNames.contains('date'))        att.createIndex('date',       'date',       { unique: false });

      const dp = store('daily_performance', { keyPath: 'id', autoIncrement: true });
      if (!dp.indexNames.contains('student_id')) dp.createIndex('student_id', 'student_id', { unique: false });
      if (!dp.indexNames.contains('course_id'))  dp.createIndex('course_id',  'course_id',  { unique: false });

      const enr = store('enrollments', { keyPath: 'id', autoIncrement: true });
      if (!enr.indexNames.contains('student_id')) enr.createIndex('student_id', 'student_id', { unique: false });
      if (!enr.indexNames.contains('course_id'))  enr.createIndex('course_id',  'course_id',  { unique: false });

      const hl = store('highlights', { keyPath: 'id', autoIncrement: true });
      if (!hl.indexNames.contains('student_id')) hl.createIndex('student_id', 'student_id', { unique: false });
    };
  });
}

function tx(storeName, mode, cb) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    cb(t.objectStore(storeName), (v) => resolve(v), (e) => reject(e));
    t.onerror = () => reject(t.error);
  }));
}

const dbGet    = (s, k)    => tx(s, 'readonly',  (os, ok, err) => { const r = os.get(k);    r.onsuccess = () => ok(r.result ?? null); r.onerror = err; });
const dbGetAll = (s)       => tx(s, 'readonly',  (os, ok, err) => { const r = os.getAll();  r.onsuccess = () => ok(r.result);         r.onerror = err; });
const dbAdd    = (s, rec)  => tx(s, 'readwrite', (os, ok, err) => { const r = os.add(rec);  r.onsuccess = () => ok(r.result);         r.onerror = err; });
const dbPut    = (s, rec)  => tx(s, 'readwrite', (os, ok, err) => { const r = os.put(rec);  r.onsuccess = () => ok(r.result);         r.onerror = err; });
const dbDel    = (s, k)    => tx(s, 'readwrite', (os, ok, err) => { const r = os.delete(k); r.onsuccess = () => ok();                 r.onerror = err; });
const dbCount  = (s)       => tx(s, 'readonly',  (os, ok, err) => { const r = os.count();   r.onsuccess = () => ok(r.result);         r.onerror = err; });

function dbByIndex(storeName, indexName, value) {
  return tx(storeName, 'readonly', (os, ok, err) => {
    const r = os.index(indexName).getAll(value);
    r.onsuccess = () => ok(r.result);
    r.onerror = err;
  });
}

function dbOneByIndex(storeName, indexName, value) {
  return tx(storeName, 'readonly', (os, ok, err) => {
    const r = os.index(indexName).get(value);
    r.onsuccess = () => ok(r.result ?? null);
    r.onerror = err;
  });
}

// ── JWT ──────────────────────────────────────────────────────────────────────

async function jwtKey(usage) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}

function b64u(buf) {
  const s = typeof buf === 'string' ? buf : String.fromCharCode(...new Uint8Array(buf));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function signJwt(payload) {
  const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = b64u(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_S }));
  const data = `${h}.${p}`;
  const sig = await crypto.subtle.sign('HMAC', await jwtKey('sign'), new TextEncoder().encode(data));
  return `${data}.${b64u(sig)}`;
}

async function verifyJwt(token) {
  try {
    const [h, p, s] = (token || '').split('.');
    if (!h || !p || !s) return null;
    const data = `${h}.${p}`;
    const sig = Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    if (!await crypto.subtle.verify('HMAC', await jwtKey('verify'), sig, new TextEncoder().encode(data))) return null;
    const pl = JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/')));
    if (pl.exp && Date.now() / 1000 > pl.exp) return null;
    return pl;
  } catch { return null; }
}

async function hashPw(pw) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw + JWT_SECRET));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Seeding ──────────────────────────────────────────────────────────────────

async function ensureSeeded() {
  const existing = await dbOneByIndex('users', 'email', 'admin@sms-lite.app');
  if (existing) return;
  await dbAdd('users', {
    email: 'admin@sms-lite.app',
    password_hash: await hashPw('AdminPassword123!'),
    full_name: 'Local Admin',
    role: 'admin',
    is_active: true,
    password_change_required: false,
    created_at: new Date().toISOString(),
  });
}

// ── Response helpers ─────────────────────────────────────────────────────────

const CORS_HEADERS = { 'Content-Type': 'application/json', 'X-SMS-Source': 'local-sw' };

const json   = (d, s = 200)   => new Response(JSON.stringify(d),   { status: s, headers: CORS_HEADERS });
const ok204  = ()              => new Response(null, { status: 204, headers: CORS_HEADERS });
const notFound   = (d = 'Not found')       => json({ detail: d }, 404);
const unauthorized = (d = 'Not authenticated') => json({ detail: d }, 401);
const badRequest   = (d = 'Bad request')       => json({ detail: d }, 422);
const paginated  = (items)     => json({ items, total: items.length, page: 1, size: items.length });

function safeUser(u) { if (!u) return null; const { password_hash: _, ...rest } = u; return rest; }
function now()       { return new Date().toISOString(); }

// ── Auth middleware ──────────────────────────────────────────────────────────

async function authUser(req) {
  const hdr = req.headers.get('Authorization') || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return null;
  const pl = await verifyJwt(token);
  if (!pl?.sub) return null;
  return dbGet('users', pl.sub);
}

async function requireAuth(req) {
  const u = await authUser(req);
  return u ? { user: u } : null;
}

// ── Auth handlers ────────────────────────────────────────────────────────────

async function authRegister(req) {
  let body; try { body = await req.json(); } catch { return badRequest('Invalid JSON'); }
  const { email, password, full_name, name } = body || {};
  if (!email || !password) return badRequest('email and password required');
  if (await dbOneByIndex('users', 'email', email)) return json({ detail: 'Email already registered' }, 409);
  const id = await dbAdd('users', {
    email,
    password_hash: await hashPw(password),
    full_name: full_name || name || '',
    role: 'teacher',
    is_active: true,
    password_change_required: false,
    created_at: now(),
  });
  return json(safeUser(await dbGet('users', id)), 201);
}

async function authRefresh(req) {
  const hdr = req.headers.get('Authorization') || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return unauthorized('No token');
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return unauthorized();
    const pl = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!pl?.sub) return unauthorized();
    const u = await dbGet('users', pl.sub);
    if (!u || !u.is_active) return unauthorized('User not found or inactive');
    const newToken = await signJwt({ sub: u.id, email: u.email, role: u.role });
    return json({ access_token: newToken, token_type: 'bearer', user: safeUser(u) });
  } catch { return unauthorized(); }
}

async function authLogin(req) {
  let body; try { body = await req.json(); } catch { return badRequest('Invalid JSON'); }
  const { email, password } = body || {};
  if (!email || !password) return badRequest('email and password required');
  const u = await dbOneByIndex('users', 'email', email);
  if (!u || await hashPw(password) !== u.password_hash) return unauthorized('Invalid credentials');
  const token = await signJwt({ sub: u.id, email: u.email, role: u.role });
  return json({ access_token: token, token_type: 'bearer', user: safeUser(u) });
}

async function authMe(req) {
  const u = await authUser(req);
  return u ? json(safeUser(u)) : unauthorized();
}

async function authChangePw(req) {
  const u = await authUser(req);
  if (!u) return unauthorized();
  let body; try { body = await req.json(); } catch { return badRequest('Invalid JSON'); }
  if (await hashPw(body.current_password) !== u.password_hash) return unauthorized('Wrong current password');
  await dbPut('users', { ...u, password_hash: await hashPw(body.new_password), password_change_required: false });
  const token = await signJwt({ sub: u.id, email: u.email, role: u.role });
  return json({ status: 'ok', access_token: token, token_type: 'bearer' });
}

// ── Students ─────────────────────────────────────────────────────────────────

async function studentsGet(req, url) {
  if (!await authUser(req)) return unauthorized();
  const q = url.searchParams.get('q') || '';
  let all = await dbGetAll('students');
  if (q) {
    const lq = q.toLowerCase();
    all = all.filter(s => `${s.first_name} ${s.last_name} ${s.email || ''}`.toLowerCase().includes(lq));
  }
  return json(all);           // normalizeResponseToArray handles plain arrays
}

async function studentsSearch(req, url) {
  if (!await authUser(req)) return unauthorized();
  const q = (url.searchParams.get('q') || '').toLowerCase();
  const all = await dbGetAll('students');
  return json(q ? all.filter(s => `${s.first_name} ${s.last_name} ${s.email || ''}`.toLowerCase().includes(q)) : all);
}

async function studentCreate(req) {
  if (!await authUser(req)) return unauthorized();
  let body; try { body = await req.json(); } catch { return badRequest('Invalid JSON'); }
  if (!body?.first_name || !body?.last_name) return badRequest('first_name and last_name required');
  const id = await dbAdd('students', { is_active: true, ...body, created_at: now(), updated_at: now() });
  return json(await dbGet('students', id), 201);
}

async function studentGet(req, id) {
  if (!await authUser(req)) return unauthorized();
  const s = await dbGet('students', id);
  return s ? json(s) : notFound('Student not found');
}

async function studentUpdate(req, id) {
  if (!await authUser(req)) return unauthorized();
  const s = await dbGet('students', id);
  if (!s) return notFound('Student not found');
  let body; try { body = await req.json(); } catch { return badRequest(); }
  const updated = { ...s, ...body, id, updated_at: now() };
  await dbPut('students', updated);
  return json(updated);
}

async function studentDelete(req, id) {
  if (!await authUser(req)) return unauthorized();
  if (!await dbGet('students', id)) return notFound('Student not found');
  await dbDel('students', id);
  return json({ message: 'Student deleted' });
}

// ── Courses ──────────────────────────────────────────────────────────────────

async function coursesGet(req)    { if (!await authUser(req)) return unauthorized(); return json(await dbGetAll('courses')); }
async function courseGet(req, id) { if (!await authUser(req)) return unauthorized(); const c = await dbGet('courses', id); return c ? json(c) : notFound('Course not found'); }

async function courseCreate(req) {
  if (!await authUser(req)) return unauthorized();
  let body; try { body = await req.json(); } catch { return badRequest(); }
  if (!body?.name) return badRequest('name required');
  const id = await dbAdd('courses', { ...body, created_at: now(), updated_at: now() });
  return json(await dbGet('courses', id), 201);
}

async function courseUpdate(req, id) {
  if (!await authUser(req)) return unauthorized();
  const c = await dbGet('courses', id);
  if (!c) return notFound('Course not found');
  let body; try { body = await req.json(); } catch { return badRequest(); }
  const updated = { ...c, ...body, id, updated_at: now() };
  await dbPut('courses', updated);
  return json(updated);
}

async function courseDelete(req, id) {
  if (!await authUser(req)) return unauthorized();
  if (!await dbGet('courses', id)) return notFound('Course not found');
  await dbDel('courses', id);
  return json({ message: 'Course deleted' });
}

// ── Grades ───────────────────────────────────────────────────────────────────

async function gradesGet(req, url) {
  if (!await authUser(req)) return unauthorized();
  const sid = url.searchParams.get('student_id');
  const cid = url.searchParams.get('course_id');
  let all = await dbGetAll('grades');
  if (sid) all = all.filter(g => g.student_id === Number(sid));
  if (cid) all = all.filter(g => g.course_id  === Number(cid));
  return paginated(all);
}

async function gradeCreate(req) {
  if (!await authUser(req)) return unauthorized();
  let body; try { body = await req.json(); } catch { return badRequest(); }
  if (!body?.student_id || !body?.course_id) return badRequest('student_id and course_id required');
  const id = await dbAdd('grades', { weight: 1, ...body, created_at: now(), updated_at: now() });
  return json(await dbGet('grades', id), 201);
}

async function gradeGet(req, id) { if (!await authUser(req)) return unauthorized(); const g = await dbGet('grades', id); return g ? json(g) : notFound(); }

async function gradeUpdate(req, id) {
  if (!await authUser(req)) return unauthorized();
  const g = await dbGet('grades', id);
  if (!g) return notFound();
  let body; try { body = await req.json(); } catch { return badRequest(); }
  const u = { ...g, ...body, id, updated_at: now() };
  await dbPut('grades', u); return json(u);
}

async function gradeDelete(req, id) {
  if (!await authUser(req)) return unauthorized();
  if (!await dbGet('grades', id)) return notFound();
  await dbDel('grades', id); return json({ message: 'Grade deleted' });
}

async function gradesByStudent(req, sid) { if (!await authUser(req)) return unauthorized(); return json(await dbByIndex('grades', 'student_id', sid)); }
async function gradesByCourse(req, cid)  { if (!await authUser(req)) return unauthorized(); return json(await dbByIndex('grades', 'course_id',  cid)); }

// ── Attendance ───────────────────────────────────────────────────────────────

async function attendanceGet(req, url) {
  if (!await authUser(req)) return unauthorized();
  const sid = url.searchParams.get('student_id');
  const cid = url.searchParams.get('course_id');
  let all = await dbGetAll('attendance');
  if (sid) all = all.filter(a => a.student_id === Number(sid));
  if (cid) all = all.filter(a => a.course_id  === Number(cid));
  return paginated(all);
}

async function attendanceCreate(req) {
  if (!await authUser(req)) return unauthorized();
  let body; try { body = await req.json(); } catch { return badRequest(); }
  if (!body?.student_id || !body?.course_id || !body?.date) return badRequest('student_id, course_id, date required');
  const id = await dbAdd('attendance', { status: 'Present', ...body, created_at: now(), updated_at: now() });
  return json(await dbGet('attendance', id), 201);
}

async function attendanceGetOne(req, id) { if (!await authUser(req)) return unauthorized(); const a = await dbGet('attendance', id); return a ? json(a) : notFound(); }

async function attendanceUpdate(req, id) {
  if (!await authUser(req)) return unauthorized();
  const a = await dbGet('attendance', id);
  if (!a) return notFound();
  let body; try { body = await req.json(); } catch { return badRequest(); }
  const u = { ...a, ...body, id, updated_at: now() };
  await dbPut('attendance', u); return json(u);
}

async function attendanceDelete(req, id) {
  if (!await authUser(req)) return unauthorized();
  if (!await dbGet('attendance', id)) return notFound();
  await dbDel('attendance', id); return json({ message: 'Attendance record deleted' });
}

async function attendanceByStudent(req, sid) { if (!await authUser(req)) return unauthorized(); return json(await dbByIndex('attendance', 'student_id', sid)); }
async function attendanceByCourse(req, cid)  { if (!await authUser(req)) return unauthorized(); return json(await dbByIndex('attendance', 'course_id',  cid)); }

async function attendanceByDateCourse(req, date, cid) {
  if (!await authUser(req)) return unauthorized();
  const all = await dbByIndex('attendance', 'course_id', cid);
  return json(all.filter(a => a.date === date));
}

// ── Daily Performance ────────────────────────────────────────────────────────

async function dpByDateCourse(req, date, cid) {
  if (!await authUser(req)) return unauthorized();
  const all = await dbByIndex('daily_performance', 'course_id', cid);
  return json(all.filter(d => d.date === date));
}

async function dpCreate(req) {
  if (!await authUser(req)) return unauthorized();
  let body; try { body = await req.json(); } catch { return badRequest(); }
  const id = await dbAdd('daily_performance', { ...body, created_at: now() });
  return json(await dbGet('daily_performance', id), 201);
}

async function dpUpdate(req, id) {
  if (!await authUser(req)) return unauthorized();
  const d = await dbGet('daily_performance', id);
  if (!d) return notFound();
  let body; try { body = await req.json(); } catch { return badRequest(); }
  const u = { ...d, ...body, id };
  await dbPut('daily_performance', u); return json(u);
}

async function dpDelete(req, id) {
  if (!await authUser(req)) return unauthorized();
  if (!await dbGet('daily_performance', id)) return notFound();
  await dbDel('daily_performance', id); return json({ message: 'Deleted' });
}

// ── Enrollments ──────────────────────────────────────────────────────────────

async function enrollCourse(req, cid) {
  if (!await authUser(req)) return unauthorized();
  let body; try { body = await req.json(); } catch { return badRequest(); }
  const ids = body?.student_ids || [];
  const existing = await dbByIndex('enrollments', 'course_id', cid);
  const existingIds = new Set(existing.map(e => e.student_id));
  let count = 0;
  for (const sid of ids) {
    if (!existingIds.has(sid)) {
      await dbAdd('enrollments', { student_id: sid, course_id: cid, enrolled_at: now() });
      count++;
    }
  }
  return json({ enrollment_count: count, message: `${count} student(s) enrolled` });
}

async function enrollmentsGet(req) {
  if (!await authUser(req)) return unauthorized();
  return paginated(await dbGetAll('enrollments'));
}

async function enrollmentsByCourse(req, cid) {
  if (!await authUser(req)) return unauthorized();
  return json(await dbByIndex('enrollments', 'course_id', cid));
}

async function enrollmentsByStudent(req, sid) {
  if (!await authUser(req)) return unauthorized();
  return json(await dbByIndex('enrollments', 'student_id', sid));
}

async function enrolledStudents(req, cid) {
  if (!await authUser(req)) return unauthorized();
  const enr = await dbByIndex('enrollments', 'course_id', cid);
  const students = await Promise.all(enr.map(e => dbGet('students', e.student_id)));
  return json(students.filter(Boolean));
}

async function unenroll(req, cid, sid) {
  if (!await authUser(req)) return unauthorized();
  const all = await dbByIndex('enrollments', 'course_id', cid);
  const e = all.find(x => x.student_id === sid);
  if (!e) return notFound('Enrollment not found');
  await dbDel('enrollments', e.id);
  return json({ message: 'Unenrolled' });
}

// ── Highlights ───────────────────────────────────────────────────────────────

async function highlightsGet(req) { if (!await authUser(req)) return unauthorized(); return paginated(await dbGetAll('highlights')); }
async function highlightCreate(req) {
  if (!await authUser(req)) return unauthorized();
  let body; try { body = await req.json(); } catch { return badRequest(); }
  const id = await dbAdd('highlights', { ...body, created_at: now(), updated_at: now() });
  return json(await dbGet('highlights', id), 201);
}
async function highlightGet(req, id) { if (!await authUser(req)) return unauthorized(); const h = await dbGet('highlights', id); return h ? json(h) : notFound(); }
async function highlightUpdate(req, id) {
  if (!await authUser(req)) return unauthorized();
  const h = await dbGet('highlights', id);
  if (!h) return notFound();
  let body; try { body = await req.json(); } catch { return badRequest(); }
  const u = { ...h, ...body, id, updated_at: now() };
  await dbPut('highlights', u); return json(u);
}
async function highlightDelete(req, id) {
  if (!await authUser(req)) return unauthorized();
  if (!await dbGet('highlights', id)) return notFound();
  await dbDel('highlights', id); return json({ message: 'Deleted' });
}
async function highlightsByStudent(req, sid) { if (!await authUser(req)) return unauthorized(); return json(await dbByIndex('highlights', 'student_id', sid)); }

// ── Analytics ────────────────────────────────────────────────────────────────

async function analyticsDashboard(req) {
  if (!await authUser(req)) return unauthorized();
  const [ns, nc, ng, na] = await Promise.all([
    dbCount('students'), dbCount('courses'), dbCount('grades'), dbCount('attendance'),
  ]);
  const grades = await dbGetAll('grades');
  const att    = await dbGetAll('attendance');
  const avgGrade = grades.length
    ? grades.reduce((s, g) => s + (g.grade / (g.max_grade || 1)) * 100, 0) / grades.length
    : 0;
  const present = att.filter(a => a.status === 'Present' || a.status === 'Late').length;
  const avgAtt  = att.length ? (present / att.length) * 100 : 0;
  return json({
    total_students: ns, total_courses: nc, total_grades: ng, total_attendance_records: na,
    average_grade: Math.round(avgGrade * 10) / 10,
    average_attendance: Math.round(avgAtt * 10) / 10,
    timestamp: now(),
  });
}

async function analyticsStudentSummary(req, sid) {
  if (!await authUser(req)) return unauthorized();
  const student = await dbGet('students', sid);
  if (!student) return notFound('Student not found');
  const enr    = await dbByIndex('enrollments', 'student_id', sid);
  const grades = await dbByIndex('grades', 'student_id', sid);
  const att    = await dbByIndex('attendance', 'student_id', sid);
  const present = att.filter(a => a.status === 'Present' || a.status === 'Late').length;
  const avgGrade = grades.length
    ? grades.reduce((s, g) => s + (g.grade / (g.max_grade || 1)) * 100, 0) / grades.length : 0;
  const attRate  = att.length ? (present / att.length) * 100 : 0;
  const coursesSummary = await Promise.all(enr.map(async e => {
    const course = await dbGet('courses', e.course_id);
    const cg = grades.filter(g => g.course_id === e.course_id);
    const ca = att.filter(a => a.course_id === e.course_id);
    const grade = cg.length ? cg.reduce((s, g) => s + (g.grade / (g.max_grade || 1)) * 100, 0) / cg.length : 0;
    const cp = ca.filter(a => a.status === 'Present' || a.status === 'Late').length;
    const letter = grade >= 90 ? 'A' : grade >= 80 ? 'B' : grade >= 70 ? 'C' : grade >= 60 ? 'D' : 'F';
    return { course_id: e.course_id, course_name: course?.name || '', grade, letter_grade: letter, attendance_rate: ca.length ? (cp / ca.length) * 100 : 0 };
  }));
  return json({
    student_id: sid, student_name: `${student.first_name} ${student.last_name}`,
    email: student.email, total_courses: enr.length,
    average_grade: Math.round(avgGrade * 10) / 10,
    attendance_rate: Math.round(attRate * 10) / 10,
    trend: 'stable', courses_summary: coursesSummary,
  });
}

async function analyticsFinalGrade(req, sid, cid) {
  if (!await authUser(req)) return unauthorized();
  const grades = (await dbByIndex('grades', 'student_id', sid)).filter(g => g.course_id === cid);
  const totalW = grades.reduce((s, g) => s + (g.weight || 1), 0);
  const grade  = totalW ? grades.reduce((s, g) => s + (g.grade / (g.max_grade || 1)) * 100 * (g.weight || 1), 0) / totalW : 0;
  const letter = grade >= 90 ? 'A' : grade >= 80 ? 'B' : grade >= 70 ? 'C' : grade >= 60 ? 'D' : 'F';
  return json({ student_id: sid, course_id: cid, final_grade: Math.round(grade * 10) / 10, letter_grade: letter });
}

async function analyticsStudentPerformance(req, sid) {
  if (!await authUser(req)) return unauthorized();
  const grades = await dbByIndex('grades', 'student_id', sid);
  return json(grades.map(g => ({ date: g.date || g.created_at, value: (g.grade / (g.max_grade || 1)) * 100, course_id: g.course_id })));
}

async function analyticsStudentAttendance(req, sid) {
  if (!await authUser(req)) return unauthorized();
  const att = await dbByIndex('attendance', 'student_id', sid);
  const present = att.filter(a => a.status === 'Present').length;
  const late    = att.filter(a => a.status === 'Late').length;
  const absent  = att.filter(a => a.status === 'Absent').length;
  const excused = att.filter(a => a.status === 'Excused').length;
  return json({ total: att.length, present, late, absent, excused, attendance_rate: att.length ? ((present + late) / att.length) * 100 : 0 });
}

async function analyticsCourseDistribution(req, cid) {
  if (!await authUser(req)) return unauthorized();
  const grades = await dbByIndex('grades', 'course_id', cid);
  const dist = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const g of grades) {
    const pct = (g.grade / (g.max_grade || 1)) * 100;
    dist[pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F']++;
  }
  return json({ course_id: cid, grade_distribution: dist, total_grades: grades.length });
}

// ── Admin Users ──────────────────────────────────────────────────────────────

async function adminUsersGet(req) {
  if (!await authUser(req)) return unauthorized();
  return json((await dbGetAll('users')).map(safeUser));
}

async function adminUserCreate(req) {
  if (!await authUser(req)) return unauthorized();
  let body; try { body = await req.json(); } catch { return badRequest(); }
  if (!body?.email || !body?.password) return badRequest('email and password required');
  if (await dbOneByIndex('users', 'email', body.email)) return json({ detail: 'User already exists' }, 409);
  const id = await dbAdd('users', {
    email: body.email,
    password_hash: await hashPw(body.password),
    full_name: body.full_name || body.name || '',
    role: body.role || 'teacher',
    is_active: true,
    password_change_required: body.password_change_required ?? true,
    created_at: now(),
  });
  return json(safeUser(await dbGet('users', id)), 201);
}

async function adminUserUpdate(req, id) {
  if (!await authUser(req)) return unauthorized();
  const u = await dbGet('users', id);
  if (!u) return notFound('User not found');
  let body; try { body = await req.json(); } catch { return badRequest(); }
  const updated = { ...u, ...body, id, password_hash: u.password_hash };
  await dbPut('users', updated);
  return json(safeUser(updated));
}

async function adminUserDelete(req, id) {
  if (!await authUser(req)) return unauthorized();
  if (!await dbGet('users', id)) return notFound('User not found');
  await dbDel('users', id);
  return json({ message: 'User deleted' });
}

async function adminUserResetPw(req, id) {
  if (!await authUser(req)) return unauthorized();
  const u = await dbGet('users', id);
  if (!u) return notFound();
  let body; try { body = await req.json(); } catch { return badRequest(); }
  await dbPut('users', { ...u, password_hash: await hashPw(body.new_password), password_change_required: false });
  return json({ message: 'Password reset' });
}

// ── Sample data ──────────────────────────────────────────────────────────────

async function generateSampleData() {
  const COURSES = [
    { name: 'Mathematics', code: 'MATH101', description: 'Algebra and calculus fundamentals' },
    { name: 'Physics', code: 'PHYS101', description: 'Mechanics and thermodynamics' },
    { name: 'Computer Science', code: 'CS101', description: 'Algorithms and data structures' },
    { name: 'English', code: 'ENG101', description: 'Academic writing and communication' },
    { name: 'Greek Language', code: 'GRK101', description: 'Modern Greek language and literature' },
  ];
  const STUDENTS = [
    { first_name: 'Αλέξανδρος', last_name: 'Παπαδόπουλος', email: 'alex.papadop@student.cy' },
    { first_name: 'Μαρία',      last_name: 'Κωνσταντίνου', email: 'maria.konst@student.cy' },
    { first_name: 'Νίκος',      last_name: 'Γεωργίου',     email: 'nikos.georg@student.cy' },
    { first_name: 'Ελένη',      last_name: 'Χριστοδούλου', email: 'eleni.christ@student.cy' },
    { first_name: 'Κώστας',     last_name: 'Αντωνίου',     email: 'kostas.ant@student.cy' },
    { first_name: 'Σοφία',      last_name: 'Δημητρίου',    email: 'sofia.dim@student.cy' },
    { first_name: 'Andreas',    last_name: 'Philippou',    email: 'andreas.phil@student.cy' },
    { first_name: 'Christina',  last_name: 'Ioannou',      email: 'christina.io@student.cy' },
  ];

  const t = now();
  const courseIds = [];
  for (const c of COURSES) courseIds.push(await dbAdd('courses', { ...c, created_at: t, updated_at: t }));

  const studentIds = [];
  for (const s of STUDENTS) studentIds.push(await dbAdd('students', { ...s, is_active: true, created_at: t, updated_at: t }));

  const STATUSES = ['Present', 'Present', 'Present', 'Late', 'Absent'];
  const today = new Date();

  for (const sid of studentIds) {
    const assignedCourses = courseIds.slice(0, 3);
    for (const cid of assignedCourses) {
      await dbAdd('enrollments', { student_id: sid, course_id: cid, enrolled_at: t });
      // 3 grades
      for (let i = 0; i < 3; i++) {
        const g = Math.round(Math.random() * 40 + 60);
        await dbAdd('grades', { student_id: sid, course_id: cid, grade: g, max_grade: 100, weight: 1, grade_type: ['Quiz', 'Exam', 'Assignment'][i], created_at: t, updated_at: t });
      }
      // 5 attendance records
      for (let i = 0; i < 5; i++) {
        const d = new Date(today); d.setDate(d.getDate() - i * 7);
        await dbAdd('attendance', { student_id: sid, course_id: cid, date: d.toISOString().slice(0, 10), status: STATUSES[i % STATUSES.length], created_at: t, updated_at: t });
      }
    }
  }
  return json({ message: `Created ${studentIds.length} students and ${courseIds.length} courses with sample grades and attendance` });
}

// ── Stub responses ────────────────────────────────────────────────────────────
// Return valid empty-state JSON so the frontend doesn't crash on missing endpoints.

const emptyPage = () => json({ items: [], total: 0, page: 1, size: 0 });
const emptyList = () => json([]);

// ── Router ───────────────────────────────────────────────────────────────────

async function router(request) {
  const url  = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '');
  const m    = request.method.toUpperCase();

  // Health (no /api/v1 prefix)
  if (path === '/health' && m === 'GET') return json({ status: 'ok', backend: 'local-sw', db: DB_NAME });

  // Auth
  if (path === '/api/v1/auth/login'           && m === 'POST') return authLogin(request);
  if (path === '/api/v1/auth/register'        && m === 'POST') return authRegister(request);
  if (path === '/api/v1/auth/refresh'         && m === 'POST') return authRefresh(request);
  if (path === '/api/v1/auth/logout'          && m === 'POST') return json({ message: 'Logged out' });
  if (path === '/api/v1/auth/me'              && m === 'GET')  return authMe(request);
  if (path === '/api/v1/auth/change-password' && m === 'POST') return authChangePw(request);

  // Students
  if (path === '/api/v1/students'        && m === 'GET')  return studentsGet(request, url);
  if (path === '/api/v1/students'        && m === 'POST') return studentCreate(request);
  if (path === '/api/v1/students/search' && m === 'GET')  return studentsSearch(request, url);

  let mm;
  mm = path.match(/^\/api\/v1\/students\/(\d+)$/);
  if (mm) {
    const id = Number(mm[1]);
    if (m === 'GET')    return studentGet(request, id);
    if (m === 'PUT')    return studentUpdate(request, id);
    if (m === 'DELETE') return studentDelete(request, id);
  }

  // Courses
  if (path === '/api/v1/courses' && m === 'GET')  return coursesGet(request);
  if (path === '/api/v1/courses' && m === 'POST') return courseCreate(request);
  mm = path.match(/^\/api\/v1\/courses\/(\d+)$/);
  if (mm) {
    const id = Number(mm[1]);
    if (m === 'GET')    return courseGet(request, id);
    if (m === 'PUT')    return courseUpdate(request, id);
    if (m === 'DELETE') return courseDelete(request, id);
  }

  // Grades
  if (path === '/api/v1/grades' && m === 'GET')  return gradesGet(request, url);
  if (path === '/api/v1/grades' && m === 'POST') return gradeCreate(request);
  mm = path.match(/^\/api\/v1\/grades\/(\d+)$/);
  if (mm) {
    const id = Number(mm[1]);
    if (m === 'GET')    return gradeGet(request, id);
    if (m === 'PUT')    return gradeUpdate(request, id);
    if (m === 'DELETE') return gradeDelete(request, id);
  }
  mm = path.match(/^\/api\/v1\/grades\/student\/(\d+)$/);
  if (mm) return gradesByStudent(request, Number(mm[1]));
  mm = path.match(/^\/api\/v1\/grades\/course\/(\d+)$/);
  if (mm) return gradesByCourse(request, Number(mm[1]));

  // Attendance
  if (path === '/api/v1/attendance' && m === 'GET')  return attendanceGet(request, url);
  if (path === '/api/v1/attendance' && m === 'POST') return attendanceCreate(request);
  mm = path.match(/^\/api\/v1\/attendance\/(\d+)$/);
  if (mm) {
    const id = Number(mm[1]);
    if (m === 'GET')    return attendanceGetOne(request, id);
    if (m === 'PUT')    return attendanceUpdate(request, id);
    if (m === 'DELETE') return attendanceDelete(request, id);
  }
  mm = path.match(/^\/api\/v1\/attendance\/student\/(\d+)$/);
  if (mm) return attendanceByStudent(request, Number(mm[1]));
  mm = path.match(/^\/api\/v1\/attendance\/course\/(\d+)$/);
  if (mm) return attendanceByCourse(request, Number(mm[1]));
  mm = path.match(/^\/api\/v1\/attendance\/date\/(.+)\/course\/(\d+)$/);
  if (mm) return attendanceByDateCourse(request, mm[1], Number(mm[2]));

  // Daily performance
  mm = path.match(/^\/api\/v1\/daily-performance\/date\/(.+)\/course\/(\d+)$/);
  if (mm && m === 'GET') return dpByDateCourse(request, mm[1], Number(mm[2]));
  if (path === '/api/v1/daily-performance' && m === 'POST') return dpCreate(request);
  mm = path.match(/^\/api\/v1\/daily-performance\/(\d+)$/);
  if (mm) {
    const id = Number(mm[1]);
    if (m === 'PUT')    return dpUpdate(request, id);
    if (m === 'DELETE') return dpDelete(request, id);
  }

  // Enrollments
  mm = path.match(/^\/api\/v1\/enrollments\/course\/(\d+)\/student\/(\d+)$/);
  if (mm && m === 'DELETE') return unenroll(request, Number(mm[1]), Number(mm[2]));
  mm = path.match(/^\/api\/v1\/enrollments\/course\/(\d+)\/students$/);
  if (mm && m === 'GET') return enrolledStudents(request, Number(mm[1]));
  mm = path.match(/^\/api\/v1\/enrollments\/course\/(\d+)$/);
  if (mm) {
    const cid = Number(mm[1]);
    if (m === 'POST') return enrollCourse(request, cid);
    if (m === 'GET')  return enrollmentsByCourse(request, cid);
  }
  mm = path.match(/^\/api\/v1\/enrollments\/student\/(\d+)$/);
  if (mm && m === 'GET') return enrollmentsByStudent(request, Number(mm[1]));
  if (path === '/api/v1/enrollments' && m === 'GET') return enrollmentsGet(request);

  // Highlights
  if (path === '/api/v1/highlights' && m === 'GET')  return highlightsGet(request);
  if (path === '/api/v1/highlights' && m === 'POST') return highlightCreate(request);
  mm = path.match(/^\/api\/v1\/highlights\/(\d+)$/);
  if (mm) {
    const id = Number(mm[1]);
    if (m === 'GET')    return highlightGet(request, id);
    if (m === 'PUT')    return highlightUpdate(request, id);
    if (m === 'DELETE') return highlightDelete(request, id);
  }
  mm = path.match(/^\/api\/v1\/highlights\/student\/(\d+)$/);
  if (mm) return highlightsByStudent(request, Number(mm[1]));

  // Analytics
  if (path === '/api/v1/analytics/dashboard' && m === 'GET') return analyticsDashboard(request);
  mm = path.match(/^\/api\/v1\/analytics\/student\/(\d+)\/summary$/);
  if (mm) return analyticsStudentSummary(request, Number(mm[1]));
  mm = path.match(/^\/api\/v1\/analytics\/student\/(\d+)\/all-courses-summary$/);
  if (mm) return analyticsStudentSummary(request, Number(mm[1])); // same shape
  mm = path.match(/^\/api\/v1\/analytics\/student\/(\d+)\/course\/(\d+)\/final-grade$/);
  if (mm) return analyticsFinalGrade(request, Number(mm[1]), Number(mm[2]));
  mm = path.match(/^\/api\/v1\/analytics\/student\/(\d+)\/performance$/);
  if (mm) return analyticsStudentPerformance(request, Number(mm[1]));
  mm = path.match(/^\/api\/v1\/analytics\/student\/(\d+)\/attendance$/);
  if (mm) return analyticsStudentAttendance(request, Number(mm[1]));
  mm = path.match(/^\/api\/v1\/analytics\/student\/(\d+)\/trends$/);
  if (mm) return json([]);
  mm = path.match(/^\/api\/v1\/analytics\/course\/(\d+)\/grade-distribution$/);
  if (mm) return analyticsCourseDistribution(request, Number(mm[1]));
  if (path === '/api/v1/analytics/lookups' && m === 'GET') return json({ lookups: {} });
  // Predictive analytics — not implemented in local mode
  if (path.startsWith('/api/v1/analytics/predictive')) return json({ detail: 'Predictive analytics not available in local mode' }, 501);

  // Admin users
  if (path === '/api/v1/admin/users' && m === 'GET')  return adminUsersGet(request);
  if (path === '/api/v1/admin/users' && m === 'POST') return adminUserCreate(request);
  mm = path.match(/^\/api\/v1\/admin\/users\/(\d+)$/);
  if (mm) {
    const id = Number(mm[1]);
    if (m === 'PATCH')  return adminUserUpdate(request, id);
    if (m === 'DELETE') return adminUserDelete(request, id);
  }
  mm = path.match(/^\/api\/v1\/admin\/users\/(\d+)\/reset-password$/);
  if (mm && m === 'POST') return adminUserResetPw(request, Number(mm[1]));

  // Admin ops
  if (path === '/api/v1/adminops/generate-sample-data' && m === 'POST') return generateSampleData();
  if (path === '/api/v1/adminops/clear'                && m === 'POST') return json({ message: 'Clear not available in local mode — manage data directly' }, 501);

  // ── Stubs for features not yet implemented in local mode ──────────────────

  if (path === '/api/v1/notifications/unread-count')  return json({ unread_count: 0 });
  if (path.startsWith('/api/v1/notifications'))       return m === 'GET' ? emptyPage() : json({ status: 'ok' });
  if (path.startsWith('/api/v1/sessions/semesters'))  return emptyList();
  if (path.startsWith('/api/v1/sessions'))            return json({ detail: 'Not available in local mode' }, 501);
  if (path === '/api/v1/dashboards')                  return m === 'GET' ? emptyList() : json({}, 201);
  if (path.startsWith('/api/v1/dashboards'))          return json({ detail: 'Not available in local mode' }, 501);
  if (path.startsWith('/api/v1/custom-reports/statistics')) return json({ total_reports: 0 });
  if (path.startsWith('/api/v1/custom-reports'))      return m === 'GET' ? emptyList() : json({}, 201);
  if (path.startsWith('/api/v1/saved-searches') || path.startsWith('/api/v1/search/saved')) return m === 'GET' ? emptyList() : json({}, 201);
  if (path === '/api/v1/search/history')              return m === 'GET' ? emptyList() : json({ cleared: 0 });
  if (path === '/api/v1/search/statistics')           return json({ entity_type: 'all', count: 0 });
  if (path === '/api/v1/search/suggestions')          return emptyList();
  if (path.startsWith('/api/v1/search'))              return m === 'GET' ? emptyList() : emptyPage();
  if (path.startsWith('/api/v1/rate-limits'))         return json({ limits: {} });
  if (path.startsWith('/api/v1/jobs'))                return m === 'GET' ? emptyList() : json({ status: 'PENDING' });
  if (path.startsWith('/api/v1/import-export'))       return m === 'GET' ? emptyPage() : json({ detail: 'Import/export not available in local mode' }, 501);
  if (path.startsWith('/api/v1/imports'))             return json({ detail: 'Import not available in local mode' }, 501);
  if (path.startsWith('/api/v1/feedback'))            return m === 'GET' ? emptyPage() : json({ status: 'ok' });
  if (path.startsWith('/api/v1/reports'))             return json({ detail: 'PDF reports not available in local mode' }, 501);
  if (path.startsWith('/api/v1/permissions'))         return m === 'GET' ? emptyList() : json({ status: 'ok' });
  if (path.startsWith('/api/v1/rbac'))                return m === 'GET' ? emptyList() : json({ status: 'ok' });
  if (path.startsWith('/api/v1/admin/rbac'))          return m === 'GET' ? json({ roles: [], permissions: [], role_permissions: [], user_roles: [] }) : json({ status: 'ok' });
  if (path.startsWith('/api/v1/admin/sample-data'))   return json({ message: 'Use /adminops/generate-sample-data instead' });
  if (path.startsWith('/api/v1/system'))              return json({ status: 'ok' });

  // Unmatched API path
  if (path.startsWith('/api/v1/')) {
    return json({ detail: `Local mode: ${m} ${path} not implemented` }, 501);
  }

  return null; // not an API route — let browser handle (static assets)
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

self.addEventListener('install', (ev) => {
  ev.waitUntil(ensureSeeded().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (ev) => {
  const url = new URL(ev.request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith('/api/v1/') && url.pathname !== '/health') return;

  ev.respondWith(
    router(ev.request).then((res) => res ?? fetch(ev.request))
      .catch((err) => {
        console.error('[sw-local-api]', err);
        return json({ detail: 'Local service worker error', error: String(err) }, 500);
      }),
  );
});
