# 🚀 Simple Installation Guide

## One-Command Install

### Windows

```batch
INSTALL.bat
```

Just double-click `INSTALL.bat` - that's it!

### Any Platform (with Python)

```bash
python install.py
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
- Run: `INSTALL.bat`

### Option B: Python + Node.js

- Python 3.11+: <https://www.python.org/downloads/>
- Node.js 18+: <https://nodejs.org/>
- Run: `python install.py`

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
python install.py
```

The installer will tell you exactly what's missing.

---

## That's It

Download → run `INSTALL.bat` → start using the app.

No execution policies, no complex setup, no PowerShell issues.

For advanced usage, see the full README.md
