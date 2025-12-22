<#
.SYNOPSIS
    Creates wizard images for the Inno Setup installer (v2.0 - Modern Design).

.DESCRIPTION
    Generates the required BMP images for the installer wizard:
    - wizard_image.bmp (164x314 pixels) - Left panel image with modern gradient
    - wizard_small.bmp (55x55 pixels) - Small icon in header with rounded corners

    Automatically reads version from VERSION file and updates wizard images.
    Includes version caching and validation.

.PARAMETER Force
    Force regeneration even if images are up-to-date.

.EXAMPLE
    .\create_wizard_images.ps1                  # Auto-detect version, regenerate if needed
    .\create_wizard_images.ps1 -Force          # Force regeneration
#>

param(
    [switch]$Force = $false
)

# Strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

# Version management
$VersionFile = Join-Path $projectRoot "VERSION"
$VersionCacheFile = Join-Path $scriptDir ".version_cache"

# Modern color palette (v2.0)
$primaryColor = [System.Drawing.Color]::FromArgb(0, 102, 204)           # Modern Blue
$primaryDark = [System.Drawing.Color]::FromArgb(0, 51, 102)             # Dark Blue
$primaryLight = [System.Drawing.Color]::FromArgb(51, 153, 255)          # Light Blue
$accentColor = [System.Drawing.Color]::FromArgb(255, 153, 0)            # Orange accent
$secondaryColor = [System.Drawing.Color]::FromArgb(240, 240, 240)       # Light gray
$textColor = [System.Drawing.Color]::FromArgb(51, 51, 51)               # Dark gray
$textLight = [System.Drawing.Color]::FromArgb(255, 255, 255)            # White

# ============================================================================
# Helper Functions
# ============================================================================

function Get-ProjectVersion {
    <#
    .SYNOPSIS
        Reads the current version from VERSION file.
    #>
    try {
        if (-not (Test-Path $VersionFile)) {
            Write-Error "VERSION file not found at: $VersionFile"
        }
        return (Get-Content $VersionFile -Raw -ErrorAction Stop).Trim()
    }
    catch {
        Write-Error "Failed to read VERSION: $_"
    }
}

function Test-VersionCacheValid {
    <#
    .SYNOPSIS
        Checks if cached version matches current version.
    #>
    if (-not (Test-Path $VersionCacheFile)) {
        return $false
    }

    $cachedVersion = Get-Content $VersionCacheFile -Raw -ErrorAction SilentlyContinue
    $currentVersion = Get-ProjectVersion

    return ($cachedVersion.Trim() -eq $currentVersion)
}

function Update-VersionCache {
    <#
    .SYNOPSIS
        Updates the version cache file.
    #>
    $version = Get-ProjectVersion
    Set-Content -Path $VersionCacheFile -Value $version -NoNewline -Force
    Write-Host "  Version cache updated: $version" -ForegroundColor Gray
}

function Test-ImageFiles {
    <#
    .SYNOPSIS
        Checks if all required wizard images exist and are valid.
    #>
    $largeImage = Join-Path $scriptDir "wizard_image.bmp"
    $smallImage = Join-Path $scriptDir "wizard_small.bmp"

    if ((Test-Path $largeImage) -and (Test-Path $smallImage)) {
        return $true
    }
    return $false
}

# ============================================================================
# Main Logic - Version Management
# ============================================================================

$currentVersion = Get-ProjectVersion
Write-Host "Current version: v$currentVersion" -ForegroundColor Cyan

# Check if regeneration is needed
$needsRegen = $Force -or -not (Test-VersionCacheValid) -or -not (Test-ImageFiles)

if ($needsRegen) {
    Write-Host "Regenerating wizard images for v$currentVersion..." -ForegroundColor Yellow
}
else {
    Write-Host "Wizard images are up-to-date (v$currentVersion)" -ForegroundColor Green
    exit 0
}

# ============================================================================
# Create Large Wizard Image (164x314) - Modern Design v2.0
# ============================================================================

$width = 164
$height = 314

$bitmap = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

# Enhanced rendering quality for modern look
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Modern gradient background - vertical gradient with depth
$rect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    $primaryColor,
    $primaryDark,
    [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
)
$graphics.FillRectangle($brush, $rect)

# Add subtle gradient overlay on top
$overlayBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Rectangle(0, 0, $width, $height)),
    [System.Drawing.Color]::FromArgb(0, 0, 0, 0),
    [System.Drawing.Color]::FromArgb(20, 0, 0, 0),
    [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
)
$graphics.FillRectangle($overlayBrush, 0, 200, $width, 114)

# Draw modern decorative geometric shapes (v2.0 building objects)
# Top accent bar
$accentBrush = New-Object System.Drawing.SolidBrush($accentColor)
$graphics.FillRectangle($accentBrush, 0, 0, $width, 3)

# Modern circles with transparency (modern design element)
$circleBrush1 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(20, 255, 255, 255))
$graphics.FillEllipse($circleBrush1, -40, 180, 180, 180)
$graphics.FillEllipse($circleBrush1, 70, 40, 140, 140)

