[CmdletBinding()]
param(
    [string]$InstallDir = "C:\Program Files\SMS",
    [string]$OutputRoot = "$env:TEMP\sms-installer-diagnostics",
    [int]$ContainerLogTail = 1000,
    [switch]$IncludeDockerInfo
)

$ErrorActionPreference = 'Continue'
Set-StrictMode -Version Latest

function Write-Step {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function New-DirectorySafe {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        New-Item -Path $Path -ItemType Directory -Force | Out-Null
    }
}

function Save-Text {
    param(
        [string]$Path,
        [string]$Content
    )
    $dir = Split-Path -Parent $Path
    if ($dir) { New-DirectorySafe -Path $dir }
    Set-Content -Path $Path -Value $Content -Encoding UTF8
}

function Invoke-Capture {
    param(
        [string]$FilePath,
        [scriptblock]$Action
    )

    try {
        $result = & $Action 2>&1 | Out-String
        Save-Text -Path $FilePath -Content $result
    }
    catch {
        Save-Text -Path $FilePath -Content ("ERROR: " + $_.Exception.Message)
    }
}

function Copy-IfExists {
    param(
        [string]$Source,
        [string]$Destination
    )

    if (Test-Path $Source) {
        $destDir = Split-Path -Parent $Destination
        if ($destDir) { New-DirectorySafe -Path $destDir }
        Copy-Item -Path $Source -Destination $Destination -Force
        return $true
    }

    return $false
}

function Get-RedactedEnv {
    param([string]$EnvPath)

    if (-not (Test-Path $EnvPath)) {
        return "# File not found: $EnvPath"
    }

    $sensitiveKeys = @(
        'SECRET_KEY',
        'POSTGRES_PASSWORD',
        'DATABASE_URL',
        'DEFAULT_ADMIN_PASSWORD',
        'JWT_SECRET',
        'API_KEY',
        'TOKEN',
        'PASSWORD'
    )

    $lines = Get-Content -Path $EnvPath -ErrorAction SilentlyContinue
    $out = New-Object System.Collections.Generic.List[string]

    foreach ($line in $lines) {
        if ([string]::IsNullOrWhiteSpace($line) -or $line.TrimStart().StartsWith('#')) {
            $out.Add($line)
            continue
        }

        if ($line -notmatch '=') {
            $out.Add($line)
            continue
        }

        $parts = $line.Split('=', 2)
        $key = $parts[0].Trim()
        $value = if ($parts.Count -gt 1) { $parts[1] } else { '' }

        $isSensitive = $false
        foreach ($pattern in $sensitiveKeys) {
            if ($key -like "*$pattern*") {
                $isSensitive = $true
                break
            }
        }

        if ($isSensitive) {
            $out.Add("$key=***REDACTED***")
        }
        else {
            $out.Add("$key=$value")
        }
    }

    return ($out -join "`r`n")
}

function Get-DockerContainerList {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        return @()
    }

    $names = @()
    try {
        $rows = docker ps -a --format "{{.Names}}" 2>$null
        foreach ($r in $rows) {
            if (-not [string]::IsNullOrWhiteSpace($r)) {
                $names += $r.Trim()
            }
        }
    }
    catch {
        # ignore
    }

    return $names | Sort-Object -Unique
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$sessionDir = Join-Path $OutputRoot "installer_diag_$timestamp"
$hostDir = Join-Path $sessionDir "host"
$dockerDir = Join-Path $sessionDir "docker"
$installDirOut = Join-Path $sessionDir "install_dir"
$metaDir = Join-Path $sessionDir "meta"

New-DirectorySafe -Path $sessionDir
New-DirectorySafe -Path $hostDir
New-DirectorySafe -Path $dockerDir
New-DirectorySafe -Path $installDirOut
New-DirectorySafe -Path $metaDir

Write-Step "Collecting host environment details..."
Invoke-Capture -FilePath (Join-Path $hostDir "whoami.txt") -Action { whoami }
Invoke-Capture -FilePath (Join-Path $hostDir "hostname.txt") -Action { hostname }
Invoke-Capture -FilePath (Join-Path $hostDir "systeminfo.txt") -Action { systeminfo }
Invoke-Capture -FilePath (Join-Path $hostDir "os_version.txt") -Action { Get-ComputerInfo | Select-Object WindowsProductName,WindowsVersion,OsBuildNumber,OsArchitecture | Format-List }

Write-Step "Collecting installer directory logs/files..."
$filesToCopy = @(
    "DOCKER_INSTALL.log",
    "DOCKER_INSTALL_WRAPPER.log",
    "DOCKER.ps1",
    "run_docker_install.cmd",
    "VERSION"
)

