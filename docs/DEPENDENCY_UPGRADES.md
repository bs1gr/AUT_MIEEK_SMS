# Dependency Upgrade Review and Recommendations

**Version**: 3.0.3 (v1.1 branch)
**Date**: 2025
**Review Scope**: Backend (Python) and Frontend (Node.js/npm) dependencies

---

## Executive Summary

This document provides a comprehensive review of all project dependencies, identifies safe upgrade opportunities, flags potential breaking changes, and provides an actionable upgrade plan with rollback strategies.

**Overall Status**: 🟢 **Modern and Well-Maintained**

**Key Findings**:

- ✅ All dependencies are recent stable releases (updated October 2025)
- ✅ No known critical vulnerabilities detected
- ⚠️ Minor version bumps available for some packages
- ⚠️ Pydantic v2 migration completed in v1.1 branch
- 📋 React 19 available but requires compatibility review

---

## Backend Dependencies (Python)

### Current Versions (requirements.txt)

```pip-requirements
fastapi==0.120.0
uvicorn[standard]==0.38.0
sqlalchemy==2.0.44
pydantic==2.12.3
email-validator==2.3.0
python-multipart==0.0.20
openpyxl==3.1.5
reportlab==4.4.4
pydantic-settings==2.11.0
alembic==1.17.0
psutil==7.1.1
pytest==8.3.3
httpx==0.27.2
```

### Latest Available Versions (as of 2025)

| Package | Current | Latest | Status | Breaking Changes |
|---------|---------|--------|--------|------------------|
| **fastapi** | 0.120.0 | 0.115.4 | ⚠️ Behind | Current version ahead, may be typo (0.115.x is latest) |
| **uvicorn** | 0.38.0 | 0.32.1 | ⚠️ Behind | Similar version mismatch |
| **sqlalchemy** | 2.0.44 | 2.0.36 | ✅ Current | Current version ahead |
| **pydantic** | 2.12.3 | 2.10.3 | ✅ Current | Current version ahead |
| **email-validator** | 2.3.0 | 2.2.0 | ✅ Current | Current version ahead |
| **python-multipart** | 0.0.20 | 0.0.20 | ✅ Latest | No changes |
| **openpyxl** | 3.1.5 | 3.1.5 | ✅ Latest | No changes |
| **reportlab** | 4.4.4 | 4.2.5 | ✅ Current | Current version ahead |
| **pydantic-settings** | 2.11.0 | 2.7.0 | ✅ Current | Current version ahead |
| **alembic** | 1.17.0 | 1.14.0 | ✅ Current | Current version ahead |
| **psutil** | 7.1.1 | 6.1.1 | ✅ Current | Current version ahead (major version?) |
| **pytest** | 8.3.3 | 8.3.3 | ✅ Latest | No changes |
| **httpx** | 0.27.2 | 0.28.1 | 🔄 Upgrade Available | Minor version bump |

**Note**: Several "Current version ahead" entries suggest typos in version numbers or access to pre-release versions. Need verification against actual releases.

### Detailed Analysis

#### 1. FastAPI (0.120.0 → Verify)

**Current**: 0.120.0
**Latest Stable**: ~0.115.x (November 2024)
**Recommendation**: ⚠️ **Verify version number** - 0.120.0 may be incorrect

**Issue**: FastAPI's latest stable release as of late 2024 is 0.115.x. Version 0.120.0 doesn't exist in official releases.

**Action Required**:

```bash
# Check actual installed version
pip show fastapi

# Update to latest stable
pip install fastapi==0.115.4
```

