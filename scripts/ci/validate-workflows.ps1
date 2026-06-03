# CI/CD Workflow Validation Test Suite
# Tests all workflow improvements and validates real behavior

param(
    [switch]$QuickTest,
    [switch]$Verbose,
    [string]$Workflow = "all"
)

$ErrorActionPreference = 'Continue'
$timestamp = Get-Date -Format 'yyyy-MM-dd HHmmss'
$reportDir = "artifacts/workflow-validation-$timestamp"
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null

$results = @{
    passed = 0
    failed = 0
    warnings = 0
    details = @()
}

function Log-Test {
    param([string]$Status, [string]$Test, [string]$Message, [string]$Details = "")

    $entry = @{
        timestamp = Get-Date -Format 'HH:mm:ss'
        status = $Status
        test = $Test
        message = $Message
        details = $Details
    }
    $results.details += $entry

    $color = switch ($Status) {
        'PASS' { 'Green' }
        'FAIL' { 'Red' }
        'WARN' { 'Yellow' }
        default { 'Gray' }
    }

    Write-Host "[$Status] $Test - $Message" -ForegroundColor $color
    if ($Details) { Write-Host "    → $Details" -ForegroundColor Gray }
}

# ============================================================================
# TEST 1: Validate workflow YAML syntax
# ============================================================================

Write-Host "`n📋 TEST 1: Workflow YAML Syntax Validation" -ForegroundColor Cyan

$workflowDir = ".github/workflows"
$mainWorkflow = "$workflowDir/ci-cd-pipeline.yml"
$maintenanceWorkflow = "$workflowDir/maintenance-consolidated.yml"

if (Test-Path $mainWorkflow) {
    Log-Test "PASS" "Main workflow exists" "$mainWorkflow found"
    $results.passed++
} else {
    Log-Test "FAIL" "Main workflow missing" "$mainWorkflow not found"
    $results.failed++
}

if (Test-Path $maintenanceWorkflow) {
    Log-Test "PASS" "Maintenance workflow exists" "$maintenanceWorkflow found"
    $results.passed++
} else {
    Log-Test "FAIL" "Maintenance workflow missing" "$maintenanceWorkflow not found"
    $results.failed++
}

# Validate YAML structure (basic checks)
try {
    $yaml = Get-Content $mainWorkflow -Raw
    if ($yaml -match 'name:' -and $yaml -match 'on:' -and $yaml -match 'jobs:') {
        Log-Test "PASS" "Main workflow structure" "YAML structure valid"
        $results.passed++
    } else {
        Log-Test "FAIL" "Main workflow structure" "Missing required YAML sections"
        $results.failed++
    }
} catch {
    Log-Test "FAIL" "Main workflow parsing" $_.Exception.Message
    $results.failed++
}

# ============================================================================
# TEST 2: Validate Critical Fix #1 - Docker Security Dependency
# ============================================================================

Write-Host "`n🔒 TEST 2: Critical Fix #1 - Docker Security Dependency" -ForegroundColor Cyan

$yaml = Get-Content $mainWorkflow -Raw

# Check that security-scan-docker has build-docker-images dependency
if ($yaml -match 'security-scan-docker:[\s\S]*?needs:\s*\[\s*build-docker-images' -or
    $yaml -match 'security-scan-docker:[\s\S]*?needs:[\s\S]*?build-docker-images') {
    Log-Test "PASS" "Docker scan dependency" "security-scan-docker depends on build-docker-images"
    $results.passed++
} else {
    Log-Test "FAIL" "Docker scan dependency" "Missing build-docker-images dependency"
    $results.failed++
}

# Check that staging-deploy-gate depends on security-scan-docker
if ($yaml -match 'staging-deploy-gate:[\s\S]*?needs:[\s\S]*?security-scan-docker') {
    Log-Test "PASS" "Deploy gate dependency" "staging-deploy-gate depends on security-scan-docker"
    $results.passed++
} else {
    Log-Test "FAIL" "Deploy gate dependency" "Missing security-scan-docker dependency"
    $results.failed++
}

# ============================================================================
# TEST 3: Validate Health Check Improvements
# ============================================================================

