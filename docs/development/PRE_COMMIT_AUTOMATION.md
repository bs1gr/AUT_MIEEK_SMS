# Pre-Commit Automation Guide

**Version:** 1.0.0  
**Created:** 2025-11-25  
**Purpose:** Unified pre-commit verification automation for SMS v1.9.0

---

## Overview

`PRE_COMMIT_CHECK.ps1` is a comprehensive automation script that consolidates all testing and verification steps required before committing code changes. It ensures production readiness by testing both Native and Docker deployment modes.

**Key Benefits:**
- ✅ **Automated**: No manual testing required
- ✅ **Comprehensive**: Tests all deployment modes
- ✅ **Fast**: Quick mode for Native-only testing
- ✅ **Detailed**: Comprehensive pass/fail reporting
- ✅ **Reliable**: Catches issues before commit

---

## Quick Start

### Basic Usage

```powershell
# Full verification (Native + Docker)
.\PRE_COMMIT_CHECK.ps1

# Fast verification (Native only)
.\PRE_COMMIT_CHECK.ps1 -Quick

# Docker only
.\PRE_COMMIT_CHECK.ps1 -SkipNative

# Native only (explicit)
.\PRE_COMMIT_CHECK.ps1 -SkipDocker
```

### Expected Output

```
╔══════════════════════════════════════════════════════════════╗
║           PRE-COMMIT VERIFICATION - SMS v1.9.0               ║
╚══════════════════════════════════════════════════════════════╝

ℹ️  Starting comprehensive pre-commit checks...

╔══════════════════════════════════════════════════════════════╗
║  Phase 1: Prerequisites Check                                ║
╚══════════════════════════════════════════════════════════════╝

Checking Python... ✅ Python 3.11.5 ✅
Checking Node.js... ✅ Node.js v20.10.0 ✅
Checking Docker... ✅ Docker available ✅

╔══════════════════════════════════════════════════════════════╗
║  Phase 2: Environment Cleanup                                ║
╚══════════════════════════════════════════════════════════════╝

ℹ️  Stopping Native processes...
✅ Native processes stopped
ℹ️  Cleaning up lingering processes...
✅ Process cleanup complete
ℹ️  Stopping Docker container...
✅ Docker container stopped

[... continues with Native testing, Docker testing, Compilation, Git status ...]

╔══════════════════════════════════════════════════════════════╗
║  Test Results Summary                                        ║
╚══════════════════════════════════════════════════════════════╝

📊 Prerequisites (3/3 passed)
  ✅ Python - Python 3.11.5
  ✅ Node.js - v20.10.0
  ✅ Docker - Docker version 24.0.7

📊 NativeBackend (1/1 passed)
  ✅ Health Check - Status: healthy

📊 NativeFrontend (1/1 passed)
  ✅ Accessibility - HTTP 200

📊 DockerContainer (2/2 passed)
  ✅ Health Check - Status: healthy
  ✅ Frontend - HTTP 200

📊 DockerDatabase (1/1 passed)
  ✅ Connection - Status: connected

📊 Compilation (2/2 passed)
  ✅ TypeScript - 0 production errors
  ✅ ESLint - Clean or warnings only

📊 GitStatus (1/1 passed)
  ✅ Changes Detected - 42 files

═══════════════════════════════════════════════════════════════

🎉 ALL TESTS PASSED - READY TO COMMIT! 🎉

ℹ️  Next steps:
  1. Review changes:  git status
  2. Stage changes:   git add -u
  3. Commit:          git commit -F commit_msg.txt
  4. Push:            git push origin main

ℹ️  Total duration: 45.2s
```

---

## Test Phases

### Phase 1: Prerequisites Check

**Purpose:** Verify required tools are installed and available.

**Tests:**
- ✅ Python 3.11+ availability
- ✅ Node.js 18+ availability
- ✅ Docker availability (if Docker testing enabled)
- ✅ PowerShell version (5.1+)

**Failure Handling:**
- Missing Python/Node.js → Installation instructions displayed
- Docker not running → Skip Docker tests (continues with Native)

---

### Phase 2: Environment Cleanup

**Purpose:** Ensure clean testing environment.

**Actions:**
- ✅ Stop all running Native processes (Backend + Frontend)
- ✅ Force kill lingering Node.js/uvicorn processes
- ✅ Stop Docker containers
- ✅ Wait 2 seconds for cleanup to complete

**Skip with:** `-NoCleanup` flag

---

### Phase 3: Native App Testing

**Purpose:** Verify Native deployment mode (development).

**Tests:**
1. **Start Native app** via `NATIVE.ps1 -Start`
   - Backend (FastAPI with uvicorn) on port 8000
   - Frontend (Vite dev server) on port 5173

2. **Backend health check**
   - Wait for port 8000 to listen (30s timeout)
   - HTTP GET to `http://localhost:8000/health`
   - Verify JSON response with `status: "healthy"`

