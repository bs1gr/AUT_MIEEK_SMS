<#
.SYNOPSIS
    Ultimate Pre-Commit Verification and System Cleanup - Student Management System

.DESCRIPTION
    Consolidated script that replaces:
    - COMMIT_PREP.ps1
    - PRE_COMMIT_CHECK.ps1
    - PRE_COMMIT_HOOK.ps1
    - SMOKE_TEST_AND_COMMIT_PREP.ps1
    - Manual cleanup scripts

    Performs comprehensive system verification and preparation:
    ✅ Code quality checks (linting, type checking)
    ✅ Translation integrity validation
    ✅ Backend test suite (unit + integration)
    ✅ Frontend test suite (components, utilities, API)
    ✅ Native mode health checks (optional)
    ✅ Docker mode health checks (optional)
    ✅ Automated cleanup (cache, build artifacts, obsolete files)
    ✅ Documentation consistency checks
    ✅ Git status validation
    ✅ Commit message generation

.PARAMETER Mode
    Execution mode:
    - 'quick'    : Fast pre-commit hook (linting, fast tests only) - 2-3 min
    - 'standard' : Standard workflow (skip deployment testing) - 5-8 min
    - 'full'     : Comprehensive (includes Native + Docker checks) - 15-20 min
    - 'cleanup'  : Only run cleanup operations
    Default: standard

.PARAMETER SkipTests
    Skip all test execution (not recommended)

.PARAMETER SkipCleanup
    Skip cleanup operations

.PARAMETER SkipLint
    Skip linting checks

.PARAMETER GenerateCommit
    Generate commit message at the end

.PARAMETER AutoFix
    Automatically fix issues where possible (formatting, imports, etc.)

.EXAMPLE
    .\COMMIT_READY.ps1
    # Standard workflow (recommended for most commits)

.EXAMPLE
    .\COMMIT_READY.ps1 -Mode quick
    # Quick validation (use as git pre-commit hook)

.EXAMPLE
    .\COMMIT_READY.ps1 -Mode full
    # Comprehensive validation (before releases)

.EXAMPLE
    .\COMMIT_READY.ps1 -Mode cleanup
    # Just cleanup workspace

.EXAMPLE
    .\COMMIT_READY.ps1 -AutoFix
    # Fix formatting and import issues automatically

.NOTES
    Version: 2.0.0
    Created: 2025-11-27
    Consolidates: COMMIT_PREP, PRE_COMMIT_CHECK, PRE_COMMIT_HOOK, SMOKE_TEST_AND_COMMIT_PREP
#>

[CmdletBinding()]
param(
    [ValidateSet('quick', 'standard', 'full', 'cleanup')]
    [string]$Mode = 'standard',
    
    [switch]$SkipTests,
    [switch]$SkipCleanup,
    [switch]$SkipLint,
    [switch]$GenerateCommit,
    [switch]$AutoFix
)

$ErrorActionPreference = 'Stop'
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKEND_DIR = Join-Path $SCRIPT_DIR "backend"
$FRONTEND_DIR = Join-Path $SCRIPT_DIR "frontend"
$VERSION_FILE = Join-Path $SCRIPT_DIR "VERSION"
$CHANGELOG_FILE = Join-Path $SCRIPT_DIR "CHANGELOG.md"

# Results tracking
$script:Results = @{
    Linting = @()
    Tests = @()
    Cleanup = @()
    Health = @()
    Overall = $true
    StartTime = Get-Date
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

function Write-Header {
    param([string]$Text, [string]$Color = 'Cyan')
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor $Color
    Write-Host "║  $($Text.PadRight(60)) ║" -ForegroundColor $Color
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor $Color
    Write-Host ""
}

function Write-Section {
    param([string]$Text)
    Write-Host ""
    Write-Host "─────────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host " $Text" -ForegroundColor White
    Write-Host "─────────────────────────────────────────────────" -ForegroundColor DarkGray
}

function Write-Success {
    param([string]$Text)
    Write-Host "✅ $Text" -ForegroundColor Green
}

function Write-Failure {
    param([string]$Text)
    Write-Host "❌ $Text" -ForegroundColor Red
    $script:Results.Overall = $false
}

function Write-Warning-Msg {
    param([string]$Text)
    Write-Host "⚠️  $Text" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Text)
    Write-Host "ℹ️  $Text" -ForegroundColor Cyan
}

