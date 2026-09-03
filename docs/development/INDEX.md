# Development Documentation

Technical documentation for developers contributing to the Student Management System.

## 🏗️ Architecture & Design

### System Architecture

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design overview
  - Dual deployment modes (Docker/Native)
  - Component architecture
  - Database schema
  - API structure

- **[ARCHITECTURE_DIAGRAMS.md](ARCHITECTURE_DIAGRAMS.md)** - Visual system workflows
  - Sequence diagrams
  - Component diagrams
  - Data flow diagrams

### Authentication & Security

- **[AUTH_AND_TEST_INFRASTRUCTURE.md](AUTH_AND_TEST_INFRASTRUCTURE.md)** - Auth & testing guide (NEW - 1.12.8)
  - Authentication bypass logic
  - Test infrastructure setup
  - SECRET_KEY validation
  - Database configuration for tests
  - Common testing patterns
  - Troubleshooting guide

- **[AUTHENTICATION.md](AUTHENTICATION.md)** - Auth implementation guide
  - JWT token flow
  - Refresh token mechanism
  - Password hashing
  - CSRF protection
  - Rate limiting

- **[`src/backend/security/`](../../src/backend/security/)** - Security module source (permissions, password hashing, JWT)

## 🚀 Getting Started

- **[DEVELOPER_FAST_START.md](DEVELOPER_FAST_START.md)** - Quick developer onboarding
  - Environment setup
  - Running locally
  - Development workflow
  - Code style guide

- **[VERSION_1_9_9_IMPROVEMENTS.md](VERSION_1_9_9_IMPROVEMENTS.md)** - Latest improvements summary (NEW - 1.9.9)
  - Frontend routing type safety
  - International locale support
  - Backend test infrastructure
  - Comprehensive documentation

## 📡 API Documentation

- **[API_EXAMPLES.md](API_EXAMPLES.md)** - API usage examples
  - Common requests/responses
  - Error handling patterns
  - Authentication flows
  - Pagination
  - Filtering & sorting

### OpenAPI/Swagger

- **Live API Docs**: `http://localhost:8000/docs` (when running)
- **ReDoc**: `http://localhost:8000/redoc`

## 🧪 Testing

### Backend Testing

- **[`src/backend/tests/`](../../src/backend/tests/)** - Backend test suite (pytest, fixtures in `conftest.py`)
  - Run via `infra/scripts/testing/RUN_TESTS_BATCH.ps1` (never `pytest` directly locally — see root `CLAUDE.md`)

### Frontend Testing

- **[`src/frontend/src/__e2e__/`](../../src/frontend/src/__e2e__/)** - E2E testing (Playwright)
  - Test helpers, `critical-flows.spec.ts`

### Performance Testing

- **[LOAD_TEST_PLAYBOOK.md](LOAD_TEST_PLAYBOOK.md)** - Load & performance testing
  - Load testing methodology
  - Performance benchmarks
  - Optimization strategies

## 🌐 Internationalization

- **[../user/LOCALIZATION.md](../user/LOCALIZATION.md)** - i18n implementation
  - Adding new languages
  - Translation workflow
  - i18next configuration

## 📦 Project Structure

```text
src/backend/
├── routers/          # API endpoints
├── services/         # Business logic layer
├── models.py         # SQLAlchemy models
├── schemas/          # Pydantic schemas
├── security/         # Auth & security
├── middleware/       # Request middleware
└── tests/            # Backend tests

src/frontend/
└── src/
    ├── api/          # API client
    ├── components/   # Reusable components
    ├── features/     # Feature modules
    ├── hooks/        # Custom React hooks
    ├── __e2e__/      # Playwright E2E tests
    └── utils/        # Utility functions
```
## 🔧 Development Tools

### Backend

- **FastAPI 0.120+** - Modern Python web framework
- **SQLAlchemy 2.0** - ORM with async support
- **Alembic** - Database migrations
- **Pytest** - Testing framework
- **Ruff** - Fast Python linter

### Frontend

- **React 18** - UI library
- **Vite 5** - Build tool
- **TanStack Query** - Data fetching
- **Zustand** - State management
- **Tailwind CSS** - Utility-first CSS
- **Playwright** - E2E testing

## 📝 Contributing Guidelines

### Code Style

- **Backend**: Follow PEP 8, use type hints
- **Frontend**: TypeScript strict mode, React best practices
- **Pre-commit hooks**: Ruff + Prettier run automatically

### Git Workflow

1. Create feature branch from `main`
2. Make changes with descriptive commits
3. Run tests locally
4. Push and create Pull Request
5. CI runs automated tests
6. Code review and merge

### Commit Messages

Follow conventional commits:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions/changes
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `chore:` Build/tooling changes

## 🐛 Debugging

### Backend Debugging

```bash
# Run with debugger

python -m debugpy --listen 5678 --wait-for-client -m uvicorn backend.main:app --reload

# View logs

tail -f backend/logs/app.log

```text
### Frontend Debugging

- React DevTools extension
- Redux DevTools for Zustand
- Network tab for API calls
- Vite HMR for instant updates

## 📊 Performance Monitoring

- SQLAlchemy slow query logging
- Response caching metrics
- Frontend bundle analysis
- Lighthouse reports

## 🔗 Useful Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Playwright Documentation](https://playwright.dev/)

## 🆘 Getting Help

- Check [GitHub Issues](https://github.com/bs1gr/AUT_MIEEK_SMS/issues)
- Review [UNIFIED_WORK_PLAN.md](../plans/UNIFIED_WORK_PLAN.md) for current priorities
- Ask in development discussions