3. **Frontend accessibility**
   - Wait for port 5173 to listen (30s timeout)
   - HTTP GET to `http://localhost:5173`
   - Verify HTTP 200 response

4. **Cleanup**
   - Stop Native processes via `NATIVE.ps1 -Stop`

**Skip with:** `-SkipNative` flag

**Typical Duration:** ~15-20 seconds

---

### Phase 4: Docker App Testing

**Purpose:** Verify Docker deployment mode (production).

**Tests:**
1. **Start Docker container** via `DOCKER.ps1 -Start`
   - Container builds/starts on port 8082
   - Uses fullstack image with Frontend + Backend

2. **Container health check**
   - Wait for port 8082 to listen (60s timeout)
   - HTTP GET to `http://localhost:8082/health`
   - Verify JSON response with `status: "healthy"`

3. **Database connection check**
   - Parse health endpoint response
   - Verify `database: "connected"`

4. **Frontend accessibility**
   - HTTP GET to `http://localhost:8082`
   - Verify HTTP 200 response

**Skip with:** `-SkipDocker` or `-Quick` flags

**Typical Duration:** ~30-45 seconds (first run with build), ~10-15 seconds (cached)

---

### Phase 5: Compilation Verification

**Purpose:** Ensure code compiles without errors.

**Tests:**
1. **TypeScript compilation**
   - Run `npx tsc --noEmit` in frontend directory
   - Filter errors to exclude test files (`*.test.ts`, `test.*`)
   - **Pass:** 0 production code errors
   - **Fail:** Any error in production code

2. **ESLint validation (informational)**
   - Run `npm run lint` in frontend directory
   - Check for blocking errors (exclude warnings)
   - **Pass:** Warnings only or clean
   - **Note:** Non-blocking, informational only

**Typical Duration:** ~5-10 seconds

---

### Phase 6: Git Status Validation

**Purpose:** Verify repository state before commit.

**Tests:**
1. **Git availability check**
   - Verify `git status` command works

2. **Changes detection**
   - Count modified files (M)
   - Count added files (A)
   - Count deleted files (D)
   - Count untracked files (??)
   - **Pass:** At least 1 file changed
   - **Fail:** 0 changes (nothing to commit)

**Output Example:**
```
  • Modified:   25 files
  • Added:      3 files
  • Deleted:    7 files
  • Untracked:  10 files
```

**Typical Duration:** ~1-2 seconds

---

## Command-Line Options

### Flags

| Flag | Description | Use Case |
|------|-------------|----------|
| `-Quick` | Skip Docker testing | Fast pre-commit check (Native only) |
| `-SkipNative` | Skip Native testing | Docker-only verification |
| `-SkipDocker` | Skip Docker testing | Native-only verification |
| `-NoCleanup` | Skip environment cleanup | Re-run tests without stopping processes |
| `-Help` | Show help message | Learn about available options |

### Examples

```powershell
# Full verification (recommended before commit)
.\PRE_COMMIT_CHECK.ps1

# Fast check during active development
.\PRE_COMMIT_CHECK.ps1 -Quick

# Test Docker deployment only
.\PRE_COMMIT_CHECK.ps1 -SkipNative

# Re-run without stopping processes
.\PRE_COMMIT_CHECK.ps1 -NoCleanup

# Show help
.\PRE_COMMIT_CHECK.ps1 -Help
```

---

## Test Results Format

### Result Tracking

Each test generates a result object:
```powershell
@{
    Test = "Backend Health Check"
    Passed = $true
    Message = "Status: healthy"
    Timestamp = "14:23:45"
}
```

Results are organized by category:
- `Prerequisites`
- `Cleanup`
- `NativeBackend`
- `NativeFrontend`
- `DockerContainer`
- `DockerDatabase`
- `Compilation`
- `GitStatus`

### Summary Report

Generated at the end of execution:
- **Per-category statistics**: X/Y tests passed
- **Individual test results**: ✅/❌ with details
- **Overall status**: Ready to commit or fix issues
- **Next steps**: Git commands to execute

---

## Exit Codes

| Code | Meaning | Action |
|------|---------|--------|
| `0` | All tests passed | Proceed with commit |
| `1` | One or more tests failed | Fix issues and re-run |

**Usage in CI/CD:**
```powershell
.\PRE_COMMIT_CHECK.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Pre-commit checks failed"
    exit 1
}
```

---

## Integration with Git Workflow

### Recommended Workflow

```powershell
# 1. Make your changes
# ... edit files ...

# 2. Run pre-commit verification
.\PRE_COMMIT_CHECK.ps1

# 3. If all tests pass, proceed with commit
git status
git add -u
git add docs/ frontend/src/hooks/useAutosave.ts  # Add new files
git commit -F commit_msg.txt
git push origin main
```

### Git Pre-Commit Hook (Optional)

Create `.git/hooks/pre-commit`:
```powershell
#!/usr/bin/env pwsh
.\PRE_COMMIT_CHECK.ps1 -Quick
if ($LASTEXITCODE -ne 0) {
    Write-Host "Pre-commit checks failed. Fix issues and try again." -ForegroundColor Red
    exit 1
}
exit 0
```