foreach ($f in $filesToCopy) {
    $src = Join-Path $InstallDir $f
    $dst = Join-Path $installDirOut $f
    $ok = Copy-IfExists -Source $src -Destination $dst
    if (-not $ok) {
        Save-Text -Path ($dst + ".missing.txt") -Content "Missing: $src"
    }
}

$envPath = Join-Path $InstallDir ".env"
Save-Text -Path (Join-Path $installDirOut ".env.redacted") -Content (Get-RedactedEnv -EnvPath $envPath)

$triggerFile = Join-Path $InstallDir "data\.triggers\sqlite_to_postgres.auto.migrated"
if (-not (Copy-IfExists -Source $triggerFile -Destination (Join-Path $installDirOut "sqlite_to_postgres.auto.migrated"))) {
    Save-Text -Path (Join-Path $installDirOut "sqlite_to_postgres.auto.migrated.missing.txt") -Content "Missing: $triggerFile"
}

Write-Step "Collecting docker diagnostics..."
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Save-Text -Path (Join-Path $dockerDir "docker_missing.txt") -Content "docker command not found on PATH"
}
else {
    Invoke-Capture -FilePath (Join-Path $dockerDir "docker_version.txt") -Action { docker version }
    Invoke-Capture -FilePath (Join-Path $dockerDir "docker_info.txt") -Action { docker info }
    Invoke-Capture -FilePath (Join-Path $dockerDir "docker_ps_a.txt") -Action { docker ps -a }
    Invoke-Capture -FilePath (Join-Path $dockerDir "docker_images.txt") -Action { docker images }
    Invoke-Capture -FilePath (Join-Path $dockerDir "docker_volumes.txt") -Action { docker volume ls }
    Invoke-Capture -FilePath (Join-Path $dockerDir "docker_networks.txt") -Action { docker network ls }

    $knownContainers = @('sms-app', 'sms-postgres')
    $dynamicContainers = Get-DockerContainerList | Where-Object { $_ -like 'sms*' -or $_ -like '*sms*' }
    $containers = ($knownContainers + $dynamicContainers) | Sort-Object -Unique

    foreach ($name in $containers) {
        if ([string]::IsNullOrWhiteSpace($name)) { continue }

        Invoke-Capture -FilePath (Join-Path $dockerDir ("inspect_" + $name + ".txt")) -Action { docker inspect $name }
        Invoke-Capture -FilePath (Join-Path $dockerDir ("logs_" + $name + ".txt")) -Action { docker logs --tail $ContainerLogTail $name }
    }

    Invoke-Capture -FilePath (Join-Path $dockerDir "recent_exited_containers.txt") -Action { docker ps -a --format "table {{.ID}}`t{{.Image}}`t{{.Status}}`t{{.Names}}" }

    $volumesToInspect = @('sms_data', 'sms_postgres_data')
    foreach ($vol in $volumesToInspect) {
        Invoke-Capture -FilePath (Join-Path $dockerDir ("volume_inspect_" + $vol + ".txt")) -Action { docker volume inspect $vol }
        Invoke-Capture -FilePath (Join-Path $dockerDir ("volume_ls_" + $vol + ".txt")) -Action {
            docker run --rm -v "${vol}:/vol:ro" alpine:latest sh -c "ls -la /vol | head -200"
        }
    }

    if ($IncludeDockerInfo) {
        Invoke-Capture -FilePath (Join-Path $dockerDir "docker_events_snapshot.txt") -Action { docker events --since 30m --until 0m }
    }
}

Write-Step "Collecting quick timeline metadata..."
$meta = @()
$meta += "Timestamp: $(Get-Date -Format o)"
$meta += "InstallDir: $InstallDir"
$meta += "SessionDir: $sessionDir"
$meta += "ContainerLogTail: $ContainerLogTail"
$meta += "ScriptVersion: 1.0"
Save-Text -Path (Join-Path $metaDir "SUMMARY.txt") -Content ($meta -join "`r`n")

Write-Step "Packaging diagnostics..."
$zipPath = Join-Path $OutputRoot ("installer_diag_" + $timestamp + ".zip")
if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}

try {
    Compress-Archive -Path (Join-Path $sessionDir "*") -DestinationPath $zipPath -CompressionLevel Optimal -Force
    Write-Host "`n✅ Diagnostics collected successfully" -ForegroundColor Green
    Write-Host "📁 Folder: $sessionDir" -ForegroundColor Green
    Write-Host "🗜 Zip:    $zipPath" -ForegroundColor Green
    Write-Host "`nPlease share the ZIP file for analysis." -ForegroundColor Cyan
}
catch {
    Write-Host "`n⚠ Diagnostics folder created, but ZIP failed: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "📁 Folder: $sessionDir" -ForegroundColor Yellow
}
