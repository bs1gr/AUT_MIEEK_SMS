# 🚀 Quick Start - Testing Setup

**Last Updated**: 2025-11-28
**Issue**: Backend tests failing due to missing dev dependencies

---

## ✅ SOLUTION (30 seconds)

You have pytest configured correctly in `requirements-dev.txt`, but it's **not installed**.

### Run This Command:

```powershell
cd backend
pip install -r requirements-dev.txt
```

That's it! This installs:
- ✅ pytest 8.3.3 (compatible with Python 3.13)
- ✅ pytest-cov 6.0.0
- ✅ mypy and type stubs
- ✅ All testing tools

---

## 🧪 Verify It Works

```powershell
# Check pytest is installed
python -m pytest --version
# Should show: pytest 8.3.3

# Run a quick test
python -m pytest tests/test_health.py -v
# Should pass!
```

---

## 🎯 Then Run Full Validation

```powershell
cd ..
.\COMMIT_READY.ps1 -Mode quick
```

This should now work correctly!

---

## 📚 Understanding Requirements Files

Your backend has **4 requirements files**:

| File | Purpose | Install When |
|------|---------|--------------|
| `requirements.txt` | Production deps | Always (Docker, production) |
| `requirements-dev.txt` | Testing/dev tools | Development only |
| `requirements-runtime.txt` | Runtime specifics | Production environment |
| `requirements-lock.txt` | Locked versions | Reproducible builds |

**For development**, you need BOTH:
```powershell
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

---

## 🔄 Complete Fresh Setup

If you want to set up from scratch:

```powershell
cd backend

# Create virtual environment (recommended)
python -m venv .venv
.venv\Scripts\Activate.ps1

# Install production dependencies
pip install -r requirements.txt

# Install development dependencies
pip install -r requirements-dev.txt

# Verify
python -m pytest --version
python -m pytest tests/ -v
```

---

## ✅ Expected Result

After running `pip install -r requirements-dev.txt`:

```
Successfully installed:
- pytest-8.3.3
- pytest-cov-6.0.0
- mypy-1.3.0
- [and other dev tools]
```

Then COMMIT_READY.ps1 will work perfectly!

---

**Status**: ✅ Simple fix - just install dev requirements
**Time**: 30 seconds
**Command**: `cd backend && pip install -r requirements-dev.txt`
