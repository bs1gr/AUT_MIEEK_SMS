#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Trigger branch protection workflow via GitHub API

.DESCRIPTION
    Triggers the apply-branch-protection workflow with updated Codecov contexts.
    Requires a GitHub Personal Access Token with 'workflow' scope.

.PARAMETER Token
    GitHub Personal Access Token (if not provided, will prompt)

.EXAMPLE
    .\scripts\trigger_branch_protection.ps1
    .\scripts\trigger_branch_protection.ps1 -Token "ghp_..."
#>

param(
    [string]$Token
)

$ErrorActionPreference = "Stop"

# Prompt for token if not provided
if (-not $Token) {
    $Token = Read-Host "Enter GitHub Personal Access Token (needs 'workflow' scope)" -AsSecureString
    $Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token)
    )
}

$owner = "bs1gr"
$repo = "AUT_MIEEK_SMS"
$workflowFile = "apply-branch-protection.yml"
$ref = "main"

$headers = @{
    "Accept" = "application/vnd.github+json"
    "Authorization" = "Bearer $Token"
    "X-GitHub-Api-Version" = "2022-11-28"
}

$body = @{
    ref = $ref
    inputs = @{
        branch = "main"
        contexts = "Import checker,Require operator approval for operator scripts,CI,codecov/project,codecov/patch"
    }
} | ConvertTo-Json

$uri = "https://api.github.com/repos/$owner/$repo/actions/workflows/$workflowFile/dispatches"

Write-Host "Triggering branch protection workflow..." -ForegroundColor Cyan
Write-Host "Repository: $owner/$repo" -ForegroundColor Gray
Write-Host "Workflow: $workflowFile" -ForegroundColor Gray
Write-Host "Branch: main" -ForegroundColor Gray
Write-Host "Contexts: Import checker, CI, codecov/project, codecov/patch" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $body -ContentType "application/json"
    Write-Host "`n✓ Workflow triggered successfully!" -ForegroundColor Green
    Write-Host "`nCheck status at: https://github.com/$owner/$repo/actions" -ForegroundColor Yellow
} catch {
    Write-Host "`n✗ Failed to trigger workflow" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red

    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Response: $errorBody" -ForegroundColor Red
    }

    exit 1
}
