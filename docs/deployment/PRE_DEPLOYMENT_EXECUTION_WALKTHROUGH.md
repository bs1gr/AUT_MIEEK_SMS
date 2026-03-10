# Pre-Deployment Execution Walkthrough (Jan 8, 2026)

> **Historical document (Jan 2026):** This walkthrough documents a specific January 2026 pre-deployment validation run.
> For current deployment workflow, use `NATIVE.ps1` / `DOCKER.ps1`, `docs/plans/UNIFIED_WORK_PLAN.md`, and `docs/DOCUMENTATION_INDEX.md`.

**Timeline**: January 8, 2026 (1-2 hours)
**Reference**: [PRE_DEPLOYMENT_VALIDATION_CHECKLIST.md](PRE_DEPLOYMENT_VALIDATION_CHECKLIST.md)
**Owner**: Historical deployment execution record
**Status**: ⚠️ Historical execution walkthrough

---

## 📋 Phase 1: Repository & Code Verification (15 minutes)

### Step 1.1: Repository Status Check

**Checklist Item**: "Repository Status: Git status clean"

```powershell
# Execute in PowerShell

cd d:\SMS\student-management-system
git status

```text
**Expected Output**:

```text
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean

```text
**If Output Differs**:
- ❌ Uncommitted changes present
  - Action: `git stash` to save, or commit before proceeding
  - Decision: Cannot proceed until clean

### Step 1.2: Version File Verification

**Checklist Item**: "Version file contains: 1.15.1"

```powershell
# Read VERSION file

Get-Content VERSION

```text
**Expected Output**:

```text
1.15.1

```text
**If Output Differs**:
- ❌ Version is 1.15.0 or other
  - Action: Version file was not updated during release prep
  - Decision: Contact release manager before proceeding
  - Fix: `echo "1.15.1" | Set-Content VERSION` (if authorized)

### Step 1.3: CHANGELOG Verification

**Checklist Item**: "CHANGELOG.md contains $11.18.3 entry"

```powershell
# Check for $11.18.3 in CHANGELOG

Select-String "## \[1.15.1\]" CHANGELOG.md | Select-Object -First 1

```text
**Expected Output**:

```text
## [1.15.1] - 2026-01-07

```text
**If Output Differs**:
- ⚠️ $11.18.3 entry missing
  - Action: Verify release notes were created
  - Decision: Proceed with caution, document issue for $11.18.3

### Step 1.4: Key Files Presence Check

**Checklist Item**: "Release files present and readable"

```powershell
# Check release documentation exists

$requiredFiles = @(
  "docs/releases/RELEASE_NOTES_$11.18.3.md",
  "docs/deployment/STAGING_DEPLOYMENT_PLAN_$11.18.3.md",
  "docs/deployment/PRE_DEPLOYMENT_VALIDATION_CHECKLIST.md"
)

foreach ($file in $requiredFiles) {
  if (Test-Path $file) {
    Write-Host "✅ $file exists"
  } else {
    Write-Host "❌ $file MISSING"
  }
}

```text
**Expected Output**:

```text
✅ docs/releases/RELEASE_NOTES_$11.18.3.md exists
✅ docs/deployment/STAGING_DEPLOYMENT_PLAN_$11.18.3.md exists
✅ docs/deployment/PRE_DEPLOYMENT_VALIDATION_CHECKLIST.md exists

```text
**If Output Differs**:
- ❌ Files missing
  - Action: Locate missing files or regenerate from templates
  - Decision: Cannot proceed without deployment plan
  - Contact: Owner for file recovery guidance

### Step 1.5: Git Log Verification

**Checklist Item**: "Recent commits contain release-related changes"

```powershell
# Show last 5 commits

git log --oneline -5

```text
**Expected Output** (should show recent commits like):

