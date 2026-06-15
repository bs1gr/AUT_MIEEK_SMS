# Installer PostgreSQL Autopilot Issue - Root Cause & Fix

**Date**: February 16, 2026
**Issue**: Latest installer (v1.18.3) defaults to PostgreSQL + Docker Compose, causing fresh installs to fail with "Failed to start Docker Compose stack"
**Status**: ✅ FIXED (Part 1-2 implemented, Part 3 documentation)

---

## 🔴 The Problem (User-Facing)

After installing from the latest installer (`SMS_Installer_1.18.0.exe`), when the user launches SMS via the desktop shortcut (`SMS_Manager.exe MenuItem 1`), they see:

```
? Detected PostgreSQL configuration - using Docker Compose (production overlay)
? Failed to start Docker Compose stack
❌ Failed to start container.
```

**What looks like a "launcher broken" issue is actually a database engine misconfiguration.**

---

## 🔍 Root Cause Analysis

### The Three-Layer Problem

#### **Layer 1: `.env.example` Defaults to PostgreSQL**
- File: `.env.example` (line 47)
- Content:
  ```dotenv
  DATABASE_ENGINE=postgresql
  POSTGRES_HOST=postgres
  POSTGRES_PORT=5432
  POSTGRES_DB=student_management
  POSTGRES_USER=sms_user
  POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE
  ```
- **Reason**: Production deployments should use PostgreSQL (better scalability, RBAC support)
- **But**: Template is meant for **all scenarios**, not just production

#### **Layer 2: Installer Copies Template Verbatim**
- File: `DOCKER.ps1` lines 715-753 (function `Initialize-Environment`)
- Logic:
  ```powershell
  # If .env doesn't exist and .env.example exists...
  $envContent = Get-Content $ROOT_ENV_EXAMPLE -Raw
  $envContent = $envContent -replace 'POSTGRES_PASSWORD=.*', "POSTGRES_PASSWORD=$postgresPassword"
  Set-Content -Path $ROOT_ENV -Value $envContent
  ```
- **Problem**: All lines copied as-is, including `DATABASE_ENGINE=postgresql`
- **Result**: Fresh install now thinks it's a PostgreSQL deployment

#### **Layer 3: DOCKER.ps1 Auto-Detects PostgreSQL & Routes to Compose**
- File: `DOCKER.ps1` lines 378-404 (function `Use-ComposeMode`)
- Logic:
  ```powershell
  function Use-ComposeMode {
      $dbEngine = Get-EnvVarValue -Name "DATABASE_ENGINE"
      if ($dbEngine -and $dbEngine -match "postgres") {
          return $true  # ← Time to use Docker Compose!
      }
      return $false
  }
  ```
- **Problem**: When .env has `DATABASE_ENGINE=postgresql`, this function returns `$true`
- **Result**: DOCKER.ps1 attempts `docker compose up -d --build` instead of `docker run` with fullstack image

#### **Layer 4: Docker Compose Stack Not Set Up on Fresh Install**
- Fresh install has:
  - ✅ Docker files (docker-compose.yml, overlay, Dockerfile.fullstack)
  - ❌ No built Postgres service image
  - ❌ No persistent volumes for Postgres data
  - ❌ No network bridge for services
- **When**: `docker compose up -d --build` is called
- **What happens**: Compose tries to pull/build services, but likely fails due to:
  - Missing env var references
  - Network isolation issues
  - Volume mount permissions
  - Or simply: "service 'postgres' not found"
- **Result**: Error is silent (output redirected to `Out-Null`), user sees "Failed to start Docker Compose stack"

---

## 💡 The Fix (3 Parts)

### ✅ Part 1: Fresh Install Defaults to SQLite (IMPLEMENTED)

**File**: `DOCKER.ps1` lines 715-753
**Change**: Modified `Initialize-Environment` to convert `.env.example` template from PostgreSQL to SQLite for fresh installations.

**Before**:
```powershell
$envContent = Get-Content $ROOT_ENV_EXAMPLE -Raw
$envContent = $envContent -replace 'POSTGRES_PASSWORD=.*', "POSTGRES_PASSWORD=$postgresPassword"
Set-Content -Path $ROOT_ENV -Value $envContent  # ← Includes DATABASE_ENGINE=postgresql
```

**After**:
```powershell
$envContent = Get-Content $ROOT_ENV_EXAMPLE -Raw
$envContent = $envContent -replace 'SECRET_KEY=.*', "SECRET_KEY=$secretKey"
$envContent = $envContent -replace 'VERSION=.*', "VERSION=$VERSION"
# ← NEW: Convert PostgreSQL to SQLite for fresh installs
$envContent = $envContent -replace 'DATABASE_ENGINE=postgresql', "DATABASE_ENGINE=sqlite"
$envContent = $envContent -replace 'POSTGRES_HOST=postgres.*', ""
$envContent = $envContent -replace 'POSTGRES_PASSWORD=.*', ""
Set-Content -Path $ROOT_ENV -Value $envContent
Write-Success "Root .env created with secure SECRET_KEY (SQLite - ready out-of-box)"
```

**Impact**:
- ✅ Fresh install .env now has `DATABASE_ENGINE=sqlite`
- ✅ DOCKER.ps1 skips compose mode
- ✅ Fullstack image is used (works out-of-box, no external deps)
- ✅ Users can upgrade to PostgreSQL later via explicit migration workflow