function Add-Result {
    param(
        [string]$Category,
        [string]$Name,
        [bool]$Success,
        [string]$Message = ""
    )
    
    $result = @{
        Name = $Name
        Success = $Success
        Message = $Message
        Timestamp = Get-Date -Format "HH:mm:ss"
    }
    
    $script:Results[$Category] += $result
    
    if (-not $Success) {
        $script:Results.Overall = $false
    }
}

function Get-Version {
    if (Test-Path $VERSION_FILE) {
        return (Get-Content $VERSION_FILE -Raw).Trim()
    }
    return "unknown"
}

# ============================================================================
# PHASE 1: CODE QUALITY & LINTING
# ============================================================================

function Invoke-CodeQualityChecks {
    Write-Header "Phase 1: Code Quality & Linting" "Cyan"
    
    if ($SkipLint) {
        Write-Warning-Msg "Linting checks skipped by user"
        return $true
    }
    
    $allPassed = $true
    
    # Backend: Ruff linting
    Write-Section "Backend: Ruff Linting"
    try {
        Push-Location $BACKEND_DIR
        Write-Info "Running ruff check..."
        
        if ($AutoFix) {
            $output = ruff check --fix --config ../config/ruff.toml . 2>&1
        } else {
            $output = ruff check --config ../config/ruff.toml . 2>&1
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Backend linting passed"
            Add-Result "Linting" "Backend Ruff" $true
        } else {
            Write-Failure "Backend linting failed"
            Write-Host $output -ForegroundColor Gray
            Add-Result "Linting" "Backend Ruff" $false $output
            $allPassed = $false
        }
    }
    catch {
        Write-Failure "Backend linting error: $_"
        Add-Result "Linting" "Backend Ruff" $false $_
        $allPassed = $false
    }
    finally {
        Pop-Location
    }
    
    # Frontend: ESLint
    Write-Section "Frontend: ESLint"
    try {
        Push-Location $FRONTEND_DIR
        Write-Info "Running ESLint..."
        
        if ($AutoFix) {
            $output = npm run lint -- --fix 2>&1
        } else {
            $output = npm run lint 2>&1
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Frontend linting passed"
            Add-Result "Linting" "Frontend ESLint" $true
        } else {
            Write-Failure "Frontend linting failed"
            Write-Host $output -ForegroundColor Gray
            Add-Result "Linting" "Frontend ESLint" $false $output
            $allPassed = $false
        }
    }
    catch {
        Write-Failure "Frontend linting error: $_"
        Add-Result "Linting" "Frontend ESLint" $false $_
        $allPassed = $false
    }
    finally {
        Pop-Location
    }
    
    # Frontend: TypeScript type checking
    Write-Section "Frontend: TypeScript Type Checking"
    try {
        Push-Location $FRONTEND_DIR
        Write-Info "Running TypeScript compiler..."
        
        $output = npx tsc --noEmit 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "TypeScript type checking passed"
            Add-Result "Linting" "TypeScript" $true
        } else {
            Write-Failure "TypeScript type checking failed"
            Write-Host $output -ForegroundColor Gray
            Add-Result "Linting" "TypeScript" $false $output
            $allPassed = $false
        }
    }
    catch {
        Write-Failure "TypeScript error: $_"
        Add-Result "Linting" "TypeScript" $false $_
        $allPassed = $false
    }
    finally {
        Pop-Location
    }
    
    # Translation integrity
    Write-Section "Translation Integrity Check"
    try {
        Push-Location $FRONTEND_DIR
        Write-Info "Checking translation key parity..."
        
        $output = npm run test -- run src/i18n/__tests__/translations.test.ts --reporter=basic 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Translation integrity verified"
            Add-Result "Linting" "Translation Integrity" $true
        } else {
            Write-Failure "Translation integrity issues found"
            Write-Host $output -ForegroundColor Gray
            Add-Result "Linting" "Translation Integrity" $false $output
            $allPassed = $false
        }
    }
    catch {
        Write-Failure "Translation check error: $_"
        Add-Result "Linting" "Translation Integrity" $false $_
        $allPassed = $false
    }
    finally {
        Pop-Location
    }
    
    return $allPassed
}