```text
ae8c37b67 docs: Complete Phase 2 planning with swimlanes and dependencies
4d78ddfa4 docs: Create Phase 2 swimlanes, dependencies, and critical path analysis
cda3d264c docs: Create comprehensive project status summary (Jan 7, 2026)
8aea7bcf8 docs: Update UNIFIED_WORK_PLAN.md with Phase 2 detailed task breakdown
3b9d44fd5 docs: Prepare $11.18.3 release package

```text
**If Output Differs**:
- ⚠️ Commits missing or out of order
  - Action: Verify commits were pushed to origin/main
  - Decision: Run `git pull origin main` to sync
  - Decision: Cannot deploy if commits not on main

---

## 🏗️ Phase 2: Infrastructure Verification (20 minutes)

### Step 2.1: Docker Installation Check

**Checklist Item**: "Docker installed and running"

```powershell
# Check Docker version

docker --version
docker ps

```text
**Expected Output**:

```text
Docker version 27.0.0 or higher
CONTAINER ID   IMAGE      COMMAND   STATUS
(empty if no containers running - that's OK)

```text
**If Docker Not Found**:
- ❌ Docker not installed
  - Action: Install Docker Desktop from docker.com
  - Decision: Cannot proceed without Docker
  - Effort: 15-30 minutes to install and verify

**If Docker Not Running**:
- ❌ Docker daemon not started
  - Action: Start Docker Desktop application
  - Decision: Wait 30 seconds for startup, retry
  - Effort: 2 minutes

### Step 2.2: Port Availability Check

**Checklist Item**: "Required ports available (8080, 5432)"

```powershell
# Check if ports are in use

netstat -ano | findstr ":8080"
netstat -ano | findstr ":5432"

```text
**Expected Output**:

```text
(Empty output = port available)

```text
**If Ports In Use**:
- ⚠️ Port already bound
  - Action: `DOCKER.ps1 -Stop` to stop existing containers
  - Decision: Confirm which application uses port
  - Effort: 2 minutes

**If Uncertain**:
- ⚠️ Ports show LISTENING
  - Action: Verify if it's old SMS container (`docker ps`)
  - Decision: Safe to restart if it's SMS
  - Effort: 1 minute

### Step 2.3: Disk Space Verification

**Checklist Item**: "Disk space ≥5GB available"

```powershell
# Check disk space on D: drive

Get-Volume D | Select-Object SizeRemaining, Size |
  ForEach-Object {
    $free = [math]::Round($_.SizeRemaining / 1GB, 2)
    $total = [math]::Round($_.Size / 1GB, 2)
    Write-Host "D: Drive - $free GB free / $total GB total"
  }

```text
**Expected Output**:

```text
D: Drive - 250.5 GB free / 500 GB total

```text
**If Less Than 5GB Free**:
- ❌ Insufficient disk space
  - Action: Clean up temporary files, old Docker images
  - Command: `docker system prune -a` (warning: removes all unused images)
  - Decision: Cannot deploy with <5GB free
  - Effort: 10-15 minutes

### Step 2.4: Network Connectivity Check

**Checklist Item**: "Network connectivity to GitHub and registries"

```powershell
# Test GitHub connectivity

Test-NetConnection github.com -Port 443

# Test Docker Hub connectivity

Test-NetConnection docker.io -Port 443

```text
**Expected Output**:

```text
ComputerName     : github.com
RemotePort       : 443
TcpTestSucceeded : True

```text
**If TcpTestSucceeded = False**:
- ❌ Network unreachable
  - Action: Check VPN, firewall, proxy settings
  - Decision: Cannot pull Docker images without network access
  - Effort: 5-10 minutes to diagnose

### Step 2.5: Environment Files Check

**Checklist Item**: ".env files present in backend and frontend"

