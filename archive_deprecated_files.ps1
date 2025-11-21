# Archive Deprecated Files Script
# Moves deprecated files to archive/deprecated/ directory

$ErrorActionPreference = 'Continue'
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$ARCHIVE_DIR = Join-Path $SCRIPT_DIR "archive\deprecated\v1.8.6.1_cleanup"

# Create archive directory
Write-Host "Creating archive directory..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path $ARCHIVE_DIR -Force | Out-Null

# List of deprecated files to archive
$deprecatedFiles = @(
    "SMART_SETUP.ps1"
)

Write-Host "`nArchiving deprecated files from root directory..." -ForegroundColor Yellow

foreach ($file in $deprecatedFiles) {
    $sourcePath = Join-Path $SCRIPT_DIR $file

    if (Test-Path $sourcePath) {
        $destPath = Join-Path $ARCHIVE_DIR $file
        Write-Host "  Moving: $file" -ForegroundColor Green
        Move-Item -Path $sourcePath -Destination $destPath -Force
    } else {
        Write-Host "  Not found: $file" -ForegroundColor DarkGray
    }
}

Write-Host "`nArchival complete!" -ForegroundColor Green
Write-Host "Files moved to: $ARCHIVE_DIR" -ForegroundColor Cyan
