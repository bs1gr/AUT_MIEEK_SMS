# Backlog Priorities (2025-12-18)

> ⚠️ **SUPERSEDED**: General priorities consolidated into [UNIFIED_WORK_PLAN.md](../plans/UNIFIED_WORK_PLAN.md)
> **Use the unified plan** for current work organization. This file is kept for historical reference.

## Priority Levels

- **P1: Critical/Blocking** – Must be addressed before any new features or releases. Impacts security, stability, or production data.
- **P2: Core Feature Development** – Major features, RBAC, and essential improvements.
- **P3: Quality & Compliance** – Linting, translations, documentation, and code quality.
- **P4: Maintenance & Optimization** – Performance, DevOps, and automation.
- **P5: Nice-to-Have/Backlog** – UI/UX polish, refactoring, analytics, and non-blocking improvements.

---

## P1: Critical/Blocking

- Expand backend edge case tests (`backend/tests/test_edge_cases.py`)
- Security & authentication review (admin endpoint roles, rate limiting, secrets)
- Address open bugs, health check failures, or monitoring alerts

## P2: Core Feature Development

- Fine-grained RBAC system (Phase 2.4+)
- New models, routers, schemas, and API endpoints
- Frontend features/components (React, i18n compliance)
- Expand backend and frontend test coverage

## P3: Quality & Compliance

- Ensure all UI strings are translated (EN/EL)
- Run translation integrity tests
- Run `COMMIT_READY.ps1 -Quick` and address lint/type errors
- Add API examples, diagrams, and update docs

## P4: Maintenance & Optimization

- Optimize slow queries/endpoints
- Update Docker/NATIVE scripts
- Automate backup verification and migration scripts

## P5: Nice-to-Have/Backlog

- UI/UX improvements
- Refactoring and modularization
- Expand metrics, logging, dashboards
- Add/expand CI script unit tests
- Introduce load-testing suite

---

# Implementation Plan (Next Steps)

1. **Start with P1:** Expand backend edge case tests for concurrency, rollbacks, and boundary values.
2. **Security Review:** Audit admin endpoints for correct role checks and rate limiting.
3. **Fix Bugs:** Address any open production issues or monitoring alerts.
4. **Iterate:** Move to P2 and beyond as P1 items are completed.

---

*This file summarizes the actionable priorities as of 2025-12-18. Update after each major release or audit.*
