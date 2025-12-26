# Development Setup (Quick Reference)

> **📖 For Complete Setup Instructions:** See the canonical **[DEVELOPER_GUIDE_COMPLETE.md](DEVELOPER_GUIDE_COMPLETE.md)** for full details.
>
> **Quick Reference Only**: This is a minimal reference. For comprehensive setup, testing, and troubleshooting, use the complete guide.

## Minimal Setup Steps

## Prerequisites

- Python 3.11+ installed
- Node.js (for frontend development) if working with the frontend

## Install runtime dependencies (optional for local dev)

```pwsh
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
```

> Tip: Run `NATIVE.ps1 -Start` (PowerShell) to start the backend and frontend in the supported native development mode. The helper script sets `SMS_ENV=development` automatically.
>
> If you need a permissive local dev mode that relaxes authentication and CSRF for convenient front-end/back-end iteration, use the `-DevEase` flag:
>
> ```pwsh
> .\NATIVE.ps1 -Start -DevEase
> ```

## Install development dependencies (type checking, linters)

```pwsh
python -m pip install -r backend/requirements-dev.txt
# or install globally: pip install mypy ruff
```

## Run tests

### Backend tests

```pwsh
cd backend
python -m pytest -q
```

### Frontend tests

```pwsh
cd frontend
npm run test          # Watch mode (interactive)
npm run test -- --run # One-time run (CI mode)
```

**Test coverage (updated 2025-11-17):** 43 test files with 1008 total tests

- **React Contexts (Auth, Language, Theme): 68 tests**
  - Auth: access_token requirement, /auth/me fallback, authService sync, persistence under `sms_user_v1`
  - Language: real i18next integration, persistence key `i18nextLng`, switch and fallback behavior
  - Theme: async DOM class application, system preference via `matchMedia`, persistence under `theme`, edge cases and listener cleanup
- **Zod schema validation (214 tests)**: Student, course, grade, attendance schemas with field constraints, type conversions, and cross-field refinements
- **Utility functions (145 tests)**: Date formatting, category localization, error handling, calendar ICS generation
- **Zustand stores (133 tests)**: CRUD operations, state consistency, immutability
- **Query hooks with React Query integration (39 tests)**: Data fetching, mutations, optimistic updates
- Modal components (Add/Edit for Students and Courses)
- Custom hooks (modal state, data queries)
- Form validation and user interactions
- API client and utility functions

## Run pre-commit checks (formatters and hooks)

```pwsh
pre-commit run --all-files
```

## Run mypy

```pwsh
python -m mypy backend --config-file config/mypy.ini --show-error-codes
```

## Notes

- The project uses `backend/requirements-dev.txt` for development-only packages. CI workflows use the same file when available.
- If you plan to build Docker images for production, do not include dev requirements in the production image.
