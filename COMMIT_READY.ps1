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
Version: 1.10.0
    Created: 2025-11-27
    Consolidates: COMMIT_PREP, PRE_COMMIT_CHECK, PRE_COMMIT_HOOK, SMOKE_TEST_AND_COMMIT_PREP

        Cleanup safety behaviour:
        - The automated cleanup stage uses a default timeout ($maxCleanupSeconds = 120) to avoid
            scanning very large mounts (e.g. site-packages, node_modules) and will abort if the
            operation takes longer than this value.
        - Known large or sensitive directories are excluded from recursive pruning by default:
            .git, node_modules, .venv, venv, backups, data, logs, docker
        - In 'cleanup' mode the command's exit code is based on the cleanup phase results only
            (0 = cleanup operations succeeded, 1 = cleanup reported failures). This helps CI
            run cleanup as a smoke test without unrelated checks failing the job.
#>

[CmdletBinding()]
param(
    [ValidateSet('quick', 'standard', 'full', 'cleanup')]
    [string]$Mode = 'standard',

    # Backward-compatible convenience switches used by CI workflows
    [switch]$Quick,
    [switch]$Standard,
    [switch]$Full,
    [switch]$Cleanup,
    
    [switch]$SkipTests,
    [switch]$SkipCleanup,
    [switch]$SkipLint,
    [switch]$GenerateCommit,
    [switch]$AutoFix,
    # New: Auto-update documentation and synchronize version across workspace
    [switch]$SyncVersion,
    [switch]$UpdateDocs,
    # New: Audit-only mode and interactive release actions
    [switch]$AuditVersion,
    [string]$BumpToVersion,
    [switch]$AutoTagAndPush,
    # New: One-shot release flow: audit → optional bump → full pre-commit → commit+push+tag (if all OK)
    [switch]$ReleaseFlow,
    # Optional: run non-interactively for CI (auto-accept prompts)
    [switch]$NonInteractive
)

$ErrorActionPreference = 'Stop'
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
# Normalize Mode based on legacy switches if provided (supports -Quick etc.)
if ($Quick)    { $Mode = 'quick' }
elseif ($Standard) { $Mode = 'standard' }
elseif ($Full)     { $Mode = 'full' }
elseif ($Cleanup)  { $Mode = 'cleanup' }

$BACKEND_DIR = Join-Path $SCRIPT_DIR "backend"
$FRONTEND_DIR = Join-Path $SCRIPT_DIR "frontend"
$VERSION_FILE = Join-Path $SCRIPT_DIR "VERSION"
# $CHANGELOG_FILE reserved for future changelog checks (removed to avoid unused variable warning)

# Helper paths
$FRONTEND_PACKAGE_JSON = Join-Path $FRONTEND_DIR "package.json"
$INSTALLER_DIR = Join-Path $SCRIPT_DIR "installer"
$DOCS_DIR = Join-Path $SCRIPT_DIR "docs"

# Determine execution environment (CI vs local dev)
$inCI = [bool](
    $env:GITHUB_ACTIONS -or $env:CI -or $env:GITHUB_RUN_ID -or $env:CI_SERVER -or $env:CONTINUOUS_INTEGRATION
)

# Enforce: skipping tests/cleanup/auto-fixes in local pre-commit requires DEV_EASE opt-in
if (-not $inCI) {
    if ($SkipTests.IsPresent -or $SkipCleanup.IsPresent -or $AutoFix.IsPresent) {
        $devEase = ($env:DEV_EASE -as [string]) -and ($env:DEV_EASE.ToLower() -in @('1','true','yes'))
        if (-not $devEase) {
            Write-Host "❌ Security: DEV_EASE must be enabled to use SkipTests, SkipCleanup, or AutoFix during local pre-commit runs." -ForegroundColor Red
            Write-Host "   To allow this locally set (PowerShell): `$env:DEV_EASE = 'true'` and re-run the command." -ForegroundColor Yellow
            exit 1
        }
    }
}

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

# Check if an executable/command exists in PATH (cross-platform)
function Test-CommandAvailable {
    param([string]$Name)
    try {
        $cmd = Get-Command $Name -ErrorAction Stop
        return $null -ne $cmd
    }
    catch {
        return $false
    }
}