```powershell
# Check backend .env

if (Test-Path "backend/.env") {
  Write-Host "✅ backend/.env exists"
} else {
  Write-Host "❌ backend/.env MISSING - copy from backend/.env.example"
  Copy-Item "backend/.env.example" "backend/.env"
}

# Check frontend .env

if (Test-Path "frontend/.env") {
  Write-Host "✅ frontend/.env exists"
} else {
  Write-Host "⚠️ frontend/.env MISSING - check if needed"
}

```text
**Expected Output**:

```text
✅ backend/.env exists
✅ frontend/.env exists

```text
**If Files Missing**:
- ⚠️ .env files not configured
  - Action: Copy from .env.example templates
  - Decision: Frontend .env optional (has defaults)
  - Effort: 2 minutes

---

## 💾 Phase 3: Database & Data Verification (15 minutes)

### Step 3.1: Database Backup Verification

**Checklist Item**: "Database backup created pre-1.15.1"

```powershell
# Check for backups

Get-ChildItem "backend/backups/" -Filter "*.db.bak" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 5 |
  ForEach-Object {
    $size = [math]::Round($_.Length / 1MB, 2)
    Write-Host "$($_.Name) - $size MB - Modified: $($_.LastWriteTime)"
  }

```text
**Expected Output**:

```text
student_management_2026-01-07_backup.db.bak - 2.5 MB - Modified: 2026-01-07 14:30:00
student_management_2026-01-06_backup.db.bak - 2.5 MB - Modified: 2026-01-06 20:15:00

```text
**If No Backups Found**:
- ❌ No database backup exists
  - Action: Create backup immediately
  - Command: `Copy-Item "data/student_management.db" "backend/backups/student_management_2026-01-07_backup.db.bak"`
  - Decision: Cannot proceed without recent backup

**If Backup Size < 100KB**:
- ❌ Backup file corrupted or empty
  - Action: Verify backup created successfully
  - Command: Recreate backup
  - Decision: Investigate why DB so small

### Step 3.2: Database File Status Check

**Checklist Item**: "Current database file readable and valid"

```powershell
# Check database file

if (Test-Path "data/student_management.db") {
  $dbSize = (Get-Item "data/student_management.db").Length / 1MB
  Write-Host "✅ Database file exists ($dbSize MB)"

  # Attempt to connect (requires Python)
  # This would verify integrity
} else {
  Write-Host "❌ Database file not found at data/student_management.db"
}

```text
**Expected Output**:

```text
✅ Database file exists (2.5 MB)

```text
**If Database Missing**:
- ❌ Database not initialized
  - Action: Restore from backup or let application initialize
  - Decision: Application will auto-initialize on startup
  - Note: First startup will be slow (migration running)

### Step 3.3: Test Data Verification

**Checklist Item**: "Test data exists (at least 50 students)"

```powershell
# Run Python script to count records

python -c "
import sys
sys.path.insert(0, 'backend')
from db import SessionLocal
from models import Student

db = SessionLocal()
count = db.query(Student).count()
print(f'Students in database: {count}')
if count >= 50:
    print('✅ Test data exists')
else:
    print(f'⚠️ Only {count} students (need ≥50 for realistic testing)')
"

```text
**Expected Output**:

```text
Students in database: 150
✅ Test data exists

```text
**If Test Data Missing**:
- ⚠️ Database empty
  - Action: Seed test data before deployment
  - Command: `python backend/seed_e2e_data.py`
  - Decision: Can proceed but E2E tests will be limited

**If Count < 50**:
- ⚠️ Insufficient test data
  - Action: Run seed script to populate
  - Effort: 5 minutes

### Step 3.4: Database Constraints Check

**Checklist Item**: "Database constraints and indexes exist"

```powershell
# Verify via Alembic (database is at latest version)

cd backend
alembic current
cd ..

```text
**Expected Output**:

```text
(head)

```text
**If Not at Head**:
- ⚠️ Migrations not applied
  - Action: Run migrations
  - Command: `cd backend && alembic upgrade head && cd ..`
  - Decision: Cannot deploy with unapplied migrations
  - Effort: 5 minutes

---

