# Frontend Comprehensive Review - $11.9.7

**Date:** Session context preservation
**Status:** Complete architectural analysis
**Scope:** React 18 + TypeScript + Vite SPA, all 39 components analyzed

---

## 1. ARCHITECTURE OVERVIEW

### 1.1 Technology Stack

- **Framework:** React 18 (TypeScript/TSX)
- **Build Tool:** Vite 5 with HMR
- **UI Framework:** Tailwind CSS 3
- **State Management:** React Query (server state) + Local React state
- **i18n:** i18next with Greek/English modular structure
- **HTTP Client:** Axios with auth interceptor
- **Router:** React Router v6
- **Testing:** Vitest + React Testing Library
- **Styling:** Tailwind CSS + CSS modules

### 1.2 Deployment Architecture

```text
Frontend (SPA)
├── Development: Vite dev server (localhost:5173)
├── Production: Built React SPA served by FastAPI (port 8080)
└── Built artifacts: frontend/dist/ → copied to backend/static/

```text
### 1.3 File Structure

```text
frontend/src/
├── App.tsx                          # Root with providers & navigation
├── api/api.js                       # Axios client with auth interceptor
├── components/                      # 39 components total
│   ├── auth/                        # Login, ProtectedRoute
│   ├── students/                    # CRUD operations
│   ├── courses/                     # Management
│   ├── common/                      # Reusable UI components
│   └── operations/                  # Control/backup panels
├── hooks/                           # Custom React hooks
├── locales/                         # i18n locale files (en/, el/)
├── services/                        # Auth, API integrations
├── utils/                           # Helpers (date, formatting)
├── __tests__/                       # Vitest suite
├── config/                          # Constants, API config
└── translations.ts                  # i18n setup & namespace mapping

```text
---

## 2. COMPONENT INVENTORY (39 TOTAL)

### 2.1 Authentication & Authorization (3 components)

| Component | Location | Purpose | Auth Mode |
|-----------|----------|---------|-----------|
| LoginPage | `/auth/LoginPage.tsx` | Username/password login | Respects AUTH_MODE |
| ProtectedRoute | `/auth/ProtectedRoute.tsx` | Route guard for authenticated routes | Redirects to login if !token |
| LogoutButton | Embedded in nav | Sign out + clear session | Triggers logout endpoint |

**Pattern:** LoginPage calls `authService.login()` which stores token in localStorage.

### 2.2 Student Management (8 components)

| Component | Purpose | Features |
|-----------|---------|----------|
| StudentList | Main student page | Filter, paginate, search |
| StudentForm | Add/edit student | Validation, phone required |
| StudentDetails | View single record | Expandable sections |
| StudentUpdate | Edit form (modal) | Inline editing |
| StudentsPage | Container/layout | Orchestrates list + form |
| AddStudentButton | Action trigger | Opens modal |
| StudentSearch | Filter UI | Regex, date range |
| EnrollmentPanel | Course enrollment | Manage courses per student |

### 2.3 Course Management (6 components)

| Component | Purpose | Features |
|-----------|---------|----------|
| CourseList | Main course page | Table view, search |
| CourseForm | Add/edit course | Weighted grading, absence penalty |
| CourseDetails | View details | Display mode |
| CourseUpdate | Edit modal | Inline editing |
| CoursesPage | Container | Orchestrates list + form |
| AddCourseButton | Action trigger | Opens modal |

### 2.4 Grade & Performance (6 components)

| Component | Purpose | Features |
|-----------|---------|----------|
| GradeList | Display grades | Grade calculation display |
| GradeForm | Add/edit grade | Component type, weight |
| GradeDetails | View single grade | Expanded info |
| AttendancePanel | Track absences | Deduct penalty from final |
| DailyPerformanceList | Daily ratings | Comment tracking |
| PerformanceForm | Record performance | 1-10 scale |

### 2.5 Common/Reusable UI (8 components)

| Component | Purpose | Usage |
|-----------|---------|-------|
| Modal | Generic dialog | All forms use Modal |
| Button | Styled button | Tailwind + states |
| Input | Text/number field | Form standard |
| Select | Dropdown | Filters, selections |
| Table | Data display | Lists, paginated |
| ErrorBoundary | Catch React errors | Wraps entire app |
| ErrorNotification | Toast/alert | Error display |
| LanguageToggle | EN/EL switcher | Navbar |

