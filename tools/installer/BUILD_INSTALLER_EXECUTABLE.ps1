<#
.SYNOPSIS
    Build executable installers for Student Management System

.DESCRIPTION
    Creates distributable Windows executable installers using PS2EXE or Advanced Installer.
    Packages the GUI wizard scripts into standalone executables with embedded resources.

.PARAMETER Method
    Packaging method: PS2EXE (free, PowerShell-to-EXE) or AdvancedInstaller (commercial, MSI)

.PARAMETER OutputPath
    Where to create the installers (default: .\dist)

.PARAMETER IncludeUninstaller
    Include uninstaller in the package

.EXAMPLE
    .\BUILD_INSTALLER_EXECUTABLE.ps1
    Build installer using default method (PS2EXE)

.EXAMPLE
    .\BUILD_INSTALLER_EXECUTABLE.ps1 -Method AdvancedInstaller
    Build MSI installer using Advanced Installer

.NOTES
    PS2EXE is free and automatically downloaded if not present
    Advanced Installer requires commercial license
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("PS2EXE", "AdvancedInstaller", "InnoSetup")]
    [string]$Method = "PS2EXE",
    
    [Parameter(Mandatory=$false)]
    [string]$OutputPath = ".\dist",
    
    [Parameter(Mandatory=$false)]
    [switch]$IncludeUninstaller = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ============================================================================
# CONFIGURATION
# ============================================================================