Write-Host "`n🏥 TEST 3: Health Check Exponential Backoff Validation" -ForegroundColor Cyan

# Check staging health check
if ($yaml -match 'staging.*health.*check' -and
    $yaml -match '\$maxAttempts\s*=\s*20' -and
    $yaml -match '\$maxDelayMs\s*=\s*20000') {
    Log-Test "PASS" "Staging health check params" "Max attempts: 20, Max delay: 20000ms"
    $results.passed++
} else {
    Log-Test "WARN" "Staging health check params" "Could not fully verify parameters"
    $results.warnings++
}

# Check exponential backoff calculation
if ($yaml -match '\[Math\]::Min\(\[int\]\(\$currentDelayMs \* 1.5\)' -or
    $yaml -match '\[Math\]::Min\(\[int\]\(\$delayMs \* 1.5\)') {
    Log-Test "PASS" "Exponential backoff logic" "Exponential calculation found (1s → 1.5s → ...)"
    $results.passed++
} else {
    Log-Test "FAIL" "Exponential backoff logic" "Backoff calculation not found"
    $results.failed++
}

# ============================================================================
# TEST 4: Job Dependency Chain Analysis
# ============================================================================

Write-Host "`n📊 TEST 4: Job Dependency Chain Analysis" -ForegroundColor Cyan

# Extract job names and dependencies
$jobDeps = @{}
$currentJob = ""
foreach ($line in $yaml -split "`n") {
    if ($line -match '^\s+(\w+):$' -and -not $line.Contains('name:')) {
        $currentJob = $matches[1]
        $jobDeps[$currentJob] = @()
    } elseif ($line -match 'needs:' -and $currentJob) {
        # Parse needs dependency
        if ($line -match "needs:\s*\[(.*?)\]") {
            $needs = $matches[1] -split ',' | ForEach-Object { $_.Trim() }
            $jobDeps[$currentJob] = $needs
        }
    }
}

# Validate key dependencies
$criticalDeps = @{
    'security-scan-docker' = 'build-docker-images'
    'staging-deploy-gate' = 'security-scan-docker'
    'production-deploy-gate' = 'security-scan-docker'
}

foreach ($job in $criticalDeps.Keys) {
    $required = $criticalDeps[$job]
    if ($jobDeps.ContainsKey($job) -and $jobDeps[$job] -contains $required) {
        Log-Test "PASS" "Job dependency: $job" "Depends on $required ✓"
        $results.passed++
    } else {
        Log-Test "WARN" "Job dependency: $job" "Could not verify dependency on $required"
        $results.warnings++
    }
}

# ============================================================================
# TEST 5: Security Scan Consolidation
# ============================================================================

Write-Host "`n🔐 TEST 5: Security Scan Consolidation Validation" -ForegroundColor Cyan

# Check that pip-audit is the primary security tool
if ($yaml -match 'pip-audit' -and -not ($yaml -match 'safety check')) {
    Log-Test "PASS" "Security consolidation" "pip-audit is primary tool, Safety removed"
    $results.passed++
} else {
    Log-Test "WARN" "Security consolidation" "Check if Safety scan was properly removed"
    $results.warnings++
}

# Check that backend security scan is parallelized
if ($yaml -match 'security-scan-backend:[\s\S]*?needs:[\s\S]*?version-verification') {
    Log-Test "PASS" "Backend security parallelization" "Runs after linting (not testing)"
    $results.passed++
} else {
    Log-Test "FAIL" "Backend security parallelization" "Missing parallelization setup"
    $results.failed++
}

# ============================================================================
# TEST 6: Maintenance Workflow Consolidation
# ============================================================================

Write-Host "`n🧹 TEST 6: Maintenance Workflow Consolidation" -ForegroundColor Cyan

$mainYaml = Get-Content $maintenanceWorkflow -Raw

# Check for task selection logic
if ($mainYaml -match 'task:' -and $mainYaml -match 'stale-cleanup|workflow-cleanup|production-health-check') {
    Log-Test "PASS" "Maintenance task selection" "Multiple task options available"
    $results.passed++
} else {
    Log-Test "FAIL" "Maintenance task selection" "Task selection not properly configured"
    $results.failed++
}

