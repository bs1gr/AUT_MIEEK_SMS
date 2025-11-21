#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Export Docker image for deployment to another PC
.DESCRIPTION
    Exports the Docker image to a tar file that can be loaded on another PC
    Much smaller and faster than copying all source files
#>

Write-Host "🚀 Exporting Docker image for deployment..." -ForegroundColor Cyan
Write-Host ""

# Check Docker
try {
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Docker is not running" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Docker not available" -ForegroundColor Red
    exit 1
}

# Find latest image
$imageList = docker images sms-fullstack --format "{{.Tag}}" 2>$null
$images = @($imageList | Where-Object { $_ -and $_ -ne '<none>' -and $_ -ne 'TAG' })
if ($images.Count -eq 0) {
    Write-Host "❌ No SMS images found. Run .\RUN.ps1 first" -ForegroundColor Red
    exit 1
}

# Sort by version (semantic versioning)
$tag = ($images | Sort-Object { [version]($_ -replace '[^0-9.]', '') } -Descending)[0]
$imageName = "sms-fullstack:$tag"
Write-Host "📦 Exporting: $imageName" -ForegroundColor Green
Write-Host ""

# Export
$outputFile = "SMS-Docker-Image-v$tag.tar"
Write-Host "⏳ Exporting (may take 2-3 minutes)..." -ForegroundColor Yellow
docker save -o $outputFile $imageName

if ($LASTEXITCODE -eq 0) {
    $sizeMB = [math]::Round((Get-Item $outputFile).Length / 1MB, 2)
    Write-Host "✅ Exported: $outputFile ($sizeMB MB)" -ForegroundColor Green
    Write-Host ""
    
    # Create instructions
    $instructions = @"
═══════════════════════════════════════════════════════════════
  DEPLOYMENT TO OTHER PC (NO GIT REQUIRED)
═══════════════════════════════════════════════════════════════

📦 FILES TO COPY:
  1. $outputFile
  2. RUN.ps1
  3. backend\.env.example

📋 STEPS ON OTHER PC:

1. Install Docker Desktop if needed
   https://www.docker.com/products/docker-desktop

2. Create folder (e.g., C:\SMS) and copy the 3 files

3. Load Docker image:
   docker load -i $outputFile

4. Create config:
   mkdir backend
   copy backend\.env.example backend\.env

5. Start:
   .\RUN.ps1

6. Login at http://localhost:8080
   Email: admin@example.com
   Password: YourSecurePassword123!

⚠️  Change password after first login!

═══════════════════════════════════════════════════════════════
"@
    
    $instructions | Out-File "DEPLOYMENT_INSTRUCTIONS.txt" -Encoding UTF8
    Write-Host "📄 Created: DEPLOYMENT_INSTRUCTIONS.txt" -ForegroundColor Green
    Write-Host ""
    Write-Host $instructions -ForegroundColor Cyan
} else {
    Write-Host "❌ Export failed" -ForegroundColor Red
    exit 1
}
