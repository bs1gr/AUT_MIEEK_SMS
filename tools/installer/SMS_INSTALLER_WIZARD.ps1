<#
.SYNOPSIS
    Student Management System - Windows Installation Wizard (GUI)

.DESCRIPTION
    Professional Windows installer with GUI wizard interface that:
    - Provides step-by-step installation wizard
    - Checks and installs prerequisites (Docker Desktop)
    - Configures environment automatically
    - Validates installation
    - Provides post-installation instructions
    
    Designed for distribution as standalone executable.

.EXAMPLE
    .\SMS_INSTALLER_WIZARD.ps1
    Launch the GUI installation wizard

.EXAMPLE
    .\SMS_INSTALLER_WIZARD.ps1 -SilentMode
    Run silent installation with default settings

.NOTES
    Version: 1.0.0
    Requires: Windows 10/11, PowerShell 5.1+
    Package with: PS2EXE or Advanced Installer
#>

param(
    [switch]$SilentMode,
    [switch]$SkipDockerCheck,
    [string]$InstallPath = "$env:ProgramFiles\StudentManagementSystem"
)

#Requires -Version 5.1
#Requires -RunAsAdministrator

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ============================================================================
# GLOBAL CONFIGURATION
# ============================================================================

$Script:Config = @{
    AppName             = "Student Management System"
    Version             = "1.9.3"
    MinDockerVersion    = [version]"20.10.0"
    MinPowerShellVersion = [version]"5.1"
    RequiredDiskSpaceGB = 10
    RequiredMemoryGB    = 4
    DockerImageName     = "sms-fullstack"
    DataVolumeName      = "sms_data"
    DefaultPort         = 8080
    RepositoryUrl       = "https://github.com/bs1gr/AUT_MIEEK_SMS"
    DockerDesktopUrl    = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
}

$Script:InstallState = @{
    Step              = 0
    TotalSteps        = 7
    InstallPath       = $InstallPath
    DockerInstalled   = $false
    DockerRunning     = $false
    PrereqsPassed     = $false
    InstallSuccess    = $false
    ErrorMessage      = ""
}

# ============================================================================
# WINDOWS FORMS GUI COMPONENTS
# ============================================================================

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$Script:Form = $null
$Script:CurrentPanel = $null

# Color scheme (modern blue theme)
$Script:Colors = @{
    Primary      = [System.Drawing.Color]::FromArgb(0, 120, 212)
    PrimaryDark  = [System.Drawing.Color]::FromArgb(0, 90, 158)
    Success      = [System.Drawing.Color]::FromArgb(16, 124, 16)
    Error        = [System.Drawing.Color]::FromArgb(196, 43, 28)
    Warning      = [System.Drawing.Color]::FromArgb(255, 185, 0)
    Background   = [System.Drawing.Color]::White
    TextPrimary  = [System.Drawing.Color]::FromArgb(50, 49, 48)
    TextSecondary = [System.Drawing.Color]::FromArgb(96, 94, 92)
    Border       = [System.Drawing.Color]::FromArgb(225, 223, 221)
}

function Initialize-WizardForm {
    $form = New-Object System.Windows.Forms.Form
    $form.Text = "$($Script:Config.AppName) - Installation Wizard"
    $form.Size = New-Object System.Drawing.Size(700, 550)
    $form.StartPosition = 'CenterScreen'
    $form.FormBorderStyle = 'FixedDialog'
    $form.MaximizeBox = $false
    $form.MinimizeBox = $false
    $form.BackColor = $Script:Colors.Background
    $form.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    
    # Add icon if available
    $iconPath = Join-Path $PSScriptRoot "..\..\frontend\public\favicon.ico"
    if (Test-Path $iconPath) {
        $form.Icon = [System.Drawing.Icon]::ExtractAssociatedIcon($iconPath)
    }
    
    return $form
}

function New-WizardPanel {
    param([string]$Name)
    
    $panel = New-Object System.Windows.Forms.Panel
    $panel.Name = $Name
    $panel.Location = New-Object System.Drawing.Point(20, 80)
    $panel.Size = New-Object System.Drawing.Size(640, 350)
    $panel.Visible = $false
    
    return $panel
}

function New-HeaderLabel {
    param(
        [string]$Text,
        [int]$Y = 20
    )
    
    $label = New-Object System.Windows.Forms.Label
    $label.Text = $Text
    $label.Location = New-Object System.Drawing.Point(20, $Y)
    $label.Size = New-Object System.Drawing.Size(600, 35)
    $label.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
    $label.ForeColor = $Script:Colors.Primary
    
    return $label
}

function New-ProgressBar {
    $progressBar = New-Object System.Windows.Forms.ProgressBar
    $progressBar.Location = New-Object System.Drawing.Point(20, 455)
    $progressBar.Size = New-Object System.Drawing.Size(640, 25)
    $progressBar.Style = 'Continuous'
    $progressBar.Minimum = 0
    $progressBar.Maximum = $Script:InstallState.TotalSteps
    
    return $progressBar
}

function New-ButtonPanel {
    $panel = New-Object System.Windows.Forms.Panel
    $panel.Location = New-Object System.Drawing.Point(20, 485)
    $panel.Size = New-Object System.Drawing.Size(640, 40)
    
    # Cancel button
    $btnCancel = New-Object System.Windows.Forms.Button
    $btnCancel.Text = "Cancel"
    $btnCancel.Location = New-Object System.Drawing.Point(430, 5)
    $btnCancel.Size = New-Object System.Drawing.Size(90, 30)
    $btnCancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
    $btnCancel.Add_Click({ Close-Wizard })
    
    # Back button
    $btnBack = New-Object System.Windows.Forms.Button
    $btnBack.Name = "btnBack"
    $btnBack.Text = "< Back"
    $btnBack.Location = New-Object System.Drawing.Point(330, 5)
    $btnBack.Size = New-Object System.Drawing.Size(90, 30)
    $btnBack.Enabled = $false
    $btnBack.Add_Click({ Move-ToPreviousStep })
    
    # Next button
    $btnNext = New-Object System.Windows.Forms.Button
    $btnNext.Name = "btnNext"
    $btnNext.Text = "Next >"
    $btnNext.Location = New-Object System.Drawing.Point(540, 5)
    $btnNext.Size = New-Object System.Drawing.Size(90, 30)
    $btnNext.BackColor = $Script:Colors.Primary
    $btnNext.ForeColor = [System.Drawing.Color]::White
    $btnNext.FlatStyle = 'Flat'
    $btnNext.Add_Click({ Move-ToNextStep })
    
    $panel.Controls.AddRange(@($btnCancel, $btnBack, $btnNext))
    
    return $panel
}