### 2.6 Operations & Control (4 components)

| Component | Purpose | Features |
|-----------|---------|----------|
| OperationsPage | Control panel | Backup management, stats |
| BackupPanel | Backup list/download | CRUD backup files |
| SystemMetrics | Status display | Health checks |
| ControlPanel | Admin controls | Feature toggles (future) |

### 2.7 Navigation & Layout (4 components)

| Component | Purpose | Features |
|-----------|---------|----------|
| App | Root layout | Providers, routing, auth |
| Navbar | Top navigation | Logo, links, language toggle |
| Sidebar | Left navigation | Menu, collapsible |
| Footer | Bottom footer | Links, version |

---

## 3. CRITICAL PATTERNS & BEST PRACTICES

### 3.1 🔐 Authentication Pattern

```typescript
// ✅ CORRECT: Respects AUTH_MODE (permissive, strict, disabled)
const { data, isLoading } = useQuery({
  queryKey: ['students'],
  queryFn: () => api.get('/students/'),
  retry: (failureCount, error) => {
    if (error?.response?.status === 401) {
      // AUTH_MODE=disabled: Pass through 200
      // AUTH_MODE=permissive: May get 401, retry once
      // AUTH_MODE=strict: Always get 401 if !token
      return false;
    }
    return failureCount < 2;
  }
});

// ❌ WRONG: Doesn't handle AUTH_MODE properly
if (!localStorage.getItem('token')) {
  redirect('/login');
}

```text
**Key Point:** The API client automatically includes the `Authorization: Bearer <token>` header if `localStorage.token` exists.

### 3.2 🌍 i18n Mandatory Pattern

```typescript
// ✅ MANDATORY for all visible text
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return (
    <>
      <h1>{t('common.title')}</h1>
      <button>{t('common.save')}</button>
      {/* Nested access also works: */}
      <p>{t('students.addStudent')}</p>
    </>
  );
}

// ❌ NEVER hardcode strings:
// return <h1>Add Student</h1>;  // Translation integrity test will fail!

```text
**Translation Structure:**

```text
frontend/src/locales/
├── en/
│   ├── common.ts        # Shared: title, save, cancel, error, loading
│   ├── auth.ts          # Login, logout, session expired
│   ├── students.ts      # Student CRUD, enrollment
│   ├── courses.ts       # Course CRUD, grading
│   ├── grades.ts        # Grade components
│   ├── attendance.ts    # Attendance tracking
│   ├── performance.ts   # Daily performance
│   ├── operations.ts    # Control panel, backups
│   └── validation.ts    # Form error messages
└── el/
    └── [same structure in Greek]

```text
### 3.3 🎨 Form Validation Pattern

```typescript
// ✅ Validation on client + backend
const [formData, setFormData] = useState({
  name: '',
  email: '',
  phone: '',  // Required for students
});

const [errors, setErrors] = useState({});

const validateForm = () => {
  const newErrors = {};
  if (!formData.name.trim()) newErrors.name = t('validation.required');
  if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    newErrors.email = t('validation.invalidEmail');
  }
  if (!formData.phone.trim()) newErrors.phone = t('validation.required');
  return Object.keys(newErrors).length === 0 ? true : (setErrors(newErrors), false);
};

const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  try {
    await api.post('/students/', formData);
    // Success handling
  } catch (error) {
    setErrors({ submit: error.response?.data?.detail });
  }
};

```text
### 3.4 📅 Date Handling Pattern

```typescript
import { formatLocalDate, parseLocalDate } from '@/utils/date';

// Format for display:
<span>{formatLocalDate(student.enrollment_date)}</span>

// Parse from input:
const date = parseLocalDate(inputValue);

// Send to API (ISO 8601):
await api.post('/students/', {
  ...formData,
  enrollment_date: new Date(formData.enrollment_date).toISOString().split('T')[0]
});

```text
### 3.5 🔄 React Query Pattern

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

// GET request:
const { data: students, isLoading, error } = useQuery({
  queryKey: ['students', filters],  // Cache key invalidation
  queryFn: () => api.get('/students/', { params: filters })
});

