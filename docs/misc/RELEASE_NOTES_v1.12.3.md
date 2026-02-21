# $11.18.3 – Major Quality, Accessibility & Maintenance Release

## ✨ New & Improved

- **Accessibility & Color Contrast**
  - All major frontend modules updated to meet WCAG AA standards.
  - Font color classes now use high-contrast, vivid Tailwind colors for better readability.
  - Drop shadows and font weight for enhanced clarity.
  - ARIA roles/labels and keyboard navigation improved across the UI.
  - Automated and manual accessibility checks performed.

- **Internationalization (i18n)**
  - Translation integrity enforced: all UI strings must exist in both EN and EL files.
  - Modular TypeScript translation files; no hardcoded UI strings.
  - Translation completeness and parity enforced by tests.

- **RBAC & Control Panel**
  - RBAC module moved to Maintenance tab and made admin-only.
  - Control Panel module renamed to “Advanced Settings”/“Προχωρημένες Ρυθμίσεις” in all locales and UI.
  - Operations/Control Panel accessibility and i18n improved.

- **RBAC (Role-Based Access Control) Overhaul**
  - Fine-grained permission-based enforcement for all admin and protected endpoints.
  - New CRUD API endpoints for roles and permissions (create, update, delete, list).
  - Bulk assignment and grant/revoke endpoints for roles and permissions.
  - All admin endpoints now require explicit permissions, not just roles.
  - Permission matrix and API documentation generated and linked in user and developer docs.
  - User/admin guides updated with RBAC management instructions and UI notes.
  - All RBAC changes are fully tested, documented, and reflected in OpenAPI/Swagger UI.

- **Frontend & UI**
  - Global audit and update of font vividness and color contrast.
  - Students, Attendance, Courses, Grading, Dashboard, and Operations modules all improved for accessibility and clarity.
  - ARIA roles, focus indicators, and keyboard navigation improved in all major views.

- **Backend & Testing**
  - Full regression test suite run and passed (backend and frontend).
  - All code quality, linting, and type checks pass.
  - Version consistency enforced across all scripts, docs, and metadata.

- **Installer & Automation**
  - Windows installer rebuilt and validated for $11.18.3.
  - Windows installer rebuilt and validated for $11.18.3.
  - Greek language encoding and wizard images regenerated and verified.
  - Installer builder script typo fixed (no workflow impact).
  - **Major installer improvements:** Versioned uninstaller naming and shortcut cleanup implemented.
  - **Shortcut management:** Fixed "SMS Toggle" shortcut persistence issue.
  - **Uninstaller naming:** Implemented workaround for proper versioned uninstaller (`unins{version}.exe`).
  - **Script modernization:** Replaced VBScript with batch script for better Windows compatibility.
  - **Documentation:** Comprehensive installer troubleshooting and changelog added.

- **Documentation**
  - README, architecture, and localization docs updated for new standards and best practices.
  - Clear guidance for future maintainers on accessibility, i18n, and color usage.

## 🛠️ Maintenance & Refactoring

- Dead code removed, codebase modularity improved.
- All legacy scripts consolidated; only two main entry points for all workflows.
- Automated version sync and commit-ready checks enhanced.
- All translation regressions and UI inconsistencies fixed.

## 🧪 Quality & Health

- All tests pass (backend, frontend, translation, and version checks).
- Native and Docker deployment health checks pass.
- Installer smoke test and encoding audits pass.

---

**This is a major quality and maintainability release. All users and maintainers are strongly encouraged to upgrade.**