# ============================================================================
# PHASE 2: TEST EXECUTION
# ============================================================================

function Invoke-TestSuite {
    Write-Header "Phase 2: Test Suite Execution" "Magenta"
    
    if ($SkipTests) {
        Write-Warning-Msg "Tests skipped by user"
        return $true
    }
    
    $allPassed = $true
    
    # Backend tests
    Write-Section "Backend: pytest"
    try {
        Push-Location $BACKEND_DIR
        
        if ($Mode -eq 'quick') {
            Write-Info "Running fast backend tests only..."
            $output = python -m pytest tests/ -m "not slow" -q --tb=short 2>&1
        } else {
            Write-Info "Running full backend test suite..."
            $output = python -m pytest -v --tb=short -q 2>&1
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Backend tests passed"
            Add-Result "Tests" "Backend pytest" $true
        } else {
            Write-Failure "Backend tests failed"
            Write-Host $output -ForegroundColor Gray
            Add-Result "Tests" "Backend pytest" $false $output
            $allPassed = $false
        }
    }
    catch {
        Write-Failure "Backend test error: $_"
        Add-Result "Tests" "Backend pytest" $false $_
        $allPassed = $false
    }
    finally {
        Pop-Location
    }
    
    # Frontend tests
    Write-Section "Frontend: Vitest"
    try {
        Push-Location $FRONTEND_DIR
        
        if ($Mode -eq 'quick') {
            Write-Info "Running fast frontend tests only..."
            $output = npm run test -- run --reporter=basic 2>&1
        } else {
            Write-Info "Running full frontend test suite..."
            $output = npm run test -- run 2>&1
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Frontend tests passed"
            Add-Result "Tests" "Frontend Vitest" $true
        } else {
            Write-Failure "Frontend tests failed"
            Write-Host $output -ForegroundColor Gray
            Add-Result "Tests" "Frontend Vitest" $false $output
            $allPassed = $false
        }
    }
    catch {
        Write-Failure "Frontend test error: $_"
        Add-Result "Tests" "Frontend Vitest" $false $_
        $allPassed = $false
    }
    finally {
        Pop-Location
    }
    
    return $allPassed
}

# ============================================================================
# PHASE 3: DEPLOYMENT HEALTH CHECKS
# ============================================================================

function Invoke-HealthChecks {
    Write-Header "Phase 3: Deployment Health Checks" "Blue"
    
    if ($Mode -ne 'full') {
        Write-Info "Health checks skipped (use -Mode full to enable)"
        return $true
    }
    
    $allPassed = $true
    
    # Check if NATIVE.ps1 and DOCKER.ps1 exist
    $nativeScript = Join-Path $SCRIPT_DIR "NATIVE.ps1"
    $dockerScript = Join-Path $SCRIPT_DIR "DOCKER.ps1"
    
    if (-not (Test-Path $nativeScript)) {
        Write-Warning-Msg "NATIVE.ps1 not found, skipping native health check"
    } else {
        Write-Section "Native Mode Health Check"
        try {
            Write-Info "Testing native deployment..."
            # Start, wait for health, stop
            & $nativeScript -Start > $null 2>&1
            Start-Sleep -Seconds 10
            
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 5
                if ($response.StatusCode -eq 200) {
                    Write-Success "Native mode health check passed"
                    Add-Result "Health" "Native Mode" $true
                } else {
                    Write-Failure "Native mode returned status: $($response.StatusCode)"
                    Add-Result "Health" "Native Mode" $false "Status: $($response.StatusCode)"
                    $allPassed = $false
                }
            }
            catch {
                Write-Failure "Native mode health check failed: $_"
                Add-Result "Health" "Native Mode" $false $_
                $allPassed = $false
            }
            finally {
                & $nativeScript -Stop > $null 2>&1
            }
        }
        catch {
            Write-Failure "Native mode error: $_"
            Add-Result "Health" "Native Mode" $false $_
            $allPassed = $false
        }
    }
    
    if (-not (Test-Path $dockerScript)) {
        Write-Warning-Msg "DOCKER.ps1 not found, skipping Docker health check"
    } else {
        Write-Section "Docker Mode Health Check"
        try {
            Write-Info "Testing Docker deployment..."
            # Start, wait for health, stop
            & $dockerScript -Start > $null 2>&1
            Start-Sleep -Seconds 15
            
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -TimeoutSec 5
                if ($response.StatusCode -eq 200) {
                    Write-Success "Docker mode health check passed"
                    Add-Result "Health" "Docker Mode" $true
                } else {
                    Write-Failure "Docker mode returned status: $($response.StatusCode)"
                    Add-Result "Health" "Docker Mode" $false "Status: $($response.StatusCode)"
                    $allPassed = $false
                }
            }
            catch {
                Write-Failure "Docker mode health check failed: $_"
                Add-Result "Health" "Docker Mode" $false $_
                $allPassed = $false
            }
            finally {
                & $dockerScript -Stop > $null 2>&1
            }
        }
        catch {
            Write-Failure "Docker mode error: $_"
            Add-Result "Health" "Docker Mode" $false $_
            $allPassed = $false
        }
    }
    
    return $allPassed
}

