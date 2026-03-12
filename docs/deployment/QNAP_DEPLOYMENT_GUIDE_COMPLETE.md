# QNAP Deployment Guide (Consolidated)

**Version:** 1.18.12
**Last Updated:** 2026-03-13
**Scope:** All QNAP Container Station deployments (basic, ARM/TS-431P3, virtual host)

---

## 📦 Deployment Flavors

- **Standard Container Station (default)** — uses `docker-compose.qnap.yml`; fastest path for most NAS models.
- **ARM / TS-431P3** — uses ARM32v7 images and build steps; summarized below (full detail archived).
- **Virtual Host** — serves the frontend via QNAP Web Server with custom domain/HTTPS; summarized below (full plan archived).

Archived deep-dives: see `archive/qnap-2025-12-06/` for the original detailed plans, compatibility matrix, and TS-431P3 step-by-step guide.

---

## 🚀 Quick Start (Standard QNAP Compose)

Prereqs: Container Station installed, SSH access, and repository copied to the NAS (e.g., `/share/Container/AUT_MIEEK_SMS`).

```bash
cd /share/Container/AUT_MIEEK_SMS
# Build and start

docker compose -f docker-compose.qnap.yml up -d --build
# Follow logs

docker compose -f docker-compose.qnap.yml logs -f

```text
Open `http://<NAS-IP>:8080/`.

---

## 🗄️ QNAP PostgreSQL-Only (Recommended for VPS Runtime)

If you want a **single common database online on QNAP** while running the app on a VPS/native host, use the dedicated PostgreSQL-only stack.

### Why this mode

- Keeps QNAP focused on database durability and snapshots
- Avoids running full app stack on constrained NAS hardware
- Lets VPS handle API/frontend scaling

### Files

- Compose: `docker/docker-compose.qnap.postgres-only.yml`
- Env template: `.env.qnap.postgres-only.example`
- Installer: `scripts/qnap/install-qnap-postgres-only.sh`
- Manager: `scripts/qnap/manage-qnap-postgres-only.sh`

### Quick start

```bash
cd /share/Container/AUT_MIEEK_SMS
cp .env.qnap.postgres-only.example .env.qnap.postgres-only
# Set QNAP_PG_BIND_IP to private/VPN interface (WireGuard/Tailscale/LAN)
./scripts/qnap/install-qnap-postgres-only.sh
./scripts/qnap/manage-qnap-postgres-only.sh status
```

### Security requirements (mandatory)

- Do **not** expose PostgreSQL directly to public internet.
- Bind to private/VPN interface only (`QNAP_PG_BIND_IP`).
- Allow access only from app host IP/VPN peers via firewall rules.
- Use strong `POSTGRES_PASSWORD` and SCRAM auth (enabled in compose).
- `./scripts/qnap/manage-qnap-postgres-only.sh psql-url` now redacts the password by default; use `--show-password` only when you explicitly need the full URL.

### App connection (VPS/backend)

Prefer backend `.env` settings in this shape:

```ini
DATABASE_ENGINE=postgresql
POSTGRES_HOST=<QNAP_PRIVATE_OR_VPN_IP>
POSTGRES_PORT=<QNAP_PG_PORT>
POSTGRES_USER=<POSTGRES_USER>
POSTGRES_PASSWORD=<POSTGRES_PASSWORD>
POSTGRES_DB=<POSTGRES_DB>
POSTGRES_SSLMODE=prefer
```

If you need a raw URL, use:

`postgresql+psycopg://<POSTGRES_USER>:<POSTGRES_PASSWORD>@<QNAP_PRIVATE_OR_VPN_IP>:<QNAP_PG_PORT>/<POSTGRES_DB>`

Then run normal app deployment on VPS side.

**Data volume:** `sms_data_qnap` (change to a bind mount if you prefer a shared folder).

**Upgrade / restart:**