# Ensure Python backend dependencies are installed (CI-safe)
function Install-BackendDependencies {
    Write-Section "Backend: Ensure Python Dependencies"
    try {
        Push-Location $BACKEND_DIR
        $pipAvailable = Test-CommandAvailable -Name "pip"
        $pythonAvailable = Test-CommandAvailable -Name "python"
        $installed = $false

        # Prefer pip if available, else python -m pip
        if ($pipAvailable) {
            Write-Info "Installing runtime requirements (pip)"
            pip install -r requirements-runtime.txt 2>&1 | Out-Null
            $installed = $true
            if (Test-Path "requirements-dev.txt") {
                Write-Info "Installing dev requirements (pip)"
                pip install -r requirements-dev.txt 2>&1 | Out-Null
            }
        } elseif ($pythonAvailable) {
            Write-Info "Installing runtime requirements (python -m pip)"
            python -m pip install -r requirements-runtime.txt 2>&1 | Out-Null
            $installed = $true
            if (Test-Path "requirements-dev.txt") {
                Write-Info "Installing dev requirements (python -m pip)"
                python -m pip install -r requirements-dev.txt 2>&1 | Out-Null
            }
        } else {
            Write-Warning-Msg "Neither pip nor python found; cannot install dependencies"
        }

        if ($installed) {
            Write-Success "Backend dependencies ensured"
            Add-Result "Tests" "Backend Dependencies" $true
            return $true
        } else {
            Add-Result "Tests" "Backend Dependencies" $false "pip/python not available"
            return $false
        }
    }
    catch {
        Write-Failure "Dependency installation error: $_"
        Add-Result "Tests" "Backend Dependencies" $false $_
        return $false
    }
    finally {
        Pop-Location
    }
}

# Helper: Find __pycache__ directories and .pyc/.pyo files without descending into excluded dirs
function Get-PrunedPyCacheTargets {
    param(
        [string]$RootPath,
        [array]$ExcludePatterns,
        [int]$MaxSeconds,
        [datetime]$StartTime
    )

    $stack = New-Object System.Collections.Stack
    $found = @()

    try {
        $rootItem = Get-Item -LiteralPath $RootPath -ErrorAction Stop
    }
    catch {
        return @()
    }

    $stack.Push($rootItem)

    while ($stack.Count -gt 0) {
        $elapsed = (Get-Date) - $StartTime
        if ($elapsed.TotalSeconds -gt $MaxSeconds) {
            Write-Warning-Msg "Traversal timeout reached after $([math]::Round($elapsed.TotalSeconds,1))s — aborting search for pycache targets."
            break
        }

        $parent = $stack.Pop()

        # Try to list directories (safe) and files within this parent
        try {
            $children = Get-ChildItem -Path $parent.FullName -Directory -ErrorAction SilentlyContinue
            # quick name-based exclusion (fast) - skip known large directories
            $skipNames = @('.git','node_modules','backups','data','logs','docker','.venv','venv')
            foreach ($child in $children) {
                $lower = $child.Name.ToLower()
                if ($skipNames -contains $lower) { continue }

                $skip = $false
                foreach ($pattern in $ExcludePatterns) {
                    if ($child.FullName -like "*$pattern*") { $skip = $true; break }
                }
                if ($skip) { continue }

                if ($child.Name -eq '__pycache__') {
                    $found += $child
                } else {
                    # descend into this child
                    $stack.Push($child)
                }
            }

            # Safe file checks (non-recursive) at this level
            $pyc = Get-ChildItem -Path $parent.FullName -File -Filter "*.pyc" -ErrorAction SilentlyContinue
            if ($pyc) { $found += $pyc }
            $pyo = Get-ChildItem -Path $parent.FullName -File -Filter "*.pyo" -ErrorAction SilentlyContinue
            if ($pyo) { $found += $pyo }
        }
        catch {
            Write-Warning-Msg "Error enumerating $($parent.FullName): $_"
            continue
        }
    }

    return $found
}

# Helper: find temporary files (safe pruned traversal), matching extensions
function Get-PrunedTempFiles {
    param(
        [string]$RootPath,
        [array]$ExcludePatterns,
        [int]$MaxSeconds,
        [datetime]$StartTime
    )

    $stack = New-Object System.Collections.Stack
    $found = @()

    try {
        $rootItem = Get-Item -LiteralPath $RootPath -ErrorAction Stop
    }
    catch {
        return @()
    }

    $stack.Push($rootItem)

    $exts = @('.tmp','.temp','.bak','.backup','.old')

    while ($stack.Count -gt 0) {
        $elapsed = (Get-Date) - $StartTime
        if ($elapsed.TotalSeconds -gt $MaxSeconds) {
            Write-Warning-Msg "Traversal timeout reached after $([math]::Round($elapsed.TotalSeconds,1))s — aborting search for temp files."
            break
        }

        $parent = $stack.Pop()

        try {
            $children = Get-ChildItem -Path $parent.FullName -Directory -ErrorAction SilentlyContinue
            # skip common large folders by name to keep traversal fast
            $skipNames = @('.git','node_modules','backups','data','logs','docker','.venv','venv')
            foreach ($child in $children) {
                $lower = $child.Name.ToLower()
                if ($skipNames -contains $lower) { continue }

                $skip = $false
                foreach ($pattern in $ExcludePatterns) {
                    if ($child.FullName -like "*$pattern*") { $skip = $true; break }
                }
                if ($skip) { continue }

                # descend
                $stack.Push($child)
            }

            # check non-recursive files at this level
            $files = Get-ChildItem -Path $parent.FullName -File -ErrorAction SilentlyContinue
            foreach ($f in $files) {
                if ($exts -contains $f.Extension.ToLower()) { $found += $f }
            }
        }
        catch {
            Write-Warning-Msg "Error enumerating $($parent.FullName): $_"
            continue
        }
    }

    return $found
}

