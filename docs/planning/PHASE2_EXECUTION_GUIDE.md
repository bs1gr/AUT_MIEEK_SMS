# Phase 2: Directory Reorganization - Execution Guide
**Date**: 2026-06-12/06-13  
**Status**: 🟡 READY FOR EXECUTION  
**Phase**: Directory Reorganization (Weeks 2-3)

---

## Executive Summary

Phase 2 will physically move all files from the current flat structure to the new organized structure created in Phase 1. This includes:

1. **Source code** (backend/ → src/backend/, frontend/ → src/frontend/)
2. **Infrastructure files** (docker/, deploy/, installer/ → infra/)
3. **Configuration files** (.env files → config/)
4. **Scripts** (23 files → infra/scripts/ organized by purpose)
5. **Documentation** (scattered files → docs/ and .archive/)

**Estimated Duration**: 4-6 hours (includes testing and validation)  
**Risk Level**: 🟡 MODERATE (well-mitigated, feature branch isolation)  
**Rollback Complexity**: Simple (delete branch, start over)

---

## Pre-Execution Checklist

- [x] Phase 1 completed (commit 156c78a85)
- [x] Directory structure created (all 25+ directories)
- [x] Migration mapping documented (PHASE1_MIGRATION_MAPPING.md)
- [x] Path reference script created (PATH_MIGRATION_SCRIPT.md)
- [x] Validation tool created (VALIDATE_PATHS.ps1)
- [x] Feature branch created (feat/codebase-reorganization)
- [ ] All uncommitted changes committed
- [ ] Backup taken (git snapshot)
- [ ] Team notified of ongoing refactor

---

## Step 1: Source Code Migration (Largest Impact)
**Estimated Time**: 30 minutes  
**Risk**: 🟡 MODERATE (many dependent files)

### Step 1.1: Move Backend Code
```powershell
# Verify backend exists
if (Test-Path "backend") {
    Write-Host "Moving backend/ → src/backend/" -ForegroundColor Cyan
    
    # Copy entire backend directory to src/backend/
    Copy-Item -Path "backend" -Destination "src/backend" -Recurse -Force
    
    # Verify copy was successful (compare file counts)
    $srcCount = (Get-ChildItem "src/backend" -Recurse -File).Count
    $oldCount = (Get-ChildItem "backend" -Recurse -File).Count
    
    if ($srcCount -eq $oldCount) {
        Write-Host "✅ Backend copy verified ($srcCount files)"
        Remove-Item -Path "backend" -Recurse -Force
        Write-Host "✅ Old backend/ removed"
    } else {
        Write-Host "❌ Copy verification failed - NOT removing old directory"
        throw "Backend copy failed"
    }
} else {
    Write-Host "⚠️  backend/ not found - already moved?"
}
```

### Step 1.2: Move Frontend Code
```powershell
# Verify frontend exists
if (Test-Path "frontend") {
    Write-Host "Moving frontend/ → src/frontend/" -ForegroundColor Cyan
    
    # Copy entire frontend directory to src/frontend/
    Copy-Item -Path "frontend" -Destination "src/frontend" -Recurse -Force
    
    # Verify copy was successful
    $srcCount = (Get-ChildItem "src/frontend" -Recurse -File).Count
    $oldCount = (Get-ChildItem "frontend" -Recurse -File).Count
    
    if ($srcCount -eq $oldCount) {
        Write-Host "✅ Frontend copy verified ($srcCount files)"
        Remove-Item -Path "frontend" -Recurse -Force
        Write-Host "✅ Old frontend/ removed"
    } else {
        Write-Host "❌ Copy verification failed - NOT removing old directory"
        throw "Frontend copy failed"
    }
} else {
    Write-Host "⚠️  frontend/ not found - already moved?"
}
```

### Step 1.3: Validate Source Code Move
```powershell
# Verify no imports/references are broken yet (before .py/.ts updates)
Write-Host "Validating source code structure..." -ForegroundColor Cyan
if ((Test-Path "src/backend") -and (Test-Path "src/frontend")) {
    Write-Host "✅ Both src/backend/ and src/frontend/ exist"
} else {
    throw "❌ Source code move failed"
}
```

---

## Step 2: Infrastructure Moves (Multiple Directories)
**Estimated Time**: 20 minutes  
**Risk**: 🟢 LOW (mostly independent)

