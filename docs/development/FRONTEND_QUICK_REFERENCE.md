# Frontend Quick Reference Card - v1.18.3

## 🏗️ ARCHITECTURE AT A GLANCE

```text
┌─────────────────────────────────────────────────────┐
│                   App (Root)                         │
│   ErrorBoundary + AuthContext + i18n + Theme        │
└───────────────────┬─────────────────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
   Auth         Protected Routes  Providers
    │               │
    ├─ LoginPage    ├─ Dashboard
    │               ├─ Students
    │               ├─ Courses
    │               ├─ Grading
    │               ├─ Attendance
    │               ├─ Calendar
    │               ├─ Operations
    │               └─ Power (Control)
    │
  State        Zustand Stores
  Mgmt         ├─ useStudentsStore
              ├─ useCoursesStore
              ├─ useGradesStore
              └─ useAttendanceStore

  Data         React Query
  Fetching     ├─ useStudents (fetch)
              ├─ useCreateStudent (mutate)
              ├─ useUpdateStudent (mutate)
              └─ useDeleteStudent (mutate)

```text
---

## 📝 CRITICAL RULES (MANDATORY)

### Rule 1: i18n for ALL Visible Text

```tsx
// ✅ ALWAYS do this
const { t } = useTranslation();
return <h1>{t('students.title')}</h1>;

// ❌ NEVER do this
return <h1>Students</h1>;

```text
### Rule 2: Auth Respects AUTH_MODE

```tsx
// ✅ Use optional_require_role
@router.get("/admin/users")
async def list_users(current_admin: Any = Depends(optional_require_role("admin"))):
    pass

// ❌ Never use require_role for admin
@router.get("/admin/users")
async def list_users(current_admin: Any = Depends(require_role("admin"))):
    pass

```text
### Rule 3: Validation on Both Sides

```tsx
// Frontend: Client-side UX
const [errors, setErrors] = useState({});
validateForm();  // Show errors immediately

// Backend: Security check
Pydantic validators always run

```text
### Rule 4: React Query Cache Invalidation

```tsx
// ✅ After mutation, always invalidate
onSuccess: () => {
  queryClient.invalidateQueries({
    queryKey: ['students']
  });
}

// ❌ Never forget cache invalidation
// Old data will display until refresh

```text
### Rule 5: Error Boundaries Everywhere

```tsx
// ✅ Wrap pages with error boundary
<SectionErrorBoundary section="StudentsPage">
  <StudentsView />
</SectionErrorBoundary>

// ❌ Don't skip error boundaries

```text
---

## 🎯 PATTERNS & EXAMPLES

### Pattern 1: Server State (React Query)

```typescript
// Fetch with cache
const { data: students, isLoading, error } = useStudents(filters);

// Mutate with invalidation
const mutation = useMutation({
  mutationFn: (data) => studentsAPI.create(data),
  onSuccess: (newStudent) => {
    queryClient.invalidateQueries({ queryKey: ['students'] });
  }
});

```text
### Pattern 2: Client State (Zustand)

```typescript
// Select from store
const students = useStudentsStore((state) => state.students);
const selectStudent = useStudentsStore((state) => state.selectStudent);

// Update store
selectStudent(student);  // Triggers re-render

```text
### Pattern 3: Modal Management

```typescript
const addModal = useModal();

// Open: addModal.open()
// Close: addModal.close()
// Check: addModal.isOpen
// Render: {addModal.isOpen && <Modal onClose={addModal.close}>...</Modal>}

```text
### Pattern 4: Form Validation

```typescript
const validate = () => {
  const newErrors = {};
  if (!formData.first_name.trim()) {
    newErrors.first_name = t('validation.required');
  }
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

```text
### Pattern 5: Toast Notifications

```typescript
const { toast, show } = useToast();

show('Saved!', 'success');
show('Error occurred', 'error');
show('Info message', 'info');

```text
---

## 📊 COMPONENT CHECKLIST

When creating a new component:

```text
┌─ Structure
│  ├─ Functional component (not class)
│  ├─ TypeScript interfaces for props
│  ├─ Default exports
│  └─ Co-locate with tests
├─ Features
│  ├─ i18n: useTranslation() for all text
│  ├─ Errors: ErrorBoundary wrapper
│  ├─ Loading: Skeleton or spinner
│  ├─ Type-safe: Full TypeScript
│  └─ Accessible: ARIA labels, semantic HTML
├─ Performance
│  ├─ React.memo() if receives props
│  ├─ useCallback() for handlers
│  ├─ useMemo() for computed values
│  └─ Virtual scrolling for lists 1000+
├─ Testing
│  ├─ Unit tests (component behavior)
│  ├─ Integration tests (user flows)
│  └─ Snapshot tests (UI changes)
└─ Documentation
   ├─ JSDoc comments
   ├─ Props documentation
   └─ Usage examples

```text
---

## 🚀 TOP 5 QUICK WINS

1. **Add React.memo to Row Components (15 min)**

   ```tsx
   export const StudentRow = React.memo(({ student, onEdit }) => (
     <tr>...</tr>
   ));
   ```

2. **Implement Skeleton Loading (20 min)**

   ```tsx
   {isLoading && <StudentRowSkeleton />}
   {data && <StudentRow student={data} />}
   ```

3. **Add useRateLimit to Forms (10 min)**

   ```tsx
   const { isRateLimited, call } = useRateLimit(500);
   <button disabled={isRateLimited} onClick={handleSubmit}>
   ```

4. **Enable Virtual Scrolling (10 min)**

   ```tsx
   const { visibleItems } = useVirtualScroll(items, { itemHeight: 48 });
   {visibleItems.map(item => <Row key={item.id} {...item} />)}
   ```

5. **Add Error Retry Button (10 min)**

   ```tsx
   {error && (
     <ErrorNotification
       message={error.message}
       action="Retry"
       onAction={refetch}
     />
   )}
   ```

---

## 🔍 DEBUGGING QUICK GUIDE

| Problem | Cause | Solution |
|---------|-------|----------|
| Component re-renders too much | No React.memo, callbacks recreated | Add React.memo + useCallback |
| API call returns old data | Cache not invalidated | Add queryClient.invalidateQueries in onSuccess |
| Form field value doesn't update | onChange not connected | Check formData state binding |
| Modal doesn't close | onClick not calling onClose | Check event handler connection |
| Translation key shows up | Missing in locale files | Add to both en/*.ts and el/*.ts |
| Slow list rendering | 1000+ items rendered | Add useVirtualScroll hook |
| API 401 error on every request | Token not stored/sent | Check localStorage.token, Authorization header |
| i18n language doesn't change | Language provider issue | Check LanguageContext, toggle implementation |

---

## 📚 QUICK FILE REFERENCE

| File | Purpose | Key Content |
|------|---------|-------------|
| `api/api.ts` | API client | Axios instance, auth interceptor |
| `contexts/AuthContext.tsx` | Auth state | User, token, login, logout |
| `stores/useStudentsStore.ts` | Student state | students[], selectedStudent, methods |
| `hooks/useStudentsQuery.ts` | Student queries | useStudents, useCreateStudent |
| `pages/StudentsPage.tsx` | Page container | Layout, routing logic |
| `features/students/components/` | Student UI | Views, modals, forms |
| `locales/en/students.ts` | EN text | All English strings |
| `locales/el/students.ts` | EL text | All Greek strings |
| `components/ui/` | Reusable UI | Button, Input, Modal, Toast |
| `utils/date.ts` | Date helpers | Format, parse, validation |

---

## 🎨 TAILWIND CLASS REFERENCE

### Common Patterns

```tsx
// Spacing
<div className="p-4 m-2">              {/* Padding 4, Margin 2 */}

// Colors
<div className="bg-blue-500 text-white"> {/* Background, Text */}

// Layout
<div className="flex gap-4 justify-between"> {/* Flexbox */}

// Responsive
<div className="md:hidden lg:block">     {/* Hide on md, show on lg */}

// States
<button className="hover:bg-blue-600 active:scale-95">

// Animation
<div className="animate-pulse animate-spin">