## 📚 Phase 4: Documentation Verification (10 minutes)

### Step 4.1: Release Notes Readability

**Checklist Item**: "Release notes are clear and complete"

```powershell
# Check release notes length and content

$notes = Get-Content "docs/releases/RELEASE_NOTES_$11.18.3.md"
$lineCount = @($notes).Count
Write-Host "Release notes: $lineCount lines"

# Check for key sections

if ($notes -match "## Features") { Write-Host "✅ Features section present" }
if ($notes -match "## Bug Fixes") { Write-Host "✅ Bug Fixes section present" }
if ($notes -match "## Migration") { Write-Host "✅ Migration guide present" }

```text
**Expected Output**:

```text
Release notes: 650 lines
✅ Features section present
✅ Bug Fixes section present
✅ Migration guide present

```text
**If Sections Missing**:
- ⚠️ Incomplete release notes
  - Action: Add missing sections
  - Decision: Can proceed but document quality lower
  - Effort: 15 minutes to complete

### Step 4.2: Deployment Plan Readability

**Checklist Item**: "Deployment plan clear and actionable"

```powershell
# Verify deployment plan structure

$plan = Get-Content "docs/deployment/STAGING_DEPLOYMENT_PLAN_$11.18.3.md"
Write-Host "Deployment plan: $(@($plan).Count) lines"

# Check phases

if ($plan -match "Phase 1") { Write-Host "✅ Phase 1 documented" }
if ($plan -match "Phase 2") { Write-Host "✅ Phase 2 documented" }
if ($plan -match "Rollback") { Write-Host "✅ Rollback procedure documented" }

```text
**Expected Output**:

```text
Deployment plan: 400 lines
✅ Phase 1 documented
✅ Phase 2 documented
✅ Rollback procedure documented

```text
### Step 4.3: API Documentation Current

**Checklist Item**: "API documentation updated for $11.18.3"

```powershell
# Check if CONTROL_API.md mentions $11.18.3 or recent changes

Select-String "1.15" "backend/CONTROL_API.md" -ErrorAction SilentlyContinue | Select-Object -First 1

```text
**Expected Output**:

```text
(Should show version reference or recent update date)

```text
---

## ⚙️ Phase 5: Deployment Scripts Verification (10 minutes)

### Step 5.1: PowerShell Script Availability

**Checklist Item**: "DOCKER.ps1 and NATIVE.ps1 present and executable"

```powershell
# Check deployment scripts

if (Test-Path "DOCKER.ps1") {
  Write-Host "✅ DOCKER.ps1 exists"
} else {
  Write-Host "❌ DOCKER.ps1 MISSING"
}

if (Test-Path "NATIVE.ps1") {
  Write-Host "✅ NATIVE.ps1 exists"
} else {
  Write-Host "❌ NATIVE.ps1 MISSING"
}

# Verify they're readable

Get-Content "DOCKER.ps1" -TotalCount 5 | ForEach-Object { Write-Host $_ }

```text
**Expected Output**:

```text
✅ DOCKER.ps1 exists
✅ NATIVE.ps1 exists
# DOCKER.ps1

# Comprehensive Docker deployment management script
# Usage: .\DOCKER.ps1 -Help

```text
### Step 5.2: Docker Compose Files Check

**Checklist Item**: "Docker Compose files present"

```powershell
# Check docker-compose files

$composeFiles = @(
  "docker/docker-compose.yml",
  "docker/docker-compose.prod.yml"
)

foreach ($file in $composeFiles) {
  if (Test-Path $file) {
    Write-Host "✅ $file exists"
  } else {
    Write-Host "❌ $file MISSING"
  }
}

```text
**Expected Output**:

```text
✅ docker/docker-compose.yml exists
✅ docker/docker-compose.prod.yml exists

```text
### Step 5.3: Script Syntax Validation

**Checklist Item**: "Scripts have valid PowerShell syntax"

