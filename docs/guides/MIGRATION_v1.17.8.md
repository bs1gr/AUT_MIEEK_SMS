# Migration Guide: $11.18.1

**Release Date:** 2026-02-11
**Release Type:** Minor (Breaking changes in frontend module locations)
**Migration Effort:** Low (import path updates)

---

## Overview

Version $11.18.1 moves the legacy Power and RBAC pages into the feature module architecture and standardizes i18n usage. This is a **breaking change only for developers who import these pages directly**. End users and standard deployments are unaffected.

**Good news:**
- ✅ No database migrations
- ✅ No API changes
- ✅ Legacy wrappers still exist for compatibility
- ✅ Only frontend import paths need updates for custom code

---

## Who Is Affected

**You are affected if you:**
- Import `PowerPage` or `AdminPermissionsPage` from `frontend/src/pages/*` (or `@/pages/*`)
- Maintain custom routes that reference the legacy page modules

**You are NOT affected if you:**
- Use the UI as an end user
- Deploy via Docker or native scripts without custom frontend code
- Rely on API endpoints only

---

## Breaking Change Summary

### Module Relocation (Frontend)

| Legacy Import | New Import | Notes |
|---|---|---|
| `@/pages/PowerPage` | `@/features/operations` → `SystemPage` | Power/System UI moved to Operations feature |
| `@/pages/AdminPermissionsPage` | `@/features/admin` → `PermissionsPage` | RBAC permissions UI moved to Admin feature |

**Legacy wrapper files still exist:**
- `frontend/src/pages/PowerPage.tsx`
- `frontend/src/pages/AdminPermissionsPage.tsx`

They are deprecated and kept only for backward compatibility. Update your imports to avoid future removals.

---

## Migration Steps

### 1) Update Imports

**Old (deprecated):**
```tsx
import PowerPage from '@/pages/PowerPage';
import AdminPermissionsPage from '@/pages/AdminPermissionsPage';
```

**New ($11.18.1+):**
```tsx
import { SystemPage } from '@/features/operations';
import { PermissionsPage } from '@/features/admin';
```

### 2) Update Route Definitions

**Old (deprecated):**
```tsx
{
  path: '/system',
  element: <PowerPage />,
}
```

**New ($11.18.1+):**
```tsx
{
  path: '/system',
  element: <SystemPage />,
}
```

And for RBAC permissions:
```tsx
{
  path: '/admin/permissions',
  element: <PermissionsPage />,
}
```

### 3) i18n Namespace Note (RBAC UI)

If you reference RBAC labels in custom code, use the `rbac` namespace to align with the updated translations:
```tsx
const { t } = useTranslation('rbac');
```

---

## Verification Checklist

After updating imports and routes:

1. **Frontend build** (recommended)
2. **Spot-check the pages** in the UI
   - System/Power page loads correctly
   - Admin permissions UI renders correctly
3. **Optional:** Run the frontend test suite if you changed routing or custom pages

---

## FAQ

### Do I need to migrate my database?
No. This change is frontend-only.

### Are API endpoints affected?
No. Backend endpoints remain unchanged.

### Can I keep using the old imports?
They still work for now, but they are deprecated. Update now to avoid breakage in future releases.

---

## Support

If you run into issues:
- Open an issue: https://github.com/bs1gr/AUT_MIEEK_SMS/issues
- Tag: `migration`, `$11.18.1`
- Include: error messages, route config snippets, and affected imports

---

*Last Updated: 2026-02-11*