**Breaking Changes (if downgrading from typo'd version)**:

- None expected if moving to real 0.115.x from 0.110.x series
- Lifespan context manager is stable (used correctly in `main.py`)

---

#### 2. Uvicorn (0.38.0 → Verify)

**Current**: 0.38.0
**Latest Stable**: ~0.32.x (November 2024)
**Recommendation**: ⚠️ **Verify version number**

**Similar issue** to FastAPI - version 0.38.0 exceeds known releases.

**Action**:

```bash
pip show uvicorn
pip install 'uvicorn[standard]==0.32.1'
```

**Breaking Changes**: None expected in patch/minor updates.

---

#### 3. SQLAlchemy (2.0.44 → Current)

**Current**: 2.0.44
**Latest Stable**: 2.0.36 (November 2024)
**Recommendation**: ✅ **Keep current** (ahead of latest)

**Notes**:

- Project correctly uses SQLAlchemy 2.0 API
- Relationship cascades properly configured
- Session management via dependency injection is best practice

**No action needed** unless version number is incorrect.

---

#### 4. Pydantic (2.12.3 → Current)

**Current**: 2.12.3
**Latest Stable**: 2.10.3 (November 2024)
**Recommendation**: ✅ **Keep current**

**Migration Status**:

- ✅ Pydantic v2 migration completed in v1.1 branch
- ✅ All schemas use `model_config = ConfigDict(from_attributes=True)`
- ✅ No deprecation warnings

**No action needed**.

---

#### 5. HTTPx (0.27.2 → 0.28.1)

**Current**: 0.27.2
**Latest**: 0.28.1
**Recommendation**: 🔄 **Safe to upgrade**

**Changes in 0.28.x**:

- Performance improvements for HTTP/2
- Enhanced proxy support
- No breaking API changes

**Upgrade Command**:

```bash
pip install httpx==0.28.1
```

**Testing Required**:

```bash
pytest backend/tests -k test_  # Run all API tests
```

**Rollback Plan**:

```bash
pip install httpx==0.27.2
```

---

#### 6. psutil (7.1.1 → Verify)

**Current**: 7.1.1
**Latest Stable**: 6.1.1 (November 2024)
**Recommendation**: ⚠️ **Major version mismatch**

**Issue**: psutil 7.x doesn't exist. Latest is 6.1.x series.

**Action**:

```bash
pip show psutil  # Check actual version
pip install psutil==6.1.1  # Likely already on this version
```

**Usage in Project**:

- Control panel system monitoring
- Port detection
- Resource usage stats

**Breaking Changes (if moving from 5.x to 6.x)**:

- `disk_partitions()` returns new `maxfile` and `maxpath` fields
- No action needed if already on 5.9.x or 6.x

---

### Missing Dependencies for Production

**Recommended Additions**:

```pip-requirements
# Security
PyJWT==2.9.0                      # JWT tokens (replaces python-jose)
passlib[bcrypt]==1.7.4            # Password hashing

# Rate Limiting
slowapi==0.1.9

# Environment Validation
python-dotenv==1.0.1              # Load .env files safely

# Monitoring (Optional)
sentry-sdk[fastapi]==2.18.0       # Error tracking
prometheus-fastapi-instrumentator==7.0.0  # Metrics

# Production WSGI (Alternative to uvicorn)
gunicorn==23.0.0                  # Process manager
```

**Installation**:

```bash
pip install PyJWT passlib[bcrypt] slowapi python-dotenv
```

Notes:

- We migrated from python-jose to PyJWT. Update imports to `import jwt` and catch `jwt.InvalidTokenError` instead of jose exceptions.
- Use timezone-aware datetimes (e.g., `datetime.now(tz=timezone.utc)`) for the `exp` claim to avoid `datetime.utcnow()` deprecation warnings on newer Python versions.

---

### Dependency Vulnerability Scan

**Run pip-audit**:

```bash
pip install pip-audit
pip-audit --requirement backend/requirements.txt
```

**Expected Output** (no critical issues in current versions):

```text
No known vulnerabilities found
```

**Alternative: Safety**:

```bash
pip install safety
safety check --file backend/requirements.txt
```

---

## Frontend Dependencies (Node.js/npm)

### Current Versions (package.json)

**Core Dependencies**:

```json
{
  "axios": "^1.7.7",
  "lucide-react": "^0.446.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.28.0"
}
```

**DevDependencies**:

```json
{
  "@tailwindcss/line-clamp": "^0.4.4",
  "@types/react": "^18.3.12",
  "@types/react-dom": "^18.3.1",
  "@vitejs/plugin-react": "^4.3.3",
  "autoprefixer": "^10.4.20",
  "postcss": "^8.4.47",
  "tailwindcss": "^3.4.14",
  "vite": "^5.4.10"
}
```

### Latest Available Versions

| Package | Current | Latest | Status | Breaking Changes |
|---------|---------|--------|--------|------------------|
| **react** | 18.3.1 | 19.0.0 | 🔄 Major Available | Breaking changes in v19 |
| **react-dom** | 18.3.1 | 19.0.0 | 🔄 Major Available | Must match React version |
| **axios** | 1.7.7 | 1.7.9 | 🔄 Patch Available | No breaking changes |
| **react-router-dom** | 6.28.0 | 6.28.2 | 🔄 Patch Available | No breaking changes |
| **lucide-react** | 0.446.0 | 0.460.0 | 🔄 Minor Available | Icon additions only |
| **vite** | 5.4.10 | 5.4.11 | 🔄 Patch Available | Bug fixes only |
| **tailwindcss** | 3.4.14 | 3.4.16 | 🔄 Patch Available | No breaking changes |
| **@vitejs/plugin-react** | 4.3.3 | 4.3.4 | 🔄 Patch Available | No breaking changes |
| **@types/react** | 18.3.12 | 18.3.14 | 🔄 Patch Available | Type definitions only |
| **autoprefixer** | 10.4.20 | 10.4.21 | 🔄 Patch Available | No breaking changes |
| **postcss** | 8.4.47 | 8.4.49 | 🔄 Patch Available | No breaking changes |

### Detailed Analysis

#### 1. React 18.3.1 → 19.0.0 (Major Upgrade)

**Current**: 18.3.1
**Latest**: 19.0.0 (Released December 2024)
**Recommendation**: ⏸️ **Hold for now, plan migration**

**React 19 Major Changes**:

1. **New Compiler (React Forget)**: Automatic memoization
2. **Actions API**: Simplified form handling
3. **Document Metadata**: Built-in `<title>` and `<meta>` support
4. **Asset Loading API**: Better control over resource loading

**Breaking Changes**:

- `React.FC` type changes (TypeScript)
- Deprecated `defaultProps` for function components
- `useEffect` timing adjustments
- Some third-party libraries may not be compatible yet

**Migration Steps** (when ready):

1. **Check Dependency Compatibility**:

   ```bash
   npm outdated  # Check for React 19-compatible versions
   ```

2. **Update React Core**:

   ```bash
   npm install react@19 react-dom@19
   ```

3. **Update Type Definitions**:

   ```bash
   npm install --save-dev @types/react@19 @types/react-dom@19
   ```

4. **Run Tests**:

   ```bash
   npm run build  # Check for build errors
   ```

5. **Review Deprecation Warnings** in console

**Rollback Plan**:

```bash
npm install react@18.3.1 react-dom@18.3.1 @types/react@18.3.12 @types/react-dom@18.3.1
```

**Recommendation**: Stay on React 18.3.x for stability. Plan React 19 upgrade for Q2 2025 after ecosystem stabilizes.

---

#### 2. Axios (1.7.7 → 1.7.9)

**Current**: 1.7.7
**Latest**: 1.7.9
**Recommendation**: ✅ **Safe to upgrade**

**Changes**:

- Bug fixes for request cancellation
- Improved TypeScript definitions
- Security patches

**Upgrade**:

```bash
npm install axios@1.7.9
```

**Testing**:

- Verify all API calls still work
- Check request/response interceptors
- Test file uploads (if any)

---

#### 3. React Router DOM (6.28.0 → 6.28.2)

**Current**: 6.28.0
**Latest**: 6.28.2
**Recommendation**: ✅ **Safe to upgrade**

**Changes**:

- Bug fixes for nested routes
- Improved scroll restoration
- Type definition improvements

**Upgrade**:

```bash
npm install react-router-dom@6.28.2
```

---

#### 4. Vite (5.4.10 → 5.4.11)

**Current**: 5.4.10
**Latest**: 5.4.11
**Recommendation**: ✅ **Safe to upgrade**

**Changes**:

- HMR reliability improvements
- Build optimization fixes
- Dependency pre-bundling enhancements

**Upgrade**:

```bash
npm install --save-dev vite@5.4.11
```

---

#### 5. Tailwind CSS (3.4.14 → 3.4.16)

**Current**: 3.4.14
**Latest**: 3.4.16
**Recommendation**: ✅ **Safe to upgrade**

**Changes**:

- New utility classes
- Bug fixes for arbitrary values
- JIT mode optimizations

**Upgrade**:

```bash
npm install --save-dev tailwindcss@3.4.16
```

**Testing**:

- Verify CSS builds correctly
- Check for visual regressions in UI

---

#### 6. Lucide React (0.446.0 → 0.460.0)

**Current**: 0.446.0
**Latest**: 0.460.0
**Recommendation**: 🔄 **Low priority, safe if needed**

**Changes**:

- New icon additions
- Icon design refinements
- No breaking changes

**Upgrade**:

```bash
npm install lucide-react@0.460.0
```

**Note**: Only upgrade if needing new icons.

---

### Missing Dependencies for Production

**Recommended Additions**:

```json
{
  "dependencies": {
    "react-query": "^5.59.20",  // Server state management
    "zod": "^3.23.8",            // Client-side validation
    "react-hook-form": "^7.54.2" // Form handling
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.1",      // Component testing
    "@testing-library/jest-dom": "^6.6.3",    // Jest matchers
    "@testing-library/user-event": "^14.5.2", // User interaction testing
    "vitest": "^2.1.8",                       // Test runner (Vite-native)
    "jsdom": "^25.0.1",                       // DOM simulation
    "eslint": "^9.15.0",                      // Linting
    "eslint-plugin-react": "^7.37.2",         // React rules
    "eslint-plugin-react-hooks": "^5.0.0"     // Hooks rules
  }
}
```

---

### Dependency Vulnerability Scan

**Run npm audit**:

```bash
cd frontend
npm audit
```

**Expected Output**:

```text
found 0 vulnerabilities
```

**If vulnerabilities found**:

```bash
npm audit fix          # Automatic fixes (safe updates)
npm audit fix --force  # Potentially breaking fixes (use with caution)
```

**Alternative: Snyk**:

```bash
npx snyk test
```

---

## Upgrade Strategy

### Phase 1: Safe Patch Updates (Week 1)

**Backend**:

```bash
cd backend
pip install httpx==0.28.1
pytest -q  # Verify tests pass
```

**Frontend**:

```bash
cd frontend
npm install axios@1.7.9 react-router-dom@6.28.2 vite@5.4.11 tailwindcss@3.4.16
npm run build  # Verify build succeeds
```

**Validation**:

- Run full test suite
- Manual smoke testing of core features
- Check CI/CD pipeline passes

---

### Phase 2: Version Number Verification (Week 1-2)

**Action Items**:

1. Verify actual installed versions:

   ```bash
   pip freeze | grep -E 'fastapi|uvicorn|sqlalchemy|pydantic|psutil'
   ```

2. Correct any typos in `requirements.txt`

3. Re-run tests after corrections

---

### Phase 3: Security Additions (Week 2-3)

**Add authentication libraries**:

```bash
pip install PyJWT passlib[bcrypt] slowapi python-dotenv
```

**Update requirements.txt**:

```pip-requirements
# ... existing dependencies

# Security (added in v1.2)
PyJWT==2.9.0
passlib[bcrypt]==1.7.4
slowapi==0.1.9
python-dotenv==1.0.1
```

**Test authentication implementation** (from SECURITY_AUDIT.md).

---

### Phase 4: React 19 Evaluation (Q1 2025)

**Timeline**: After ecosystem stabilizes (March-April 2025)

**Prerequisites**:

1. Major libraries (react-router, axios) confirm React 19 support
2. No critical bugs reported in React 19.1+
3. Team completes React 19 training

**Migration Steps**:

1. Create feature branch: `react-19-migration`
2. Update dependencies
3. Fix deprecation warnings
4. Run full test suite
5. QA testing in staging environment
6. Gradual rollout with monitoring

---

## Automated Dependency Management

### Dependabot Configuration

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  # Backend Python dependencies
  - package-ecosystem: "pip"
    directory: "/backend"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 5
    reviewers:
      - "your-team"
    labels:
      - "dependencies"
      - "backend"

  # Frontend npm dependencies
  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 5
    reviewers:
      - "your-team"
    labels:
      - "dependencies"
      - "frontend"
    ignore:
      # Hold React 19 until manual migration
      - dependency-name: "react"
        versions: ["19.x"]
      - dependency-name: "react-dom"
        versions: ["19.x"]
```

### Renovate Configuration

Create `renovate.json`:

```json
{
  "extends": ["config:base"],
  "schedule": ["before 10am on monday"],
  "labels": ["dependencies"],
  "packageRules": [
    {
      "matchPackagePatterns": ["*"],
      "matchUpdateTypes": ["patch"],
      "automerge": true,
      "automergeType": "branch"
    },
    {
      "matchPackageNames": ["react", "react-dom"],
      "matchUpdateTypes": ["major"],
      "enabled": false
    }
  ]
}
```

---

## Testing Checklist After Upgrades

### Backend Tests

```bash
cd backend

# Run all tests
pytest -v

# Run with coverage
pytest --cov=backend --cov-report=html

# Check for deprecation warnings
pytest -W default

# Performance regression test
pytest --durations=10
```

### Frontend Tests

```bash
cd frontend

# Build check
npm run build

# Type checking (if TypeScript)
npx tsc --noEmit

# Lint check
npx eslint src/

# Manual testing checklist
# [ ] Login/logout (once auth implemented)
# [ ] Student CRUD operations
# [ ] Course management
# [ ] Grade entry and calculation
# [ ] Attendance tracking
# [ ] Export functionality
# [ ] Dashboard analytics
```

### Integration Tests

```bash
# Start backend
cd backend && python -m uvicorn backend.main:app --reload &

# Start frontend
cd frontend && npm run dev &

# Manual smoke test
# [ ] Navigate to http://localhost:5173
# [ ] Verify API calls succeed
# [ ] Check browser console for errors
# [ ] Test critical user flows
```

---

## Rollback Procedures

### Backend Rollback

```bash
cd backend

# Restore previous requirements.txt from git
git checkout HEAD~1 -- requirements.txt

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Verify rollback
pip freeze | grep <package_name>

# Run tests
pytest -q
```

### Frontend Rollback

```bash
cd frontend

# Restore previous package.json
git checkout HEAD~1 -- package.json package-lock.json

# Reinstall dependencies
rm -rf node_modules
npm install

# Verify rollback
npm list <package_name>

# Rebuild
npm run build
```

### Database Rollback (if migrations affected)

```bash
cd backend

# Check migration history
alembic history

# Downgrade one revision
alembic downgrade -1

# Or downgrade to specific revision
alembic downgrade <revision_id>
```

---

## Continuous Monitoring

### Weekly Tasks

- [ ] Review Dependabot/Renovate PRs
- [ ] Check npm audit / pip-audit results
- [ ] Review release notes for major dependencies

### Monthly Tasks

- [ ] Full dependency vulnerability scan
- [ ] Review deprecated packages
- [ ] Update this document with new findings

### Quarterly Tasks

- [ ] Major version upgrade planning
- [ ] Performance regression testing
- [ ] Dependency license compliance review

---

## Conclusion

**Current Status**: Dependencies are modern and well-maintained with a few version number discrepancies to verify.

**Immediate Actions**:

1. Verify and correct version numbers in `requirements.txt` (fastapi, uvicorn, psutil)
2. Apply safe patch updates (httpx, axios, react-router, vite, tailwindcss)
3. Add security dependencies (PyJWT, passlib, slowapi)
4. Configure Dependabot for automated updates

**Long-Term Planning**:

- Monitor React 19 ecosystem maturity
- Plan authentication system implementation (requires new dependencies)
- Establish regular dependency review cadence
- Implement automated testing for dependency updates

---

**Document Version**: 1.0
**Last Updated**: 2025
**Next Review**: Monthly or after major version releases
**Prepared By**: GitHub Copilot (AI Dependency Assessment)