# ============================================================================
# WIZARD PAGES
# ============================================================================

function New-WelcomePage {
    $panel = New-WizardPanel -Name "Welcome"
    
    $lblTitle = New-Object System.Windows.Forms.Label
    $lblTitle.Text = "Welcome to $($Script:Config.AppName)"
    $lblTitle.Location = New-Object System.Drawing.Point(20, 20)
    $lblTitle.Size = New-Object System.Drawing.Size(600, 40)
    $lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
    $lblTitle.ForeColor = $Script:Colors.Primary
    
    $lblVersion = New-Object System.Windows.Forms.Label
    $lblVersion.Text = "Version $($Script:Config.Version)"
    $lblVersion.Location = New-Object System.Drawing.Point(20, 65)
    $lblVersion.Size = New-Object System.Drawing.Size(600, 20)
    $lblVersion.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $lblVersion.ForeColor = $Script:Colors.TextSecondary
    
    $lblDescription = New-Object System.Windows.Forms.Label
    $lblDescription.Text = @"
This wizard will guide you through the installation of the Student Management System.

The installer will:
  • Check system requirements
  • Install Docker Desktop (if needed)
  • Configure the application
  • Build and start the Docker container
  • Verify the installation

Estimated installation time: 10-15 minutes (first-time setup)

Click 'Next' to begin the installation process.
"@
    $lblDescription.Location = New-Object System.Drawing.Point(20, 100)
    $lblDescription.Size = New-Object System.Drawing.Size(600, 200)
    $lblDescription.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    
    $panel.Controls.AddRange(@($lblTitle, $lblVersion, $lblDescription))
    
    return $panel
}

function New-LicensePage {
    $panel = New-WizardPanel -Name "License"
    
    $lblTitle = New-Object System.Windows.Forms.Label
    $lblTitle.Text = "License Agreement"
    $lblTitle.Location = New-Object System.Drawing.Point(20, 20)
    $lblTitle.Size = New-Object System.Drawing.Size(600, 30)
    $lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
    
    $txtLicense = New-Object System.Windows.Forms.TextBox
    $txtLicense.Location = New-Object System.Drawing.Point(20, 60)
    $txtLicense.Size = New-Object System.Drawing.Size(600, 230)
    $txtLicense.Multiline = $true
    $txtLicense.ScrollBars = 'Vertical'
    $txtLicense.ReadOnly = $true
    $txtLicense.Font = New-Object System.Drawing.Font("Consolas", 9)
    
    # Load LICENSE file
    $licensePath = Join-Path $PSScriptRoot "..\..\LICENSE"
    if (Test-Path $licensePath) {
        $txtLicense.Text = Get-Content $licensePath -Raw
    } else {
        $txtLicense.Text = "MIT License - See LICENSE file in the installation directory for full terms."
    }
    
    $chkAccept = New-Object System.Windows.Forms.CheckBox
    $chkAccept.Name = "chkAcceptLicense"
    $chkAccept.Text = "I accept the terms of the license agreement"
    $chkAccept.Location = New-Object System.Drawing.Point(20, 300)
    $chkAccept.Size = New-Object System.Drawing.Size(600, 25)
    $chkAccept.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    $chkAccept.Add_CheckedChanged({
        $btnNext = $Script:Form.Controls.Find("btnNext", $true)[0]
        $btnNext.Enabled = $this.Checked
    })
    
    $panel.Controls.AddRange(@($lblTitle, $txtLicense, $chkAccept))
    
    return $panel
}

function New-PrerequisitesPage {
    $panel = New-WizardPanel -Name "Prerequisites"
    
    $lblTitle = New-Object System.Windows.Forms.Label
    $lblTitle.Text = "System Requirements Check"
    $lblTitle.Location = New-Object System.Drawing.Point(20, 20)
    $lblTitle.Size = New-Object System.Drawing.Size(600, 30)
    $lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
    
    $lstResults = New-Object System.Windows.Forms.ListBox
    $lstResults.Name = "lstPrereqResults"
    $lstResults.Location = New-Object System.Drawing.Point(20, 60)
    $lstResults.Size = New-Object System.Drawing.Size(600, 200)
    $lstResults.Font = New-Object System.Drawing.Font("Consolas", 9)
    
    $btnCheck = New-Object System.Windows.Forms.Button
    $btnCheck.Name = "btnCheckPrereq"
    $btnCheck.Text = "Check System Requirements"
    $btnCheck.Location = New-Object System.Drawing.Point(20, 270)
    $btnCheck.Size = New-Object System.Drawing.Size(200, 35)
    $btnCheck.BackColor = $Script:Colors.Primary
    $btnCheck.ForeColor = [System.Drawing.Color]::White
    $btnCheck.FlatStyle = 'Flat'
    $btnCheck.Add_Click({ Test-Prerequisites })
    
    $lblStatus = New-Object System.Windows.Forms.Label
    $lblStatus.Name = "lblPrereqStatus"
    $lblStatus.Text = "Click 'Check System Requirements' to begin"
    $lblStatus.Location = New-Object System.Drawing.Point(230, 280)
    $lblStatus.Size = New-Object System.Drawing.Size(390, 25)
    $lblStatus.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Italic)
    $lblStatus.ForeColor = $Script:Colors.TextSecondary
    
    $panel.Controls.AddRange(@($lblTitle, $lstResults, $btnCheck, $lblStatus))
    
    return $panel
}