// POST/PUT/DELETE:
const mutation = useMutation({
  mutationFn: (formData) => api.post('/students/', formData),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['students'] });
    setShowForm(false);
  },
  onError: (error) => {
    setErrorMessage(error.response?.data?.detail || 'Error');
  }
});

const handleCreate = (formData) => {
  mutation.mutate(formData);
};

```text
### 3.6 🛡️ Error Handling Pattern

```typescript
// Centralized error display:
<ErrorBoundary>
  <ErrorNotification
    message={errorMessage}
    type="error"
    onDismiss={() => setErrorMessage('')}
  />
  <MainContent />
</ErrorBoundary>

// API error interceptor (in api.js):
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

```text
---

## 4. COMPONENT DEEP DIVES

### 4.1 App.tsx (Root Component)

```typescript
function App() {
  return (
    <ErrorBoundary>
      <AuthContext.Provider value={authContextValue}>
        <LanguageProvider>
          <AppearanceThemeProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/auth/login" element={<LoginPage />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <MainLayout />
                    </ProtectedRoute>
                  }
                >
                  {/* Protected routes */}
                </Route>
              </Routes>
            </BrowserRouter>
          </AppearanceThemeProvider>
        </LanguageProvider>
      </AuthContext.Provider>
    </ErrorBoundary>
  );
}

