# Development Setup Guide (Full Reference)

> **📖 Canonical Guide:** This is now supplementary to **[DEVELOPER_GUIDE_COMPLETE.md](DEVELOPER_GUIDE_COMPLETE.md)** which includes all content below.
>
> **Use:** Refer to the complete guide for integrated setup + architecture + best practices.

## 📋 Table of Contents

1. [Quick Start (30 seconds)](#quick-start-30-seconds)
2. [Prerequisites](#prerequisites)
3. [Testing Setup](#testing-setup)
4. [Pre-commit Validation](#pre-commit-validation)
5. [Troubleshooting](#troubleshooting)
6. [Repository Health](#repository-health)

---

## ⚡ Quick Start (30 seconds)

### TL;DR - Get Testing Working Now

```powershell

# Install development dependencies

cd backend
pip install -r requirements-dev.txt

# Verify it works

python -m pytest --version  # Should show: pytest 8.3.3

# Run validation

cd ..
.\COMMIT_READY.ps1 -Mode quick

```text
**That's it!** Your development environment is ready.

Optional: install the repository-provided pre-commit hook which runs `COMMIT_READY.ps1 -Mode quick` at commit time.
Use the helper scripts in `scripts/` to install hooks cross-platform:

PowerShell (Windows):

```powershell
pwsh ./scripts/install-git-hooks.ps1

```text
macOS / Linux:

```bash
./scripts/install-git-hooks.sh

```text
---

## 📦 Prerequisites

### System Requirements

- **Python**: 3.11, 3.12, or 3.13
- **Node.js**: 18+ (for frontend development)
- **PowerShell**: 7+ (for running scripts)
- **Docker Desktop**: Optional (for Docker deployment mode)

### Python Version Notes

- ✅ **Python 3.12**: Recommended (fully compatible, stable)
- ✅ **Python 3.11**: Fully supported
- ⚠️  **Python 3.13**: Requires pytest >= 8.0.0 (already configured in requirements-dev.txt)

---

## 🧪 Testing Setup

### Understanding Requirements Files

Your backend has **4 requirements files**:

| File | Purpose | When to Install |
|------|---------|-----------------|
| `requirements.txt` | Production dependencies (FastAPI, SQLAlchemy, etc.) | Always (production + development) |
| `requirements-dev.txt` | Testing & development tools (pytest, mypy, ruff) | Development only |
| `requirements-runtime.txt` | Runtime-specific dependencies | Production environment |
| `requirements-lock.txt` | Locked versions for reproducibility | CI/CD pipelines |

### Fresh Development Setup

```powershell
cd backend

# Create virtual environment (recommended)

python -m venv .venv
.venv\Scripts\Activate.ps1

# Install production dependencies

pip install -r requirements.txt

# Install development dependencies

pip install -r requirements-dev.txt

# Verify installation

python -m pytest --version

```text
### What Gets Installed

**From requirements-dev.txt**:

- ✅ pytest 8.3.3 (compatible with Python 3.13)
- ✅ pytest-cov 6.0.0 (code coverage)
- ✅ mypy 1.3.0 (type checking)
- ✅ Type stubs for libraries
- ✅ All testing tools

---

## 🔍 Common Issues & Fixes

### Issue 1: pytest Not Found

**Symptom**:

```text
ValueError: I/O operation on closed file

```text
or

```text
python: No module named pytest

```text
**Cause**: Development dependencies not installed

**Fix**:

```powershell
cd backend
pip install -r requirements-dev.txt

```text
---

### Issue 2: Python 3.13 Compatibility

**Symptom**:

```text
ValueError: I/O operation on closed file
pytest's capture.py at line 571: self.tmpfile.seek(0)

```text
**Cause**: Known compatibility issue between pytest < 8.0.0 and Python 3.13

**Fix Options**:

#### Option A: Upgrade pytest (Recommended)

```powershell
cd backend
pip install --upgrade pytest>=8.0.0 pytest-cov>=4.1.0

```text
The project's `requirements-dev.txt` already specifies pytest 8.3.3, so a fresh install should work.

#### Option B: Use Python 3.12 (Alternative)

Download Python 3.12 from python.org and recreate virtual environment:

```powershell
cd backend
rm -rf .venv
python3.12 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -r requirements-dev.txt

```text
#### Option C: Disable pytest Capture (Temporary Workaround)

```powershell
cd backend
python -m pytest -s  # -s disables capture

```text
**Note**: Loses output control, not recommended for regular use.

---

### Issue 3: Wrong Shell (Git Bash vs PowerShell)

**Symptom**: Commands not found, environment variables not accessible

**Cause**: Running PowerShell scripts from Git Bash

**Fix**: Always run validation scripts from PowerShell:

```powershell

# Press Win + X → Select "Windows PowerShell" or "Terminal"

cd D:\SMS\student-management-system
.\COMMIT_READY.ps1 -Mode quick

```text
**Why?** Git Bash (MINGW64) doesn't have:

- Direct access to Python.exe
- Direct access to npm/node.exe
- Proper environment for PowerShell scripts

---

### Issue 4: Port Already in Use

**Symptom**: Cannot start development server

**Fix**:

```powershell

# Check what's using the port

netstat -ano | findstr :8000   # Backend
netstat -ano | findstr :5173   # Frontend

# Stop existing processes

.\DOCKER.ps1 -Stop              # If Docker is running
.\NATIVE.ps1 -Stop              # If native mode is running

```text
---

## ✅ Pre-commit Validation

### Running COMMIT_READY.ps1

The project uses a unified pre-commit validation script with 4 modes:

#### Quick Mode (2-3 minutes) - Recommended for iterations

```powershell
.\COMMIT_READY.ps1 -Mode quick

```text
**Runs**:

- ✅ Code quality checks (Ruff, ESLint)
- ✅ Quick test suite
- ✅ Automated cleanup

#### Standard Mode (5-8 minutes) - DEFAULT

```powershell
.\COMMIT_READY.ps1

# or

.\COMMIT_READY.ps1 -Mode standard

```text
**Runs**:

- ✅ Full code quality checks
- ✅ Complete test suite (backend + frontend)
- ✅ TypeScript type checking
- ✅ Translation validation
- ✅ Automated cleanup

#### Full Mode (15-20 minutes) - Before releases

```powershell
.\COMMIT_READY.ps1 -Mode full

```text
**Runs**:

- ✅ Everything in standard mode
- ✅ Health checks (Native + Docker)
- ✅ Deployment validation
- ✅ Comprehensive reporting

#### Cleanup Only (1-2 minutes) - Maintenance

```powershell
.\COMMIT_READY.ps1 -Mode cleanup

```text
**Runs**:

- ✅ Remove Python cache (**pycache**, .pytest_cache)
- ✅ Remove Node cache (node_modules/.cache)
- ✅ Remove build artifacts (dist/, build/)
- ✅ Remove temporary files (*.tmp,*.bak)

### Auto-Fix Support

```powershell

# Run with automatic fixes

.\COMMIT_READY.ps1 -Mode quick -AutoFix

```text
**Auto-fixes**:

- ✅ Code formatting (Ruff format)
- ✅ Import organization
- ✅ ESLint fixable issues

### What Validation Checks

| Check | Quick | Standard | Full |
|-------|-------|----------|------|
| **Python Code Quality** (Ruff) | ✅ | ✅ | ✅ |
| **Python Type Checking** (mypy) | ❌ | ✅ | ✅ |
| **JavaScript Code Quality** (ESLint) | ✅ | ✅ | ✅ |
| **TypeScript Type Checking** | ❌ | ✅ | ✅ |
| **Backend Tests** (pytest) | ✅ Quick | ✅ Full | ✅ Full |
| **Frontend Tests** (Vitest) | ❌ | ✅ | ✅ |
| **Translation Integrity** | ❌ | ✅ | ✅ |
| **Health Checks** | ❌ | ❌ | ✅ |
| **Automated Cleanup** | ✅ | ✅ | ✅ |

---

## 📊 Repository Health

### Static Analysis Results

Based on latest repository audit (2025-11-28):

| Category | Status | Score |
|----------|--------|-------|
| **Organization** | ✅ Excellent | 10/10 |
| **Documentation** | ✅ Comprehensive | 10/10 |
| **Version Control** | ✅ Clean | 10/10 |
| **File Structure** | ✅ Well-organized | 10/10 |
| **Legacy Cleanup** | ✅ Complete | 10/10 |

**Overall Static Assessment**: 9.8/10 (Excellent)

### What Was Verified

1. ✅ **Directory Structure** - Excellent organization, minimal clutter
2. ✅ **Script References** - All legacy scripts properly archived
3. ✅ **Port Documentation** - Correctly documents both modes
4. ✅ **Build Artifacts** - None present (dist/, build/, cache/)
5. ✅ **Temporary Files** - None found (.tmp, .old, orphaned files)
6. ✅ **Version Consistency** - VERSION (1.17.2) matches CHANGELOG.md
7. ✅ **Git Status** - Clean working tree
8. ✅ **Documentation** - Master index up-to-date

### Runtime Validation Required

The following checks **require running** `COMMIT_READY.ps1`:

- ❌ Backend pytest tests
- ❌ Frontend TypeScript type checking
- ❌ Frontend ESLint validation
- ❌ Translation integrity tests
- ❌ Ruff linting

---

## 🔄 Development Workflow

### Daily Workflow

```powershell

# 1. Start development environment

.\NATIVE.ps1 -Start              # Backend + Frontend with hot-reload

# 2. Make changes...

# 3. Run quick validation before commit

.\COMMIT_READY.ps1 -Mode quick

# 4. If all checks pass, commit

git add .
git commit -m "your message"
git push

```text
### Before Creating Pull Request

```powershell

# Run standard validation

.\COMMIT_READY.ps1 -Mode standard

# Or full validation for major changes

.\COMMIT_READY.ps1 -Mode full

```text
### Before Release

```powershell

# Full validation with health checks

.\COMMIT_READY.ps1 -Mode full

# Review all reports

# Create release notes

# Tag release

```text
---

## 🎯 Next Steps

After setup is complete:

1. **Verify Testing Works**:

   ```powershell
   cd backend
   python -m pytest tests/ -v

   ```

2. **Run Full Validation**:

   ```powershell
   cd ..
   .\COMMIT_READY.ps1 -Mode quick

   ```

3. **Start Development**:

   ```powershell
   .\NATIVE.ps1 -Start

   ```

4. **Read More Documentation**:

   - [GIT_WORKFLOW.md](GIT_WORKFLOW.md) - Git commit standards
   - [PRE_COMMIT_GUIDE.md](PRE_COMMIT_GUIDE.md) - Unified pre-commit workflow
   - [DEVELOPER_FAST_START.md](DEVELOPER_FAST_START.md) - Quick developer onboarding
   - [DOCUMENTATION_INDEX.md](../DOCUMENTATION_INDEX.md) - Complete documentation index

---

## ❓ FAQ

### Q: Do I need Docker for development?

**A**: No. Use `NATIVE.ps1` for development with hot-reload. Docker is only required for production-like testing.

### Q: Which Python version should I use?

**A**: Python 3.12 is recommended for best compatibility. Python 3.13 works but requires pytest >= 8.0.0.

### Q: Why are there multiple requirements files?

**A**: Separation of concerns:

- `requirements.txt` - Production (always install)
- `requirements-dev.txt` - Development/Testing (dev only)
- `requirements-runtime.txt` - Runtime-specific
- `requirements-lock.txt` - CI/CD reproducibility

### Q: Can I skip validation before committing?

**A**: Not recommended. Validation ensures code quality, passing tests, and no regressions.

### Q: What if COMMIT_READY.ps1 fails?

**A**: The script provides specific error messages and fix suggestions. Use `-AutoFix` for automatic fixes where possible.

### Q: How do I run only backend tests?

**A**:

```powershell
cd backend
python -m pytest -v

```text
### Q: How do I run only frontend tests?

**A**:

```powershell
cd frontend
npm test

```text
---

## 📚 Related Documentation

- [GIT_WORKFLOW.md](GIT_WORKFLOW.md) - Git workflow and commit standards
- [PRE_COMMIT_GUIDE.md](PRE_COMMIT_GUIDE.md) - Unified pre-commit workflow
- [DEVELOPER_FAST_START.md](DEVELOPER_FAST_START.md) - Quick start for new developers
- [API_EXAMPLES.md](API_EXAMPLES.md) - API usage examples
- [../operations/SCRIPTS_GUIDE.md](../operations/SCRIPTS_GUIDE.md) - All available scripts
- [../operations/CLEANUP_SCRIPTS_GUIDE.md](../operations/CLEANUP_SCRIPTS_GUIDE.md) - Cleanup operations

---

## 💡 Tips & Best Practices

1. **Always use virtual environment** for Python dependencies
2. **Run quick validation** before every commit
3. **Use standard mode** before creating pull requests
4. **Use full mode** before releases
5. **Install both** requirements.txt and requirements-dev.txt for development
6. **Run scripts from PowerShell**, not Git Bash
7. **Keep dependencies up-to-date** with `pip list --outdated`

---

**Last Updated**: 2026-05-28
**Maintainer**: Development Team
**Version**: 1.0.0 (Consolidated from 4 separate guides)
