#!/usr/bin/env pwsh
#Requires -Version 7.0

<#
.SYNOPSIS
Archived frontend test runner (summary mode)
.DESCRIPTION
Superseded on March 12, 2026 by `RUN_FRONTEND_TESTS.ps1 -Mode Summary`.
#>

[CmdletBinding()]
param(
  [Parameter()] [string] $Pattern,
  [Parameter()] [switch] $SkipRun
)

Write-Host "RUN_FRONTEND_TESTS_SUMMARY.ps1 is archived." -ForegroundColor Yellow
Write-Host "Use: .\RUN_FRONTEND_TESTS.ps1 -Mode Summary [-Pattern <pattern>] [-SkipRun]" -ForegroundColor Cyan
exit 0