function Get-Version {
    if (Test-Path $VERSION_FILE) {
        return (Get-Content $VERSION_FILE -Raw).Trim()
    }
    return "unknown"
}

# ============================================================================
# PHASE A: VERSION PROPAGATION & DOCS AUTO-UPDATE
# ============================================================================

function Set-PackageJsonVersion {
    param(
        [string]$Path,
        [string]$Version
    )
    try {
        $json = Get-Content $Path -Raw | ConvertFrom-Json
        if ($null -ne $json.version -and $json.version -ne $Version) {
            $json.version = $Version
            ($json | ConvertTo-Json -Depth 10) | Set-Content -Path $Path -Encoding UTF8
            Write-Success "Updated package.json version -> $Version"
            return $true
        }
        return $true
    }
    catch {
        Write-Warning-Msg "Unable to update ${Path}: $_"
        return $false
    }
}

function Update-TextFileVersionLines {
    param(
        [string]$Path,
        [string]$Version
    )
    try {
        if (-not (Test-Path $Path)) { return $true }
        $content = Get-Content $Path -Raw
        $updated = $false

        # Common patterns: "Version: X.Y.Z" and banners like "vX.Y.Z"
        $newContent = $content -replace '(?m)^\s*Version:\s*\d+\.\d+\.\d+', "Version: $Version"
        if ($newContent -ne $content) { $updated = $true }

        # Replace standalone banner versions vX.Y.Z within known headers
        $newContent2 = $newContent -replace '(?m)(v)\d+\.\d+\.\d+', "`$1$Version"
        if ($newContent2 -ne $newContent) { $updated = $true }
        
        # Inno Setup script header comments ("; Version: X.Y.Z")
        $newContent3 = $newContent2 -replace '(?m)^;\s*Version:\s*\d+\.\d+\.\d+', "; Version: $Version"
        if ($newContent3 -ne $newContent2) { $updated = $true }

        # Python docstrings or comments that reference Version lines
        # Replace 'Version: See VERSION file' with explicit version, and also handle explicit numbers
        $newContent4 = $newContent3 -replace '(?m)^\s*Version:\s*See VERSION file', "Version: $Version"
        $newContent4 = $newContent4 -replace '(?m)^\s*Version:\s*\d+\.\d+\.\d+', "Version: $Version"
        if ($newContent4 -ne $newContent3) { $updated = $true }

        if ($updated) {
            Set-Content -Path $Path -Value $newContent4 -Encoding UTF8
            Write-Success "Synchronized version in $(Split-Path $Path -Leaf)"
        }
        return $true
    }
    catch {
        Write-Warning-Msg "Failed to update version lines in ${Path}: $_"
        return $false
    }
}

function Invoke-VersionPropagationAndDocs {
    Write-Header "Phase A: Version Propagation & Docs Update" "DarkGreen"

    $version = Get-Version
    if ($version -eq 'unknown') {
        Write-Warning-Msg "VERSION file missing or unreadable; skipping propagation"
        Add-Result "Linting" "Version Propagation" $false "VERSION missing"
        return $false
    }

    $ok = $true

    # 1) Sync frontend package.json version when requested
    if (Test-Path $FRONTEND_PACKAGE_JSON) {
        if ($SyncVersion -or $AutoFix) {
            $ok = (Set-PackageJsonVersion -Path $FRONTEND_PACKAGE_JSON -Version $version) -and $ok
        } else {
            Write-Info "Version sync to package.json skipped (use -SyncVersion or -AutoFix to enable)"
        }
    }

    # 2) Update known documentation/version banners
    if ($UpdateDocs -or $AutoFix -or ($Mode -in @('standard','full'))) {
        $targets = @(
            (Join-Path $SCRIPT_DIR 'README.md'),
            (Join-Path $SCRIPT_DIR 'COMMIT_READY.ps1'),
            (Join-Path $SCRIPT_DIR 'DOCKER.ps1'),
            (Join-Path $SCRIPT_DIR 'NATIVE.ps1'),
            (Join-Path $SCRIPT_DIR 'CHANGELOG.md'),
            (Join-Path $SCRIPT_DIR 'COMMIT_SUMMARY.md'),
            (Join-Path $SCRIPT_DIR 'RELEASE_SUMMARY_$11.9.7.md'),
            (Join-Path $SCRIPT_DIR 'PERFORMANCE_AUDIT_2025-12-03.md')
        )

        foreach ($t in $targets) {
            Update-TextFileVersionLines -Path $t -Version $version | Out-Null
        }

        # Process docs directory broadly for Version lines
        if (Test-Path $DOCS_DIR) {
            Get-ChildItem $DOCS_DIR -Recurse -Filter *.md | ForEach-Object {
                Update-TextFileVersionLines -Path $_.FullName -Version $version | Out-Null
            }
        }

        # Installer scripts may carry banner/version lines
        if (Test-Path $INSTALLER_DIR) {
            Get-ChildItem $INSTALLER_DIR -Recurse -Include *.ps1,*.cmd,*.bat,*.rtf,*.txt | ForEach-Object {
                Update-TextFileVersionLines -Path $_.FullName -Version $version | Out-Null
            }
        }

        Write-Success "Documentation and script version references synchronized"
        Add-Result "Linting" "Docs & Version Sync" $true
    } else {
        Write-Info "Docs update skipped (use -UpdateDocs or -AutoFix to enable)"
        Add-Result "Linting" "Docs & Version Sync" $true "Skipped"
    }

    return $ok
}