### Step 2.1: Move Docker Files
```powershell
Write-Host "Moving Docker files..." -ForegroundColor Cyan

if (Test-Path "docker") {
    Copy-Item -Path "docker" -Destination "infra/docker" -Recurse -Force
    Remove-Item -Path "docker" -Recurse -Force
    Write-Host "✅ docker/ → infra/docker/"
}

if (Test-Path "Dockerfile") {
    Copy-Item -Path "Dockerfile" -Destination "infra/docker/Dockerfile" -Force
    Remove-Item -Path "Dockerfile" -Force
    Write-Host "✅ Dockerfile → infra/docker/Dockerfile"
}

if (Test-Path ".dockerignore") {
    Copy-Item -Path ".dockerignore" -Destination "infra/docker/.dockerignore" -Force
    Remove-Item -Path ".dockerignore" -Force
    Write-Host "✅ .dockerignore → infra/docker/.dockerignore"
}
```

### Step 2.2: Move Deployment Directories
```powershell
Write-Host "Moving deployment files..." -ForegroundColor Cyan

if (Test-Path "deploy") {
    Copy-Item -Path "deploy" -Destination "infra/deployment" -Recurse -Force
    Remove-Item -Path "deploy" -Recurse -Force
    Write-Host "✅ deploy/ → infra/deployment/"
}

if (Test-Path "installer") {
    Copy-Item -Path "installer" -Destination "infra/installer" -Recurse -Force
    Remove-Item -Path "installer" -Recurse -Force
    Write-Host "✅ installer/ → infra/installer/"
}

if (Test-Path "SMS_Native_Lite_Edition") {
    Copy-Item -Path "SMS_Native_Lite_Edition" -Destination "infra/native-lite" -Recurse -Force
    Remove-Item -Path "SMS_Native_Lite_Edition" -Recurse -Force
    Write-Host "✅ SMS_Native_Lite_Edition/ → infra/native-lite/"
}
```

---

## Step 3: Configuration Files Migration
**Estimated Time**: 10 minutes  
**Risk**: 🟡 MODERATE (.env files are critical)

### Step 3.1: Move .env Files
```powershell
Write-Host "Moving .env files..." -ForegroundColor Cyan

$envMoves = @(
    @{ from = ".env"; to = "config/.env" },
    @{ from = ".env.example"; to = "config/.env.example" },
    @{ from = ".env.production"; to = "config/environments/production.env" },
    @{ from = ".env.production.example"; to = "config/environments/production.env.example" },
    @{ from = ".env.production.SECURE"; to = "config/environments/production.env.SECURE" },
    @{ from = ".env.qnap.example"; to = "config/environments/qnap.env.example" },
    @{ from = ".env.qnap.postgres-only.example"; to = "config/environments/qnap-postgres-only.env.example" }
)

foreach ($move in $envMoves) {
    if (Test-Path $move.from) {
        Copy-Item -Path $move.from -Destination $move.to -Force
        Remove-Item -Path $move.from -Force
        Write-Host "✅ $($move.from) → $($move.to)"
    }
}
```

### Step 3.2: Move Other Config Files
```powershell
Write-Host "Moving other config files..." -ForegroundColor Cyan

$configMoves = @(
    @{ from = "codecov.yml"; to = "config/codecov.yml" },
    @{ from = ".coveragerc"; to = "config/.coveragerc" },
    @{ from = ".gitleaks.toml"; to = "config/.gitleaks.toml" },
    @{ from = ".trivyignore"; to = "config/.trivyignore" },
    @{ from = ".pre-commit-config.yaml"; to = "config/.pre-commit-config.yaml" },
    @{ from = ".secrets.baseline"; to = "config/.secrets.baseline" },
    @{ from = ".markdownlint.json"; to = "config/.markdownlint.json" },
    @{ from = ".markdownlintignore"; to = "config/.markdownlintignore" }
)

foreach ($move in $configMoves) {
    if (Test-Path $move.from) {
        Copy-Item -Path $move.from -Destination $move.to -Force
        Remove-Item -Path $move.from -Force
        Write-Host "✅ $($move.from) → $($move.to)"
    }
}
```

---

## Step 4: Script Organization (23 Files)
**Estimated Time**: 15 minutes  
**Risk**: 🟢 LOW (easy to verify, scripts are standalone)

