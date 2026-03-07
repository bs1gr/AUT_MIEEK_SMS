param(
    [string]$OutputPath = ".\recovered_master.key"
)

$ErrorActionPreference = "Stop"

function Get-DockerCommand {
    if (Get-Command docker.exe -ErrorAction SilentlyContinue) {
        return "docker.exe"
    }
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        return "docker"
    }
    throw "Docker CLI not found in PATH (docker.exe/docker)."
}

Write-Host "=== Recover SMS master.key from Docker container ===" -ForegroundColor Cyan

$dockerCmd = Get-DockerCommand
$containerCandidates = @("sms-app", "student-management-system-app", "sms_app")
$containerId = $null
$containerName = $null

foreach ($name in $containerCandidates) {
    try {
        $id = (& $dockerCmd ps -a --filter "name=^$name`$" --format "{{.ID}}" 2>$null | Select-Object -First 1)
        if ($id) {
            $containerId = $id.Trim()
            $containerName = $name
            break
        }
    } catch {
        # Continue to next candidate
    }
}

if (-not $containerId) {
    try {
        $runningId = (& $dockerCmd ps --format "{{.ID}} {{.Names}}" 2>$null | Select-Object -First 1)
        if ($runningId) {
            $parts = $runningId -split "\s+"
            $containerId = $parts[0]
            $containerName = $parts[1]
        }
    } catch {
        # Continue
    }
}

if (-not $containerId) {
    Write-Error "No Docker containers found. Start Docker/SMS first."
}

Write-Host "Using container: $containerName ($containerId)" -ForegroundColor Yellow

$possiblePaths = @(
    "/app/.keys/master.key",
    "/app/backend/.keys/master.key",
    "/backend/.keys/master.key",
    "/srv/app/.keys/master.key",
    "/opt/app/.keys/master.key",
    "C:/app/.keys/master.key",
    "C:/backend/.keys/master.key"
)

$foundPath = $null
foreach ($p in $possiblePaths) {
    try {
        if (Test-Path $OutputPath) {
            Remove-Item $OutputPath -Force -ErrorAction SilentlyContinue
        }

        & $dockerCmd cp "${containerId}:$p" "$OutputPath" 2>$null

        if (Test-Path $OutputPath) {
            $size = (Get-Item $OutputPath).Length
            if ($size -eq 32) {
                $foundPath = $p
                break
            }
            Remove-Item $OutputPath -Force -ErrorAction SilentlyContinue
        }
    }
    catch {
        # Continue probing other paths
    }
}

if (-not $foundPath) {
    Write-Warning "master.key not found in known container paths."
    Write-Host "`nContainer mount diagnostics:" -ForegroundColor Yellow
    & $dockerCmd inspect $containerId --format "{{range .Mounts}}- {{.Source}} -> {{.Destination}} ({{.Type}}){{println}}{{end}}"
    Write-Host "`nTip: If this is a Linux container, run inside the laptop host shell:" -ForegroundColor Cyan
    Write-Host "  docker exec $containerId sh -lc 'find / -name master.key 2>/dev/null'"
    Write-Host "Then copy it with:"
    Write-Host "  docker cp ${containerId}:<found_path> $OutputPath"
    throw "Unable to auto-locate master.key."
}

Write-Host "Found key at: $foundPath" -ForegroundColor Green

if (-not (Test-Path $OutputPath)) {
    Write-Error "docker cp completed but output file was not created: $OutputPath"
}

$item = Get-Item $OutputPath
$hash = Get-FileHash $OutputPath -Algorithm SHA256

Write-Host "Recovered key file:" -ForegroundColor Green
Write-Host "  Path: $($item.FullName)"
Write-Host "  Size: $($item.Length) bytes"
Write-Host "  SHA256: $($hash.Hash)"
Write-Host "\nNext: copy this file to .keys/master.key in the restore workspace and re-run restore." -ForegroundColor Cyan
