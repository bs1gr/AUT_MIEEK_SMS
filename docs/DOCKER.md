# Docker Quickstart

This repository includes a production-friendly Docker setup that serves the built frontend with NGINX and proxies API requests to the FastAPI backend.

## Components

- Backend: FastAPI (Uvicorn) on port 8000
- Frontend: React (Vite) built to static files, served by NGINX on port 80
- NGINX: Serves frontend and proxies API endpoints (/api/*) and service endpoints (/health, /docs, /redoc, /control) to the backend

The docker-compose setup exposes only the frontend on host port 8080 by default, keeping the backend internal. You can optionally expose the backend on host 8000.

## Prerequisites

- Docker Desktop (Windows/macOS) or Docker Engine (Linux)

## Build and Run

From the project root:

```pwsh
# Build images and start containers in the background
docker compose build
docker compose up -d

# Open the app
Start-Process http://localhost:8080
```

### Unified entry (Windows)

Prefer using the unified helper that picks Compose vs Fullstack:

```pwsh
# Compose mode (default): rebuild and start both containers
./scripts/DOCKER_RUN.ps1

# Compose with no-cache rebuild
./scripts/DOCKER_RUN.ps1 -NoCache

# Fullstack single-image: build and run on port 8081
./scripts/DOCKER_RUN.ps1 -Mode fullstack

# Fullstack on a different host port
./scripts/DOCKER_RUN.ps1 -Mode fullstack -Port 8082

# Stop (Down) for either mode
./scripts/DOCKER_RUN.ps1 -Mode compose -Down
./scripts/DOCKER_RUN.ps1 -Mode fullstack -Down
```

Stop and remove containers:

```pwsh
# Stop and remove containers
docker compose down
```

## Customizing API URL in Frontend Build

By default, the frontend is built with `VITE_API_URL=/api/v1` so all API calls are relative to the same origin and proxied by NGINX.

If you need to target a different backend URL at build time, pass a build arg:

```pwsh
# Example: point to external backend host
docker compose build --build-arg VITE_API_URL=http://api.example.com/api/v1 frontend
```

Note: This value is compiled at build time by Vite.

## Persisting the Database

The backend uses SQLite by default. A named volume `sms_data` stores the database file at `/data/student_management.db` inside the fullstack container.

Environment overrides in `docker-compose.yml` (legacy compose setup):

- `DATABASE_URL=sqlite:////data/student_management.db` (four slashes for absolute path)
- `CORS_ORIGINS=http://localhost:8080` to allow same-host frontend in dev

To reset data, remove the volume:

```pwsh
docker volume rm sms_data
```

The exact volume name may differ in legacy compose (auto-prefixed), list all volumes with:

```pwsh
docker volume ls
```

### Backups and Restore (recommended)

Use the Developer Tools menu for one-click database management:

- Backup: DEVTOOLS → `[B]` Backup Database (to `./backups`)
- Restore: DEVTOOLS → `[T]` Restore Database (from `./backups`)
- Migrate: DEVTOOLS → `[M]` Migrate Compose → Fullstack Volume

What each option does:

- Backup copies `/data/student_management.db` from the `sms_data` volume to a timestamped file in the local `./backups` folder using an ephemeral Alpine container.
- Restore stops the running container (if any) and copies a selected backup file back into the `sms_data` volume as `/data/student_management.db`.
- Migrate copies all content from legacy compose volume `student-management-system_sms_data` into `sms_data`.

Backups are safe to run while the app is running, but for consistency-sensitive operations you may prefer to stop briefly before restoring.

## Troubleshooting

- Frontend 404 on refresh: Handled by NGINX `try_files` to `index.html`.
- API CORS errors: Ensure `CORS_ORIGINS` includes your frontend origin or use same-origin (default compose is same-origin via proxy).
- Backend health: Check <http://localhost:8080/health> (proxied) or expose backend port and test <http://localhost:8000/health>.
- Rebuild needed after frontend changes: `docker compose build frontend && docker compose up -d`.

## Optional: Expose Backend Port

Uncomment the `ports` mapping under the `backend` service in `docker-compose.yml`:

```yaml
    # ports:
    #   - "8000:8000"
```

Then access backend docs at <http://localhost:8000/docs>.

## Fullstack Image (Backend serves frontend)

If you prefer a single container, you can build the fullstack image which serves the built frontend directly from FastAPI.

```pwsh
# Build fullstack image
docker build -f docker/Dockerfile.fullstack -t sms-fullstack .

# Run (maps container 8000 to host 8080)
docker run --rm -p 8080:8000 sms-fullstack

# Open the app
Start-Process http://localhost:8080
```

Notes:

- The fullstack image sets `SERVE_FRONTEND=1` in the backend, enabling SPA serving.
- Root URL `/` serves the SPA (index.html), while API endpoints remain at `/api/v1/*`.
- API metadata is available at `/api` (JSON).
- Swagger docs: `/docs`, ReDoc: `/redoc`, Health: `/health`.
- Client-side routes (e.g., `/#power`) work via 404 fallback to index.html.

### Helper scripts (Windows)

On Windows, you can use the provided helper scripts:

```pwsh
# Build (optional) and run fullstack
./scripts/DOCKER_FULLSTACK_UP.ps1           # run using existing image
./scripts/DOCKER_FULLSTACK_UP.ps1 -Rebuild  # rebuild image first, then run

# Stop container (and optionally remove the image)
./scripts/DOCKER_FULLSTACK_DOWN.ps1
./scripts/DOCKER_FULLSTACK_DOWN.ps1 -RemoveImage

# Refresh (rebuild + run) helpers
./scripts/DOCKER_REFRESH.ps1                # compose rebuild + up -d
./scripts/DOCKER_FULLSTACK_REFRESH.ps1 -Run # fullstack rebuild + run (port 8081)
```

You’ll also find these options in `LAUNCHER.bat` under:

- F: Fullstack Up (single container)
- G: Fullstack Down (single container)

## Publishing Images (GHCR)

This repo includes a release workflow to build and push images to GitHub Container Registry (GHCR).

- Trigger via pushing a tag like `v1.0.0` or manually from Actions.
- Images pushed (owner namespace, all lowercase):
  - `ghcr.io/<owner>/sms-backend`
  - `ghcr.io/<owner>/sms-frontend`
  - `ghcr.io/<owner>/sms-fullstack`

You can pull and run the fullstack image like:

```pwsh
docker run --rm -p 8080:8000 ghcr.io/<owner>/sms-fullstack:latest
```