# ============================================================================
# PHASE 4: AUTOMATED CLEANUP
# ============================================================================

function Invoke-AutomatedCleanup {
    Write-Header "Phase 4: Automated Cleanup" "Yellow"
    
    if ($SkipCleanup -and $Mode -ne 'cleanup') {
        Write-Warning-Msg "Cleanup skipped by user"
        return $true
    }
    
    $totalRemoved = 0
    $totalSize = 0
    
    # Python cache cleanup
    Write-Section "Python Cache Cleanup"
    try {
        $pycacheFiles = Get-ChildItem -Path $SCRIPT_DIR -Recurse -Include "__pycache__","*.pyc","*.pyo",".pytest_cache" -Directory -ErrorAction SilentlyContinue
        foreach ($item in $pycacheFiles) {
            try {
                $size = (Get-ChildItem $item -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
                if ($null -eq $size) { $size = 0 }
                Remove-Item $item -Recurse -Force -ErrorAction Stop
                $totalRemoved++
                $totalSize += $size
            }
            catch {
                Write-Warning-Msg "Could not remove $($item.FullName): $_"
            }
        }
        Write-Success "Removed $totalRemoved Python cache items"
        Add-Result "Cleanup" "Python Cache" $true "$totalRemoved items"
    }
    catch {
        Write-Failure "Python cache cleanup error: $_"
        Add-Result "Cleanup" "Python Cache" $false $_
    }
    
    # Node modules cache cleanup
    Write-Section "Node.js Cache Cleanup"
    try {
        $nodeCache = Join-Path $FRONTEND_DIR "node_modules\.cache"
        if (Test-Path $nodeCache) {
            $size = (Get-ChildItem $nodeCache -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
            Remove-Item $nodeCache -Recurse -Force
            $totalSize += $size
            Write-Success "Removed node_modules/.cache"
            Add-Result "Cleanup" "Node Cache" $true
        } else {
            Write-Info "Node cache already clean"
            Add-Result "Cleanup" "Node Cache" $true "Already clean"
        }
    }
    catch {
        Write-Failure "Node cache cleanup error: $_"
        Add-Result "Cleanup" "Node Cache" $false $_
    }
    
    # Build artifacts cleanup
    Write-Section "Build Artifacts Cleanup"
    try {
        $buildDirs = @(
            (Join-Path $FRONTEND_DIR "dist"),
            (Join-Path $FRONTEND_DIR "build")
        )
        
        foreach ($dir in $buildDirs) {
            if (Test-Path $dir) {
                $size = (Get-ChildItem $dir -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
                Remove-Item $dir -Recurse -Force
                $totalSize += $size
                Write-Success "Removed $(Split-Path $dir -Leaf)"
            }
        }
        Add-Result "Cleanup" "Build Artifacts" $true
    }
    catch {
        Write-Failure "Build artifacts cleanup error: $_"
        Add-Result "Cleanup" "Build Artifacts" $false $_
    }
    
    # Temporary files cleanup
    Write-Section "Temporary Files Cleanup"
    try {
        $tempFiles = Get-ChildItem -Path $SCRIPT_DIR -Include "*.tmp","*.temp","*.bak","*.backup","*.old" -Recurse -File -ErrorAction SilentlyContinue
        foreach ($file in $tempFiles) {
            try {
                $totalSize += $file.Length
                Remove-Item $file -Force
                $totalRemoved++
            }
            catch {
                Write-Warning-Msg "Could not remove $($file.FullName): $_"
            }
        }
        
        if ($totalRemoved -gt 0) {
            Write-Success "Removed $totalRemoved temporary files"
        } else {
            Write-Info "No temporary files found"
        }
        Add-Result "Cleanup" "Temp Files" $true "$totalRemoved files"
    }
    catch {
        Write-Failure "Temp files cleanup error: $_"
        Add-Result "Cleanup" "Temp Files" $false $_
    }
    
    # Summary
    $totalSizeMB = [math]::Round($totalSize / 1MB, 2)
    Write-Info "Total space freed: $totalSizeMB MB"
    
    return $true
}

# ============================================================================
# PHASE 5: DOCUMENTATION & GIT STATUS
# ============================================================================

function Invoke-DocumentationCheck {
    Write-Header "Phase 5: Documentation & Git Status" "Green"
    
    # Check key documentation
    Write-Section "Key Documentation Check"
    $keyDocs = @(
        "README.md",
        "CHANGELOG.md",
        "TODO.md",
        "docs/DOCUMENTATION_INDEX.md"
    )
    
    $allExist = $true
    foreach ($doc in $keyDocs) {
        $docPath = Join-Path $SCRIPT_DIR $doc
        if (Test-Path $docPath) {
            Write-Success "$doc exists"
        } else {
            Write-Failure "$doc is missing"
            $allExist = $false
        }
    }
    
    # Git status
    Write-Section "Git Status"
    try {
        $gitStatus = git status --short 2>&1
        
        if ([string]::IsNullOrWhiteSpace($gitStatus)) {
            Write-Success "Working directory is clean"
        } else {
            Write-Info "Uncommitted changes detected:"
            Write-Host $gitStatus -ForegroundColor Gray
        }
    }
    catch {
        Write-Warning-Msg "Git not available or not a git repository"
    }
    
    return $allExist
}

# ============================================================================
# PHASE 6: COMMIT MESSAGE GENERATION
# ============================================================================

function New-CommitMessage {
    Write-Header "Commit Message Generation" "Cyan"
    
    $version = Get-Version
    $duration = ((Get-Date) - $script:Results.StartTime).TotalSeconds
    $durationStr = [math]::Round($duration, 1)
    
    # Count results
    $lintPassed = ($script:Results.Linting | Where-Object { $_.Success }).Count
    $lintTotal = $script:Results.Linting.Count
    $testsPassed = ($script:Results.Tests | Where-Object { $_.Success }).Count
    $testsTotal = $script:Results.Tests.Count
    
    $status = if ($script:Results.Overall) { "✅ PASSED" } else { "❌ FAILED" }
    
    $message = @"
chore: pre-commit validation complete

Status: $status
Version: $version
Duration: ${durationStr}s
Mode: $Mode

Code Quality:
- Linting: $lintPassed/$lintTotal checks passed
- Tests: $testsPassed/$testsTotal suites passed

$(if ($script:Results.Cleanup.Count -gt 0) {
"Cleanup: $($script:Results.Cleanup.Count) operations completed
"})
All systems verified and ready for commit.
"@

    Write-Host $message -ForegroundColor White
    
    Write-Host "`n" + "═" * 60 -ForegroundColor Cyan
    Write-Host "NEXT STEPS:" -ForegroundColor Cyan
    Write-Host "═" * 60 -ForegroundColor Cyan
    
    if ($script:Results.Overall) {
        Write-Host "1. Review the changes: git status" -ForegroundColor White
        Write-Host "2. Stage your changes: git add ." -ForegroundColor White
        Write-Host "3. Commit with message above" -ForegroundColor White
        Write-Host "4. Push: git push origin main" -ForegroundColor White
    } else {
        Write-Host "⚠️  Fix the failed checks before committing" -ForegroundColor Yellow
        Write-Host "Review the failures above and address them" -ForegroundColor White
    }
    
    return $message
}

# ============================================================================
# SUMMARY & REPORTING
# ============================================================================

function Show-Summary {
    Write-Header "Execution Summary" "Green"
    
    $duration = ((Get-Date) - $script:Results.StartTime).TotalSeconds
    
    Write-Host "Mode: $Mode" -ForegroundColor Cyan
    Write-Host "Duration: $([math]::Round($duration, 1))s" -ForegroundColor Cyan
    Write-Host ""
    
    # Linting results
    if ($script:Results.Linting.Count -gt 0) {
        Write-Host "Code Quality:" -ForegroundColor Yellow
        foreach ($result in $script:Results.Linting) {
            $icon = if ($result.Success) { "✅" } else { "❌" }
            Write-Host "  $icon $($result.Name)" -ForegroundColor $(if ($result.Success) { "Green" } else { "Red" })
        }
        Write-Host ""
    }
    
    # Test results
    if ($script:Results.Tests.Count -gt 0) {
        Write-Host "Tests:" -ForegroundColor Yellow
        foreach ($result in $script:Results.Tests) {
            $icon = if ($result.Success) { "✅" } else { "❌" }
            Write-Host "  $icon $($result.Name)" -ForegroundColor $(if ($result.Success) { "Green" } else { "Red" })
        }
        Write-Host ""
    }
    
    # Health checks
    if ($script:Results.Health.Count -gt 0) {
        Write-Host "Health Checks:" -ForegroundColor Yellow
        foreach ($result in $script:Results.Health) {
            $icon = if ($result.Success) { "✅" } else { "❌" }
            Write-Host "  $icon $($result.Name)" -ForegroundColor $(if ($result.Success) { "Green" } else { "Red" })
        }
        Write-Host ""
    }
    
    # Cleanup results
    if ($script:Results.Cleanup.Count -gt 0) {
        Write-Host "Cleanup:" -ForegroundColor Yellow
        foreach ($result in $script:Results.Cleanup) {
            $icon = if ($result.Success) { "✅" } else { "❌" }
            $msg = if ($result.Message) { " ($($result.Message))" } else { "" }
            Write-Host "  $icon $($result.Name)$msg" -ForegroundColor $(if ($result.Success) { "Green" } else { "Red" })
        }
        Write-Host ""
    }
    
    # Overall result
    Write-Host "═" * 60 -ForegroundColor Cyan
    if ($script:Results.Overall) {
        Write-Host "✅ ALL CHECKS PASSED - READY TO COMMIT" -ForegroundColor Green
    } else {
        Write-Host "❌ SOME CHECKS FAILED - REVIEW AND FIX" -ForegroundColor Red
    }
    Write-Host "═" * 60 -ForegroundColor Cyan
}

# ============================================================================
# MAIN WORKFLOW
# ============================================================================

function Invoke-MainWorkflow {
    $startBanner = @"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║          COMMIT READY - Pre-Commit Verification              ║
║          Student Management System v$(Get-Version)                   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
"@
    
    Write-Host $startBanner -ForegroundColor Green
    Write-Host ""
    Write-Host "Mode: $Mode" -ForegroundColor Cyan
    Write-Host "Started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
    Write-Host ""
    
    # Execute workflow based on mode
    if ($Mode -eq 'cleanup') {
        Invoke-AutomatedCleanup
    } else {
        # Phase 1: Code Quality
        if (-not $SkipLint) {
            $lintResult = Invoke-CodeQualityChecks
        }
        
        # Phase 2: Tests
        if (-not $SkipTests) {
            $testResult = Invoke-TestSuite
        }
        
        # Phase 3: Health Checks (only in full mode)
        if ($Mode -eq 'full') {
            $healthResult = Invoke-HealthChecks
        }
        
        # Phase 4: Cleanup
        if (-not $SkipCleanup) {
            $cleanupResult = Invoke-AutomatedCleanup
        }
        
        # Phase 5: Documentation
        Invoke-DocumentationCheck
    }
    
    # Show summary
    Show-Summary
    
    # Generate commit message if requested or if all passed
    if ($GenerateCommit -or ($script:Results.Overall -and $Mode -ne 'cleanup')) {
        New-CommitMessage
    }
    
    # Return exit code
    return $(if ($script:Results.Overall) { 0 } else { 1 })
}

# ============================================================================
# ENTRY POINT
# ============================================================================

try {
    $exitCode = Invoke-MainWorkflow
    exit $exitCode
}
catch {
    Write-Host ""
    Write-Host "═" * 60 -ForegroundColor Red
    Write-Host "FATAL ERROR" -ForegroundColor Red
    Write-Host "═" * 60 -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    exit 1
}