```powershell
# Quick syntax check on DOCKER.ps1

$errors = @()
$ast = [System.Management.Automation.Language.Parser]::ParseFile(
  (Resolve-Path "DOCKER.ps1"),
  [ref]$null,
  [ref]$errors
)

if ($errors.Count -eq 0) {
  Write-Host "✅ DOCKER.ps1 syntax valid"
} else {
  Write-Host "❌ DOCKER.ps1 has syntax errors:"
  $errors | ForEach-Object { Write-Host "  - $_" }
}

```text
**Expected Output**:

```text
✅ DOCKER.ps1 syntax valid

```text
**If Syntax Errors Found**:
- ❌ Script has errors
  - Action: Do not execute; contact the owner
  - Decision: Cannot proceed with invalid scripts

---

## 🧪 Phase 6: Pre-Deployment Tests (10 minutes)

### Step 6.1: Docker Image Availability

**Checklist Item**: "Required Docker images are available or can be pulled"

```powershell
# Check if base images available

Write-Host "Checking Docker images..."
docker images | findstr "python"
docker images | findstr "node"

```text
**Expected Output**:

```text
python        latest    abc123...   2 weeks ago   1.2GB
node          20        def456...   1 month ago   500MB

```text
**If Images Not Found**:
- ⚠️ Images not cached locally (will be pulled on first build)
  - Action: This is normal, will pull during `DOCKER.ps1 -Start`
  - Decision: First deploy will be slower (5-10 min extra)
  - Effort: Automatic during deployment

### Step 6.2: Network Connectivity to Docker Registry

**Checklist Item**: "Can reach Docker Hub and GitHub registries"

```powershell
# Test connectivity

Test-NetConnection -ComputerName docker.io -Port 443 -InformationLevel Quiet
Test-NetConnection -ComputerName ghcr.io -Port 443 -InformationLevel Quiet

Write-Host "Docker Hub: $(if ($? -eq $true) {'✅ Accessible'} else {'❌ Unreachable'})"

```text
**Expected Output**:

```text
Docker Hub: ✅ Accessible

```text
### Step 6.3: Backend Requirements Check

**Checklist Item**: "Python dependencies specified in requirements.txt"

```powershell
# Check requirements exist

if (Test-Path "backend/requirements.txt") {
  $requirementCount = (Get-Content "backend/requirements.txt" | Measure-Object -Line).Lines
  Write-Host "✅ requirements.txt exists ($requirementCount dependencies)"
} else {
  Write-Host "❌ requirements.txt MISSING"
}

# Check requirements.lock

if (Test-Path "backend/requirements-lock.txt") {
  Write-Host "✅ requirements-lock.txt exists (pinned versions)"
} else {
  Write-Host "⚠️ requirements-lock.txt missing (non-critical)"
}

```text
**Expected Output**:

```text
✅ requirements.txt exists (45 dependencies)
✅ requirements-lock.txt exists (pinned versions)

```text
### Step 6.4: Frontend Dependencies Check

**Checklist Item**: "NPM dependencies specified in package.json"

```powershell
# Check package.json

if (Test-Path "frontend/package.json") {
  Write-Host "✅ frontend/package.json exists"

  # Show dependency count (rough)
  $json = Get-Content "frontend/package.json" | ConvertFrom-Json
  $count = $json.dependencies.PSObject.Properties.Count
  Write-Host "  Dependencies: ~$count packages"
} else {
  Write-Host "❌ frontend/package.json MISSING"
}

# Check package-lock.json

if (Test-Path "frontend/package-lock.json") {
  Write-Host "✅ frontend/package-lock.json exists (locked versions)"
} else {
  Write-Host "⚠️ package-lock.json missing (will use latest)"
}

```text
**Expected Output**:

```text
✅ frontend/package.json exists
  Dependencies: ~30 packages
✅ frontend/package-lock.json exists (locked versions)

```text
---

