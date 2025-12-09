# DEPRECATED: use scripts/utils/backups/backup_tools.ps1
# This stub forwards all parameters to the consolidated location.

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('grab','put')]
    [string]$Action,
    [string]$Destination,
    [string]$Source,
    [string]$ApiUrl,
    [string]$Token
)

$root = Split-Path $PSScriptRoot -Parent
$target = Join-Path $root 'scripts\utils\backups\backup_tools.ps1'
Write-Host "[DEPRECATED] Redirecting to $target" -ForegroundColor Yellow

if (-not (Test-Path $target)) {
    Write-Error "Target script not found: $target"
    exit 1
}

# Build argument list for forwarding
$forwardParams = @{}
if ($Action) { $forwardParams['Action'] = $Action }
if ($Destination) { $forwardParams['Destination'] = $Destination }
if ($Source) { $forwardParams['Source'] = $Source }
if ($ApiUrl) { $forwardParams['ApiUrl'] = $ApiUrl }
if ($Token) { $forwardParams['Token'] = $Token }

& $target @forwardParams
