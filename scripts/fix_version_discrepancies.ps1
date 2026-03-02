# Script to automatically fix version discrepancies across the project
# Reads the source of truth from the VERSION file

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$VersionFile = Join-Path $RootDir "VERSION"

if (-not (Test-Path $VersionFile)) {
    Write-Error "VERSION file not found at $VersionFile"
    exit 1
}

$CurrentVersion = (Get-Content $VersionFile).Trim()
$CurrentVersionCore = ($CurrentVersion -replace '^v', '')
Write-Host "Target Version: $CurrentVersion" -ForegroundColor Cyan

function Update-FileContent {
    param (
        [string]$Path,
        [string]$Pattern,
        [string]$Replacement
    )
    if (Test-Path $Path) {
        $content = Get-Content $Path -Raw
        if ($content -match $Pattern) {
            $newContent = $content -replace $Pattern, $Replacement
            if ($newContent -ne $content) {
                Set-Content -Path $Path -Value $newContent -Encoding UTF8
                Write-Host "Updated $Path" -ForegroundColor Green
            }
        }
    }
}

# 1. Frontend package.json
$PackageJsonPath = Join-Path $RootDir "frontend\package.json"
if (Test-Path $PackageJsonPath) {
    $pkg = Get-Content $PackageJsonPath -Raw | ConvertFrom-Json
    if ($pkg.version -ne $CurrentVersionCore) {
        $pkg.version = $CurrentVersionCore
        $pkg | ConvertTo-Json -Depth 10 | Set-Content $PackageJsonPath
        Write-Host "Updated frontend/package.json" -ForegroundColor Green
    }
}

# 2. COMMIT_READY.ps1
Update-FileContent (Join-Path $RootDir "COMMIT_READY.ps1") "Version: \d+\.\d+\.\d+" "Version: $CurrentVersionCore"

# 3. RUN_TESTS_BATCH.ps1
Update-FileContent (Join-Path $RootDir "RUN_TESTS_BATCH.ps1") "SMS v\d+\.\d+\.\d+" "SMS v$CurrentVersionCore"

# 4. Copilot Instructions
$CopilotDocs = Join-Path $RootDir ".github\copilot-instructions.md"
Update-FileContent $CopilotDocs "\*\*Version\*\*: v\d+\.\d+\.\d+" "**Version**: v$CurrentVersionCore"
Update-FileContent $CopilotDocs "\*\*Current Version\*\*: v\d+\.\d+\.\d+" "**Current Version**: v$CurrentVersionCore"
Update-FileContent $CopilotDocs "\(current: \d+\.\d+\.\d+\)" "(current: $CurrentVersionCore)"

# 5. Agent Policy Enforcement
Update-FileContent (Join-Path $RootDir "docs\AGENT_POLICY_ENFORCEMENT.md") "\(current: \d+\.\d+\.\d+\)" "(current: $CurrentVersionCore)"

# 6. Unified Work Plan
Update-FileContent (Join-Path $RootDir "docs\plans\UNIFIED_WORK_PLAN.md") "\*\*Current Version\*\*: \d+\.\d+\.\d+" "**Current Version**: $CurrentVersionCore"

# 7. Agent Quick Start
$QuickStart = Join-Path $RootDir "docs\AGENT_QUICK_START.md"
Update-FileContent $QuickStart "RELEASE_NOTES_v\d+\.\d+\.\d+" "RELEASE_NOTES_v$CurrentVersionCore"
Update-FileContent $QuickStart "tag/v\d+\.\d+\.\d+" "tag/v$CurrentVersionCore"

Write-Host "Version synchronization complete." -ForegroundColor Cyan
