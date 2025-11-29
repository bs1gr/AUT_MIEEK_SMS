# 🔧 IMMEDIATE FIX - Pytest Not Installed

**Issue**: pytest is not installed or not in requirements.txt
**Solution**: Install pytest and add to requirements

---

## 🚨 Problem

You're running Python 3.13, but pytest is either:
1. Not installed at all
2. Not listed in requirements.txt
3. Incompatible version for Python 3.13

---

## ✅ QUICK FIX (2 minutes)

Run these commands in PowerShell:

```powershell
cd backend

# Install pytest compatible with Python 3.13
pip install pytest>=8.0.0 pytest-cov>=4.1.0

# Test it works
python -m pytest --version

# Should show: pytest 8.x.x

# Add to requirements.txt
echo "pytest>=8.0.0" >> requirements-dev.txt
echo "pytest-cov>=4.1.0" >> requirements-dev.txt
```

---

## 📝 Create requirements-dev.txt

Create [backend/requirements-dev.txt](backend/requirements-dev.txt) with testing dependencies:

```txt
# Development and Testing Dependencies
pytest>=8.0.0
pytest-cov>=4.1.0
pytest-asyncio>=0.23.0
ruff>=0.1.0
mypy>=1.7.0
```

---

## 🧪 Verify Fix

```powershell
cd backend

# Test pytest works
python -m pytest --version

# Run a simple test
python -m pytest tests/test_health.py -v

# Should see tests run successfully
```

---

## 🎯 Then Run Validation

After pytest is installed:

```powershell
cd ..
.\COMMIT_READY.ps1 -Mode quick
```

---

## 📚 Why This Happened

The backend/requirements.txt only contains **production** dependencies. Testing dependencies (pytest, etc.) should be in a separate file: **requirements-dev.txt**

This is a common Python pattern:
- `requirements.txt` = Production only
- `requirements-dev.txt` = Development/Testing tools

---

## 🔄 Complete Setup Command

For a fresh setup:

```powershell
cd backend

# Install production dependencies
pip install -r requirements.txt

# Install development dependencies
pip install pytest>=8.0.0 pytest-cov>=4.1.0 pytest-asyncio>=0.23.0 ruff mypy

# Save dev requirements
pip freeze | Select-String "pytest|ruff|mypy" > requirements-dev.txt
```

---

## ✅ After Fix

Your directory should have:
- `backend/requirements.txt` - Production deps (FastAPI, SQLAlchemy, etc.)
- `backend/requirements-dev.txt` - Testing deps (pytest, ruff, mypy)

Then COMMIT_READY.ps1 will work correctly!
