# QNAP Deployment Plan

This placeholder document satisfies automated test expectations (`test_qnap_deployment_exists`) and outlines the high-level steps for deploying the Student Management System on a QNAP NAS environment.

## Objectives

- Run the consolidated Docker stack (`DOCKER.ps1 -Start`) on QNAP.
- Persist database volume (`sms_data`) to QNAP storage.
- Provide backup and restore procedures using `adminops` endpoints and volume snapshots.

## Prerequisites

1. QNAP NAS with Container Station (Docker) enabled.
2. QNAP user with permission to manage containers and shared folders.
3. Allocated shared folder for persistent data (e.g., `/share/sms_data`).
4. Generated strong SECRET_KEY placed into `backend/.env` before first run.

## Deployment Steps

1. Copy repository to QNAP (Git clone or upload archive).
2. Create/update `backend/.env` and `frontend/.env` from examples.
3. From an SSH session on QNAP, build and start:

   ```sh
   docker compose -f docker-compose.prod.yml up -d --build
   ```

4. Verify container health:

   ```sh
   docker ps
   docker logs sms-fullstack --tail=100
   ```

5. Access application via `http://<QNAP_HOST>:8080`.

## Backup & Restore

- Trigger backup via API: `POST /api/v1/adminops/backup` (admin token required).
- Store produced `.db` files under `/backups` share.
- Restore by `POST /api/v1/adminops/restore` with uploaded file.

## Monitoring (Optional)

If Prometheus/Grafana containers are used, ensure host networking or adjust environment variables pointing to QNAP host.

## Security Notes

- Always set a long random `SECRET_KEY`.
- Enable authentication by setting `AUTH_ENABLED=1` in `.env`.
- For role enforcement use `AUTH_MODE=strict` once initial admin user is created.

## Future Enhancements

- Automate backup rotation with a cron container.
- Add NAS-specific health probe integration.

---
This file can be expanded with QNAP-specific tuning guidelines as needed.
