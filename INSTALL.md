# 🚀 Simple Installation Guide

## One-Command Install

### Recommended (All platforms)

Use the canonical one-click entrypoint provided by the project. This replaces older helpers such as `INSTALL.bat` or `install.py`.

```powershell
.\RUN.ps1           # One command to install (Docker) and start the application
```

For native development workflows use the supported native entry point:

```powershell
pwsh -NoProfile -File scripts/dev/run-native.ps1
```

---

## What It Does

The installer automatically:

1. ✅ Detects Docker / Python / Node.js
2. ✅ Chooses the best mode for your system
3. ✅ Installs all dependencies
4. ✅ Sets up the database
5. ✅ Starts the application
6. ✅ Opens your browser

**No configuration needed!**

---

## Requirements

You need **ONE** of these:


### Option A: Docker (Recommended - Easiest)

- Install Docker Desktop: <https://www.docker.com/products/docker-desktop/>
- Start Docker Desktop
- Run: `.\RUN.ps1`

### Option B: Python + Node.js (Developer / Advanced)

- Python 3.11+: <https://www.python.org/downloads/>
- Node.js 18+: <https://nodejs.org/>
- Use the native dev entrypoint for backend+frontend during development:

```powershell
pwsh -NoProfile -File scripts/dev/run-native.ps1
```

---

## After Installation

### Docker Mode

- **Access:** <http://localhost:8080>
- **Stop:** `docker compose down`
- **Start again:** `docker compose up -d`

### Native Mode

```bash
# Backend (terminal 1)
cd backend
python -m uvicorn backend.main:app --reload

# Frontend (terminal 2)
cd frontend
npm run dev
```

- **Access:** <http://localhost:5173>

---

## Troubleshooting

### "Docker not found"

Install Docker Desktop from: <https://www.docker.com/products/docker-desktop/>

### "Python not found"

Install Python 3.11+ from: <https://www.python.org/downloads/>
**Important:** Check "Add Python to PATH" during installation

### "Node.js not found"

Install Node.js 18+ from: <https://nodejs.org/>

### Still not working?

Run diagnostics:

```bash
# The old `install.py` helper has been removed. See `INSTALLATION_GUIDE.md` or use `.\RUN.ps1`.
```

The installer will tell you exactly what's missing.

---

## That's It

Download → run `.\RUN.ps1` → start using the app.

No execution policies, no complex setup, no PowerShell issues.

For advanced usage, see the full README.md
