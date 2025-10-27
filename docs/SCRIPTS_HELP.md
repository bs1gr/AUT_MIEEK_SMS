# Scripts Guide

This guide explains every script in the `scripts/` folder: what it does, when to use it, and example usage. All commands below are PowerShell (Windows). Run from the project root unless noted.

Tip: If PowerShell blocks execution, launch a terminal and run:

```pwsh
Set-ExecutionPolicy -Scope CurrentUser Bypass -Force
```

## Table of Contents
- Unified Entry
- Fullstack (single container)
- Compose (two containers)
- Developer Tools & Diagnostics
- Maintenance & Cleanup
- Setup & Daily Use

---

## Unified Entry

### scripts/DOCKER_RUN.ps1
One entry for both flows.

- Default mode: Compose (frontend + backend containers)
- Select fullstack mode with `-Mode fullstack`
- Rebuild without cache using `-NoCache`
- Stop/remove containers with `-Down`

Examples:
```pwsh
# Compose (default): rebuild + up -d
./scripts/DOCKER_RUN.ps1

# Compose, no-cache rebuild
./scripts/DOCKER_RUN.ps1 -NoCache

# Fullstack: build + run on port 8081 (default)
./scripts/DOCKER_RUN.ps1 -Mode fullstack

# Fullstack on port 8082
./scripts/DOCKER_RUN.ps1 -Mode fullstack -Port 8082

# Stop containers
./scripts/DOCKER_RUN.ps1 -Mode compose -Down
./scripts/DOCKER_RUN.ps1 -Mode fullstack -Down
```

When to use:
- Prefer this script for most cases; it chooses the right underlying script and ensures you’re on the latest image.

---

## Fullstack (single container)
Backend serves the built SPA; great for end users and production-like testing.

### scripts/DOCKER_FULLSTACK_REFRESH.ps1
Build the fullstack image and optionally run it.

Parameters:
- `-NoCache`: force full rebuild
- `-Run`: run the container
- `-Port <int>`: host port to map to container 8000 (default 8081)

Examples:
```pwsh
# Build only
./scripts/DOCKER_FULLSTACK_REFRESH.ps1

# Build and run on default port 8081
./scripts/DOCKER_FULLSTACK_REFRESH.ps1 -Run

# Build no-cache and run on port 8082
./scripts/DOCKER_FULLSTACK_REFRESH.ps1 -NoCache -Run -Port 8082
```

### scripts/DOCKER_FULLSTACK_UP.ps1
Run the existing fullstack image (optionally `-Rebuild` first).

### scripts/DOCKER_FULLSTACK_DOWN.ps1
Stop the fullstack container (optionally `-RemoveImage`).

When to use:
- Use these when you want a single container serving everything.

---

## Compose (two containers)
NGINX serves the frontend; FastAPI runs separately.

### scripts/DOCKER_REFRESH.ps1
Rebuild and start the compose stack (frontend + backend).

Parameters:
- `-NoCache`: force no-cache build

Examples:
```pwsh
# Rebuild + up -d
./scripts/DOCKER_REFRESH.ps1

# No-cache
./scripts/DOCKER_REFRESH.ps1 -NoCache
```

### scripts/DOCKER_UP.ps1 / scripts/DOCKER_DOWN.ps1
Convenience wrappers to start/stop the compose stack.

When to use:
- Prefer compose for dev scenarios needing separate services and NGINX proxy.

---

## Developer Tools & Diagnostics

### scripts/DEVTOOLS.ps1 / DEVTOOLS.bat
Interactive menu for developers:
- Docker operations: build, logs, shell
- Diagnostics: health, ports, database
- Native mode: run Python + Node with hot-reload

### scripts/DEBUG_PORTS.ps1
Quickly identify port conflicts (e.g., 8080, 8000, 5173).

### scripts/DIAGNOSE_FRONTEND.ps1
Checks common frontend issues (build output, NGINX mapping, proxy).

### scripts/DOCKER_SMOKE.ps1
Basic smoke tests (health endpoint, docs availability) against running containers.

When to use:
- Use these to troubleshoot environment issues and validate the stack.

---

## Maintenance & Cleanup

### scripts/CLEANUP.ps1
Moves obsolete files to `./Obsolete/` and removes temporary artifacts like `__pycache__` and `*.pid`.

- Safe by default (moves rather than deletes)
- Review `./Obsolete/` before deleting permanently

### scripts/CLEANUP_DOCS.ps1
Cleans up docs artifacts and normalizes formatting.

### scripts/CLEANUP_OBSOLETE_FILES.ps1
Batch-moves older scripts and files out of the main workspace.

### scripts/CREATE_PACKAGE.ps1
Create a distributable package (zip) for release/testing.

When to use:
- Run periodically to keep the repo tidy, especially before packaging or releases.

---

## Setup & Daily Use

### SETUP.ps1 / SETUP.bat
First-time build steps (Docker images, environment prep).

### QUICKSTART.ps1 / QUICKSTART.bat
Start the app quickly (defaults to the recommended flow on your system).

### STOP.ps1 / STOP.bat
Stop the running app/containers.

### INSTALL.ps1
Legacy installer used by older flows; use `SETUP.ps1` instead in most cases.

When to use:
- For end users: `SETUP` once, then `QUICKSTART` daily, `STOP` when done.
- For developers: use `DEVTOOLS` for advanced tasks.

---

## Decision Guide

- Want the simplest, production-like run? Use Fullstack:
  - `./scripts/DOCKER_RUN.ps1 -Mode fullstack`
- Need NGINX proxy and separate services? Use Compose:
  - `./scripts/DOCKER_RUN.ps1` (default)
- Changed a lot of code or base layers? Force rebuild:
  - Add `-NoCache`
- Port conflict? Change the port:
  - Fullstack: `-Port 9090`
  - Compose: adjust `docker-compose.yml` if needed

## Notes
- Health endpoints:
  - Compose (frontend proxy): http://localhost:8080/health
  - Fullstack: http://localhost:8081/health (or your `-Port`)
- Database volume persists across runs; see DEVTOOLS for backup/restore.
