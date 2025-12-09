# QNAP Deployment Guide (Consolidated)

**Version:** 1.9.9  
**Last Updated:** 2025-12-06  
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
```

Open `http://<NAS-IP>:8080/`.

**Data volume:** `sms_data_qnap` (change to a bind mount if you prefer a shared folder).

**Upgrade / restart:**

```bash
docker compose -f docker-compose.qnap.yml pull
docker compose -f docker-compose.qnap.yml up -d --build
```

**Uninstall:**

```bash
docker compose -f docker-compose.qnap.yml down
```

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
- **Database:** SQLite volume by default; switch to Postgres by adding a `postgres` service and updating `DATABASE_URL`.
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
- **Port already in use:** adjust `ports:` in `docker-compose.qnap.yml` or stop conflicting services.
- **ARM image errors:** rebuild using the ARM compose file; ensure `docker buildx` is available if cross-building.
- **Frontend 404s behind virtual host:** confirm `/api` proxy rule and that SPA fallback is enabled in QNAP Web Server.

---

## 📚 References

- Compose files: `docker-compose.qnap.yml`, `docker/docker-compose.qnap.yml` variants
- Backend tooling: `backend/tools/create_admin`
- Archived deep dives: `archive/qnap-2025-12-06/`