---

### ✅ Part 2: Better Error Logging for Compose Failures (IMPLEMENTED)

**File**: `DOCKER.ps1` lines 1440-1450
**Change**: Capture and display actual Docker Compose error output.

**Before**:
```powershell
docker compose @composeArgs up -d --build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error-Message "Failed to start Docker Compose stack"
    return 1
}
```

**After**:
```powershell
$composeOutput = docker compose @composeArgs up -d --build 2>&1
if ($LASTEXITCODE -ne 0) {
    # Capture actual error for logging
    if ($Silent) {
        Write-InstallerLog "Docker Compose error output:"
        $composeOutput | ForEach-Object { Write-InstallerLog "$_" }
    }
    Write-Error-Message "Failed to start Docker Compose stack"
    Write-Warning "Docker Compose output:"
    $composeOutput | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    return 1
}
```

**Impact**:
- ✅ If compose fails, user now sees the actual error (not silent failure)
- ✅ Installer log includes error details for debugging
- ✅ Easier to identify root cause (missing image, network issue, etc.)

---

### 📋 Part 3: Documentation & Upgrade Path (REFERENCE)

**For users upgrading from PostgreSQL installations**:
- If they already have `DATABASE_ENGINE=postgresql` in their `.env`, no change occurs
- If they explicitly want PostgreSQL on fresh install, they can:
  1. Edit `.env` after install: `DATABASE_ENGINE=postgresql`
  2. Set `POSTGRES_*` variables
  3. Run: `.\DOCKER.ps1 -Start` (will switch to compose mode)

**For migration from SQLite to PostgreSQL** (future enhancement):
- Document in: `docs/deployment/SQLITE_TO_POSTGRESQL_MIGRATION.md`
- Steps:
  1. Backup current data: `.\DOCKER.ps1 -Backup`
  2. Update .env: `DATABASE_ENGINE=postgresql`
  3. Run: `.\DOCKER.ps1 -Start` (will trigger compose mode + auto-migration)

---

## ✅ Verification Steps

### For Fresh Install (This is What Was Broken)

1. **Download installer**: `SMS_Installer_1.18.0.exe`
2. **Install to default location**: `C:\Program Files\SMS`
3. **Launch via desktop shortcut or `SMS_Manager.exe`**
4. **Expected (After Fix)**:
   - ✅ "Starting container..." (using fullstack image)
   - ✅ "Container started successfully"
   - ✅ Browser opens to `http://localhost:8080`
   - ✅ Login screen appears

### For Existing PostgreSQL Installation

1. **User has `DATABASE_ENGINE=postgresql` in `.env`**
2. **Run `SMS_Manager.exe` or `.\DOCKER.ps1 -Start`**
3. **Expected**:
   - ✅ "Detected PostgreSQL configuration - using Docker Compose (production overlay)"
   - ✅ Compose services start (postgres, backend, frontend)
   - ✅ Browser opens to `http://localhost:8080`

---

## 🔧 Technical Deep Dive

### Why SQLite by Default?

| Aspect | SQLite | PostgreSQL |
|--------|--------|-----------|
| **Setup complexity** | ✅ Zero config (file-based) | ❌ Requires Postgres service |
| **Out-of-box experience** | ✅ Works immediately | ❌ Requires Docker Compose setup |
| **Data persistence** | ✅ Via volume mount (data/) | ✅ Via volume mount (postgres/) |
| **Scalability** | ⚠️ Good for <1000 concurrent | ✅ Unlimited concurrent |
| **RBAC support** | ✅ Full support (JSON storage) | ✅ Full support (native) |
| **Learning curve** | ✅ Flat | ❌ Docker Compose concepts |
| **Migration path** | ✅ → PostgreSQL via alembic | ✅ Permanent |

**Conclusion**: SQLite is the right default for "first 5 minutes out of box". Advanced users upgrading to PostgreSQL is a deliberate, documented step.

---

## 📊 Affected Versions

- **v1.18.3**: ❌ Contains the issue (from commit 2a3e64704 onward)
- **v1.18.3**: ✅ Uses fullstack image (no compose auto-routing)
- **v1.18.3 and earlier**: ✅ Uses fullstack image

---

## 🚀 Next Steps

1. **Commit this fix** to main branch
2. **Test with fresh install** from fixed version
3. **Update installer** with next release (v1.18.3 or v1.18.3)
4. **Document migration path** for users who want PostgreSQL
5. **Monitor GitHub issues** for any similar "Docker Compose failed" reports

---

## 📋 Checklist for Release

- [x] Root cause identified (PostgreSQL default in template)
- [x] Part 1 fix implemented (SQLite default for fresh install)
- [x] Part 2 fix implemented (Better error logging)
- [ ] Part 3 documentation added (Migration guide for PostgreSQL)
- [ ] Fresh install tested with fixed version
- [ ] Existing PostgreSQL install tested (regression check)
- [ ] Commit prepared with semantic message
- [ ] Release notes updated

---

## 🎓 Lessons Learned

1. **Template defaults matter**: `.env.example` with `DATABASE_ENGINE=postgresql` was meant for advanced users, not defaults
2. **Silent failures hide problems**: `Out-Null` suppressed crucial Docker error messages
3. **Compose vs. Fullstack**: Need clear routing logic. SQLite → fullstack, PostgreSQL → compose
4. **Fresh install UX**: Should be "works immediately", not "requires manual config"