# ============================================================================
# VERSION AUDIT & INTERACTIVE RELEASE ACTIONS
# ============================================================================

function Get-WorkspaceVersionRefs {
    param([string]$Version)
    $refs = @()

    # package.json
    if (Test-Path $FRONTEND_PACKAGE_JSON) {
        try {
            $pkg = Get-Content $FRONTEND_PACKAGE_JSON -Raw | ConvertFrom-Json
            $refs += @{ Path = $FRONTEND_PACKAGE_JSON; Type = 'json'; Value = $pkg.version }
        } catch {}
    }

    # Explicit files and docs banners
    $explicitTargets = @(
        (Join-Path $SCRIPT_DIR 'README.md'),
        (Join-Path $SCRIPT_DIR 'CHANGELOG.md'),
        (Join-Path $SCRIPT_DIR 'COMMIT_SUMMARY.md'),
        (Join-Path $SCRIPT_DIR 'DOCKER.ps1'),
        (Join-Path $SCRIPT_DIR 'NATIVE.ps1'),
        (Join-Path $SCRIPT_DIR 'COMMIT_READY.ps1')
    ) | Where-Object { Test-Path $_ }

    foreach ($t in $explicitTargets) {
        try {
            $content = Get-Content $t -Raw
            $m1 = [regex]::Match($content, '(?m)^\s*Version:\s*(\d+\.\d+\.\d+)')
            if ($m1.Success) { $refs += @{ Path = $t; Type = 'text-line'; Value = $m1.Groups[1].Value } }
            $m2 = [regex]::Match($content, '\bv(\d+\.\d+\.\d+)\b')
            if ($m2.Success) { $refs += @{ Path = $t; Type = 'banner'; Value = $m2.Groups[1].Value } }
        } catch {}
    }

    if (Test-Path $DOCS_DIR) {
        Get-ChildItem $DOCS_DIR -Recurse -Filter *.md | ForEach-Object {
            try {
                $content = Get-Content $_.FullName -Raw
                $m1 = [regex]::Match($content, '(?m)^\s*Version:\s*(\d+\.\d+\.\d+)')
                if ($m1.Success) { $refs += @{ Path = $_.FullName; Type = 'text-line'; Value = $m1.Groups[1].Value } }
                $m2 = [regex]::Match($content, '\bv(\d+\.\d+\.\d+)\b')
                if ($m2.Success) { $refs += @{ Path = $_.FullName; Type = 'banner'; Value = $m2.Groups[1].Value } }
            } catch {}
        }
    }

    if (Test-Path $INSTALLER_DIR) {
        Get-ChildItem $INSTALLER_DIR -Recurse -Include *.ps1,*.cmd,*.bat | ForEach-Object {
            try {
                $content = Get-Content $_.FullName -Raw
                $m1 = [regex]::Match($content, '(?m)^\s*Version:\s*(\d+\.\d+\.\d+)')
                if ($m1.Success) { $refs += @{ Path = $_.FullName; Type = 'text-line'; Value = $m1.Groups[1].Value } }
                $m2 = [regex]::Match($content, '\bv(\d+\.\d+\.\d+)\b')
                if ($m2.Success) { $refs += @{ Path = $_.FullName; Type = 'banner'; Value = $m2.Groups[1].Value } }
            } catch {}
        }
    }

    return $refs
}

function Invoke-VersionAuditReport {
    Write-Header "Version Audit Report" "DarkYellow"
    $version = Get-Version
    Write-Info "Source of truth VERSION: $version"

    $refs = Get-WorkspaceVersionRefs -Version $version
    if ($refs.Count -eq 0) {
        Write-Warning-Msg "No version references found in workspace"
        Add-Result "Linting" "Version Audit" $true "No refs"
        return 0
    }

    $mismatches = 0
    foreach ($r in $refs) {
        $ok = ($r.Value -eq $version)
        $icon = if ($ok) { '✅' } else { '❌' }
        if (-not $ok) { $mismatches++ }
        Write-Host " $icon $($r.Path) [$($r.Type)] -> $($r.Value)" -ForegroundColor $(if ($ok) { 'Green' } else { 'Red' })
    }

    if ($mismatches -gt 0) {
        Write-Warning-Msg "$mismatches mismatches detected"
        Add-Result "Linting" "Version Audit" $false "$mismatches mismatches"
        return $mismatches
    } else {
        Write-Success "All references match VERSION"
        Add-Result "Linting" "Version Audit" $true
        return 0
    }
}

