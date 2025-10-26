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

The backend uses SQLite by default. A named volume `sms_data` stores the database file at `/data/student_management.db` inside the backend container.

Environment overrides in `docker-compose.yml`:

- `DATABASE_URL=sqlite:////data/student_management.db` (four slashes for absolute path)
- `CORS_ORIGINS=http://localhost:8080` to allow same-host frontend in dev

To reset data, remove the volume:

```pwsh
docker volume rm sms_student-management-system_sms_data
```

The exact volume name may differ; list volumes with:

```pwsh
docker volume ls
```

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