## ✅ Phase 7: Final Sign-Off (5 minutes)

### Step 7.1: Compilation of Results

**Create Summary Table**:

| Category | Item | Status | Comment |
|----------|------|--------|---------|
| **Repository** | Git clean | ✅ PASS | No uncommitted changes |
| | Version 1.15.1 | ✅ PASS | Correct version |
| | CHANGELOG entry | ✅ PASS | $11.18.3 documented |
| **Infrastructure** | Docker installed | ✅ PASS | Running |
| | Ports available | ✅ PASS | 8080, 5432 free |
| | Disk space | ✅ PASS | 250GB free |
| | Network connectivity | ✅ PASS | GitHub, Docker Hub reachable |
| **Database** | Backup created | ✅ PASS | 2.5 MB, recent |
| | Test data | ✅ PASS | 150 students |
| | Migrations | ✅ PASS | At (head) |
| **Documentation** | Release notes | ✅ PASS | 650 lines, complete |
| | Deployment plan | ✅ PASS | 400 lines, detailed |
| **Scripts** | DOCKER.ps1 | ✅ PASS | Valid syntax |
| | Docker Compose | ✅ PASS | Files present |
| **Dependencies** | Python deps | ✅ PASS | 45 packages specified |
| | NPM deps | ✅ PASS | ~30 packages locked |

### Step 7.2: Risk Assessment

- ✅ All critical checks PASS
- ✅ No blocking issues identified
- ✅ Infrastructure ready for deployment
- ⚠️ Note: First Docker build will pull images (~5-10 min extra time)

### Step 7.3: GO/NO-GO Decision

**GO CONDITIONS** (All must be true):
- ✅ Git repository clean
- ✅ Version = 1.15.1
- ✅ Docker installed and running
- ✅ Ports 8080, 5432 available
- ✅ Disk space ≥ 5GB
- ✅ Database backup created (≥100KB)
- ✅ Test data exists
- ✅ Migrations at (head)
- ✅ All deployment scripts valid

**DECISION: ✅ GO FOR DEPLOYMENT**

**Authorized By**: [Owner], Date: [Date], Time: [Time]

**Next Steps**:
1. Confirm GO decision with the owner
2. Proceed to Phase 1 of [STAGING_DEPLOYMENT_PLAN_$11.18.3.md](STAGING_DEPLOYMENT_PLAN_$11.18.3.md)
3. Execute `DOCKER.ps1 -Stop` (if containers running)
4. Execute `DOCKER.ps1 -Start` to begin deployment
5. Monitor health checks (expected: 5-10 minutes)

---

## 🔄 If NO-GO Decision Needed

**NO-GO TRIGGERS** (Any of these):
- ❌ Git repository not clean
- ❌ Version file != 1.15.1
- ❌ Docker not installed/running
- ❌ Ports 8080 or 5432 in use (and can't be freed)
- ❌ Disk space < 5GB
- ❌ Database backup missing or <100KB
- ❌ Migrations not at (head)
- ❌ Invalid PowerShell scripts

**If NO-GO Occurs**:
1. Document issue in DEPLOYMENT_STATUS_TRACKER.md
2. Contact the owner
3. Create action plan to resolve issue
4. Reschedule validation for next day
5. Do NOT attempt deployment with NO-GO status

---

## 📞 Escalation Contacts

| Issue | Contact | Escalation Time |
|-------|---------|-----------------|
| Database backup issues | Database Admin | 30 min |
| Docker/infrastructure | Deployment operator / owner | 15 min |
| Script syntax errors | Owner | Immediate |
| Network connectivity | Network Admin | 30 min |
| Disk space issues | System Admin | 1 hour |
| Git/repository issues | Git Admin | 15 min |

---

**Document Status**: ⚠️ Historical execution record
**Created**: January 7, 2026
**Owner**: Historical deployment execution record
**Next Review**: Historical snapshot — no scheduled review