# Slightly opaque accent circles
$circleBrush2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 255, 153, 0))
$graphics.FillEllipse($circleBrush2, 100, 250, 100, 100)

# Draw "SMS" text with modern font styling
$fontBold = New-Object System.Drawing.Font("Segoe UI", 38, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush($textLight)
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center

$smsCenterX = $width / 2
$graphics.DrawString("SMS", $fontBold, $textBrush, $smsCenterX, 95, $format)

# Draw modern subtitle with better spacing
$subtitleFont = New-Object System.Drawing.Font("Segoe UI", 8, [System.Drawing.FontStyle]::Regular)
$centerX = $width / 2
$graphics.DrawString("Student", $subtitleFont, $textBrush, $centerX, 150, $format)
$graphics.DrawString("Management", $subtitleFont, $textBrush, $centerX, 163, $format)
$graphics.DrawString("System", $subtitleFont, $textBrush, $centerX, 176, $format)

# Modern decorative line with gradient
$lineWidth = $width - 60
$lineGradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Rectangle(30, 200, $lineWidth, 2)),
    [System.Drawing.Color]::FromArgb(0, 255, 255, 255),
    [System.Drawing.Color]::FromArgb(100, 255, 255, 255),
    [System.Drawing.Drawing2D.LinearGradientMode]::Horizontal
)
$graphics.FillRectangle($lineGradient, 30, 200, $lineWidth, 2)

# Draw version with enhanced styling
$versionFont = New-Object System.Drawing.Font("Segoe UI", 7, [System.Drawing.FontStyle]::Regular)
$versionBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 255, 255, 255))
$versionX = $width / 2
$graphics.DrawString("v$($currentVersion)", $versionFont, $versionBrush, $versionX, 285, $format)

# Bottom accent bar
$bottomY = $height - 3
$graphics.FillRectangle($accentBrush, 0, $bottomY, $width, 3)

# Save high quality
$bitmap.Save("$scriptDir\wizard_image.bmp", [System.Drawing.Imaging.ImageFormat]::Bmp)
Write-Host "  Created wizard_image.bmp (v$currentVersion)" -ForegroundColor Green

# Cleanup
$graphics.Dispose()
$bitmap.Dispose()
$brush.Dispose()
$overlayBrush.Dispose()
$circleBrush1.Dispose()
$circleBrush2.Dispose()
$accentBrush.Dispose()
$textBrush.Dispose()
$versionBrush.Dispose()
$fontBold.Dispose()
$subtitleFont.Dispose()
$versionFont.Dispose()
$lineGradient.Dispose()
$format.Dispose()

# ============================================================================
# Create Small Wizard Image (55x55) - Modern Icon v2.0
# ============================================================================

$width = 55
$height = 55

$bitmap = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

# Enhanced rendering quality
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Background with gradient (modern icon style)
$rect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    $primaryLight,
    $primaryColor,
    [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
)
$graphics.FillRectangle($brush, $rect)

# Draw rounded rectangle border with modern style
$cornerRadius = 10
$path = New-Object System.Drawing.Drawing2D.GraphicsPath

# Build rounded rectangle path
$arcSize = $cornerRadius * 2
$path.AddArc(0, 0, $arcSize, $arcSize, 180, 90)
$path.AddArc($width - $arcSize, 0, $arcSize, $arcSize, 270, 90)
$path.AddArc($width - $arcSize, $height - $arcSize, $arcSize, $arcSize, 0, 90)
$path.AddArc(0, $height - $arcSize, $arcSize, $arcSize, 90, 90)
$path.CloseFigure()

$graphics.SetClip($path)
$graphics.Clear($primaryColor)

# Add subtle shine effect (top highlight)
$shineBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(60, 255, 255, 255))
$graphics.FillEllipse($shineBrush, 5, 2, 20, 20)

# Draw "S" letter with modern styling
$font = New-Object System.Drawing.Font("Segoe UI", 30, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush($textLight)
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center

$smallCenterX = $width / 2
$smallCenterY = ($height / 2) + 2
$graphics.DrawString("S", $font, $textBrush, $smallCenterX, $smallCenterY, $format)

# Save high quality
$bitmap.Save("$scriptDir\wizard_small.bmp", [System.Drawing.Imaging.ImageFormat]::Bmp)
Write-Host "  Created wizard_small.bmp (v$currentVersion)" -ForegroundColor Green

# Cleanup
$graphics.Dispose()
$bitmap.Dispose()
$brush.Dispose()
$shineBrush.Dispose()
$textBrush.Dispose()
$font.Dispose()
$path.Dispose()
$format.Dispose()

# ============================================================================
# Update Version Cache
# ============================================================================

Update-VersionCache

# ============================================================================
# Summary
# ============================================================================

Write-Host "`nWizard Images Generation Complete" -ForegroundColor Cyan
Write-Host "Version: v$currentVersion" -ForegroundColor Green
Write-Host "Large Image: wizard_image.bmp (164x314)" -ForegroundColor Green
Write-Host "Small Image: wizard_small.bmp (55x55)" -ForegroundColor Green
Write-Host "Design: Modern v2.0 with enhanced visuals" -ForegroundColor Green