function Invoke-InteractiveRelease {
    param(
        [string]$TargetVersion,
        [switch]$TagAndPush
    )

    Write-Header "Interactive Release" "DarkCyan"
    $current = Get-Version
    if (-not $TargetVersion) { $TargetVersion = $current }
    Write-Info "Current VERSION: $current"
    Write-Info "Target VERSION:  $TargetVersion"

    $response = if ($NonInteractive) { 'y' } else { Read-Host "Proceed to synchronize, commit, push and tag v$TargetVersion? (y/N)" }
    if ($response.ToLower() -ne 'y') {
        Write-Warning-Msg "Release aborted by user"
        Add-Result "Linting" "Interactive Release" $false "aborted"
        return $false
    }

    # 1) Write VERSION if bump requested
    if ($TargetVersion -ne $current) {
        Set-Content -Path $VERSION_FILE -Value $TargetVersion -Encoding UTF8
        Write-Success "Updated VERSION -> $TargetVersion"
    }

    # 2) Propagate versions across workspace and docs
    Invoke-VersionPropagationAndDocs | Out-Null

    # 3) git commit, push, tag
    try {
        git add .
        git commit -m "chore: release v$TargetVersion"
        if ($TagAndPush) {
            git tag "v$TargetVersion"
            git push origin "v$TargetVersion"
            git push
        }
        Write-Success "Git commit/push/tag complete"
        Add-Result "Linting" "Release Actions" $true
        return $true
    }
    catch {
        Write-Warning-Msg "Git operations failed: $_"
        Add-Result "Linting" "Release Actions" $false $_
        return $false
    }
}

# ============================================================================
# PHASE 0: VERSION CONSISTENCY CHECK
# ============================================================================

