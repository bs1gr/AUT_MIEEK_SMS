<#
.SYNOPSIS
    Creates wizard images for the Inno Setup installer.

.DESCRIPTION
    Generates the required BMP images for the installer wizard:
    - wizard_image.bmp (164x314 pixels) - Left panel image
    - wizard_small.bmp (55x55 pixels) - Small icon in header
#>

Add-Type -AssemblyName System.Drawing

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Colors
$primaryColor = [System.Drawing.Color]::FromArgb(0, 102, 204)      # Blue
$secondaryColor = [System.Drawing.Color]::FromArgb(240, 240, 240)  # Light gray
$textColor = [System.Drawing.Color]::FromArgb(51, 51, 51)          # Dark gray

# ============================================================================
# Create Large Wizard Image (164x314)
# ============================================================================

$width = 164
$height = 314

$bitmap = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

# Enable anti-aliasing
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Background gradient
$rect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect, 
    $primaryColor, 
    [System.Drawing.Color]::FromArgb(0, 51, 102),
    [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
)
$graphics.FillRectangle($brush, $rect)

# Draw decorative circles
$circleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 255, 255, 255))
$graphics.FillEllipse($circleBrush, -50, 200, 200, 200)
$graphics.FillEllipse($circleBrush, 80, 50, 150, 150)

# Draw "SMS" text
$font = New-Object System.Drawing.Font("Segoe UI", 36, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center

$graphics.DrawString("SMS", $font, $textBrush, ($width / 2), 100, $format)

# Draw subtitle
$subtitleFont = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Regular)
$graphics.DrawString("Student", $subtitleFont, $textBrush, ($width / 2), 155, $format)
$graphics.DrawString("Management", $subtitleFont, $textBrush, ($width / 2), 172, $format)
$graphics.DrawString("System", $subtitleFont, $textBrush, ($width / 2), 189, $format)

# Draw decorative line
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(100, 255, 255, 255), 2)
$graphics.DrawLine($pen, 30, 220, $width - 30, 220)

# Draw version
$versionFont = New-Object System.Drawing.Font("Segoe UI", 8, [System.Drawing.FontStyle]::Regular)
$version = (Get-Content "$scriptDir\..\VERSION" -Raw -ErrorAction SilentlyContinue) ?? "1.9.7"
$graphics.DrawString("v$($version.Trim())", $versionFont, $textBrush, ($width / 2), 280, $format)

# Save
$bitmap.Save("$scriptDir\wizard_image.bmp", [System.Drawing.Imaging.ImageFormat]::Bmp)

# Cleanup
$graphics.Dispose()
$bitmap.Dispose()
$brush.Dispose()
$circleBrush.Dispose()
$textBrush.Dispose()
$font.Dispose()
$subtitleFont.Dispose()
$versionFont.Dispose()
$pen.Dispose()

Write-Host "Created wizard_image.bmp" -ForegroundColor Green

# ============================================================================
# Create Small Wizard Image (55x55)
# ============================================================================

$width = 55
$height = 55

$bitmap = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

# Enable anti-aliasing
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Background
$rect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
$brush = New-Object System.Drawing.SolidBrush($primaryColor)
$graphics.FillRectangle($brush, $rect)

# Draw rounded rectangle
$cornerRadius = 8
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddArc(0, 0, $cornerRadius * 2, $cornerRadius * 2, 180, 90)
$path.AddArc($width - $cornerRadius * 2, 0, $cornerRadius * 2, $cornerRadius * 2, 270, 90)
$path.AddArc($width - $cornerRadius * 2, $height - $cornerRadius * 2, $cornerRadius * 2, $cornerRadius * 2, 0, 90)
$path.AddArc(0, $height - $cornerRadius * 2, $cornerRadius * 2, $cornerRadius * 2, 90, 90)
$path.CloseFigure()

$graphics.SetClip($path)
$graphics.Clear($primaryColor)

# Draw "S" letter
$font = New-Object System.Drawing.Font("Segoe UI", 28, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center

$graphics.DrawString("S", $font, $textBrush, ($width / 2), ($height / 2), $format)

# Save
$bitmap.Save("$scriptDir\wizard_small.bmp", [System.Drawing.Imaging.ImageFormat]::Bmp)

# Cleanup
$graphics.Dispose()
$bitmap.Dispose()
$brush.Dispose()
$textBrush.Dispose()
$font.Dispose()
$path.Dispose()

Write-Host "Created wizard_small.bmp" -ForegroundColor Green