```text
**Provider Stack:**

1. ErrorBoundary - Catches React render errors
2. AuthContext - Global auth state
3. LanguageProvider - i18n setup
4. AppearanceThemeProvider - Dark/light mode
5. BrowserRouter - React Router

### 4.2 StudentList Component (Example)

```typescript
function StudentList() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({});
  const { data: students, isLoading, error } = useQuery({
    queryKey: ['students', filters],
    queryFn: () => api.get('/students/', { params: filters })
  });

  if (isLoading) return <div>{t('common.loading')}</div>;
  if (error) return <ErrorNotification message={error.message} />;

  return (
    <div>
      <StudentSearch onFilter={setFilters} />
      <Table>
        <thead>
          <tr>
            <th>{t('students.name')}</th>
            <th>{t('students.email')}</th>
            <th>{t('students.phone')}</th>
            <th>{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {students?.map(student => (
            <tr key={student.id}>
              <td>{student.name}</td>
              <td>{student.email}</td>
              <td>{student.phone}</td>
              <td>
                <Button onClick={() => handleEdit(student)}>Edit</Button>
                <Button onClick={() => handleDelete(student.id)}>Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

```text
### 4.3 StudentForm Component (Example)

```typescript
function StudentForm({ student, onSubmit, onCancel }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState(
    student || { name: '', email: '', phone: '', enrollment_date: '' }
  );
  const [errors, setErrors] = useState({});
  const mutation = useMutation({
    mutationFn: (data) =>
      student
        ? api.put(`/students/${student.id}`, data)
        : api.post('/students/', data),
    onSuccess: onSubmit,
    onError: (error) => setErrors({ submit: error.response?.data?.detail })
  });

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = t('validation.required');
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = t('validation.invalidEmail');
    }
    if (!formData.phone.trim()) newErrors.phone = t('validation.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      mutation.mutate(formData);
    }
  };

  return (
    <Modal title={student ? t('students.editStudent') : t('students.addStudent')}>
      <form onSubmit={handleSubmit}>
        <Input
          label={t('students.name')}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          error={errors.name}
        />
        <Input
          label={t('students.email')}
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          error={errors.email}
        />
        <Input
          label={t('students.phone')}
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          error={errors.phone}
          required
        />
        <Input
          label={t('students.enrollmentDate')}
          type="date"
          value={formData.enrollment_date}
          onChange={(e) => setFormData({ ...formData, enrollment_date: e.target.value })}
        />
        {errors.submit && <ErrorNotification message={errors.submit} />}
        <div className="flex gap-2">
          <Button type="submit" disabled={mutation.isPending}>{t('common.save')}</Button>
          <Button type="button" onClick={onCancel}>{t('common.cancel')}</Button>
        </div>
      </form>
    </Modal>
  );
}

```text
---

## 5. API INTEGRATION

### 5.1 API Client Setup (api.js)

```javascript
// Exported constants:
export const CONTROL_API_BASE = '/control/api';  // For backup endpoints

// Axios instance with interceptors:
const apiClient = axios.create({
  baseURL: ORIGINAL_API_BASE_URL,  // Defaults to /api/v1
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000
});

// Auth interceptor (adds Authorization header):
apiClient.interceptors.request.use((config) => attachAuthHeader(config));

// Response interceptor (handles 401 -> redirect to login):
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

```text
### 5.2 API Endpoints Summary

**Students:**

- `GET /students/` - List with filters
- `POST /students/` - Create
- `GET /students/{id}` - Get by ID
- `PUT /students/{id}` - Update
- `DELETE /students/{id}` - Soft delete

**Courses:**

- `GET /courses/` - List
- `POST /courses/` - Create
- `GET /courses/{id}` - Get by ID
- `PUT /courses/{id}` - Update
- `DELETE /courses/{id}` - Soft delete

**Grades:**

- `GET /grades/` - List with filters
- `POST /grades/` - Create
- `PUT /grades/{id}` - Update
- `DELETE /grades/{id}` - Soft delete

**Attendance:**

- `GET /attendance/` - List
- `POST /attendance/` - Record absence
- `DELETE /attendance/{id}` - Remove record

**Control (Backups):**

- `GET /control/api/operations/backups` - List backups
- `GET /control/api/operations/backups/{filename}` - Download
- `POST /control/api/operations/backups` - Create backup
- `DELETE /control/api/operations/backups/{filename}` - Delete
- `POST /control/api/operations/backups/zip` - Create ZIP

---

## 6. STATE MANAGEMENT

### 6.1 Global State (React Context)

```typescript
// AuthContext - Authentication state
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

// Usage:
const { user, login, logout } = useContext(AuthContext);

```text
### 6.2 Server State (React Query)

```typescript
// Cached queries with automatic invalidation:
useQuery({
  queryKey: ['students', filters],
  queryFn: () => api.get('/students/', { params: filters })
});

// Cache invalidation on mutation:
useMutation({
  mutationFn: (data) => api.post('/students/', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['students'] });
  }
});

```text
### 6.3 UI State (Local React State)

```typescript
const [showForm, setShowForm] = useState(false);
const [selectedStudent, setSelectedStudent] = useState(null);
const [searchTerm, setSearchTerm] = useState('');
const [errors, setErrors] = useState({});

```text
---

## 7. TESTING STRATEGY

### 7.1 Test File Location & Naming

```text
frontend/src/components/students/__tests__/StudentList.test.tsx
frontend/src/components/students/__tests__/StudentForm.test.tsx
frontend/src/services/__tests__/authService.test.ts
frontend/src/utils/__tests__/date.test.ts

```text
### 7.2 Test Patterns

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StudentList from '../StudentList';
import * as api from '@/api/api';

vi.mock('@/api/api');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en' }
  })
}));

describe('StudentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays loading state', () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <StudentList />
      </QueryClientProvider>
    );
    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  it('displays students after loading', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [{ id: 1, name: 'John', email: 'john@test.com' }]
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <StudentList />
      </QueryClientProvider>
    );
    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
    });
  });
});

```text
---

## 8. CONFIGURATION

### 8.1 Environment Variables

```text
# frontend/.env

VITE_API_URL=http://localhost:8000/api/v1      # Dev
# or: /api/v1                                   # Production (relative)

VITE_APP_VERSION=1.9.7
VITE_ENABLE_DEBUG=false

```text
### 8.2 Vite Config (vite.config.ts)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000'  // Proxy API calls in dev
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});

```text
### 8.3 Build Output

```bash
npm run build        # Creates frontend/dist/
                     # Copy to backend/static/
                     # FastAPI serves as SPA fallback

```text
---

## 9. BUILD & DEPLOYMENT

### 9.1 Development Mode

```bash
cd frontend
npm install
npm run dev              # HMR on localhost:5173
                         # Proxy to backend:8000/api

```text
### 9.2 Production Mode (Docker)

```bash
npm run build            # → frontend/dist/
COPY dist /app/static    # Dockerfile copies to backend/static/
FastAPI serves SPA       # GET * → index.html (React handles routing)

```text
### 9.3 SPA Routing Fallback

```python
# backend/main.py

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # If not /api/v1/*, serve index.html
    # React Router handles client-side routing
    return FileResponse("static/index.html")