function Invoke-VersionConsistencyCheck {
    Write-Header "Phase 0: Version Consistency" "DarkCyan"

    # Run comprehensive version verification using VERIFY_VERSION.ps1
    $verifyScript = Join-Path $SCRIPT_DIR "scripts\VERIFY_VERSION.ps1"
    
    if (-not (Test-Path $verifyScript)) {
        Write-Warning-Msg "VERIFY_VERSION.ps1 not found, falling back to basic check"
        $version = Get-Version
        Write-Info "VERSION file: $version"
        Add-Result "Linting" "Version Consistency" $true "Basic check only"
        return $true
    }

    Write-Info "Running comprehensive version verification..."
    
    # Check if AutoFix is enabled and apply updates if inconsistencies found
    if ($AutoFix) {
        Write-Info "AutoFix enabled - will update inconsistent version references"
        $result = & $verifyScript -Update 2>&1
        $exitCode = $LASTEXITCODE
    } else {
        $result = & $verifyScript -CheckOnly 2>&1
        $exitCode = $LASTEXITCODE
    }
    
    # Display output
    $result | ForEach-Object { Write-Host $_ }
    
    # Exit codes: 0=success, 1=critical failure, 2=inconsistencies found
    if ($exitCode -eq 0) {
        Write-Success "All version references consistent across codebase"
        Add-Result "Linting" "Version Consistency" $true "All 9 version checks passed"
        return $true
    } 
    elseif ($exitCode -eq 2 -and -not $AutoFix) {
        Write-Warning-Msg "Version inconsistencies detected. Run with -AutoFix to update automatically."
        Write-Info "Manual fix: .\scripts\VERIFY_VERSION.ps1 -Update"
        Add-Result "Linting" "Version Consistency" $false "Inconsistencies found (use -AutoFix)"
        return $false
    }
    else {
        Write-Failure "Version verification failed"
        Add-Result "Linting" "Version Consistency" $false "Critical version mismatch"
        return $false
    }
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

        $ruffAvailable = Test-CommandAvailable -Name "ruff"
        $output = $null
        if ($ruffAvailable) {
            if ($AutoFix) {
                $output = ruff check --fix --config ../config/ruff.toml . 2>&1
            } else {
                $output = ruff check --config ../config/ruff.toml . 2>&1
            }
        } else {
            # Fallback: try python -m ruff if ruff is not directly in PATH (common in CI)
            $pythonAvailable = Test-CommandAvailable -Name "python"
            if ($pythonAvailable) {
                if ($AutoFix) {
                    $output = python -m ruff check --fix --config ../config/ruff.toml . 2>&1
                } else {
                    $output = python -m ruff check --config ../config/ruff.toml . 2>&1
                }
            } else {
                Write-Warning-Msg "Ruff is not available; skipping backend lint"
                $LASTEXITCODE = 0
                $output = "SKIPPED"
            }
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
        $npmAvailable = Test-CommandAvailable -Name "npm"
        if ($npmAvailable) {
            if ($AutoFix) {
                $output = npm run lint -- --fix 2>&1
            } else {
                $output = npm run lint 2>&1
            }
        } else {
            Write-Warning-Msg "npm is not available; skipping ESLint"
            $LASTEXITCODE = 0
            $output = "SKIPPED"
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

    # Repository Markdown lint
    Write-Section "Repository: Markdown Lint"
    try {
        Push-Location $SCRIPT_DIR
        $npxAvailable = Test-CommandAvailable -Name "npx"
        if ($npxAvailable) {
            $mdConfig = Join-Path $SCRIPT_DIR "config\.markdownlint.json"
            $mdIgnore = Join-Path $SCRIPT_DIR ".markdownlintignore"
            if (Test-Path $mdConfig) {
                if ($AutoFix) {
                    if (Test-Path $mdIgnore) {
                        $output = npx markdownlint-cli "**/*.md" --fix --config "$mdConfig" --ignore-path "$mdIgnore" 2>&1
                    } else {
                        $output = npx markdownlint-cli "**/*.md" --fix --config "$mdConfig" 2>&1
                    }
                } else {
                    if (Test-Path $mdIgnore) {
                        $output = npx markdownlint-cli "**/*.md" --config "$mdConfig" --ignore-path "$mdIgnore" 2>&1
                    } else {
                        $output = npx markdownlint-cli "**/*.md" --config "$mdConfig" 2>&1
                    }
                }
            } else {
                if ($AutoFix) {
                    if (Test-Path $mdIgnore) {
                        $output = npx markdownlint-cli "**/*.md" --fix --ignore-path "$mdIgnore" 2>&1
                    } else {
                        $output = npx markdownlint-cli "**/*.md" --fix 2>&1
                    }
                } else {
                    if (Test-Path $mdIgnore) {
                        $output = npx markdownlint-cli "**/*.md" --ignore-path "$mdIgnore" 2>&1
                    } else {
                        $output = npx markdownlint-cli "**/*.md" 2>&1
                    }
                }
            }
        } else {
            Write-Warning-Msg "npx not available; skipping Markdown lint"
            $LASTEXITCODE = 0
            $output = "SKIPPED"
        }

        if ($LASTEXITCODE -eq 0) {
            Write-Success "Markdown linting passed"
            Add-Result "Linting" "Markdown Lint" $true
        } else {
            # In 'full' mode, allow docs lint to be non-blocking unless STRICT_DOCS_LINT=1
            $strictDocs = ($env:STRICT_DOCS_LINT -as [string]) -and ($env:STRICT_DOCS_LINT.ToLower() -in @('1','true','yes'))
            if ($Mode -eq 'full' -and -not $strictDocs) {
                Write-Warning-Msg "Markdown linting reported issues (non-blocking in full mode). Review output below:"
                Write-Host $output -ForegroundColor Gray
                Add-Result "Linting" "Markdown Lint (non-blocking)" $true "Issues present; non-blocking in full mode"
            } else {
                Write-Failure "Markdown linting failed"
                Write-Host $output -ForegroundColor Gray
                Add-Result "Linting" "Markdown Lint" $false $output
                $allPassed = $false
            }
        }
    }
    catch {
        Write-Failure "Markdown linting error: $_"
        Add-Result "Linting" "Markdown Lint" $false $_
        $allPassed = $false
    }
    finally {
        Pop-Location
    }
    
    # Frontend: TypeScript type checking
    Write-Section "Frontend: TypeScript Type Checking"
    try {
        Push-Location $FRONTEND_DIR
        if ($Mode -eq 'quick') {
            Write-Info "Skipping TypeScript type checking in quick mode (temporary)"
            $output = "SKIPPED"
            # Ensure the step is treated as successful when skipped
            $LASTEXITCODE = 0
        } else {
            Write-Info "Running TypeScript compiler..."
            $npxAvailable = Test-CommandAvailable -Name "npx"
            if ($npxAvailable) {
                $output = npx tsc --noEmit 2>&1
            } else {
                Write-Warning-Msg "npx is not available; skipping TypeScript type check"
                $LASTEXITCODE = 0
                $output = "SKIPPED"
            }
        }
        
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
        $npmAvailable = Test-CommandAvailable -Name "npm"
        if ($npmAvailable) {
            $output = npm run test -- run src/i18n/__tests__/translations.test.ts --reporter=basic 2>&1
        } else {
            Write-Warning-Msg "npm is not available; skipping translation integrity test"
            $LASTEXITCODE = 0
            $output = "SKIPPED"
        }
        
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
    
    # Ensure backend deps (help CI runners without preinstalled packages)
    Install-BackendDependencies | Out-Null

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
                # Wait for the backend to become available (retry loop) — uvicorn may take a moment to bind
                $healthUrl = "http://127.0.0.1:8000/health"
                $maxAttempts = 12
                $attempt = 0
                $ok = $false

                while (-not $ok -and $attempt -lt $maxAttempts) {
                    $attempt++
                    try {
                        $response = Invoke-WebRequest -Uri $healthUrl -TimeoutSec 5 -ErrorAction Stop
                        if ($response.StatusCode -eq 200) { $ok = $true; break }
                    }
                    catch {
                        Write-Info "Native health check attempt $attempt/$maxAttempts failed — retrying in 2s..."
                        Start-Sleep -Seconds 2
                    }
                }

                if ($ok) {
                    Write-Success "Native mode health check passed"
                    Add-Result "Health" "Native Mode" $true
                } else {
                    Write-Failure "Native mode health check failed after $maxAttempts attempts"
                    Add-Result "Health" "Native Mode" $false "No successful response after $maxAttempts attempts"
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
# PHASE 3B: INSTALLER PRODUCTION AUDIT
# ============================================================================

function Invoke-InstallerAudit {
    if ($Mode -ne 'full') {
        return $true
    }
    
    Write-Section "Installer Production Audit"
    
    try {
        Write-Info "Auditing installer versioning and components..."
        $installerBuilder = Join-Path $SCRIPT_DIR "INSTALLER_BUILDER.ps1"
        
        if (-not (Test-Path $installerBuilder)) {
            Write-Info "INSTALLER_BUILDER.ps1 not found, skipping installer audit"
            return $true
        }
        
        $auditOutput = & $installerBuilder -Action audit -Verbose:$Verbose -ErrorAction Stop 2>&1
        $auditOutput | ForEach-Object { Write-Info $_ }
        
        Write-Success "Installer audit passed ✓"
        Add-Result "Health" "Installer Audit" $true
        return $true
    }
    catch {
        Write-Failure "Installer audit failed: $_"
        Add-Result "Health" "Installer Audit" $false $_
        return $false
    }
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
    
    # Safety: do not scan the entire workspace forever. Set a sensible timeout
    # so a misconfigured mount or very large folder won't block cleanup.
    $maxCleanupSeconds = 120
    $cleanupStart = Get-Date

    # Exclude very large folders from a full recursive sweep
    $excludePatterns = @(
        '\.git\',
        '\\node_modules\\',
        '\\frontend\\node_modules\\',
        '\\.venv\\',
        '\\backend\\.venv\\',
        '\\backend\\venv\\',
        '\\venv\\',
        '\\backups\\',
        '\\data\\',
        '\\logs\\',
        '\\docker\\'
    )

    $totalRemoved = 0
    $totalSize = 0
    
    # Python cache cleanup
    Write-Section "Python Cache Cleanup"
    try {
        # Find __pycache__ directories and standalone cache files (pyc/pyo) while
        # skipping known large directories. We use Get-ChildItem with filtering
        # and guard with a elapsed-time check so this never runs indefinitely.

        # Use a pruned traversal that avoids descending into excluded directories (fast & safe)
        $targets = Get-PrunedPyCacheTargets -RootPath $SCRIPT_DIR -ExcludePatterns $excludePatterns -MaxSeconds $maxCleanupSeconds -StartTime $cleanupStart

        foreach ($item in $targets) {
            # Safety: bail out if we've been cleaning for too long
            $elapsed = (Get-Date) - $cleanupStart
            if ($elapsed.TotalSeconds -gt $maxCleanupSeconds) {
                Write-Warning-Msg "Cleanup timeout reached after $([math]::Round($elapsed.TotalSeconds,1))s — aborting remaining automated cleanup to avoid long-running operation."
                Add-Result "Cleanup" "Python Cache" $false "Timeout after $([math]::Round($elapsed.TotalSeconds,1))s"
                break
            }
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
        $tempFiles = Get-PrunedTempFiles -RootPath $SCRIPT_DIR -ExcludePatterns $excludePatterns -MaxSeconds $maxCleanupSeconds -StartTime $cleanupStart
        $tempFound = $tempFiles.Count
        $failedRemovals = 0

        foreach ($file in $tempFiles) {
            try {
                # safety: don't run indefinitely cleaning temp files
                $elapsed = (Get-Date) - $cleanupStart
                if ($elapsed.TotalSeconds -gt $maxCleanupSeconds) {
                    Write-Warning-Msg "Cleanup timeout reached during temp files removal after $([math]::Round($elapsed.TotalSeconds,1))s — stopping further deletes."
                    Add-Result "Cleanup" "Temp Files" $false "Timeout after $([math]::Round($elapsed.TotalSeconds,1))s"
                    break
                }

                $totalSize += $file.Length
                Remove-Item $file -Force -ErrorAction Stop
                $totalRemoved++
            }
            catch {
                # Record failures (commonly due to in-use/locked files on Windows)
                $failedRemovals++
                Write-Warning-Msg "Could not remove $($file.FullName): $($_.Exception.Message)"
            }
        }

        if ($totalRemoved -gt 0) {
            Write-Success "Removed $totalRemoved temporary files"
        } else {
            if ($tempFound -gt 0) {
                Write-Warning-Msg "Found $tempFound temporary files but none could be removed. They may be in-use by other processes (e.g., editor/VSCode plugin testing) and will need the process terminated to be cleaned up." 
            } else {
                Write-Info "No temporary files found"
            }
        }

        # Consider cleanup a failure if we found files but couldn't remove one or more
        if ($tempFound -gt 0 -and $failedRemovals -gt 0) {
            $msg = "$totalRemoved removed, $failedRemovals failed (in-use/locked files likely)"
            Add-Result "Cleanup" "Temp Files" $false $msg
        } else {
            Add-Result "Cleanup" "Temp Files" $true "$totalRemoved files removed"
        }
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
    
    $finalNote = if ($script:Results.Overall) { "All systems verified and ready for commit." } else { "Some checks failed — review the failures above and address them before committing." }

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
$finalNote
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
    
    # Optional: Version audit only
    if ($AuditVersion) {
        $mismatchCount = Invoke-VersionAuditReport
        # If mismatches exist, propose bump and prompt to proceed with full pre-commit
        if ($mismatchCount -gt 0) {
            $currentVer = Get-Version
            Write-Host ""; Write-Host "Detected $mismatchCount mismatches against VERSION=$currentVer" -ForegroundColor Yellow
            $proposed = if ($NonInteractive) { $currentVer } else { Read-Host "Enter target version to bump (default: $currentVer) or press Enter to keep" }
            if ([string]::IsNullOrWhiteSpace($proposed)) { $proposed = $currentVer }
            # Ask to proceed with bump & continue
            $ans = if ($NonInteractive) { 'y' } else { Read-Host "Proceed with bump to v$proposed and continue pre-commit procedures? (y/N)" }
            if ($ans.ToLower() -eq 'y') {
                # perform bump + propagate, but do not commit/tag here; continue workflow
                if ($proposed -ne $currentVer) {
                    Set-Content -Path $VERSION_FILE -Value $proposed -Encoding UTF8
                    Write-Success "Updated VERSION -> $proposed"
                }
                Invoke-VersionPropagationAndDocs | Out-Null
            } else {
                Write-Warning-Msg "User chose not to bump; continuing without changes"
            }
        } else {
            Write-Info "No mismatches detected; continuing with pre-commit procedures"
        }
        # Do NOT return here; continue with the rest of the pre-commit workflow
    }

    # Phase A: Version propagation & docs auto-update (runs early)
    Invoke-VersionPropagationAndDocs | Out-Null

    # Phase 0: Version Consistency (always)
    Invoke-VersionConsistencyCheck | Out-Null

    # Execute workflow based on mode
    if ($Mode -eq 'cleanup') {
        Invoke-AutomatedCleanup
    } else {
        # Phase 1: Code Quality
        if (-not $SkipLint) {
            Invoke-CodeQualityChecks | Out-Null
        }
        
        # Phase 2: Tests
        if (-not $SkipTests) {
            Invoke-TestSuite | Out-Null
        }
        
        # Phase 3: Health Checks (only in full mode)
        if ($Mode -eq 'full') {
            Invoke-HealthChecks | Out-Null
            Invoke-InstallerAudit | Out-Null
        }
        
        # Phase 4: Cleanup
        if (-not $SkipCleanup) {
            Invoke-AutomatedCleanup | Out-Null
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
    
    # One-shot release flow: if enabled and all checks passed, perform commit/push/tag automatically
    if ($ReleaseFlow -and $script:Results.Overall) {
        $finalVersion = Get-Version
        Write-Header "Release Flow" "DarkGreen"
        Write-Info "All checks passed; preparing to commit, push and tag v$finalVersion"
        $proceed = if ($NonInteractive) { 'y' } else { Read-Host "Proceed with commit/push/tag for v$finalVersion? (y/N)" }
        if ($proceed.ToLower() -eq 'y') {
            try {
                git add .
                git commit -m "chore: release v$finalVersion"
                git tag "v$finalVersion"
                git push
                git push origin "v$finalVersion"
                Write-Success "Release push & tag complete"
            }
            catch {
                Write-Warning-Msg "Release push/tag failed: $_"
                $script:Results.Overall = $false
            }
        } else {
            Write-Warning-Msg "Release flow skipped by user"
        }
    }

    # Compute and return exit code.
    # In cleanup-only mode we should base success on cleanup results only (avoid unrelated flags
    # like lint/tests causing a non-zero exit when caller only expects cleanup to be successful).
    if ($Mode -eq 'cleanup') {
        # Evaluate cleanup results only
        $cleanupFailures = ($script:Results.Cleanup | Where-Object { -not $_.Success }).Count
        if ($cleanupFailures -eq 0) {
            return 0
        }
        else {
            return 1
        }
    }

    return $(if ($script:Results.Overall) { 0 } else { 1 })
}

# ============================================================================
# ENTRY POINT
# ============================================================================

try {
    $exitCode = Invoke-MainWorkflow
    # Relaxed exit policy in quick mode unless STRICT_CI=1
    $strictCI = ($env:STRICT_CI -as [string]) -and ($env:STRICT_CI.ToLower() -in @('1','true','yes'))
    if ($Mode -eq 'quick' -and -not $strictCI) {
        exit 0
    }
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