Make executable:
```powershell
chmod +x .git/hooks/pre-commit
```

---

## Troubleshooting

### Common Issues

#### 1. "Docker not available"

**Symptom:** Docker prerequisite check fails
**Solution:**
- Start Docker Desktop
- Or run with `-SkipDocker` flag

#### 2. "Port already in use"

**Symptom:** Native/Docker tests fail due to port conflicts
**Solution:**
- Run cleanup phase: `.\PRE_COMMIT_CHECK.ps1` (includes cleanup)
- Or manually stop processes:
  ```powershell
  .\NATIVE.ps1 -Stop
  .\DOCKER.ps1 -Stop
  ```

#### 3. "Backend failed to start"

**Symptom:** Native Backend health check fails
**Solution:**
- Check Python virtual environment: `backend\.venv`
- Run setup: `.\NATIVE.ps1 -Setup`
- Check logs: `backend\logs\app.log`

#### 4. "Frontend not accessible"

**Symptom:** Frontend tests fail
**Solution:**
- Check node_modules: `frontend\node_modules`
- Run setup: `.\NATIVE.ps1 -Setup`
- Check for port conflicts on 5173 (Native) or 8082 (Docker)

#### 5. "TypeScript errors in production code"

**Symptom:** Compilation phase fails
**Solution:**
- Review errors in output
- Fix TypeScript issues in production code
- Re-run verification

---

## Performance Optimization

### Quick Mode

For faster iteration during development:
```powershell
.\PRE_COMMIT_CHECK.ps1 -Quick
```

**Skips:**
- Docker container build/start
- Docker health checks
- Docker frontend tests

**Typical duration:** 15-20 seconds vs. 45-60 seconds (full)

### Caching

Docker image caching significantly speeds up subsequent runs:
- **First run:** ~45-60 seconds (build + test)
- **Cached run:** ~10-15 seconds (test only)

---

## Script Architecture

### Function Organization

```
PRE_COMMIT_CHECK.ps1
├── Configuration
│   ├── $SCRIPT_DIR, $NATIVE_SCRIPT, $DOCKER_SCRIPT
│   ├── Port definitions (8000, 5173, 8082)
│   └── Test results tracking ($script:TestResults)
│
├── Utility Functions
│   ├── Write-Header, Write-Success, Write-Failure, Write-Info, Write-Warning
│   ├── Add-TestResult (category, test, passed, message)
│   ├── Test-CommandAvailable (check if command exists)
│   ├── Test-PortInUse (check if port is listening)
│   ├── Wait-ForPort (wait for port to open)
│   └── Test-HttpEndpoint (wait for HTTP 200)
│
├── Test Phases
│   ├── Test-Prerequisites (Python, Node.js, Docker)
│   ├── Invoke-Cleanup (stop processes, clean temp files)
│   ├── Test-NativeDeployment (Backend + Frontend)
│   ├── Test-DockerDeployment (Container + Database)
│   ├── Test-Compilation (TypeScript, ESLint)
│   └── Test-GitStatus (modified, added, deleted files)
│
├── Reporting
│   └── Show-Summary (per-category statistics, next steps)
│
└── Main Execution
    ├── Parse command-line arguments
    ├── Run test phases in sequence
    ├── Show summary report
    └── Exit with appropriate code (0 or 1)
```

### Error Handling

- **Non-fatal errors:** Logged as warnings, tests continue
- **Fatal errors:** Test fails, `$script:TestResults.Overall = $false`
- **Cleanup errors:** Ignored (may not be running)
- **Missing tools:** Docker tests skipped if Docker unavailable

---

## Future Enhancements

### Planned Features

1. **Parallel Testing**
   - Run Native and Docker tests in parallel
   - Reduce total execution time by 40-50%

2. **Test Caching**
   - Cache test results based on file changes
   - Skip unchanged components

3. **Configurable Tests**
   - YAML configuration file for test selection
   - Custom timeout values per test

4. **HTML Report Generation**
   - Generate HTML test report
   - Include screenshots on failure

5. **Integration with GitHub Actions**
   - Automatic PR checks
   - Status badges

---

## Related Documentation

- **Git Workflow:** `GIT_COMMIT_INSTRUCTIONS.md`
- **Native Development:** `NATIVE.ps1 --Help`
- **Docker Deployment:** `DOCKER.ps1 --Help`
- **Autosave Pattern:** `docs/development/AUTOSAVE_PATTERN.md`
- **Architecture:** `docs/ARCHITECTURE.md`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-25 | Initial release |
|       |            | - 6 test phases |
|       |            | - Native + Docker testing |
|       |            | - Comprehensive reporting |

---

**Generated:** 2025-11-25  
**Version:** 1.0.0  
**Purpose:** Pre-commit automation documentation for SMS v1.9.0
