# create_admin usage

This document explains how to use the `create_admin.py` tool to create an administrator user for the Student Management System.

Recommended invocation (preferred):

```powershell
# From repository root
python -m backend.tools.create_admin --email admin@example.com --password 'StrongP@ssw0rd!'
```

Why this invocation?

- Running the script as a module (`-m`) makes Python treat `backend` as a package. This avoids `ModuleNotFoundError: No module named 'backend'` when imports like `backend.db` are used inside the script.

Alternate invocation (if you must run the file directly):

```powershell
# Ensure Python can import the 'backend' package from the repo root
$env:PYTHONPATH = (Resolve-Path .).Path
python backend/tools/create_admin.py --email admin@example.com --password 'StrongP@ssw0rd!'
```

Security guidance

- Do NOT use the public registration endpoint to create admin users. The frontend Register widget only creates regular (teacher) accounts.
- Prefer creating admin accounts using this script or via an internal-only administrative API that is protected by network access controls.
- Never commit plaintext passwords into source control or share them in PRs. Use temporary credentials and rotate on first login.

Troubleshooting

- If you still see `ModuleNotFoundError: No module named 'backend'`, confirm you're running the command from the project root and that the active Python interpreter is the one with the project dependencies installed.
- If the script reports DB connection errors, check `backend/config.py` settings and environment variables (e.g., `DATABASE_URL`).
