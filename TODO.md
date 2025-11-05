# Project TODO

Last updated: 2025-11-05

## Backend

### Remaining

- [ ] Introduce soft delete support (`deleted_at` semantics) for critical models and update queries accordingly.
- [ ] Enhance error responses with stable error IDs and documented enums for clients.

### Completed

- [x] Increase automated test coverage to 80%+ and publish coverage artifacts (pytest-cov in CI).
- [x] Add dedicated unit tests for `backend/routers/routers_imports.py::validate_uploaded_file` failure modes.
- [x] Extend health checks to report memory utilization thresholds alongside existing disk/database checks.
- [x] Implement SQLAlchemy query performance monitoring with slow-query logging and optional dashboard export.
- [x] Enable response compression (FastAPI `GZipMiddleware`) with sensible defaults.
- [x] Produce Docker production configuration (compose overlay with resource limits and restart policies).

## Frontend

### Remaining

- [ ] Add a React Error Boundary component and wrap the top-level tree.
- [ ] Strip or guard production `console.log` usage during builds.
- [ ] Surface API version headers in the UI where relevant and ensure the client sends/consumes them when available.
- [ ] Evaluate client-side caching for heavy read endpoints once backend caching decisions are made.

## Documentation

### Remaining

- [ ] Flesh out OpenAPI/README examples with request/response samples, including validation and error scenarios.
- [ ] Add deployment architecture and sequence diagrams for critical workflows.
- [ ] Capture load-test playbooks and metrics expectations in `docs/` once tooling is selected.

## DevOps & CI

### Remaining

- [ ] Add unit coverage for `.github/scripts/normalize_ruff.py` and related validators.
- [ ] Cache npm dependencies in CI to reduce install time (see release note follow-up).
- [ ] Expand load-testing automation (e.g., Locust) and integrate with pipelines.
- [ ] Track application/business metrics via Prometheus/OpenTelemetry once instrumentation plan is ready.
- [ ] Schedule the next comprehensive code review (per CODE_REVIEW_FINDINGS follow-up).