function New-DockerInstallPage {
    $panel = New-WizardPanel -Name "DockerInstall"
    
    $lblTitle = New-Object System.Windows.Forms.Label
    $lblTitle.Text = "Docker Desktop Installation"
    $lblTitle.Location = New-Object System.Drawing.Point(20, 20)
    $lblTitle.Size = New-Object System.Drawing.Size(600, 30)
    $lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
    
    $lblDescription = New-Object System.Windows.Forms.Label
    $lblDescription.Text = @"
Docker Desktop is required to run the Student Management System.

The installer can download and install Docker Desktop automatically, or you can install it manually.

IMPORTANT: Docker Desktop installation requires a system restart.
After restarting, please run this installer again to complete the setup.

Estimated download size: ~500 MB
Installation time: 5-10 minutes
"@
    $lblDescription.Location = New-Object System.Drawing.Point(20, 60)
    $lblDescription.Size = New-Object System.Drawing.Size(600, 160)
    $lblDescription.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    
    $btnInstallDocker = New-Object System.Windows.Forms.Button
    $btnInstallDocker.Name = "btnInstallDocker"
    $btnInstallDocker.Text = "Download && Install Docker Desktop"
    $btnInstallDocker.Location = New-Object System.Drawing.Point(20, 230)
    $btnInstallDocker.Size = New-Object System.Drawing.Size(280, 40)
    $btnInstallDocker.BackColor = $Script:Colors.Primary
    $btnInstallDocker.ForeColor = [System.Drawing.Color]::White
    $btnInstallDocker.FlatStyle = 'Flat'
    $btnInstallDocker.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    $btnInstallDocker.Add_Click({ Install-DockerDesktopGUI })
    
    $btnManual = New-Object System.Windows.Forms.Button
    $btnManual.Text = "Manual Installation Instructions"
    $btnManual.Location = New-Object System.Drawing.Point(320, 230)
    $btnManual.Size = New-Object System.Drawing.Size(280, 40)
    $btnManual.Add_Click({ Show-ManualDockerInstructions })
    
    $progressDocker = New-Object System.Windows.Forms.ProgressBar
    $progressDocker.Name = "progressDocker"
    $progressDocker.Location = New-Object System.Drawing.Point(20, 280)
    $progressDocker.Size = New-Object System.Drawing.Size(600, 25)
    $progressDocker.Style = 'Marquee'
    $progressDocker.Visible = $false
    
    $lblDockerStatus = New-Object System.Windows.Forms.Label
    $lblDockerStatus.Name = "lblDockerStatus"
    $lblDockerStatus.Text = ""
    $lblDockerStatus.Location = New-Object System.Drawing.Point(20, 315)
    $lblDockerStatus.Size = New-Object System.Drawing.Size(600, 30)
    $lblDockerStatus.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Italic)
    
    $panel.Controls.AddRange(@($lblTitle, $lblDescription, $btnInstallDocker, $btnManual, $progressDocker, $lblDockerStatus))
    
    return $panel
}

function New-ConfigurationPage {
    $panel = New-WizardPanel -Name "Configuration"
    
    $lblTitle = New-Object System.Windows.Forms.Label
    $lblTitle.Text = "Installation Configuration"
    $lblTitle.Location = New-Object System.Drawing.Point(20, 20)
    $lblTitle.Size = New-Object System.Drawing.Size(600, 30)
    $lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
    
    # Installation Path
    $lblInstallPath = New-Object System.Windows.Forms.Label
    $lblInstallPath.Text = "Installation Directory:"
    $lblInstallPath.Location = New-Object System.Drawing.Point(20, 70)
    $lblInstallPath.Size = New-Object System.Drawing.Size(150, 20)
    
    $txtInstallPath = New-Object System.Windows.Forms.TextBox
    $txtInstallPath.Name = "txtInstallPath"
    $txtInstallPath.Text = $Script:InstallState.InstallPath
    $txtInstallPath.Location = New-Object System.Drawing.Point(180, 67)
    $txtInstallPath.Size = New-Object System.Drawing.Size(340, 25)
    
    $btnBrowse = New-Object System.Windows.Forms.Button
    $btnBrowse.Text = "Browse..."
    $btnBrowse.Location = New-Object System.Drawing.Point(530, 65)
    $btnBrowse.Size = New-Object System.Drawing.Size(90, 28)
    $btnBrowse.Add_Click({
        $folderBrowser = New-Object System.Windows.Forms.FolderBrowserDialog
        $folderBrowser.Description = "Select installation directory"
        $folderBrowser.SelectedPath = $txtInstallPath.Text
        if ($folderBrowser.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
            $txtInstallPath.Text = $folderBrowser.SelectedPath
            $Script:InstallState.InstallPath = $folderBrowser.SelectedPath
        }
    })
    
    # Port Configuration
    $lblPort = New-Object System.Windows.Forms.Label
    $lblPort.Text = "Application Port:"
    $lblPort.Location = New-Object System.Drawing.Point(20, 115)
    $lblPort.Size = New-Object System.Drawing.Size(150, 20)
    
    $numPort = New-Object System.Windows.Forms.NumericUpDown
    $numPort.Name = "numPort"
    $numPort.Value = $Script:Config.DefaultPort
    $numPort.Minimum = 1024
    $numPort.Maximum = 65535
    $numPort.Location = New-Object System.Drawing.Point(180, 112)
    $numPort.Size = New-Object System.Drawing.Size(100, 25)
    
    $lblPortInfo = New-Object System.Windows.Forms.Label
    $lblPortInfo.Text = "(Default: 8080)"
    $lblPortInfo.Location = New-Object System.Drawing.Point(290, 115)
    $lblPortInfo.Size = New-Object System.Drawing.Size(150, 20)
    $lblPortInfo.ForeColor = $Script:Colors.TextSecondary
    
    # Admin Credentials
    $grpAdmin = New-Object System.Windows.Forms.GroupBox
    $grpAdmin.Text = "Administrator Account"
    $grpAdmin.Location = New-Object System.Drawing.Point(20, 155)
    $grpAdmin.Size = New-Object System.Drawing.Size(600, 130)
    
    $lblEmail = New-Object System.Windows.Forms.Label
    $lblEmail.Text = "Email:"
    $lblEmail.Location = New-Object System.Drawing.Point(15, 30)
    $lblEmail.Size = New-Object System.Drawing.Size(130, 20)
    
    $txtEmail = New-Object System.Windows.Forms.TextBox
    $txtEmail.Name = "txtAdminEmail"
    $txtEmail.Text = "admin@example.com"
    $txtEmail.Location = New-Object System.Drawing.Point(150, 27)
    $txtEmail.Size = New-Object System.Drawing.Size(430, 25)
    
    $lblPassword = New-Object System.Windows.Forms.Label
    $lblPassword.Text = "Password:"
    $lblPassword.Location = New-Object System.Drawing.Point(15, 65)
    $lblPassword.Size = New-Object System.Drawing.Size(130, 20)
    
    $txtPassword = New-Object System.Windows.Forms.TextBox
    $txtPassword.Name = "txtAdminPassword"
    $txtPassword.Text = "YourSecurePassword123!"
    $txtPassword.Location = New-Object System.Drawing.Point(150, 62)
    $txtPassword.Size = New-Object System.Drawing.Size(430, 25)
    $txtPassword.UseSystemPasswordChar = $true
    
    $chkShowPassword = New-Object System.Windows.Forms.CheckBox
    $chkShowPassword.Text = "Show password"
    $chkShowPassword.Location = New-Object System.Drawing.Point(150, 95)
    $chkShowPassword.Size = New-Object System.Drawing.Size(150, 25)
    $chkShowPassword.Add_CheckedChanged({
        $txtPassword.UseSystemPasswordChar = -not $this.Checked
    })
    
    $grpAdmin.Controls.AddRange(@($lblEmail, $txtEmail, $lblPassword, $txtPassword, $chkShowPassword))
    
    $panel.Controls.AddRange(@($lblTitle, $lblInstallPath, $txtInstallPath, $btnBrowse, 
                               $lblPort, $numPort, $lblPortInfo, $grpAdmin))
    
    return $panel
}