```bash
docker compose -f docker/docker-compose.qnap.postgres-only.yml --env-file .env.qnap.postgres-only pull
docker compose -f docker/docker-compose.qnap.postgres-only.yml --env-file .env.qnap.postgres-only up -d

```text
**Uninstall:**

```bash
docker compose -f docker/docker-compose.qnap.postgres-only.yml --env-file .env.qnap.postgres-only down

```text
---

## 🏗️ ARM / TS-431P3 (Summary)

- Use the ARM32v7 compose/build steps from `docker-compose.qnap.arm32v7.yml`.
- Build images locally on the NAS (QEMU not required on-device); expect longer build time.
- Keep RAM ≥ 4GB; TS-431P3 8GB is fully supported.
- For a pre-flight checklist, see the archived `QNAP_TS-431P3_ARM_BUILD_GUIDE.md`.

---

## 🌐 Virtual Host Option (Summary)

- Serve the built frontend via QNAP Web Server virtual host (e.g., `https://sms.yourdomain.com`).
- Proxy `/api` to the backend container network; keep backend in Container Station.
- Use QNAP SSL certificate management for HTTPS.
- Full step-by-step plan (architecture diagrams, troubleshooting) lives in the archived `QNAP_VIRTUAL_HOST_DEPLOYMENT_PLAN.md`.

---

## 🔧 Configuration Notes

- **CORS & VITE_API_URL:** default `VITE_API_URL="/api"` so same-origin via NGINX proxy inside the container.
- **Database:** for the shared-DB architecture, prefer the PostgreSQL-only QNAP stack above. Treat SQLite-on-QNAP as a simpler legacy/local mode, not the preferred common-database path.
- **Volumes:** Convert `sms_data_qnap` to a bind mount for easier backups:

  ```yaml
  volumes:
    sms_data_qnap:
      driver_opts:
        type: none
        o: bind
        device: /share/Container/sms_data
  ```

- **Permissions:** Ensure the bind folder exists and is writable:

  ```bash
  mkdir -p /share/Container/sms_data
  chmod 777 /share/Container/sms_data
  ```

---

## 🛡️ Maintenance & Recovery

- **Backups:** Use QNAP snapshots or copy `sms_data_qnap` (or bind mount path). For Postgres, back up the DB volume as well.
- **PostgreSQL-only backups:** `./scripts/qnap/manage-qnap-postgres-only.sh backup` now creates a compressed dump, validates the gzip archive, writes a `.sha256` checksum, and prunes older backups based on `QNAP_POSTGRES_BACKUP_KEEP`.
- **Logs:** `docker compose -f docker-compose.qnap.yml logs -f` for live tail; export before pruning.
- **Cleanup:** If space is tight, run `./DOCKER.ps1 -Prune` from a dev machine (or equivalent Docker prune on the NAS). Avoid deleting volumes unless you have a backup.
- **Reset admin password:**

  ```bash
  cd backend
  python -m backend.tools.create_admin --reset-password admin@example.com
  ```

- **Switch to emergency auth (temporary):** add `AUTH_MODE=disabled` in backend `.env`, then remove after recovery.

---

## 🧭 Troubleshooting Cheatsheet

- **Container won’t start:** check `docker compose ... logs`, verify `DATABASE_URL` and available disk space.
- **PostgreSQL-only installer fails preflight:** verify `QNAP_PG_BIND_IP` is set to a real private/VPN interface address, the port is available, and QNAP data/backup folders are writable.
- **Port already in use:** adjust `ports:` in `docker-compose.qnap.yml` or stop conflicting services.
- **ARM image errors:** rebuild using the ARM compose file; ensure `docker buildx` is available if cross-building.
- **Frontend 404s behind virtual host:** confirm `/api` proxy rule and that SPA fallback is enabled in QNAP Web Server.

---

## 📚 References

- Compose files: `docker-compose.qnap.yml`, `docker/docker-compose.qnap.yml` variants
- Backend tooling: `backend/tools/create_admin`
- Archived deep dives: `archive/qnap-2025-12-06/`
