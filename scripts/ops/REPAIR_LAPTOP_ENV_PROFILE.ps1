param(
    [string]$InstallRoot = "\\Laptop-vas\SMS",
    [switch]$WhatIfOnly
)

$ErrorActionPreference = "Stop"

function Get-EnvValue {
    param(
        [string]$Content,
        [string]$Key
    )

    $m = [regex]::Match($Content, "(?m)^\s*" + [regex]::Escape($Key) + "\s*=\s*(.+)$")
    if ($m.Success) {
        return $m.Groups[1].Value.Trim()
    }
    return ""
}

function Set-EnvValue {
    param(
        [string]$Content,
        [string]$Key,
        [string]$Value
    )

    $pattern = "(?m)^\s*" + [regex]::Escape($Key) + "\s*=.*$"
    $line = "$Key=$Value"
    if ([regex]::IsMatch($Content, $pattern)) {
        return [regex]::Replace($Content, $pattern, $line)
    }

    if (-not $Content.EndsWith("`n")) {
        $Content += "`r`n"
    }
    return $Content + $line + "`r`n"
}

$envPath = Join-Path $InstallRoot ".env"
if (-not (Test-Path $envPath)) {
    throw "Could not find .env at: $envPath"
}

$raw = Get-Content $envPath -Raw

$pgServer = Get-EnvValue -Content $raw -Key "POSTGRES_HOST"
$pgPort = Get-EnvValue -Content $raw -Key "POSTGRES_PORT"
$pgDb = Get-EnvValue -Content $raw -Key "POSTGRES_DB"
$pgUser = Get-EnvValue -Content $raw -Key "POSTGRES_USER"
$pgPassword = Get-EnvValue -Content $raw -Key "POSTGRES_PASSWORD"

if ([string]::IsNullOrWhiteSpace($pgServer) -or
    [string]::IsNullOrWhiteSpace($pgPort) -or
    [string]::IsNullOrWhiteSpace($pgDb) -or
    [string]::IsNullOrWhiteSpace($pgUser) -or
    [string]::IsNullOrWhiteSpace($pgPassword)) {
    throw "POSTGRES_* keys are incomplete in $envPath. Repair aborted to avoid writing an invalid DATABASE_URL."
}

$encUser = [System.Uri]::EscapeDataString($pgUser)
$encPassword = [System.Uri]::EscapeDataString($pgPassword)
$encDb = [System.Uri]::EscapeDataString($pgDb)
$newUrl = "postgresql://${encUser}:${encPassword}@${pgServer}:${pgPort}/${encDb}"

$updated = $raw
$updated = Set-EnvValue -Content $updated -Key "SMS_DATABASE_PROFILE" -Value "remote"
$updated = Set-EnvValue -Content $updated -Key "DATABASE_ENGINE" -Value "postgresql"
$updated = Set-EnvValue -Content $updated -Key "DATABASE_URL" -Value $newUrl

if ($WhatIfOnly) {
    Write-Host "[WhatIf] Would update: $envPath"
    Write-Host "  SMS_DATABASE_PROFILE=remote"
    Write-Host "  DATABASE_ENGINE=postgresql"
    Write-Host "  DATABASE_URL=$newUrl"
    exit 0
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = Join-Path $InstallRoot "backups\database"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}
$backupPath = Join-Path $backupDir ".env.pre_profile_repair_$timestamp"
Copy-Item -Path $envPath -Destination $backupPath -Force

Set-Content -Path $envPath -Value $updated -NoNewline

Write-Host "Backup created: $backupPath"
Write-Host "Updated: $envPath"
Write-Host "SMS_DATABASE_PROFILE=remote"
Write-Host "DATABASE_ENGINE=postgresql"
Write-Host "DATABASE_URL=$newUrl"
Write-Host "Next: run DOCKER.ps1 -Restart from $InstallRoot"