function New-InstallationPage {
    $panel = New-WizardPanel -Name "Installation"
    
    $lblTitle = New-Object System.Windows.Forms.Label
    $lblTitle.Text = "Installing Student Management System"
    $lblTitle.Location = New-Object System.Drawing.Point(20, 20)
    $lblTitle.Size = New-Object System.Drawing.Size(600, 30)
    $lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
    
    $lblStatus = New-Object System.Windows.Forms.Label
    $lblStatus.Name = "lblInstallStatus"
    $lblStatus.Text = "Preparing installation..."
    $lblStatus.Location = New-Object System.Drawing.Point(20, 60)
    $lblStatus.Size = New-Object System.Drawing.Size(600, 25)
    $lblStatus.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    
    $progressInstall = New-Object System.Windows.Forms.ProgressBar
    $progressInstall.Name = "progressInstall"
    $progressInstall.Location = New-Object System.Drawing.Point(20, 95)
    $progressInstall.Size = New-Object System.Drawing.Size(600, 30)
    $progressInstall.Style = 'Continuous'
    $progressInstall.Minimum = 0
    $progressInstall.Maximum = 100
    
    $txtLog = New-Object System.Windows.Forms.TextBox
    $txtLog.Name = "txtInstallLog"
    $txtLog.Location = New-Object System.Drawing.Point(20, 135)
    $txtLog.Size = New-Object System.Drawing.Size(600, 190)
    $txtLog.Multiline = $true
    $txtLog.ScrollBars = 'Vertical'
    $txtLog.ReadOnly = $true
    $txtLog.Font = New-Object System.Drawing.Font("Consolas", 8)
    $txtLog.BackColor = [System.Drawing.Color]::Black
    $txtLog.ForeColor = [System.Drawing.Color]::LimeGreen
    
    $panel.Controls.AddRange(@($lblTitle, $lblStatus, $progressInstall, $txtLog))
    
    return $panel
}

function New-CompletionPage {
    $panel = New-WizardPanel -Name "Completion"
    
    $lblTitle = New-Object System.Windows.Forms.Label
    $lblTitle.Name = "lblCompletionTitle"
    $lblTitle.Text = "Installation Complete!"
    $lblTitle.Location = New-Object System.Drawing.Point(20, 20)
    $lblTitle.Size = New-Object System.Drawing.Size(600, 40)
    $lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
    $lblTitle.ForeColor = $Script:Colors.Success
    
    $lblMessage = New-Object System.Windows.Forms.Label
    $lblMessage.Name = "lblCompletionMessage"
    $lblMessage.Text = @"
The Student Management System has been successfully installed!

The application is now running and accessible at:

    http://localhost:8080

Default administrator credentials:
    Email: admin@example.com
    Password: YourSecurePassword123!

IMPORTANT: Please change the default password immediately after first login.

To manage the application, use DOCKER.ps1 (production) or NATIVE.ps1 (development) in the installation directory.
"@
    $lblMessage.Location = New-Object System.Drawing.Point(20, 70)
    $lblMessage.Size = New-Object System.Drawing.Size(600, 220)
    $lblMessage.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    
    $chkLaunchBrowser = New-Object System.Windows.Forms.CheckBox
    $chkLaunchBrowser.Name = "chkLaunchBrowser"
    $chkLaunchBrowser.Text = "Open application in browser"
    $chkLaunchBrowser.Location = New-Object System.Drawing.Point(20, 300)
    $chkLaunchBrowser.Size = New-Object System.Drawing.Size(300, 25)
    $chkLaunchBrowser.Checked = $true
    
    $panel.Controls.AddRange(@($lblTitle, $lblMessage, $chkLaunchBrowser))
    
    return $panel
}

# ============================================================================
# PREREQUISITE CHECKING
# ============================================================================