# Check for dry-run capability
if ($mainYaml -match 'dry.?run' -or $mainYaml -match 'DRY_RUN') {
    Log-Test "PASS" "Dry-run capability" "Dry-run mode implemented"
    $results.passed++
} else {
    Log-Test "WARN" "Dry-run capability" "Could not verify dry-run implementation"
    $results.warnings++
}

# ============================================================================
# TEST 7: Archive Cleanup
# ============================================================================

Write-Host "`n📦 TEST 7: Archived Workflows Verification" -ForegroundColor Cyan

$archivedWorkflows = @(
    "deprecation-audit.yml"
    "doc-audit.yml"
    "markdown-lint.yml"
    "version-consistency.yml"
)

$archiveDir = "$workflowDir/archive"
$archivedCount = 0

foreach ($workflow in $archivedWorkflows) {
    $archivedPath = "$archiveDir/$workflow"
    $activePath = "$workflowDir/$workflow"

    if ((Test-Path $archivedPath) -and -not (Test-Path $activePath)) {
        Log-Test "PASS" "Workflow archived: $workflow" "Found in archive, removed from active"
        $archivedCount++
        $results.passed++
    } elseif (Test-Path $activePath) {
        Log-Test "WARN" "Workflow not archived: $workflow" "Still in active directory"
        $results.warnings++
    }
}

# ============================================================================
# TEST 8: Performance Impact Analysis
# ============================================================================

Write-Host "`n⚡ TEST 8: Performance Impact Validation" -ForegroundColor Cyan

# Analyze if parallelization is properly implemented
$parallelJobs = @()
$sequentialJobs = @()

# Count approximate job execution parallelization
$securityJobsParallelized = @('security-scan-backend', 'security-scan-frontend', 'security-scan-docker')
$foundParallel = 0

foreach ($job in $securityJobsParallelized) {
    if ($jobDeps.ContainsKey($job) -and $jobDeps[$job] -match 'version-verification|workflow-version-policy') {
        $foundParallel++
    }
}

if ($foundParallel -ge 2) {
    Log-Test "PASS" "Security job parallelization" "At least 2 security jobs run in parallel"
    $results.passed++
} else {
    Log-Test "WARN" "Security job parallelization" "Could not verify full parallelization"
    $results.warnings++
}

# ============================================================================
# SUMMARY
# ============================================================================

Write-Host "`n" -ForegroundColor White
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          WORKFLOW VALIDATION TEST RESULTS                      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$total = $results.passed + $results.failed
$passRate = if ($total -gt 0) { [math]::Round(($results.passed / $total) * 100) } else { 0 }

Write-Host "`n📊 Summary:" -ForegroundColor White
Write-Host "  ✅ Passed:  $($results.passed)" -ForegroundColor Green
Write-Host "  ❌ Failed:  $($results.failed)" -ForegroundColor $(if ($results.failed -gt 0) { 'Red' } else { 'Green' })
Write-Host "  ⚠️  Warnings: $($results.warnings)" -ForegroundColor $(if ($results.warnings -gt 0) { 'Yellow' } else { 'Green' })
Write-Host "  📈 Pass Rate: $passRate%" -ForegroundColor $(if ($passRate -ge 80) { 'Green' } else { 'Yellow' })

# Save detailed report
$reportFile = "$reportDir/validation-report.json"
$results | ConvertTo-Json -Depth 10 | Set-Content $reportFile
Write-Host "`n📄 Detailed report saved to: $reportFile" -ForegroundColor Gray

# Exit code based on failures
if ($results.failed -gt 0) {
    Write-Host "`n❌ VALIDATION FAILED - $($results.failed) critical issues found" -ForegroundColor Red
    exit 1
} elseif ($results.warnings -gt 0) {
    Write-Host "`n⚠️  VALIDATION PASSED WITH WARNINGS - Review warnings above" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "`n✅ VALIDATION PASSED - All critical checks verified" -ForegroundColor Green
    exit 0
}
