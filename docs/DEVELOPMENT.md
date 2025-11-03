# Development setup

This document describes how to set up a local development environment for the backend and run static checks.

Prerequisites
-------------
- Python 3.11+ installed
- Node.js (for frontend development) if working with the frontend

Install runtime dependencies (optional for local dev)

```pwsh
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
```

Install development dependencies (type checking, linters)

```pwsh
python -m pip install -r backend/requirements-dev.txt
# or install globally: pip install mypy ruff
```

Run tests
---------

```pwsh
cd backend
python -m pytest -q
```

Run pre-commit checks (formatters and hooks)
-------------------------------------------

```pwsh
pre-commit run --all-files
```

Run mypy
--------

```pwsh
python -m mypy backend --config-file mypy.ini --show-error-codes
```

Notes
-----
- The project uses `backend/requirements-dev.txt` for development-only packages. CI workflows use the same file when available.
- If you plan to build Docker images for production, do not include dev requirements in the production image.