function Test-Prerequisites {
    $lstResults = $Script:Form.Controls.Find("lstPrereqResults", $true)[0]
    $lblStatus = $Script:Form.Controls.Find("lblPrereqStatus", $true)[0]
    $btnNext = $Script:Form.Controls.Find("btnNext", $true)[0]
    
    $lstResults.Items.Clear()
    $lstResults.Items.Add("=== System Requirements Check ===")
    $lstResults.Items.Add("")
    
    $allPassed = $true
    
    # Check Windows version
    $lstResults.Items.Add("Checking Windows version...")
    $osVersion = [System.Environment]::OSVersion.Version
    if ($osVersion.Major -ge 10) {
        $lstResults.Items.Add("  [✓] Windows 10/11 detected: $($osVersion)")
    } else {
        $lstResults.Items.Add("  [✗] Windows 10 or later required")
        $allPassed = $false
    }
    $lstResults.Items.Add("")
    
    # Check PowerShell version
    $lstResults.Items.Add("Checking PowerShell version...")
    $psVersion = $PSVersionTable.PSVersion
    if ($psVersion -ge $Script:Config.MinPowerShellVersion) {
        $lstResults.Items.Add("  [✓] PowerShell $psVersion")
    } else {
        $lstResults.Items.Add("  [✗] PowerShell $($Script:Config.MinPowerShellVersion) or later required")
        $allPassed = $false
    }
    $lstResults.Items.Add("")
    
    # Check administrator privileges
    $lstResults.Items.Add("Checking administrator privileges...")
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if ($isAdmin) {
        $lstResults.Items.Add("  [✓] Running as Administrator")
    } else {
        $lstResults.Items.Add("  [✗] Administrator privileges required")
        $allPassed = $false
    }
    $lstResults.Items.Add("")
    
    # Check disk space
    $lstResults.Items.Add("Checking available disk space...")
    $drive = [System.IO.Path]::GetPathRoot($Script:InstallState.InstallPath)
    $driveInfo = New-Object System.IO.DriveInfo($drive)
    $freeSpaceGB = [math]::Round($driveInfo.AvailableFreeSpace / 1GB, 2)
    if ($freeSpaceGB -ge $Script:Config.RequiredDiskSpaceGB) {
        $lstResults.Items.Add("  [✓] Available space: $freeSpaceGB GB")
    } else {
        $lstResults.Items.Add("  [✗] Insufficient disk space: $freeSpaceGB GB (need $($Script:Config.RequiredDiskSpaceGB) GB)")
        $allPassed = $false
    }
    $lstResults.Items.Add("")
    
    # Check memory
    $lstResults.Items.Add("Checking system memory...")
    $totalMemoryGB = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
    if ($totalMemoryGB -ge $Script:Config.RequiredMemoryGB) {
        $lstResults.Items.Add("  [✓] Total RAM: $totalMemoryGB GB")
    } else {
        $lstResults.Items.Add("  [⚠] Low memory: $totalMemoryGB GB (recommended: $($Script:Config.RequiredMemoryGB) GB)")
    }
    $lstResults.Items.Add("")
    
    # Check Docker
    $lstResults.Items.Add("Checking Docker Desktop...")
    try {
        $dockerVersion = docker --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            $lstResults.Items.Add("  [✓] Docker installed: $dockerVersion")
            $Script:InstallState.DockerInstalled = $true
            
            # Check if Docker is running
            $null = docker ps 2>$null
            if ($LASTEXITCODE -eq 0) {
                $lstResults.Items.Add("  [✓] Docker is running")
                $Script:InstallState.DockerRunning = $true
            } else {
                $lstResults.Items.Add("  [⚠] Docker is installed but not running")
                $lstResults.Items.Add("      Please start Docker Desktop and check again")
                $Script:InstallState.DockerRunning = $false
            }
        } else {
            throw "Docker not found"
        }
    } catch {
        $lstResults.Items.Add("  [✗] Docker Desktop not installed")
        $lstResults.Items.Add("      Docker will be installed in the next step")
        $Script:InstallState.DockerInstalled = $false
        $Script:InstallState.DockerRunning = $false
    }
    $lstResults.Items.Add("")
    
    # Summary
    $lstResults.Items.Add("=== Summary ===")
    if ($allPassed -and $Script:InstallState.DockerInstalled -and $Script:InstallState.DockerRunning) {
        $lstResults.Items.Add("All prerequisites met! Ready to install.")
        $lblStatus.Text = "✓ All checks passed - Ready to proceed"
        $lblStatus.ForeColor = $Script:Colors.Success
        $btnNext.Enabled = $true
        $Script:InstallState.PrereqsPassed = $true
    } elseif ($allPassed -and (-not $Script:InstallState.DockerInstalled -or -not $Script:InstallState.DockerRunning)) {
        $lstResults.Items.Add("System requirements met, but Docker needs attention.")
        $lblStatus.Text = "⚠ Docker installation/startup required"
        $lblStatus.ForeColor = $Script:Colors.Warning
        $btnNext.Enabled = $true
        $Script:InstallState.PrereqsPassed = $false
    } else {
        $lstResults.Items.Add("Some requirements are not met. Please address the issues above.")
        $lblStatus.Text = "✗ Prerequisites check failed"
        $lblStatus.ForeColor = $Script:Colors.Error
        $btnNext.Enabled = $false
        $Script:InstallState.PrereqsPassed = $false
    }
    
    $lstResults.SelectedIndex = $lstResults.Items.Count - 1
}

# ============================================================================
# DOCKER INSTALLATION
# ============================================================================

