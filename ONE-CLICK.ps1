#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Compatibility wrapper for one-click start.
.DESCRIPTION
  This script is deprecated and now forwards to QUICKSTART.ps1.
  Prefer using QUICKSTART.ps1 (auto-setup/start) or SMS.ps1 (interactive).
.EXAMPLE
  .\ONE-CLICK.ps1 -PreferDocker
#>

[CmdletBinding()]
param(
  [switch]$ForceInstall,
  [switch]$PreferDocker,
  [switch]$PreferNative,
  [switch]$SkipStart,
  [switch]$Verbose
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$smartSetup = Join-Path $root 'SMART_SETUP.ps1'

Write-Host ''
Write-Host '==============================================='
Write-Host ' Student Management System - ONE CLICK (Wrapper)'
Write-Host '==============================================='
Write-Host ''
Write-Host 'NOTE: ONE-CLICK.ps1 is deprecated.' -ForegroundColor Yellow
Write-Host '      Forwarding to SMART_SETUP.ps1...' -ForegroundColor Yellow

if (-not (Test-Path $smartSetup)) {
  Write-Error "SMART_SETUP.ps1 not found at $smartSetup"
  exit 1
}

# Map legacy flags to SMART_SETUP.ps1
$argsList = @()
if ($ForceInstall) { $argsList += '-Force' }
if ($PreferDocker) { $argsList += '-PreferDocker' }
if ($PreferNative) { $argsList += '-PreferNative' }
if ($SkipStart)    { $argsList += '-SkipStart' }
if ($Verbose)      { $argsList += '-Verbose' }

& $smartSetup @argsList @args
exit $LASTEXITCODE
