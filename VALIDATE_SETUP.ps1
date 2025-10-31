<#
.SYNOPSIS
  Validates system setup and diagnoses common issues

.DESCRIPTION
  Checks prerequisites for running the Student Management System:
  - PowerShell version and execution policy
  - Python installation and version
  - Node.js installation and version
  - Docker Desktop status
  - PATH configuration
  - File permissions
  - Antivirus interference

.EXAMPLE
  .\VALIDATE_SETUP.ps1
  Run full validation and show recommendations

.EXAMPLE
  .\VALIDATE_SETUP.ps1 -Fix
  Attempt to fix common issues automatically
#>

param(
    [switch]$Fix,
    [switch]$Verbose
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'  # Continue on errors to show all issues

$script:issues = @()
$script:warnings = @()
$script:fixes = @()

function Write-Header {
    param([string]$Text)
    Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  $($Text.PadRight(60)) ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
}

function Write-Check {
    param([string]$Name, [string]$Status, [string]$Message = "")
    $color = switch ($Status) {
        "OK" { "Green" }
        "WARN" { "Yellow" }
        "FAIL" { "Red" }
        default { "White" }
    }
    
    $symbol = switch ($Status) {
        "OK" { "✓" }
        "WARN" { "⚠" }
        "FAIL" { "✗" }
        default { "•" }
    }
    
    Write-Host "  $symbol " -NoNewline -ForegroundColor $color
    Write-Host "$Name " -NoNewline
    if ($Message) {
        Write-Host "- $Message" -ForegroundColor Gray
    } else {
        Write-Host ""
    }
}

function Test-Command {
    param([string]$Command)
    try {
        $null = Get-Command $Command -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# ============================================================================
# 1. PowerShell Environment Check
# ============================================================================
Write-Header "PowerShell Environment"

$psVersion = $PSVersionTable.PSVersion
Write-Check "PowerShell Version" "OK" "$($psVersion.Major).$($psVersion.Minor).$($psVersion.Patch)"

if ($psVersion.Major -lt 5) {
    Write-Check "PowerShell Version Check" "FAIL" "PowerShell 5.1+ required"
    $script:issues += "PowerShell version too old. Install PowerShell 7+: https://aka.ms/powershell"
} elseif ($psVersion.Major -eq 5) {
    Write-Check "PowerShell Version Check" "WARN" "Consider upgrading to PowerShell 7+"
    $script:warnings += "PowerShell 7+ recommended for better performance"
}

# Check for pwsh (PowerShell 7+)
if (Test-Command "pwsh") {
    $pwshVersion = (pwsh -Command '$PSVersionTable.PSVersion.ToString()' 2>$null)
    Write-Check "PowerShell 7+ (pwsh)" "OK" "Version $pwshVersion available"
} else {
    Write-Check "PowerShell 7+ (pwsh)" "WARN" "Not installed (optional but recommended)"
    $script:warnings += "Install PowerShell 7+ for best experience: https://aka.ms/powershell"
}

# Execution Policy
$execPolicy = Get-ExecutionPolicy -Scope CurrentUser
Write-Check "Execution Policy" $(if ($execPolicy -in @('RemoteSigned','Unrestricted','Bypass')) { "OK" } else { "WARN" }) "$execPolicy"

if ($execPolicy -eq 'Restricted') {
    $script:issues += "Execution Policy is Restricted. Scripts will fail to run."
    if ($Fix) {
        try {
            Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
            Write-Check "  → Fixed Execution Policy" "OK" "Set to RemoteSigned"
            $script:fixes += "Changed Execution Policy to RemoteSigned"
        } catch {
            Write-Check "  → Fix Failed" "FAIL" $_.Exception.Message
        }
    } else {
        Write-Host "    → Run with -Fix to change to RemoteSigned" -ForegroundColor Yellow
    }
}

# ============================================================================
# 2. Python Check
# ============================================================================
Write-Header "Python Environment"

$pythonFound = $false
$pythonCommands = @('python', 'python3', 'py')

foreach ($cmd in $pythonCommands) {
    if (Test-Command $cmd) {
        try {
            $pyVersion = & $cmd --version 2>&1 | Out-String
            if ($pyVersion -match '(\d+\.\d+\.\d+)') {
                $version = $matches[1]
                $versionParts = $version -split '\.'
                $major = [int]$versionParts[0]
                $minor = [int]$versionParts[1]
                
                if ($major -eq 3 -and $minor -ge 11) {
                    Write-Check "Python ($cmd)" "OK" "Version $version"
                    $pythonFound = $true
                    break
                } elseif ($major -eq 3 -and $minor -ge 8) {
                    Write-Check "Python ($cmd)" "WARN" "Version $version (3.11+ recommended)"
                    $script:warnings += "Python 3.11+ recommended for best compatibility"
                    $pythonFound = $true
                    break
                } else {
                    Write-Check "Python ($cmd)" "FAIL" "Version $version too old"
                }
            }
        } catch {
            Write-Check "Python ($cmd)" "FAIL" "Error checking version"
        }
    }
}

if (-not $pythonFound) {
    Write-Check "Python 3.11+" "FAIL" "Not found in PATH"
    $script:issues += "Python 3.11+ not found. Install from: https://www.python.org/downloads/"
    $script:issues += "  → Make sure to check 'Add Python to PATH' during installation"
}

# Check pip
if ($pythonFound -and (Test-Command "pip")) {
    $pipVersion = pip --version 2>&1 | Out-String
    if ($pipVersion -match '(\d+\.\d+\.\d+)') {
        Write-Check "pip" "OK" "Version $($matches[1])"
    }
} elseif ($pythonFound) {
    Write-Check "pip" "WARN" "Not found (may need python -m pip)"
}

# ============================================================================
# 3. Node.js Check
# ============================================================================
Write-Header "Node.js Environment"

if (Test-Command "node") {
    $nodeVersion = node --version 2>&1
    if ($nodeVersion -match 'v(\d+)\.') {
        $nodeMajor = [int]$matches[1]
        if ($nodeMajor -ge 18) {
            Write-Check "Node.js" "OK" "Version $nodeVersion"
        } elseif ($nodeMajor -ge 16) {
            Write-Check "Node.js" "WARN" "Version $nodeVersion (18+ recommended)"
            $script:warnings += "Node.js 18+ recommended for best compatibility"
        } else {
            Write-Check "Node.js" "FAIL" "Version $nodeVersion too old"
            $script:issues += "Node.js 18+ required. Install from: https://nodejs.org/"
        }
    }
} else {
    Write-Check "Node.js" "WARN" "Not found (required for native mode)"
    $script:warnings += "Node.js 18+ needed for native development mode"
}

# Check npm
if (Test-Command "npm") {
    $npmVersion = npm --version 2>&1
    Write-Check "npm" "OK" "Version $npmVersion"
} elseif (Test-Command "node") {
    Write-Check "npm" "FAIL" "Not found (should come with Node.js)"
}

# ============================================================================
# 4. Docker Check
# ============================================================================
Write-Header "Docker Environment"

if (Test-Command "docker") {
    try {
        $dockerVersion = docker --version 2>&1 | Out-String
        Write-Check "Docker CLI" "OK" "$($dockerVersion.Trim())"
        
        # Check if Docker daemon is running
        $dockerInfo = docker info 2>&1 | Out-String
        if ($LASTEXITCODE -eq 0) {
            Write-Check "Docker Daemon" "OK" "Running"
            
            # Check docker compose
            if (Test-Command "docker") {
                $composeTest = docker compose version 2>&1 | Out-String
                if ($LASTEXITCODE -eq 0) {
                    Write-Check "Docker Compose" "OK" "Available (modern syntax)"
                } else {
                    # Try legacy docker-compose
                    if (Test-Command "docker-compose") {
                        Write-Check "Docker Compose" "WARN" "Legacy docker-compose found"
                        $script:warnings += "Consider updating to modern 'docker compose' syntax"
                    } else {
                        Write-Check "Docker Compose" "FAIL" "Not available"
                    }
                }
            }
        } else {
            Write-Check "Docker Daemon" "FAIL" "Not running"
            $script:issues += "Docker Desktop is not running. Start Docker Desktop from the Start Menu."
        }
    } catch {
        Write-Check "Docker" "FAIL" "Error checking Docker: $($_.Exception.Message)"
    }
} else {
    Write-Check "Docker" "WARN" "Not installed (optional for Docker mode)"
    $script:warnings += "Docker Desktop recommended for easiest deployment: https://www.docker.com/products/docker-desktop/"
}

# ============================================================================
# 5. Project Structure Check
# ============================================================================
Write-Header "Project Structure"

$requiredFiles = @(
    "QUICKSTART.ps1",
    "SMS.ps1",
    "backend/main.py",
    "backend/requirements.txt",
    "frontend/package.json",
    "docker-compose.yml"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    $fullPath = Join-Path $PSScriptRoot $file
    if (Test-Path $fullPath) {
        Write-Check $file "OK" "Found"
    } else {
        Write-Check $file "FAIL" "Missing"
        $script:issues += "Required file missing: $file"
        $allFilesExist = $false
    }
}

# ============================================================================
# 6. Permissions Check
# ============================================================================
Write-Header "Permissions & Security"

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
    Write-Check "Administrator Rights" "OK" "Running as Administrator"
} else {
    Write-Check "Administrator Rights" "WARN" "Not running as Administrator"
    $script:warnings += "Docker mode may require Administrator rights"
}

# Check write permissions
try {
    $testFile = Join-Path $PSScriptRoot "test_write_permission.tmp"
    "test" | Out-File $testFile -ErrorAction Stop
    Remove-Item $testFile -ErrorAction Stop
    Write-Check "Write Permissions" "OK" "Can write to project directory"
} catch {
    Write-Check "Write Permissions" "FAIL" "Cannot write to project directory"
    $script:issues += "No write permission to project directory. Check folder permissions."
}

# ============================================================================
# 7. Network Check
# ============================================================================
Write-Header "Network Connectivity"

$ports = @(8080, 8000, 5173)
$portsInUse = @()

foreach ($port in $ports) {
    $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($listener) {
        Write-Check "Port $port" "WARN" "Already in use by PID $($listener[0].OwningProcess)"
        $portsInUse += $port
    } else {
        Write-Check "Port $port" "OK" "Available"
    }
}

if ($portsInUse.Count -gt 0) {
    $script:warnings += "Ports in use: $($portsInUse -join ', '). May need to stop conflicting services."
}

# ============================================================================
# Summary
# ============================================================================
Write-Header "Validation Summary"

$totalChecks = 20
$issueCount = $script:issues.Count
$warningCount = $script:warnings.Count

Write-Host ""
if ($issueCount -eq 0 -and $warningCount -eq 0) {
    Write-Host "  ✓ All checks passed! System ready to run." -ForegroundColor Green
    Write-Host "  → Run: .\QUICKSTART.ps1" -ForegroundColor Cyan
} elseif ($issueCount -eq 0) {
    Write-Host "  ⚠ $warningCount warning(s) found, but system can run" -ForegroundColor Yellow
    Write-Host "  → Run: .\QUICKSTART.ps1" -ForegroundColor Cyan
} else {
    Write-Host "  ✗ $issueCount critical issue(s) found" -ForegroundColor Red
    Write-Host "  → Fix issues below before running" -ForegroundColor Red
}

if ($script:issues.Count -gt 0) {
    Write-Host "`n  Critical Issues:" -ForegroundColor Red
    foreach ($issue in $script:issues) {
        Write-Host "    • $issue" -ForegroundColor Red
    }
}

if ($script:warnings.Count -gt 0) {
    Write-Host "`n  Warnings:" -ForegroundColor Yellow
    foreach ($warning in $script:warnings) {
        Write-Host "    • $warning" -ForegroundColor Yellow
    }
}

if ($script:fixes.Count -gt 0) {
    Write-Host "`n  Applied Fixes:" -ForegroundColor Green
    foreach ($fix in $script:fixes) {
        Write-Host "    • $fix" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Recommendation:" -ForegroundColor Cyan

if ($pythonFound -or (Test-Command "docker")) {
    if (Test-Command "docker") {
        $dockerInfo = docker info 2>&1 | Out-String
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  → Use Docker mode (easiest): .\QUICKSTART.ps1" -ForegroundColor Green
        } else {
            Write-Host "  → Start Docker Desktop, then: .\QUICKSTART.ps1" -ForegroundColor Yellow
        }
    } elseif ($pythonFound) {
        Write-Host "  → Use Native mode: .\QUICKSTART.ps1" -ForegroundColor Green
        Write-Host "    (Will use Python + Node.js)" -ForegroundColor Gray
    }
} else {
    Write-Host "  → Install Docker Desktop OR Python 3.11+ to continue" -ForegroundColor Red
}

Write-Host ""
Write-Host "For more help:" -ForegroundColor Cyan
Write-Host "  • Run with -Fix to auto-fix common issues" -ForegroundColor Gray
Write-Host "  • Check setup.log for detailed error messages" -ForegroundColor Gray
Write-Host "  • Read TROUBLESHOOTING.md for common solutions" -ForegroundColor Gray
Write-Host ""

# Exit with error code if critical issues found
if ($issueCount -gt 0) {
    exit 1
} else {
    exit 0
}
