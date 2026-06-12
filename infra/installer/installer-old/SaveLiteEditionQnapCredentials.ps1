#Requires -Version 5.0
<#
.SYNOPSIS
Save QNAP PostgreSQL credentials for SMS Lite Edition (run after installer)

.DESCRIPTION
This script saves QNAP PostgreSQL connection details to a credentials file
that SMS_Lite.exe will read on startup. This allows Lite Edition to connect
to a shared QNAP PostgreSQL database instead of using local SQLite.

.PARAMETER InstallPath
Installation directory (set by installer as {app})

.PARAMETER PgHost
PostgreSQL host (QNAP IP or DNS name)

.PARAMETER PgPort
PostgreSQL port (default 5432)

.PARAMETER PgDb
Database name

.PARAMETER PgUser
PostgreSQL username

.PARAMETER PgPass
PostgreSQL password

.PARAMETER PgSSLMode
SSL mode (disable, allow, prefer, require)

.EXAMPLE
# Called from Inno Setup installer
& "$InstallPath\SaveLiteEditionQnapCredentials.ps1" -InstallPath "C:\SMS" `
    -PgHost "qnap.local" -PgPort "5432" -PgDb "student_management" `
    -PgUser "sms_user" -PgPass "password" -PgSSLMode "prefer"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$InstallPath,

    [Parameter(Mandatory=$false)]
    [string]$PgHost = "",

    [Parameter(Mandatory=$false)]
    [string]$PgPort = "5432",

    [Parameter(Mandatory=$false)]
    [string]$PgDb = "",

    [Parameter(Mandatory=$false)]
    [string]$PgUser = "",

    [Parameter(Mandatory=$false)]
    [string]$PgPass = "",

    [Parameter(Mandatory=$false)]
    [string]$PgSSLMode = "prefer"
)

# Only save if QNAP details are provided
if ([string]::IsNullOrWhiteSpace($PgHost) -or [string]::IsNullOrWhiteSpace($PgDb)) {
    Write-Host "Lite Edition will use local SQLite (no QNAP credentials provided)"
    exit 0
}

try {
    # Create local-secrets directory
    $SecretsDir = Join-Path $InstallPath "local-secrets"
    if (-not (Test-Path $SecretsDir)) {
        New-Item -ItemType Directory -Path $SecretsDir -Force | Out-Null
        Write-Host "Created directory: $SecretsDir"
    }

    # Build JSON credentials object
    $Credentials = @{
        host     = $PgHost
        port     = [int]$PgPort
        dbname   = $PgDb
        user     = $PgUser
        password = $PgPass
        sslmode  = $PgSSLMode
    }

    # Save to JSON file
    $CredentialsFile = Join-Path $SecretsDir "qnap-credentials.json"
    $Credentials | ConvertTo-Json -Depth 2 | Out-File -FilePath $CredentialsFile -Encoding UTF8 -Force

    # Set restrictive permissions (owner only, read+write)
    $Acl = Get-Acl $CredentialsFile
    $Acl.SetAccessRuleProtection($true, $false)  # Disable inheritance
    # Remove all existing access rules
    $Acl.Access | ForEach-Object { $Acl.RemoveAccessRule($_) }
    # Add read+write for current user only
    $CurrentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
    $AccessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        $CurrentUser,
        "ReadAndExecute,Write",
        "Allow"
    )
    $Acl.AddAccessRule($AccessRule)
    Set-Acl -Path $CredentialsFile -AclObject $Acl

    Write-Host "✅ Saved QNAP credentials: $CredentialsFile"
    Write-Host "   Host: $PgHost"
    Write-Host "   Port: $PgPort"
    Write-Host "   Database: $PgDb"
    Write-Host "   User: $PgUser"
    Write-Host "   SSL Mode: $PgSSLMode"
    Write-Host ""
    Write-Host "SMS_Lite.exe will use this QNAP PostgreSQL database on next startup."

    exit 0
}
catch {
    Write-Error "Failed to save QNAP credentials: $_"
    exit 1
}