```text
---

## 10. SECURITY CONSIDERATIONS

### 10.1 Authentication

- Token stored in `localStorage` (XSS vulnerability risk if not careful)
- Sent via `Authorization: Bearer <token>` header
- Interceptor redirects to login on 401

### 10.2 CORS

- Backend configured with CORS middleware
- Frontend makes requests to `/api/v1` (same origin in prod)

### 10.3 Form Validation

- Client-side validation for UX
- Server-side validation mandatory (never trust client)

### 10.4 Rate Limiting

- Backend enforces rate limits
- Frontend should show error messages gracefully

---

## 11. COMMON ISSUES & SOLUTIONS

| Issue | Cause | Solution |
|-------|-------|----------|
| `CORS error` | API URL misconfigured | Check `VITE_API_URL` in `.env` |
| `404 on refresh` | SPA routing fallback missing | Ensure FastAPI serves `index.html` for unknown routes |
| `401 Unauthorized` | Token expired or invalid | Check `localStorage.token`, clear and re-login |
| `Blank page after build` | Assets not copied | Run `npm run build` and verify `dist/` exists |
| `i18n keys missing` | Incomplete translations | Add both EN and EL keys in locale files |
| `Mutations not working` | Query cache not invalidated | Add `queryClient.invalidateQueries()` in `onSuccess` |
| `Form not submitting` | Validation errors silent | Check console, ensure `validateForm()` returns true |

---

## 12. PERFORMANCE OPTIMIZATION

### 12.1 Code Splitting

```typescript
const StudentList = React.lazy(() => import('./StudentList'));
const StudentForm = React.lazy(() => import('./StudentForm'));

<Suspense fallback={<LoadingSpinner />}>
  <StudentList />
</Suspense>

```text
### 12.2 Query Optimization

```typescript
// Only refetch when filters change:
const { data } = useQuery({
  queryKey: ['students', filters],
  queryFn: () => api.get('/students/', { params: filters }),
  staleTime: 5 * 60 * 1000,  // 5 minutes
  gcTime: 10 * 60 * 1000      // 10 minutes (formerly cacheTime)
});

```text
### 12.3 Memoization

```typescript
const StudentListMemo = React.memo(StudentList, (prev, next) => {
  return prev.filters === next.filters;
});

```text
---

## 13. DEBUGGING & MONITORING

### 13.1 Browser DevTools

- React DevTools extension for component hierarchy
- Network tab to inspect API calls
- Console for error logs

### 13.2 Frontend Logging

```typescript
// Log API responses
api.interceptors.response.use(response => {
  console.debug('[API]', response.config.url, response.data);
  return response;
});

```text
### 13.3 Error Reporting

```typescript
// POST frontend errors to backend
fetch('/api/logs/frontend-error', {
  method: 'POST',
  body: JSON.stringify({
    message: error.message,
    stack: error.stack,
    url: window.location.href
  })
});

```text
---

## 14. CHECKLIST FOR NEW FEATURES

When adding a new feature:

- [ ] Create component in `frontend/src/components/{module}/`
- [ ] Add i18n keys in `frontend/src/locales/en/{module}.ts` + `el/{module}.ts`
- [ ] Use `const { t } = useTranslation()` for all visible text
- [ ] Add React Query hooks for data fetching
- [ ] Implement form validation with error messages
- [ ] Add test file in `__tests__/` directory
- [ ] Run `npm run test` to verify tests pass
- [ ] Run `npm run lint` to check code quality
- [ ] Document component in JSDoc comments
- [ ] Update this file with new component info

---

## 15. REFERENCES & LINKS

- **React Documentation:** <https://react.dev>
- **Vite Documentation:** <https://vitejs.dev>
- **React Router:** <https://reactrouter.com>
- **React Query:** <https://tanstack.com/query>
- **i18next:** <https://www.i18next.com>
- **Tailwind CSS:** <https://tailwindcss.com>
- **TypeScript:** <https://www.typescriptlang.org>

---

**Last Updated:** $11.9.7
**Maintainer:** Development Team
**Questions?** Check the main `ARCHITECTURE.md` or `docs/user/LOCALIZATION.md`
