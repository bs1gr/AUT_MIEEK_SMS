# PowerShell script to grab (download) and put (restore) backups for AUT_MIEEK_SMS
# Usage:
#   .\backup_tools.ps1 -Action grab -Destination <path>
#   .\backup_tools.ps1 -Action put -Source <backup_file>
#
# - 'grab' copies the latest backup from ./backups to the specified destination
# - 'put' uploads a backup file and triggers restore via the API

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('grab','put')]
    [string]$Action,
    [string]$Destination,
    [string]$Source,
    [string]$ApiUrl = "http://localhost:8080/api/v1/adminops/restore",
    [string]$Token = ""
)

$root = (Get-Item $PSScriptRoot).Parent.Parent.Parent.FullName
$backupsDir = Join-Path $root 'backups'

if ($Action -eq 'grab') {
    if (-not $Destination) {
        Write-Error "Destination path required for grab."
        exit 1
    }
    $latest = Get-ChildItem -Path $backupsDir -Filter 'backup_*.db' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latest) {
        Write-Error "No backup files found in $backupsDir."
        exit 1
    }
    Copy-Item $latest.FullName $Destination -Force
    Write-Host "Copied $($latest.Name) to $Destination"
}
elseif ($Action -eq 'put') {
    if (-not $Source) {
        Write-Error "Source backup file required for put."
        exit 1
    }
    if (-not (Test-Path $Source)) {
        Write-Error "Source file $Source does not exist."
        exit 1
    }
    $headers = @{"accept"="application/json"}
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    $response = Invoke-RestMethod -Uri $ApiUrl -Method Post -Headers $headers -InFile $Source -ContentType 'application/octet-stream' -ErrorAction Stop
    Write-Host "Restore triggered. Response: $($response | ConvertTo-Json)"
}
else {
    Write-Error "Unknown action: $Action"
    exit 1
}
