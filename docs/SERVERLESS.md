# Serverless and Cloud Deployment Guide

This project runs great on containers, but it can also be adapted for serverless with a few tweaks. This guide outlines options and the minimal changes you need.

## Overview

- API: FastAPI
- DB: SQLite (local dev) → Use Postgres in serverless/cloud
- Frontend: Vite + React SPA
- Config: Environment variables

## Options

1. AWS Lambda + API Gateway

- Adapter: Mangum
- Package: `pip install mangum`
- Entry point (example):

  ```python
  # backend/lambda_handler.py
  from backend.main import create_app
  from mangum import Mangum

  app = create_app()
  handler = Mangum(app, lifespan="auto")
  ```

- Notes:
  - Cold starts: keep imports light; use `lifespan="auto"` so startup runs when needed.
  - DB: Use a serverless Postgres (e.g., AWS Aurora Serverless v2, Neon, Supabase). Avoid SQLite for multi-instance Lambda.

1. Cloud Run / Fly.io / Render (Containers as-a-service)

- Use `docker/Dockerfile.backend` as is.
- Set env vars for `DATABASE_URL`, `CORS_ORIGINS`, `SERVE_FRONTEND`.
- Prefer managed Postgres; mount volumes only for dev.

1. Azure Functions or Vercel/Netlify Edge Functions

- Similar to Lambda: wrap the FastAPI app with their adapter (or run a containerized app for simplicity).

## Database recommendations

- Local: SQLite (already configured; WAL + foreign_keys enabled).
- Cloud/Serverless: Postgres. Update `DATABASE_URL` like:
  - `postgresql+psycopg://USER:PASS@HOST:PORT/DBNAME`
- Connection tips (serverless):
  - Use a pooler (e.g., PgBouncer) to reduce connection churn.
  - Lower pool size; rely on HTTP keep-alive and short-lived connections.

## Environment variables

- `DATABASE_URL`: Full SQLAlchemy URI. For SQLite dev, `sqlite:///./data/sms.db`
- `CORS_ORIGINS`: CSV or JSON array of origins, e.g. `http://localhost:5173,https://yourapp.com`
- `SERVE_FRONTEND`: `1` to serve SPA via FastAPI (single-container); unset or `0` to serve SPA separately (recommended for CDN/edge).

## Frontend deployment

- Build SPA in `frontend/`:
  - `npm ci && npm run build`
  - Deploy `frontend/dist` to S3+CloudFront, Netlify, or Vercel static hosting.
- If using NGINX container (current compose), you can ship the built assets via `Dockerfile.frontend`.

## Observability & health

- Health endpoint: `GET /health`
- Structured logs: see `backend/logging_config.py`; forward to CloudWatch/Stackdriver.

## Backups

- In serverless/cloud, don’t back up the SQLite file. Instead:
  - Use managed Postgres snapshots, or
  - Periodic logical dumps to S3/Blob (pg_dump).

## Security basics

- Disable wide-open CORS in production.
- Keep secrets in a managed store (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager).
- Ensure dependencies are pinned and updated.

## Minimal code changes needed

- Add Mangum handler for Lambda (see above). No other code changes required.
- Ensure `backend/config.py` reads `DATABASE_URL` from env (already supported).
- Use Postgres in production; don’t rely on filesystem for runtime state.

## Runbook (Lambda)

- Build layer or package with app dependencies (via container or zip with `requirements.txt`).
- Handler: `backend.lambda_handler.handler`
- Memory: 512–1024MB for faster cold start; adjust timeout (10–30s initial).
- Set env vars: `DATABASE_URL`, `CORS_ORIGINS`.

---

Questions or want a tailored infra plan (IaC templates, CI/CD)? Open an issue and share your target platform.