### Step 4.1: Organize by Purpose
```powershell
Write-Host "Organizing scripts..." -ForegroundColor Cyan

# Release scripts
$releaseScripts = @(
    "RELEASE_HELPER.ps1",
    "RELEASE_WITH_DOCS.ps1",
    "RELEASE_READY.ps1",
    "INSTALLER_BUILDER.ps1",
    "GENERATE_RELEASE_DOCS.ps1"
)

foreach ($script in $releaseScripts) {
    if (Test-Path $script) {
        Move-Item -Path $script -Destination "infra/scripts/release/" -Force
        Write-Host "✅ $script → infra/scripts/release/"
    }
}

# Development scripts
$devScripts = @(
    "NATIVE_TOGGLE.ps1",
    "NATIVE.ps1",
    "CREATE_NATIVE_SHORTCUT.ps1",
    "setup_lite_qnap.ps1",
    "setup_lite_qnap_remote.ps1",
    "DOCKER.ps1"
)

foreach ($script in $devScripts) {
    if (Test-Path $script) {
        Move-Item -Path $script -Destination "infra/scripts/dev/" -Force
        Write-Host "✅ $script → infra/scripts/dev/"
    }
}

# Testing scripts
$testScripts = @(
    "RUN_E2E_TESTS.ps1",
    "RUN_FRONTEND_TESTS.ps1",
    "RUN_TESTS_BATCH.ps1",
    "RUN_TESTS_CATEGORY.ps1",
    "RUN_CURATED_LOAD_TEST.ps1",
    "MONITOR_BATCH_TESTS.ps1",
    "test_e2e_fixes.sh"
)

foreach ($script in $testScripts) {
    if (Test-Path $script) {
        Move-Item -Path $script -Destination "infra/scripts/testing/" -Force
        Write-Host "✅ $script → infra/scripts/testing/"
    }
}

# Operations scripts
$opsScripts = @(
    "COMMIT_READY.ps1",
    "WORKSPACE_CLEANUP.ps1",
    "WORKSPACE_RECOVERY.ps1",
    "CLEAR_PYCACHE.ps1",
    "UNINSTALL_SMS_MANUALLY.ps1"
)

foreach ($script in $opsScripts) {
    if (Test-Path $script) {
        Move-Item -Path $script -Destination "infra/scripts/ops/" -Force
        Write-Host "✅ $script → infra/scripts/ops/"
    }
}

# Deployment scripts
$deployScripts = @(
    "DEPLOY_PHASE2_NOW.ps1",
    "DEPLOY_PHASE2_NOW.sh"
)

foreach ($script in $deployScripts) {
    if (Test-Path $script) {
        Move-Item -Path $script -Destination "infra/scripts/deploy/" -Force
        Write-Host "✅ $script → infra/scripts/deploy/"
    }
}

# Diagnostics scripts
$diagScripts = @(
    "diagnose_migration.py",
    "fix_admin_account.py",
    "fix_greek_encoding_permanent.py",
    "fix_test_credentials.py"
)

foreach ($script in $diagScripts) {
    if (Test-Path $script) {
        Move-Item -Path $script -Destination "infra/scripts/diagnostics/" -Force
        Write-Host "✅ $script → infra/scripts/diagnostics/"
    }
}
```

---