$Script:Config = @{
    AppName             = "Student Management System"
    Version             = (Get-Content "$PSScriptRoot\..\..\VERSION" -Raw).Trim()
    Publisher           = "AUT MIEEK"
    AppId               = "{8F9B6C2E-4D5A-4E6B-9C3D-7F8E9A0B1C2D}"
    InstallerScript     = "$PSScriptRoot\SMS_INSTALLER_WIZARD.ps1"
    UninstallerScript   = "$PSScriptRoot\SMS_UNINSTALLER_WIZARD.ps1"
    IconPath            = "$PSScriptRoot\..\..\frontend\public\favicon.ico"
    LicensePath         = "$PSScriptRoot\..\..\LICENSE"
    OutputPath          = $OutputPath
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error-Message {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Warning-Message {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Test-CommandExists {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# ============================================================================
# PS2EXE METHOD (Free, PowerShell-to-EXE converter)
# ============================================================================

function Install-PS2EXE {
    Write-Info "Checking for PS2EXE module..."
    
    if (-not (Get-Module -ListAvailable -Name ps2exe)) {
        Write-Info "Installing PS2EXE module from PowerShell Gallery..."
        Install-Module -Name ps2exe -Force -Scope CurrentUser
        Write-Success "PS2EXE module installed"
    } else {
        Write-Success "PS2EXE module already installed"
    }
    
    Import-Module ps2exe -Force
}

function Build-PS2EXE-Installer {
    Write-Info "Building installer executable with PS2EXE..."
    
    # Ensure output directory exists
    New-Item -ItemType Directory -Path $Script:Config.OutputPath -Force | Out-Null
    
    $installerExe = Join-Path $Script:Config.OutputPath "SMS_Installer_$($Script:Config.Version).exe"
    
    # PS2EXE parameters
    $ps2exeParams = @{
        InputFile      = $Script:Config.InstallerScript
        OutputFile     = $installerExe
        Title          = "$($Script:Config.AppName) Installer"
        Description    = "Installation wizard for $($Script:Config.AppName)"
        Company        = $Script:Config.Publisher
        Product        = $Script:Config.AppName
        Version        = $Script:Config.Version
        Copyright      = "(c) $(Get-Date -Format yyyy) $($Script:Config.Publisher)"
        RequireAdmin   = $true
        NoConsole      = $true
        NoOutput       = $true
        NoError        = $true
        STA            = $true
        LongPaths      = $true
    }
    
    # Add icon if available
    if (Test-Path $Script:Config.IconPath) {
        $ps2exeParams['iconFile'] = $Script:Config.IconPath
    }
    
    # Build installer
    try {
        Invoke-PS2EXE @ps2exeParams
        Write-Success "Installer executable created: $installerExe"
    } catch {
        Write-Error-Message "Failed to build installer: $_"
        throw
    }
    
    # Build uninstaller if requested
    if ($IncludeUninstaller) {
        Write-Info "Building uninstaller executable..."
        
        $uninstallerExe = Join-Path $Script:Config.OutputPath "SMS_Uninstaller_$($Script:Config.Version).exe"
        
        $ps2exeParams.InputFile = $Script:Config.UninstallerScript
        $ps2exeParams.OutputFile = $uninstallerExe
        $ps2exeParams.Title = "$($Script:Config.AppName) Uninstaller"
        $ps2exeParams.Description = "Uninstaller for $($Script:Config.AppName)"
        
        try {
            Invoke-PS2EXE @ps2exeParams
            Write-Success "Uninstaller executable created: $uninstallerExe"
        } catch {
            Write-Error-Message "Failed to build uninstaller: $_"
            throw
        }
    }
    
    return $installerExe
}

# ============================================================================
# INNO SETUP METHOD (Free, creates single-file installer)
# ============================================================================

function Build-InnoSetup-Installer {
    Write-Info "Building installer with Inno Setup..."
    
    # Check if Inno Setup is installed
    $innoSetupPath = "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe"
    if (-not (Test-Path $innoSetupPath)) {
        Write-Warning-Message "Inno Setup not found. Please install from: https://jrsoftware.org/isdl.php"
        Write-Info "After installation, run this script again."
        return $null
    }
    
    # Create Inno Setup script
    $issScript = Join-Path $Script:Config.OutputPath "SMS_Installer.iss"
    
    $issContent = @"
; Student Management System - Inno Setup Installer Script
; Generated by BUILD_INSTALLER_EXECUTABLE.ps1

#define MyAppName "$($Script:Config.AppName)"
#define MyAppVersion "$($Script:Config.Version)"
#define MyAppPublisher "$($Script:Config.Publisher)"
#define MyAppURL "https://github.com/bs1gr/AUT_MIEEK_SMS"
#define MyAppExeName "SMS_Installer_Wizard.exe"

[Setup]
AppId=$($Script:Config.AppId)
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DisableProgramGroupPage=yes
LicenseFile=$($Script:Config.LicensePath)
OutputDir=$($Script:Config.OutputPath)
OutputBaseFilename=SMS_Setup_{#MyAppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64
UninstallDisplayIcon={app}\uninstall.exe

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "greek"; MessagesFile: "compiler:Languages\Greek.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "$($PSScriptRoot)\..\..\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; Exclude unnecessary files
Source: "$($PSScriptRoot)\..\..\*"; Excludes: "*.pyc,__pycache__,node_modules,.git,.vscode,*.log,backups\*,data\*,logs\*,temp_*,archive\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\DOCKER.ps1"" -Start"; WorkingDir: "{app}"
Name: "{autoprograms}\{#MyAppName} Status"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\DOCKER.ps1"" -Status"; WorkingDir: "{app}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\DOCKER.ps1"" -Start"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\DOCKER.ps1"" -Install"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall runascurrentuser

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\tools\installer\SMS_UNINSTALLER_WIZARD.ps1"""; RunOnceId: "UninstallSMS"

[Code]
function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
begin
  Result := True;
  
  // Check for Docker Desktop
  if not RegKeyExists(HKLM, 'SOFTWARE\Docker Inc.\Docker\1.0') and
     not RegKeyExists(HKCU, 'SOFTWARE\Docker Inc.\Docker\1.0') then
  begin
    if MsgBox('Docker Desktop is not installed. Do you want to download it now?', mbConfirmation, MB_YESNO) = IDYES then
    begin
      ShellExec('open', 'https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe', '', '', SW_SHOWNORMAL, ewNoWait, ResultCode);
      MsgBox('Please install Docker Desktop and restart this installer.', mbInformation, MB_OK);
      Result := False;
    end;
  end;
end;
"@
    
    Set-Content -Path $issScript -Value $issContent -Encoding UTF8
    Write-Success "Inno Setup script created: $issScript"
    
    # Compile with Inno Setup
    Write-Info "Compiling installer with Inno Setup..."
    $result = & $innoSetupPath $issScript
    
    if ($LASTEXITCODE -eq 0) {
        $installerPath = Join-Path $Script:Config.OutputPath "SMS_Setup_$($Script:Config.Version).exe"
        Write-Success "Installer created: $installerPath"
        return $installerPath
    } else {
        Write-Error-Message "Inno Setup compilation failed"
        return $null
    }
}

# ============================================================================
# ADVANCED INSTALLER METHOD (Commercial, MSI installer)
# ============================================================================

function Build-AdvancedInstaller-Installer {
    Write-Info "Building MSI installer with Advanced Installer..."
    
    # Check if Advanced Installer is installed
    $aiPath = "${env:ProgramFiles(x86)}\Caphyon\Advanced Installer 21.3\bin\x86\AdvancedInstaller.com"
    if (-not (Test-Path $aiPath)) {
        Write-Warning-Message "Advanced Installer not found."
        Write-Info "This is a commercial tool. Download from: https://www.advancedinstaller.com/"
        Write-Info "Falling back to PS2EXE method..."
        return Build-PS2EXE-Installer
    }
    
    # Create Advanced Installer project (AIP file)
    # This is a simplified example - full implementation would require extensive XML generation
    Write-Warning-Message "Advanced Installer integration not fully implemented in this version."
    Write-Info "Using PS2EXE method instead..."
    
    return Build-PS2EXE-Installer
}

# ============================================================================
# PACKAGE CREATION
# ============================================================================

function New-DistributionPackage {
    param([string]$InstallerPath)
    
    Write-Info "Creating distribution package..."
    
    $packageDir = Join-Path $Script:Config.OutputPath "SMS_Distribution_$($Script:Config.Version)"
    New-Item -ItemType Directory -Path $packageDir -Force | Out-Null
    
    # Copy installer
    Copy-Item -Path $InstallerPath -Destination $packageDir
    
    # Copy uninstaller if exists
    $uninstallerPath = Join-Path $Script:Config.OutputPath "SMS_Uninstaller_$($Script:Config.Version).exe"
    if (Test-Path $uninstallerPath) {
        Copy-Item -Path $uninstallerPath -Destination $packageDir
    }
    
    # Copy documentation
    $docFiles = @("README.md", "LICENSE", "CHANGELOG.md", "INSTALLATION_GUIDE.md")
    foreach ($docFile in $docFiles) {
        $docPath = Join-Path $PSScriptRoot "..\..\$docFile"
        if (Test-Path $docPath) {
            Copy-Item -Path $docPath -Destination $packageDir
        }
    }
    
    # Create README for distribution
    $distReadme = @"
# Student Management System - Distribution Package
Version: $($Script:Config.Version)

## Quick Installation

### Option 1: One-Click Installer (Recommended)
1. Right-click **SMS_Installer_$($Script:Config.Version).exe**
2. Select **"Run as Administrator"**
3. Follow the installation wizard

The installer will:
- Check system requirements
- Install Docker Desktop (if needed)
- Configure the application
- Build and start the system automatically

### Option 2: Manual Installation
If you prefer manual installation or the automated installer fails:

1. **Install Docker Desktop**
   - Download from: https://www.docker.com/products/docker-desktop
   - Install and start Docker Desktop

2. **Extract this package** to desired location (e.g., C:\SMS)

3. **Run installation script**
   ```powershell
   cd C:\SMS
   .\DOCKER.ps1 -Install
   ```

## System Requirements

- Windows 10/11 (64-bit)
- Docker Desktop 20.10.0 or later
- 4 GB RAM (8 GB recommended)
- 10 GB free disk space
- Internet connection (first-time setup)

## Uninstallation

To uninstall the application:

1. Right-click **SMS_Uninstaller_$($Script:Config.Version).exe**
2. Select **"Run as Administrator"**
3. Choose your data retention options:
   - Keep data (recommended for reinstallation)
   - Remove all data (complete uninstall)
4. Follow the wizard

## Default Credentials

After installation, access the application at: **http://localhost:8080**

- Email: admin@example.com
- Password: YourSecurePassword123!

⚠️ **IMPORTANT:** Change the default password immediately after first login!

## Support

- GitHub Repository: https://github.com/bs1gr/AUT_MIEEK_SMS
- Documentation: See INSTALLATION_GUIDE.md
- Issues: https://github.com/bs1gr/AUT_MIEEK_SMS/issues

---

© $(Get-Date -Format yyyy) $($Script:Config.Publisher) | Version $($Script:Config.Version)
"@
    
    Set-Content -Path (Join-Path $packageDir "README.txt") -Value $distReadme
    Write-Success "Distribution README created"
    
    # Create ZIP archive
    Write-Info "Creating ZIP archive..."
    $zipPath = "$packageDir.zip"
    Compress-Archive -Path $packageDir -DestinationPath $zipPath -Force
    Write-Success "Distribution package created: $zipPath"
    
    return $zipPath
}

# ============================================================================
# MAIN BUILD PROCESS
# ============================================================================

function Start-Build {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  SMS Installer Builder" -ForegroundColor Cyan
    Write-Host "  Version: $($Script:Config.Version)" -ForegroundColor Cyan
    Write-Host "  Method: $Method" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Validate source files
    if (-not (Test-Path $Script:Config.InstallerScript)) {
        Write-Error-Message "Installer script not found: $($Script:Config.InstallerScript)"
        exit 1
    }
    
    if ($IncludeUninstaller -and -not (Test-Path $Script:Config.UninstallerScript)) {
        Write-Error-Message "Uninstaller script not found: $($Script:Config.UninstallerScript)"
        exit 1
    }
    
    # Build based on selected method
    $installerPath = switch ($Method) {
        "PS2EXE" {
            Install-PS2EXE
            Build-PS2EXE-Installer
        }
        "InnoSetup" {
            Build-InnoSetup-Installer
        }
        "AdvancedInstaller" {
            Build-AdvancedInstaller-Installer
        }
    }
    
    if ($installerPath) {
        # Create distribution package
        $packagePath = New-DistributionPackage -InstallerPath $installerPath
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  Build Completed Successfully!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Installer: $installerPath" -ForegroundColor Green
        Write-Host "Package: $packagePath" -ForegroundColor Green
        Write-Host ""
        Write-Host "To distribute:" -ForegroundColor Cyan
        Write-Host "  1. Test the installer on a clean Windows 10/11 machine" -ForegroundColor Cyan
        Write-Host "  2. Distribute the ZIP package to users" -ForegroundColor Cyan
        Write-Host "  3. Users should run SMS_Installer_*.exe as Administrator" -ForegroundColor Cyan
        Write-Host ""
    } else {
        Write-Error-Message "Build failed"
        exit 1
    }
}

# ============================================================================
# ENTRY POINT
# ============================================================================

try {
    Start-Build
} catch {
    Write-Error-Message "Build failed: $_"
    exit 1
}