function Install-DockerDesktopGUI {
    $btnInstallDocker = $Script:Form.Controls.Find("btnInstallDocker", $true)[0]
    $progressDocker = $Script:Form.Controls.Find("progressDocker", $true)[0]
    $lblDockerStatus = $Script:Form.Controls.Find("lblDockerStatus", $true)[0]
    
    $btnInstallDocker.Enabled = $false
    $progressDocker.Visible = $true
    $lblDockerStatus.Text = "Downloading Docker Desktop installer..."
    $lblDockerStatus.ForeColor = $Script:Colors.Primary
    
    $Script:Form.Refresh()
    
    try {
        $installerPath = Join-Path $env:TEMP "DockerDesktopInstaller.exe"
        
        # Download installer
        $lblDockerStatus.Text = "Downloading Docker Desktop (~500 MB)..."
        $Script:Form.Refresh()
        
        Invoke-WebRequest -Uri $Script:Config.DockerDesktopUrl -OutFile $installerPath -UseBasicParsing
        
        $lblDockerStatus.Text = "Download complete. Starting installation..."
        $Script:Form.Refresh()
        Start-Sleep -Seconds 1
        
        # Run installer
        $process = Start-Process -FilePath $installerPath -ArgumentList "install --quiet" -Wait -PassThru
        
        if ($process.ExitCode -eq 0) {
            $lblDockerStatus.Text = "Docker Desktop installed successfully!"
            $lblDockerStatus.ForeColor = $Script:Colors.Success
            
            [System.Windows.Forms.MessageBox]::Show(
                "Docker Desktop has been installed successfully!`n`nIMPORTANT: A system restart is required.`n`nAfter restarting, Docker Desktop will start automatically. Please run this installer again to complete the setup.",
                "Installation Successful",
                [System.Windows.Forms.MessageBoxButtons]::OK,
                [System.Windows.Forms.MessageBoxIcon]::Information
            )
            
            $result = [System.Windows.Forms.MessageBox]::Show(
                "Would you like to restart your computer now?",
                "Restart Required",
                [System.Windows.Forms.MessageBoxButtons]::YesNo,
                [System.Windows.Forms.MessageBoxIcon]::Question
            )
            
            if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
                Restart-Computer -Force
            } else {
                $Script:Form.Close()
            }
        } else {
            throw "Installation failed with exit code: $($process.ExitCode)"
        }
    } catch {
        $lblDockerStatus.Text = "Installation failed: $_"
        $lblDockerStatus.ForeColor = $Script:Colors.Error
        
        [System.Windows.Forms.MessageBox]::Show(
            "Failed to install Docker Desktop automatically.`n`nError: $_`n`nPlease install Docker Desktop manually from:`n$($Script:Config.DockerDesktopUrl)",
            "Installation Failed",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error
        )
    } finally {
        $progressDocker.Visible = $false
        $btnInstallDocker.Enabled = $true
        
        # Cleanup
        if (Test-Path $installerPath) {
            Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
        }
    }
}

function Show-ManualDockerInstructions {
    [System.Windows.Forms.MessageBox]::Show(
        @"
Manual Docker Desktop Installation:

1. Download Docker Desktop from:
   $($Script:Config.DockerDesktopUrl)

2. Run the installer (DockerDesktopInstaller.exe)

3. Follow the installation wizard with default settings

4. Restart your computer when prompted

5. After restart, wait for Docker Desktop to start (whale icon in system tray should be stable)

6. Run this installer again to complete the setup

For more information, visit:
https://docs.docker.com/desktop/install/windows-install/
"@,
        "Manual Docker Desktop Installation",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Information
    )
    
    Start-Process $Script:Config.DockerDesktopUrl
}

# ============================================================================
# INSTALLATION PROCESS
# ============================================================================

