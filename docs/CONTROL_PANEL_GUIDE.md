# Control Panel Guide

The **HTML Control Panel** provides a lightweight, browser-based interface to manage the Student Management System without keeping terminal windows open.

## Quick Start

### Option 1: Use the Launcher

1. Run `LAUNCHER.bat`
2. Select option **\[C\]** (Control Panel Only)
3. The backend will start and the control panel will open in your browser
4. The launcher script exits immediately—no terminal windows remain open

### Option 2: Command Line

```powershell
.\scripts\RUN.ps1 -ControlOnly
```

Or from the project root:

```batch
powershell -File .\scripts\RUN.ps1 -ControlOnly
```

## Features

### System Status

- **Real-time monitoring** of backend and frontend services
- **Port detection** automatically identifies which ports services are using
- **Refresh button** to manually update status (auto-refresh every 4 seconds)

### Service Controls

- **Start Frontend** - Launches the Vite dev server (port 5173)
- **Stop Frontend** - Gracefully stops the frontend only
- **Stop All** - Stops both frontend and backend (page becomes unreachable after this)
- **Stop Backend** - Stops the backend server (page becomes unreachable after this)

### Quick Access

- **Open Frontend** - Opens the main application (detects port automatically)
- **Open API Docs** - Opens Swagger UI at `/docs`
- **Open ReDoc** - Opens ReDoc documentation at `/redoc`

### Operations & Maintenance

- **Install Frontend/Backend Dependencies** – Installs npm/pip dependencies
- **Build Docker Image** – Builds the fullstack image for distribution
- **Cleanup System** – Removes temporary files and Python caches
- **Cleanup Obsolete Files** – Removes outdated, non-essential docs (host-only)
- **Update Docker Data Volume** – Creates a new versioned data volume and writes `docker-compose.override.yml` to switch volumes (host-only; optional data migration). After running, apply with `docker compose down` then `docker compose up -d`.

## Use Cases

### Minimal Demo Run

1. Launch control panel only (no frontend)
2. Check system status
3. Start frontend when ready
4. Open the app from the control panel
5. Stop all services when done

**Benefits:**

- No long-running terminal windows
- Clean exit after starting services
- Minimal resource usage (backend only until you need frontend)

### Quick Status Check

1. Open control panel
2. View service status
3. Close browser when done (services keep running)

### On-Demand Frontend

- Keep backend running permanently
- Start/stop frontend as needed via control panel
- Useful for development where you want to restart frontend frequently

## Technical Details

### Architecture

- **Control Panel**: Single HTML file (`html_control_panel.html`) served by backend
- **Endpoint**: `http://localhost:8000/control`
- **Backend API Routes**:
  - `GET /control/api/status` - Current service status
  - `POST /control/api/start` - Start frontend
  - `POST /control/api/stop` - Stop frontend
  - `POST /control/api/stop-all` - Stop all services
  - `POST /control/api/stop-backend` - Stop backend

### Port Detection

- Backend auto-detects ports 8000-8010
- Frontend auto-detects ports 5173-5180
- Control panel adapts to actual ports in use

### Process Management (Windows)

- Uses `taskkill` for graceful termination
- Tree kill (`/T` flag) ensures child processes are stopped
- Force flag (`/F`) for stubborn processes
- PID tracking via `.backend.pid` and `.frontend.pid` files

## Comparison: Full vs Control-Only Mode

| Feature | Full Mode (`RUN.bat`) | Control-Only Mode |
|---------|----------------------|-------------------|
| Backend | ✅ Auto-start | ✅ Auto-start |
| Frontend | ✅ Auto-start | ❌ Manual via control panel |
| Browser | Opens frontend (5173) | Opens control panel (8000/control) |
| Terminal | Waits for services | Exits immediately |
| Resource | Higher (both services) | Lower (backend only) |
| Use case | Production, normal use | Testing, demos, minimal runs |

## Troubleshooting

### Control Panel Won't Load

- **Check backend status**: The control panel is served by the backend. If it won't load, the backend isn't running.
- **Start backend manually**:

  ```powershell
  cd backend
  .\venv\Scripts\activate
  uvicorn backend.main:app --host 127.0.0.1 --port 8000
  ```

### "Start Frontend" Fails

Common causes:

1. **Node.js not installed** - Install from <https://nodejs.org> (v18+ required)
2. **Dependencies not installed** - Run `LAUNCHER.bat` → option 4 (Install Dependencies)
3. **Port 5173 in use** - Close other Vite servers or change port
4. **npm not found** - Ensure Node.js installation includes npm and is on PATH

**Solution**: Check the in-browser error message; it will specify the exact cause.

### Services Won't Stop

If "Stop All" doesn't work:

1. Use the launcher → option 3 (Emergency Shutdown)
2. Or manually:

  ```powershell
   taskkill /F /IM node.exe /T
   taskkill /F /IM python.exe /T
   ```

### Page Becomes Unresponsive After Stopping Backend

**This is expected.** When you stop the backend, the control panel (served by the backend) becomes unreachable. Simply close the browser tab.

## Best Practices

1. **For quick tests**: Use control-only mode to avoid unnecessary frontend starts
2. **For development**: Use full mode to have both services ready
3. **For demos**: Start control-only, then start frontend when presenting
4. **After work**: Use "Stop All" from control panel for clean shutdown

## Security Notes

- Control panel binds to `127.0.0.1` (localhost only)
- Not exposed to network (safe for local development)
- No authentication required (local-only access assumed)
- For production deployment, add authentication and use HTTPS

## Next Steps

After verifying the control panel workflow:

1. Review [TODO.md](TODO.md) for Phase 3 deployment tasks
2. Proceed with Dockerization (see Docker section in TODO)
3. Consider Windows installer packaging for distribution

---

**Tip**: Bookmark `http://localhost:8000/control` for quick access after starting the backend manually!