## Step 5: Documentation Organization
**Estimated Time**: 10 minutes  
**Risk**: 🟢 LOW (documentation doesn't break builds)

### Step 5.1: Move Recent Status Reports
```powershell
Write-Host "Organizing documentation..." -ForegroundColor Cyan

# Recent docs → docs/reports/
$reportDocs = @(
    @{ from = "CI_CD_STAGING_CLEANUP_SUMMARY_2026_06_12.md"; to = "docs/reports/ci-cd-staging-cleanup-2026-06-12.md" },
    @{ from = "STAGING_CLEANUP_REPORT_2026_06_12.md"; to = "docs/reports/staging-cleanup-2026-06-12.md" },
    @{ from = "STAGING_COMPLETE_CLEANUP_2026_06_12.md"; to = "docs/reports/staging-complete-cleanup-2026-06-12.md" }
)

foreach ($doc in $reportDocs) {
    if (Test-Path $doc.from) {
        Move-Item -Path $doc.from -Destination $doc.to -Force
        Write-Host "✅ $($doc.from) → $($doc.to)"
    }
}

# Guides
$guideDocs = @(
    @{ from = "STAGING_CLEANUP_GUIDE.md"; to = "docs/guides/staging-cleanup-guide.md" }
)

foreach ($doc in $guideDocs) {
    if (Test-Path $doc.from) {
        Move-Item -Path $doc.from -Destination $doc.to -Force
        Write-Host "✅ $($doc.from) → $($doc.to)"
    }
}

# Planning
$planningDocs = @(
    @{ from = "CODEBASE_REORGANIZATION_PLAN_2026_06_12.md"; to = "docs/planning/codebase-reorganization-plan-2026-06-12.md" },
    @{ from = "PHASE1_MIGRATION_MAPPING.md"; to = "docs/planning/phase1-migration-mapping.md" },
    @{ from = "PATH_MIGRATION_SCRIPT.md"; to = "docs/planning/path-migration-script.md" }
)

foreach ($doc in $planningDocs) {
    if (Test-Path $doc.from) {
        Move-Item -Path $doc.from -Destination $doc.to -Force
        Write-Host "✅ $($doc.from) → $($doc.to)"
    }
}
```

### Step 5.2: Archive Old Logs
```powershell
Write-Host "Archiving old logs..." -ForegroundColor Cyan

# Create archive directories if needed
New-Item -ItemType Directory -Path ".archive/logs/commit-ready-logs" -Force | Out-Null

# Move logs
$logFiles = Get-ChildItem -Path "." -MaxDepth 1 -Include "*.log", "*.txt", "*.zip" -ErrorAction SilentlyContinue
foreach ($log in $logFiles) {
    if ($log.Name -match "commit_ready|rebuild|pr_output|workflow_logs|logs\.zip") {
        Move-Item -Path $log.FullName -Destination ".archive/logs/" -Force
        Write-Host "✅ $($log.Name) → .archive/logs/"
    }
}

# Move old phase completion logs
$phaseLogs = Get-ChildItem -Path "." -MaxDepth 1 -Include "PHASE*.txt" -ErrorAction SilentlyContinue
foreach ($log in $phaseLogs) {
    Move-Item -Path $log.FullName -Destination ".archive/phase-logs/" -Force
    Write-Host "✅ $($log.Name) → .archive/phase-logs/"
}
```

---

## Step 6: Validation & Testing
**Estimated Time**: 30 minutes  
**Risk**: 🟢 LOW (non-destructive)

### Step 6.1: Run Path Validation
```powershell
Write-Host "Running path validation..." -ForegroundColor Cyan
& "infra/scripts/testing/VALIDATE_PATHS.ps1"

# Check exit code
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Path validation passed!"
} else {
    Write-Host "❌ Path validation failed - review PATH_VALIDATION_REPORT.md"
    throw "Validation failed"
}
```

### Step 6.2: Verify Directory Structure
```powershell
Write-Host "Verifying directory structure..." -ForegroundColor Cyan

$dirs = @(
    "src/backend",
    "src/frontend",
    "infra/docker",
    "infra/deployment",
    "infra/installer",
    "infra/native-lite",
    "infra/scripts",
    "config",
    "config/environments",
    "docs/reports",
    "docs/guides",
    "docs/planning"
)

foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        $fileCount = (Get-ChildItem $dir -Recurse -File -ErrorAction SilentlyContinue).Count
        Write-Host "✅ $dir ($fileCount files)"
    } else {
        Write-Host "❌ $dir - NOT FOUND"
    }
}
```

### Step 6.3: Check for Root-Level Clutter
```powershell
Write-Host "Checking for remaining clutter..." -ForegroundColor Cyan

# Scripts that should be gone
$scripts = Get-ChildItem -Path "." -MaxDepth 1 -Include "*.ps1", "*.sh", "*.py" -ErrorAction SilentlyContinue
if ($scripts) {
    Write-Host "⚠️  Found scripts still at root level:"
    foreach ($script in $scripts) {
        Write-Host "  - $($script.Name)"
    }
} else {
    Write-Host "✅ No scripts remaining at root level"
}

# .env files that should be gone
$envFiles = Get-ChildItem -Path "." -MaxDepth 1 -Include ".env*" -ErrorAction SilentlyContinue
if ($envFiles) {
    Write-Host "⚠️  Found .env files still at root level:"
    foreach ($file in $envFiles) {
        Write-Host "  - $($file.Name)"
    }
} else {
    Write-Host "✅ No .env files at root level"
}
```

---

## Step 7: Commit Phase 2 Work
**Estimated Time**: 5 minutes

```powershell
Write-Host "Preparing Phase 2 commit..." -ForegroundColor Cyan

git add -A
git status --short

git commit -m "feat: phase 2 - directory reorganization complete

Reorganized codebase from flat structure to logical hierarchy:

**Source Code:**
- backend/ → src/backend/
- frontend/ → src/frontend/

**Infrastructure:**
- docker/ → infra/docker/
- deploy/ → infra/deployment/
- installer/ → infra/installer/
- SMS_Native_Lite_Edition/ → infra/native-lite/
- 23 scripts → infra/scripts/ (organized by purpose)

**Configuration:**
- .env files → config/ and config/environments/
- Config files → config/

**Documentation:**
- Status reports → docs/reports/
- Guides → docs/guides/
- Planning docs → docs/planning/
- Old logs → .archive/

**Validation:**
✅ All directories created and verified
✅ File counts validated
✅ Path validation passed
✅ No broken references detected
✅ Ready for Phase 3 (CI/CD updates)

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"

Write-Host "✅ Phase 2 complete!" -ForegroundColor Green
