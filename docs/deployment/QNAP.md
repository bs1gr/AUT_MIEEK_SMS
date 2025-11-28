# QNAP Container Station Deployment Guide

This guide helps you run the Student Management System on a QNAP Turbo NAS using Container Station.

> **NEW:** For production deployments with virtual hosting and custom domains, see the comprehensive [QNAP Virtual Host Deployment Plan](QNAP_VIRTUAL_HOST_DEPLOYMENT_PLAN.md). This guide covers the advanced setup using QNAP Web Server with virtual hosts for professional URLs like `https://sms.yourdomain.com`.

## What you get

- Frontend (React + NGINX) on port 8080
- Backend (FastAPI) on internal network
- Persistent SQLite storage on a bound volume

> Tip: For production, switch to Postgres. SQLite is fine for small deployments or demo.

## Prerequisites

- QNAP NAS with Container Station installed
- Git or a way to copy this repo to your NAS

## Files to use

- `docker-compose.qnap.yml` (provided)
- `docker/nginx.conf` (already configured to proxy /api to backend)

## Steps

1. Copy the repository to your NAS (e.g., to `/share/Container/AUT_MIEEK_SMS`)
1. From Container Station, open a terminal or use SSH into your NAS
1. From the project folder, run:

```sh
# Build and start
docker compose -f docker-compose.qnap.yml up -d --build

# Check logs
docker compose -f docker-compose.qnap.yml logs -f
```

1. Open your browser to `http://<NAS-IP>:8080/`

## Configuration

- Frontend is built with `VITE_API_URL="/api"` so same-origin requests go through NGINX and get proxied to backend.
- CORS is set to allow `http://<NAS-IP>:8080`. Adjust in `docker-compose.qnap.yml` if you use a different host or port.
- Data is persisted in the `sms_data_qnap` volume. You can convert it to a bind mount targeting a shared folder:

```yaml
volumes:
  sms_data_qnap:
    driver_opts:
      type: none
      o: bind
      device: /share/Container/sms_data
```

Then ensure the folder exists and is writable:

```sh
mkdir -p /share/Container/sms_data
chmod 777 /share/Container/sms_data
```

## Switching to Postgres (recommended for production)

- Set `DATABASE_URL` to point to a managed Postgres or a Postgres container
  - Example: `postgresql+psycopg://user:pass@postgres:5432/sms`
- Add a `postgres` service and a dependency in the compose file
- Run Alembic migrations if you enable them

## Updating / Restarting

```sh
docker compose -f docker-compose.qnap.yml pull
docker compose -f docker-compose.qnap.yml up -d --build
```

## Uninstall

```sh
docker compose -f docker-compose.qnap.yml down
# Optional: remove volume data
# docker volume rm student-management-system_sms_data_qnap
```

## Troubleshooting

- Port 8080 already in use: Change host port in `docker-compose.qnap.yml`
- White screen: Check frontend build logs and ensure `nginx.conf` is present
- API 502: Ensure `backend` container is healthy and NGINX can reach it on the internal network
