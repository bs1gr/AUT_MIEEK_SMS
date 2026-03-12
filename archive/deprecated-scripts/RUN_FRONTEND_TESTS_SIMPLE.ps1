#!/usr/bin/env pwsh
#Requires -Version 7.0

<#
.SYNOPSIS
Archived frontend test runner (simple mode)
.DESCRIPTION
Superseded on March 12, 2026 by `RUN_FRONTEND_TESTS.ps1 -Mode Verbose`.
#>

[CmdletBinding()]
param()

Write-Host "RUN_FRONTEND_TESTS_SIMPLE.ps1 is archived." -ForegroundColor Yellow
Write-Host "Use: .\RUN_FRONTEND_TESTS.ps1 -Mode Verbose" -ForegroundColor Cyan
exit 0