```text
---

## 🧪 TESTING TEMPLATE

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StudentForm from '@/components/StudentForm';

describe('StudentForm', () => {
  it('should submit form with valid data', async () => {
    const handleSubmit = vi.fn();

    render(
      <QueryClientProvider client={new QueryClient()}>
        <StudentForm onSubmit={handleSubmit} />
      </QueryClientProvider>
    );

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'John' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalled();
    });
  });
});

```text
---

## 🔐 SECURITY CHECKLIST

- [ ] No hardcoded secrets in code
- [ ] Token stored in httpOnly cookies (already done ✅)
- [ ] All API calls authenticated
- [ ] Input validation on client + server
- [ ] Error messages don't leak sensitive info
- [ ] CSRF protection enabled (SameSite cookies)
- [ ] Rate limiting on sensitive endpoints
- [ ] Content Security Policy header set
- [ ] Dependencies updated regularly
- [ ] npm audit clean

---

## 📊 PERFORMANCE TARGETS

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| First Contentful Paint | < 1.5s | - | 🟡 TBD |
| Largest Contentful Paint | < 2.5s | - | 🟡 TBD |
| Time to Interactive | < 3.5s | - | 🟡 TBD |
| Cumulative Layout Shift | < 0.1 | - | 🟡 TBD |
| Bundle Size | < 300KB | - | 🟡 TBD |
| Re-render Cycles | -30% | - | 🟡 TBD |

---

## 📱 BROWSER SUPPORT

```javascript
// Target browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

// Features used
✅ ES2020 (top-level await, etc)
✅ React 18 (concurrent rendering)
✅ CSS Grid & Flexbox
✅ LocalStorage API
✅ Fetch API with AbortController

```text
---

## 🚀 DEPLOYMENT CHECKLIST

Before deploying to production:

```text
Code Quality
☐ npm run lint - No errors
☐ npm run type-check - Type safe
☐ npm run test - All tests pass

Performance
☐ npm run build - Check output size
☐ npm run build -- --visualizer - Analyze bundle
☐ No unused dependencies

Security
☐ npm audit - No vulnerabilities
☐ Remove console.log statements
☐ Remove React DevTools
☐ Remove React Query DevTools

Build
☐ npm run build succeeds
☐ dist/ folder created
☐ index.html exists
☐ All assets copied

Environment
☐ VITE_API_URL set correctly
☐ VITE_APP_VERSION updated
☐ .env.production exists
☐ No hardcoded secrets

```text
---

## 📞 COMMON COMMANDS

```bash
# Development

npm run dev              # Start Vite dev server
npm run lint             # Check code quality
npm run type-check       # TypeScript check
npm run test             # Run tests
npm run test:ui          # Vitest UI

# Production

npm run build            # Build for production
npm run build --visualizer # Analyze bundle
npm run preview          # Preview build locally

# Maintenance

npm outdated             # Check outdated packages
npm audit                # Security audit
npm update --save        # Update packages

```text
---

## 💡 TIPS & TRICKS

### Tip 1: Quick API Testing

```bash
# Test API locally

curl http://localhost:8000/api/v1/students/ \
  -H "Authorization: Bearer <token>"

```text
### Tip 2: Redux DevTools Chrome Extension

- Inspect React Query cache
- Time travel debugging
- Replay mutations

### Tip 3: Measure Component Render Time

```typescript
import { Profiler } from 'react';

<Profiler id="StudentsView" onRender={onRenderCallback}>
  <StudentsView />
</Profiler>

```text
### Tip 4: Network Tab Inspection

- Sort by size (find bloat)
- Filter by status (find 404s)
- Check cache headers
- Monitor XHR calls

### Tip 5: Lighthouse Audit

```bash
# In Chrome DevTools

Ctrl+Shift+J → Lighthouse Tab
Run audit for Performance, Accessibility, Best Practices

```text
---

## 🎯 NEXT STEPS

1. **This Week:** Add React.memo + useCallback to 5 components
2. **Next Week:** Implement skeleton loading + error retry
3. **Following Week:** Add Zod validation schemas

---

**Keep this card handy while developing!** 📌

Print or bookmark this reference for quick lookup during development.

---

*Last Updated: December 4, 2025*
*Frontend v1.18.3 - Modern React Architecture*