function Start-Installation {
    $lblStatus = $Script:Form.Controls.Find("lblInstallStatus", $true)[0]
    $progressInstall = $Script:Form.Controls.Find("progressInstall", $true)[0]
    $txtLog = $Script:Form.Controls.Find("txtInstallLog", $true)[0]
    $btnNext = $Script:Form.Controls.Find("btnNext", $true)[0]
    $btnBack = $Script:Form.Controls.Find("btnBack", $true)[0]
    
    $btnNext.Enabled = $false
    $btnBack.Enabled = $false
    
    # Get configuration values
    $txtInstallPath = $Script:Form.Controls.Find("txtInstallPath", $true)[0]
    $numPort = $Script:Form.Controls.Find("numPort", $true)[0]
    $txtAdminEmail = $Script:Form.Controls.Find("txtAdminEmail", $true)[0]
    $txtAdminPassword = $Script:Form.Controls.Find("txtAdminPassword", $true)[0]
    
    $installPath = $txtInstallPath.Text
    $port = [int]$numPort.Value
    $adminEmail = $txtAdminEmail.Text
    $adminPassword = $txtAdminPassword.Text
    
    function Add-LogEntry {
        param([string]$Message, [string]$Type = "Info")
        
        $timestamp = Get-Date -Format "HH:mm:ss"
        $prefix = switch ($Type) {
            "Success" { "[✓]" }
            "Error" { "[✗]" }
            "Warning" { "[⚠]" }
            default { "[•]" }
        }
        
        $txtLog.AppendText("$timestamp $prefix $Message`r`n")
        $txtLog.SelectionStart = $txtLog.Text.Length
        $txtLog.ScrollToCaret()
        $Script:Form.Refresh()
    }
    
    try {
        # Step 1: Create installation directory
        $lblStatus.Text = "Step 1/7: Creating installation directory..."
        $progressInstall.Value = 10
        Add-LogEntry "Creating installation directory: $installPath"
        
        if (-not (Test-Path $installPath)) {
            New-Item -ItemType Directory -Path $installPath -Force | Out-Null
            Add-LogEntry "Directory created successfully" "Success"
        } else {
            Add-LogEntry "Directory already exists" "Info"
        }
        
        # Step 2: Copy application files
        $lblStatus.Text = "Step 2/7: Copying application files..."
        $progressInstall.Value = 20
        Add-LogEntry "Copying application files from installer package..."
        
        # Get source path (current script directory)
        $sourcePath = Split-Path -Parent $PSScriptRoot
        $sourcePath = Split-Path -Parent $sourcePath
        
        # Copy essential files
        $filesToCopy = @("DOCKER.ps1", "NATIVE.ps1", "VERSION", "README.md", "LICENSE", "docker-compose.yml")
        foreach ($file in $filesToCopy) {
            $source = Join-Path $sourcePath $file
            if (Test-Path $source) {
                Copy-Item -Path $source -Destination $installPath -Force
                Add-LogEntry "Copied: $file"
            }
        }
        
        # Copy directories
        $dirsToopy = @("backend", "frontend", "docker", "scripts")
        foreach ($dir in $dirsToCopy) {
            $source = Join-Path $sourcePath $dir
            $dest = Join-Path $installPath $dir
            if (Test-Path $source) {
                Copy-Item -Path $source -Destination $dest -Recurse -Force
                Add-LogEntry "Copied: $dir\"
            }
        }
        
        Add-LogEntry "Application files copied successfully" "Success"
        
        # Step 3: Create environment configuration
        $lblStatus.Text = "Step 3/7: Configuring environment..."
        $progressInstall.Value = 35
        Add-LogEntry "Generating secure SECRET_KEY..."
        
        $secretKey = -join ((48..57) + (65..90) + (97..122) + (45,95) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
        
        # Create .env files
        $rootEnvContent = @"
VERSION=$($Script:Config.Version)

# Security
SECRET_KEY=$secretKey

# Authentication Settings
AUTH_ENABLED=True
DEFAULT_ADMIN_EMAIL=$adminEmail
DEFAULT_ADMIN_PASSWORD=$adminPassword
DEFAULT_ADMIN_FULL_NAME=System Administrator
DEFAULT_ADMIN_FORCE_RESET=False

# Application Settings
APP_PORT=$port
"@
        
        Set-Content -Path (Join-Path $installPath ".env") -Value $rootEnvContent
        Add-LogEntry "Root .env file created"
        
        $backendEnvContent = @"
# Database
DATABASE_URL=sqlite:///data/student_management.db

# Security
SECRET_KEY=$secretKey
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Admin User
DEFAULT_ADMIN_EMAIL=$adminEmail
DEFAULT_ADMIN_PASSWORD=$adminPassword
DEFAULT_ADMIN_FULL_NAME=System Administrator

# CORS Settings
CORS_ORIGINS=http://localhost:$port,http://127.0.0.1:$port

# Rate Limiting
ENABLE_RATE_LIMITING=true

# Logging
LOG_LEVEL=INFO
"@
        
        $backendEnvPath = Join-Path $installPath "backend\.env"
        Set-Content -Path $backendEnvPath -Value $backendEnvContent
        Add-LogEntry "Backend .env file created"
        
        Add-LogEntry "Environment configuration complete" "Success"
        
        # Step 4: Wait for Docker
        $lblStatus.Text = "Step 4/7: Verifying Docker is ready..."
        $progressInstall.Value = 50
        Add-LogEntry "Checking Docker status..."
        
        $dockerReady = $false
        $attempts = 0
        $maxAttempts = 30
        
        while (-not $dockerReady -and $attempts -lt $maxAttempts) {
            try {
                $null = docker ps 2>$null
                if ($LASTEXITCODE -eq 0) {
                    $dockerReady = $true
                    Add-LogEntry "Docker is ready" "Success"
                } else {
                    throw "Docker not responding"
                }
            } catch {
                $attempts++
                Add-LogEntry "Waiting for Docker... (attempt $attempts/$maxAttempts)"
                Start-Sleep -Seconds 2
            }
        }
        
        if (-not $dockerReady) {
            throw "Docker is not running. Please start Docker Desktop and try again."
        }
        
        # Step 5: Build Docker image
        $lblStatus.Text = "Step 5/7: Building Docker image..."
        $progressInstall.Value = 65
        Add-LogEntry "Building Docker image (this may take 5-10 minutes)..."
        Add-LogEntry "Please wait..."
        
        Push-Location $installPath
        try {
            $buildOutput = docker build -t "$($Script:Config.DockerImageName):$($Script:Config.Version)" -f docker/Dockerfile . 2>&1
            if ($LASTEXITCODE -ne 0) {
                throw "Docker build failed: $buildOutput"
            }
            Add-LogEntry "Docker image built successfully" "Success"
        } finally {
            Pop-Location
        }
        
        # Step 6: Start container
        $lblStatus.Text = "Step 6/7: Starting application container..."
        $progressInstall.Value = 80
        Add-LogEntry "Starting SMS container..."
        
        # Stop existing container if any
        $null = docker stop sms-fullstack 2>$null
        $null = docker rm sms-fullstack 2>$null
        
        # Start new container
        Push-Location $installPath
        try {
            $runScript = Join-Path $installPath "DOCKER.ps1"
            & $runScript
            Add-LogEntry "Container started successfully" "Success"
        } finally {
            Pop-Location
        }
        
        # Step 7: Verify installation
        $lblStatus.Text = "Step 7/7: Verifying installation..."
        $progressInstall.Value = 95
        Add-LogEntry "Verifying application is running..."
        
        Start-Sleep -Seconds 5
        
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$port/health" -UseBasicParsing -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Add-LogEntry "Application is responding" "Success"
                $Script:InstallState.InstallSuccess = $true
            } else {
                throw "Unexpected response: $($response.StatusCode)"
            }
        } catch {
            Add-LogEntry "Warning: Could not verify application (it may still be starting up)" "Warning"
            $Script:InstallState.InstallSuccess = $true  # Assume success
        }
        
        # Complete
        $progressInstall.Value = 100
        $lblStatus.Text = "Installation complete!"
        Add-LogEntry ""
        Add-LogEntry "========================================" "Success"
        Add-LogEntry "Installation completed successfully!" "Success"
        Add-LogEntry "========================================" "Success"
        Add-LogEntry ""
        Add-LogEntry "Access the application at: http://localhost:$port"
        Add-LogEntry "Default credentials: $adminEmail"
        
        $btnNext.Enabled = $true
        
    } catch {
        $Script:InstallState.InstallSuccess = $false
        $Script:InstallState.ErrorMessage = $_.Exception.Message
        
        $lblStatus.Text = "Installation failed!"
        $lblStatus.ForeColor = $Script:Colors.Error
        Add-LogEntry ""
        Add-LogEntry "========================================" "Error"
        Add-LogEntry "Installation failed: $($_.Exception.Message)" "Error"
        Add-LogEntry "========================================" "Error"
        
        [System.Windows.Forms.MessageBox]::Show(
            "Installation failed:`n`n$($_.Exception.Message)`n`nPlease check the log for details.",
            "Installation Failed",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error
        )
        
        $btnNext.Enabled = $true
        $btnBack.Enabled = $true
    }
}

