# Release Notes - Version 1.14.0

**Release Date**: 2025-12-29
**Previous Version**: $11.14.2

## 🐛 Bug Fixes

- Docker security scan - use filesystem scan on Dockerfile directory instead of image-ref [13fe9db]
- Docker security scan - build and load image locally for Trivy scanning [0fd24d3]
- E2E test database initialization and seeding\n\n- Add force reseed step to ensure test user (test@example.com) exists even if admin user created by bootstrap\n- Remove DISABLE_STARTUP_TASKS flag to allow migrations to run properly on startup\n- Ensures tables exist and test user is present before E2E login\n\nThis should address E2E login 400 errors seen previously. [bb57e76]
- disable login lockouts in E2E environment and make E2E tests non-blocking in CI [c00086b]
- handle Bandit encoding issues by using CSV output format [6811897]
- replace remaining Boolean defaults (0/1 -> FALSE/TRUE) for PostgreSQL [98ace77]
- use TRUE/FALSE for Boolean migrations (PostgreSQL compatibility) + adjust coverage threshold [109df00]
- replace Unicode ticks in Greek encoding script for Windows CI [49e481d]
- replace Unicode arrow with ASCII in Greek encoding script [89a1630]
- add required inputs to workflow_call trigger in CI/CD pipeline [0db0df5]

## 📝 Documentation

- release notes and changelog for $11.14.2 [58645e3]

## 🤖 CI/CD

- fix encoding script output + install missing types and vitest coverage deps [3e5f5dc]
- run gitleaks via CLI for policy compliance [aa8a354]
- remove default on workflow_call input [26ccbe1]

## 🧹 Chores

- pre-commit validation complete [7cdcdfd]
- E2E - improve timeout handling and add VITE_API_URL env variable [8c816bb]

## 📦 Other Changes

- E2E: Fix login health check to use JSON email/password and seeded credentials [6f2f0a7]
- [- Updat]
- [- Updat]
- [- Updat]
- [- Fixed]
- [- Made ]
- [Backend]
- Vasilis
- [- Fixes]
- Vasilis
- [- Added]
- [- Fixes]
- Vasilis

---

### 📊 Statistics

- **Total Commits**: 29
- **Contributors**: 2
