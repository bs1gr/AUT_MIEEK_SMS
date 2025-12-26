<#
.SYNOPSIS
    Shared cleanup utilities for SMS maintenance scripts

.DESCRIPTION
    Common functions used by CLEANUP_PRE_RELEASE.ps1 and CLEANUP_COMPREHENSIVE.ps1
    to eliminate code duplication and ensure consistent cleanup behavior.

.NOTES
    Version: 1.0.0
    Created: 2025-12-04
    Part of script consolidation effort (v1.9.7)
#>

# ============================================================================
# SHARED CLEANUP FUNCTIONS
# ============================================================================

function Remove-SafeItem {
    <#
    .SYNOPSIS
        Safely remove a file or directory with size tracking and error handling

    .PARAMETER Path
        Path to file or directory to remove

    .PARAMETER Description
        Human-readable description for logging

    .PARAMETER DryRun
        If true, only report what would be deleted without deleting

    .PARAMETER SpaceFreedRef
        Reference to variable tracking total space freed (optional)

    .PARAMETER CleanupCountRef
        Reference to variable tracking cleanup count (optional)
    #>
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Description,
        [switch]$DryRun,
        [ref]$SpaceFreedRef,
        [ref]$CleanupCountRef
    )

    if (-not (Test-Path $Path)) {
        Write-Host "  ○ Not found: $Description" -ForegroundColor Gray
        return $false
    }

    try {
        # Calculate size
        $size = 0
        if (Test-Path $Path -PathType Container) {
            $size = (Get-ChildItem -Path $Path -Recurse -Force -ErrorAction SilentlyContinue |
                     Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
        } else {
            $size = (Get-Item $Path -ErrorAction SilentlyContinue).Length
        }

        if ($null -eq $size) { $size = 0 }

        # Update tracking variables if provided
        if ($SpaceFreedRef) { $SpaceFreedRef.Value += $size }
        if ($CleanupCountRef) { $CleanupCountRef.Value++ }

        # Perform removal or dry run
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would delete: $Path" -ForegroundColor DarkGray
            Write-Host "            ($Description) - $(Format-FileSize $size)" -ForegroundColor DarkGray
        } else {
            Remove-Item -Path $Path -Recurse -Force -ErrorAction Stop
            $sizeMB = [math]::Round($size / 1MB, 2)
            Write-Host "  ✓ Removed: $Description ($sizeMB MB)" -ForegroundColor Green
        }

        return $true
    } catch {
        Write-Host "  ✗ Failed: $Description - $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Format-FileSize {
    <#
    .SYNOPSIS
        Format byte size into human-readable string

    .PARAMETER Bytes
        Size in bytes to format
    #>
    param([long]$Bytes)

    if ($Bytes -eq 0) { return "0 B" }

    $sizes = @("B", "KB", "MB", "GB", "TB")
    $order = [Math]::Min([Math]::Floor([Math]::Log($Bytes, 1024)), $sizes.Length - 1)
    $size = [Math]::Round($Bytes / [Math]::Pow(1024, $order), 2)

    return "$size $($sizes[$order])"
}

function Write-CleanupSummary {
    <#
    .SYNOPSIS
        Display cleanup operation summary

    .PARAMETER ItemsRemoved
        Number of items removed

    .PARAMETER SpaceFreed
        Total bytes freed

    .PARAMETER Errors
        Array of error messages (optional)

    .PARAMETER DryRun
        If true, indicate this was a dry run
    #>
    param(
        [int]$ItemsRemoved,
        [long]$SpaceFreed,
        [string[]]$Errors = @(),
        [switch]$DryRun
    )

    Write-Host "`n$('=' * 70)" -ForegroundColor Cyan
    if ($DryRun) {
        Write-Host "  Cleanup Summary (DRY RUN)" -ForegroundColor Cyan
    } else {
        Write-Host "  Cleanup Summary" -ForegroundColor Cyan
    }
    Write-Host "$('=' * 70)" -ForegroundColor Cyan

    Write-Host "Items removed: $ItemsRemoved" -ForegroundColor $(if ($ItemsRemoved -gt 0) { "Green" } else { "Gray" })
    Write-Host "Space freed: $(Format-FileSize $SpaceFreed)" -ForegroundColor $(if ($SpaceFreed -gt 0) { "Green" } else { "Gray" })

    if ($Errors.Count -gt 0) {
        Write-Host "`nErrors encountered: $($Errors.Count)" -ForegroundColor Yellow
        foreach ($err in $Errors) {
            Write-Host "  • $err" -ForegroundColor Red
        }
    }

    if ($DryRun) {
        Write-Host "`nRun without -DryRun to execute cleanup" -ForegroundColor Yellow
    } else {
        Write-Host "`n✅ Cleanup complete!" -ForegroundColor Green
    }
}

function Test-GitKeepFile {
    <#
    .SYNOPSIS
        Check if path contains only .gitkeep files (directory should be preserved)

    .PARAMETER Path
        Directory path to check
    #>
    param([string]$Path)

    if (-not (Test-Path $Path -PathType Container)) { return $false }

    $items = Get-ChildItem -Path $Path -Force -ErrorAction SilentlyContinue

    # Empty directory or only contains .gitkeep
    return ($items.Count -eq 0) -or (($items.Count -eq 1) -and ($items[0].Name -eq '.gitkeep'))
}

# Functions are automatically available when dot-sourced
# No Export-ModuleMember needed for dot-sourcing