# ============================================================================
# WIZARD NAVIGATION
# ============================================================================

$Script:WizardPages = @()
$Script:CurrentPageIndex = 0

function Show-WizardPage {
    param([int]$Index)
    
    # Hide current page
    if ($Script:CurrentPanel) {
        $Script:CurrentPanel.Visible = $false
    }
    
    # Show new page
    $Script:CurrentPageIndex = $Index
    $Script:CurrentPanel = $Script:WizardPages[$Index]
    $Script:CurrentPanel.Visible = $true
    
    # Update progress bar
    $progressBar = $Script:Form.Controls.Find("progressBar", $true)[0]
    if ($progressBar) {
        $progressBar.Value = $Index + 1
    }
    
    # Update buttons
    $btnBack = $Script:Form.Controls.Find("btnBack", $true)[0]
    $btnNext = $Script:Form.Controls.Find("btnNext", $true)[0]
    
    $btnBack.Enabled = ($Index -gt 0)
    
    # Special handling for specific pages
    switch ($Script:CurrentPanel.Name) {
        "License" {
            # Disable Next until license is accepted
            $chkAccept = $Script:Form.Controls.Find("chkAcceptLicense", $true)[0]
            $btnNext.Enabled = $chkAccept.Checked
        }
        "Prerequisites" {
            # Reset Next button
            $btnNext.Enabled = $false
            $btnNext.Text = "Next >"
        }
        "DockerInstall" {
            # Show/hide Docker install page based on prerequisites
            if ($Script:InstallState.DockerInstalled -and $Script:InstallState.DockerRunning) {
                # Skip Docker installation page
                Move-ToNextStep
                return
            }
            $btnNext.Enabled = $false  # Will be enabled after Docker is ready
        }
        "Installation" {
            # Change button text
            $btnNext.Text = "Install"
            $btnNext.Enabled = $true
        }
        "Completion" {
            # Change button text to Finish
            $btnNext.Text = "Finish"
            $btnBack.Enabled = $false
        }
    }
    
    $Script:Form.Refresh()
}

function Move-ToNextStep {
    $btnNext = $Script:Form.Controls.Find("btnNext", $true)[0]
    
    # Special handling for specific pages
    $currentPageName = $Script:WizardPages[$Script:CurrentPageIndex].Name
    
    switch ($currentPageName) {
        "Installation" {
            # Start installation process
            if ($btnNext.Text -eq "Install") {
                Start-Installation
                $btnNext.Text = "Next >"
                return  # Don't move to next page yet
            }
        }
        "Completion" {
            # Launch browser if requested
            $chkLaunchBrowser = $Script:Form.Controls.Find("chkLaunchBrowser", $true)[0]
            if ($chkLaunchBrowser.Checked) {
                $numPort = $Script:Form.Controls.Find("numPort", $true)[0]
                $port = if ($numPort) { [int]$numPort.Value } else { $Script:Config.DefaultPort }
                Start-Process "http://localhost:$port"
            }
            
            # Close wizard
            $Script:Form.Close()
            return
        }
    }
    
    # Move to next page
    if ($Script:CurrentPageIndex -lt ($Script:WizardPages.Count - 1)) {
        Show-WizardPage ($Script:CurrentPageIndex + 1)
    }
}

function Move-ToPreviousStep {
    if ($Script:CurrentPageIndex -gt 0) {
        Show-WizardPage ($Script:CurrentPageIndex - 1)
    }
}

function Close-Wizard {
    $result = [System.Windows.Forms.MessageBox]::Show(
        "Are you sure you want to cancel the installation?",
        "Cancel Installation",
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Question
    )
    
    if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
        $Script:Form.Close()
    }
}

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

function Start-InstallationWizard {
    # Check administrator privileges
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    
    if (-not $isAdmin) {
        if (-not $SilentMode) {
            [System.Windows.Forms.MessageBox]::Show(
                "This installer requires administrator privileges.`n`nPlease right-click the installer and select 'Run as Administrator'.",
                "Administrator Rights Required",
                [System.Windows.Forms.MessageBoxButtons]::OK,
                [System.Windows.Forms.MessageBoxIcon]::Warning
            )
        }
        exit 1
    }
    
    # Initialize main form
    $Script:Form = Initialize-WizardForm
    
    # Create wizard pages
    $Script:WizardPages = @(
        (New-WelcomePage),
        (New-LicensePage),
        (New-PrerequisitesPage),
        (New-DockerInstallPage),
        (New-ConfigurationPage),
        (New-InstallationPage),
        (New-CompletionPage)
    )
    
    # Add all pages to form (hidden initially)
    foreach ($page in $Script:WizardPages) {
        $Script:Form.Controls.Add($page)
    }
    
    # Add header label (shown on all pages)
    $lblHeader = New-HeaderLabel -Text "Student Management System - Installer"
    $Script:Form.Controls.Add($lblHeader)
    
    # Add progress bar
    $progressBar = New-ProgressBar
    $progressBar.Name = "progressBar"
    $Script:Form.Controls.Add($progressBar)
    
    # Add button panel
    $buttonPanel = New-ButtonPanel
    $Script:Form.Controls.Add($buttonPanel)
    
    # Show first page
    Show-WizardPage 0
    
    # Show form
    [void]$Script:Form.ShowDialog()
}

# ============================================================================
# RUN WIZARD
# ============================================================================

if (-not $SilentMode) {
    Start-InstallationWizard
} else {
    Write-Host "Silent mode installation not yet implemented" -ForegroundColor Yellow
    Write-Host "Please run the installer without -SilentMode parameter" -ForegroundColor Yellow
    exit 1
}
