<#
.SYNOPSIS
    ⚠️  LEGACY - Student Management System - Windows Uninstaller Wizard (GUI)

.DESCRIPTION
    ⚠️  DEPRECATED: Use the official Inno Setup uninstaller instead.
    This PowerShell-based wizard is kept for historical reference.
    
    Historical documentation:
    Professional Windows uninstaller with GUI interface that:
    - Provides uninstallation options (keep data, full cleanup)
    - Backs up database and user files
    - Removes Docker containers and images
    - Optional deep Docker cleanup
    - Removes application files
    
    For end-users, use the packaged uninstaller created by Inno Setup.

.EXAMPLE
    .\SMS_UNINSTALLER_WIZARD.ps1
    Launch the GUI uninstallation wizard (DEPRECATED)

.EXAMPLE
    .\SMS_UNINSTALLER_WIZARD.ps1 -DeepClean
    Perform deep Docker cleanup (DEPRECATED)

.NOTES
    Version: 1.0.0 (Legacy)
    Deprecated: v1.9.7+
    Replacement: Uninstall_SMS_{version}.exe (created by Inno Setup)
    Requires: Windows 10/11, PowerShell 5.1+
#>

Write-Host ""
Write-Host "⚠️  WARNING: This PowerShell uninstaller is deprecated." -ForegroundColor Yellow
Write-Host "Use the official Inno Setup uninstaller instead (Uninstall_SMS_{version}.exe)" -ForegroundColor Yellow
Write-Host ""

param(
    [switch]$SilentMode,
    [switch]$DeepClean,
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
    AppName          = "Student Management System"
    Version          = "1.9.9"
    DockerImageName  = "sms-fullstack"
    DataVolumeName   = "sms_data"
    ContainerName    = "sms-fullstack"
    BackupPath       = Join-Path $env:USERPROFILE "Desktop\SMS_Backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
}

$Script:UninstallState = @{
    Step              = 0
    TotalSteps        = 5
    InstallPath       = $InstallPath
    KeepData          = $true
    KeepBackups       = $true
    DeepDockerClean   = $false
    BackupCreated     = $false
    UninstallSuccess  = $false
    ErrorMessage      = ""
}

# ============================================================================
# WINDOWS FORMS GUI COMPONENTS
# ============================================================================

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$Script:Form = $null
$Script:CurrentPanel = $null

# Color scheme
$Script:Colors = @{
    Primary      = [System.Drawing.Color]::FromArgb(0, 120, 212)
    PrimaryDark  = [System.Drawing.Color]::FromArgb(0, 90, 158)
    Success      = [System.Drawing.Color]::FromArgb(16, 124, 16)
    Error        = [System.Drawing.Color]::FromArgb(196, 43, 28)
    Warning      = [System.Drawing.Color]::FromArgb(255, 185, 0)
    Background   = [System.Drawing.Color]::White
    TextPrimary  = [System.Drawing.Color]::FromArgb(50, 49, 48)
    TextSecondary = [System.Drawing.Color]::FromArgb(96, 94, 92)
}

function Initialize-UninstallerForm {
    $form = New-Object System.Windows.Forms.Form
    $form.Text = "$($Script:Config.AppName) - Uninstaller"
    $form.Size = New-Object System.Drawing.Size(700, 500)
    $form.StartPosition = 'CenterScreen'
    $form.FormBorderStyle = 'FixedDialog'
    $form.MaximizeBox = $false
    $form.MinimizeBox = $false
    $form.BackColor = $Script:Colors.Background
    $form.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    
    return $form
}

function New-UninstallerPanel {
    param([string]$Name)
    
    $panel = New-Object System.Windows.Forms.Panel
    $panel.Name = $Name
    $panel.Location = New-Object System.Drawing.Point(20, 80)
    $panel.Size = New-Object System.Drawing.Size(640, 300)
    $panel.Visible = $false
    
    return $panel
}

function New-ButtonPanel {
    $panel = New-Object System.Windows.Forms.Panel
    $panel.Location = New-Object System.Drawing.Point(20, 420)
    $panel.Size = New-Object System.Drawing.Size(640, 40)
    
    $btnCancel = New-Object System.Windows.Forms.Button
    $btnCancel.Text = "Cancel"
    $btnCancel.Location = New-Object System.Drawing.Point(430, 5)
    $btnCancel.Size = New-Object System.Drawing.Size(90, 30)
    $btnCancel.Add_Click({ Close-Uninstaller })
    
    $btnBack = New-Object System.Windows.Forms.Button
    $btnBack.Name = "btnBack"
    $btnBack.Text = "< Back"
    $btnBack.Location = New-Object System.Drawing.Point(330, 5)
    $btnBack.Size = New-Object System.Drawing.Size(90, 30)
    $btnBack.Enabled = $false
    $btnBack.Add_Click({ Move-ToPreviousStep })
    
    $btnNext = New-Object System.Windows.Forms.Button
    $btnNext.Name = "btnNext"
    $btnNext.Text = "Next >"
    $btnNext.Location = New-Object System.Drawing.Point(540, 5)
    $btnNext.Size = New-Object System.Drawing.Size(90, 30)
    $btnNext.BackColor = $Script:Colors.Error
    $btnNext.ForeColor = [System.Drawing.Color]::White
    $btnNext.FlatStyle = 'Flat'
    $btnNext.Add_Click({ Move-ToNextStep })
    
    $panel.Controls.AddRange(@($btnCancel, $btnBack, $btnNext))
    
    return $panel
}

# ============================================================================
# UNINSTALLER PAGES
# ============================================================================

function New-WelcomePage {
    $panel = New-UninstallerPanel -Name "Welcome"
    
    $lblTitle = New-Object System.Windows.Forms.Label
    $lblTitle.Text = "Uninstall $($Script:Config.AppName)"
    $lblTitle.Location = New-Object System.Drawing.Point(20, 20)
    $lblTitle.Size = New-Object System.Drawing.Size(600, 40)
    $lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
    $lblTitle.ForeColor = $Script:Colors.Error
    
    $lblDescription = New-Object System.Windows.Forms.Label
    $lblDescription.Text = @"
This wizard will guide you through the uninstallation process.

You can choose to:
  • Keep your data (database and backups) - Recommended if reinstalling
  • Remove all data completely - For full uninstall
  • Perform deep Docker cleanup - Remove all Docker cache

⚠️ IMPORTANT: We recommend backing up your data before uninstalling.

Click 'Next' to continue with the uninstallation.
"@
    $lblDescription.Location = New-Object System.Drawing.Point(20, 70)
    $lblDescription.Size = New-Object System.Drawing.Size(600, 200)
    $lblDescription.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    
    $panel.Controls.AddRange(@($lblTitle, $lblDescription))
    
    return $panel
}

function New-OptionsPage {
    $panel = New-UninstallerPanel -Name "Options"
    
    $lblTitle = New-Object System.Windows.Forms.Label
    $lblTitle.Text = "Uninstallation Options"
    $lblTitle.Location = New-Object System.Drawing.Point(20, 20)
    $lblTitle.Size = New-Object System.Drawing.Size(600, 30)
    $lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
    
    # Data options group
    $grpData = New-Object System.Windows.Forms.GroupBox
    $grpData.Text = "Data Handling"
    $grpData.Location = New-Object System.Drawing.Point(20, 60)
    $grpData.Size = New-Object System.Drawing.Size(600, 100)
    
    $radioKeepData = New-Object System.Windows.Forms.RadioButton
    $radioKeepData.Name = "radioKeepData"
    $radioKeepData.Text = "Keep my data (database and backups) - Recommended"
    $radioKeepData.Location = New-Object System.Drawing.Point(15, 30)
    $radioKeepData.Size = New-Object System.Drawing.Size(570, 25)
    $radioKeepData.Checked = $true
    $radioKeepData.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    $radioKeepData.ForeColor = $Script:Colors.Success
    
    $lblKeepInfo = New-Object System.Windows.Forms.Label
    $lblKeepInfo.Text = "Your database and backups will be preserved. Use this if you plan to reinstall."
    $lblKeepInfo.Location = New-Object System.Drawing.Point(35, 55)
    $lblKeepInfo.Size = New-Object System.Drawing.Size(550, 35)
    $lblKeepInfo.Font = New-Object System.Drawing.Font("Segoe UI", 8)
    $lblKeepInfo.ForeColor = $Script:Colors.TextSecondary
    
    $grpData.Controls.AddRange(@($radioKeepData, $lblKeepInfo))
    
    # Backup creation option
    $grpBackup = New-Object System.Windows.Forms.GroupBox
    $grpBackup.Text = "Before Uninstalling"
    $grpBackup.Location = New-Object System.Drawing.Point(20, 170)
    $grpBackup.Size = New-Object System.Drawing.Size(600, 110)
    
    $chkCreateBackup = New-Object System.Windows.Forms.CheckBox
    $chkCreateBackup.Name = "chkCreateBackup"
    $chkCreateBackup.Text = "Create backup on Desktop before uninstalling (Recommended)"
    $chkCreateBackup.Location = New-Object System.Drawing.Point(15, 30)
    $chkCreateBackup.Size = New-Object System.Drawing.Size(570, 25)
    $chkCreateBackup.Checked = $true
    $chkCreateBackup.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    
    $lblBackupPath = New-Object System.Windows.Forms.Label
    $lblBackupPath.Name = "lblBackupPath"
    $lblBackupPath.Text = "Backup location: $($Script:Config.BackupPath)"
    $lblBackupPath.Location = New-Object System.Drawing.Point(35, 60)
    $lblBackupPath.Size = New-Object System.Drawing.Size(550, 40)
    $lblBackupPath.Font = New-Object System.Drawing.Font("Segoe UI", 8)
    $lblBackupPath.ForeColor = $Script:Colors.TextSecondary
    
    $grpBackup.Controls.AddRange(@($chkCreateBackup, $lblBackupPath))
    
    $panel.Controls.AddRange(@($lblTitle, $grpData, $grpBackup))
    
    return $panel
}

function New-DockerCleanupPage {
    $panel = New-UninstallerPanel -Name "DockerCleanup"
    
    $lblTitle = New-Object System.Windows.Forms.Label
    $lblTitle.Text = "Docker Cleanup Options"
    $lblTitle.Location = New-Object System.Drawing.Point(20, 20)
    $lblTitle.Size = New-Object System.Drawing.Size(600, 30)
    $lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
    
    $lblDescription = New-Object System.Windows.Forms.Label
    $lblDescription.Text = @"
Choose how to clean up Docker resources:
"@
    $lblDescription.Location = New-Object System.Drawing.Point(20, 60)
    $lblDescription.Size = New-Object System.Drawing.Size(600, 25)
    $lblDescription.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    
    # Cleanup options
    $grpCleanup = New-Object System.Windows.Forms.GroupBox
    $grpCleanup.Text = "Docker Cleanup Level"
    $grpCleanup.Location = New-Object System.Drawing.Point(20, 90)
    $grpCleanup.Size = New-Object System.Drawing.Size(600, 190)
    
    $radioStandard = New-Object System.Windows.Forms.RadioButton
    $radioStandard.Name = "radioStandardClean"
    $radioStandard.Text = "Standard Cleanup (Recommended)"
    $radioStandard.Location = New-Object System.Drawing.Point(15, 30)
    $radioStandard.Size = New-Object System.Drawing.Size(570, 25)
    $radioStandard.Checked = $true
    $radioStandard.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    
    $lblStandardInfo = New-Object System.Windows.Forms.Label
    $lblStandardInfo.Text = "Removes SMS containers and images only. Keeps Docker volumes (data) and cache."
    $lblStandardInfo.Location = New-Object System.Drawing.Point(35, 55)
    $lblStandardInfo.Size = New-Object System.Drawing.Size(550, 30)
    $lblStandardInfo.Font = New-Object System.Drawing.Font("Segoe UI", 8)
    $lblStandardInfo.ForeColor = $Script:Colors.TextSecondary
    
    $radioDeep = New-Object System.Windows.Forms.RadioButton
    $radioDeep.Name = "radioDeepClean"
    $radioDeep.Text = "Deep Docker Cleanup (Advanced)"
    $radioDeep.Location = New-Object System.Drawing.Point(15, 95)
    $radioDeep.Size = New-Object System.Drawing.Size(570, 25)
    $radioDeep.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    $radioDeep.ForeColor = $Script:Colors.Warning
    
    $lblDeepInfo = New-Object System.Windows.Forms.Label
    $lblDeepInfo.Text = @"
⚠️ Removes ALL Docker cache from old SMS installations:
   • All SMS containers (running and stopped)
   • All SMS images (current and previous versions)
   • Docker builder cache
   • Unused networks
   • Optionally: Docker volumes (if you chose to remove data)

Use this if you had previous SMS installations causing conflicts.
"@
    $lblDeepInfo.Location = New-Object System.Drawing.Point(35, 120)
    $lblDeepInfo.Size = New-Object System.Drawing.Size(550, 60)
    $lblDeepInfo.Font = New-Object System.Drawing.Font("Segoe UI", 8)
    $lblDeepInfo.ForeColor = $Script:Colors.TextSecondary
    
    $grpCleanup.Controls.AddRange(@($radioStandard, $lblStandardInfo, $radioDeep, $lblDeepInfo))
    
    $panel.Controls.AddRange(@($lblTitle, $lblDescription, $grpCleanup))
    
    return $panel
}

function New-UninstallationPage {
    $panel = New-UninstallerPanel -Name "Uninstallation"
    
    $lblTitle = New-Object System.Windows.Forms.Label
    $lblTitle.Text = "Uninstalling..."
    $lblTitle.Location = New-Object System.Drawing.Point(20, 20)
    $lblTitle.Size = New-Object System.Drawing.Size(600, 30)
    $lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
    
    $lblStatus = New-Object System.Windows.Forms.Label
    $lblStatus.Name = "lblUninstallStatus"
    $lblStatus.Text = "Preparing uninstallation..."
    $lblStatus.Location = New-Object System.Drawing.Point(20, 60)
    $lblStatus.Size = New-Object System.Drawing.Size(600, 25)
    $lblStatus.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    
    $progressUninstall = New-Object System.Windows.Forms.ProgressBar
    $progressUninstall.Name = "progressUninstall"
    $progressUninstall.Location = New-Object System.Drawing.Point(20, 95)
    $progressUninstall.Size = New-Object System.Drawing.Size(600, 30)
    $progressUninstall.Style = 'Continuous'
    $progressUninstall.Minimum = 0
    $progressUninstall.Maximum = 100
    
    $txtLog = New-Object System.Windows.Forms.TextBox
    $txtLog.Name = "txtUninstallLog"
    $txtLog.Location = New-Object System.Drawing.Point(20, 135)
    $txtLog.Size = New-Object System.Drawing.Size(600, 145)
    $txtLog.Multiline = $true
    $txtLog.ScrollBars = 'Vertical'
    $txtLog.ReadOnly = $true
    $txtLog.Font = New-Object System.Drawing.Font("Consolas", 8)
    $txtLog.BackColor = [System.Drawing.Color]::Black
    $txtLog.ForeColor = [System.Drawing.Color]::LimeGreen
    
    $panel.Controls.AddRange(@($lblTitle, $lblStatus, $progressUninstall, $txtLog))
    
    return $panel
}

function New-CompletionPage {
    $panel = New-UninstallerPanel -Name "Completion"
    
    $lblTitle = New-Object System.Windows.Forms.Label
    $lblTitle.Name = "lblCompletionTitle"
    $lblTitle.Text = "Uninstallation Complete"
    $lblTitle.Location = New-Object System.Drawing.Point(20, 20)
    $lblTitle.Size = New-Object System.Drawing.Size(600, 40)
    $lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
    $lblTitle.ForeColor = $Script:Colors.Success
    
    $lblMessage = New-Object System.Windows.Forms.Label
    $lblMessage.Name = "lblCompletionMessage"
    $lblMessage.Text = @"
The Student Management System has been successfully uninstalled.

Your data has been preserved in:
    [Will be populated during uninstallation]

Thank you for using the Student Management System!
"@
    $lblMessage.Location = New-Object System.Drawing.Point(20, 70)
    $lblMessage.Size = New-Object System.Drawing.Size(600, 200)
    $lblMessage.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    
    $panel.Controls.AddRange(@($lblTitle, $lblMessage))
    
    return $panel
}

# ============================================================================
# UNINSTALLATION PROCESS
# ============================================================================

function Start-Uninstallation {
    $lblStatus = $Script:Form.Controls.Find("lblUninstallStatus", $true)[0]
    $progressUninstall = $Script:Form.Controls.Find("progressUninstall", $true)[0]
    $txtLog = $Script:Form.Controls.Find("txtUninstallLog", $true)[0]
    $btnNext = $Script:Form.Controls.Find("btnNext", $true)[0]
    $btnBack = $Script:Form.Controls.Find("btnBack", $true)[0]
    
    $btnNext.Enabled = $false
    $btnBack.Enabled = $false
    
    # Get options
    $radioKeepData = $Script:Form.Controls.Find("radioKeepData", $true)[0]
    $chkCreateBackup = $Script:Form.Controls.Find("chkCreateBackup", $true)[0]
    $radioDeepClean = $Script:Form.Controls.Find("radioDeepClean", $true)[0]
    
    $Script:UninstallState.KeepData = $radioKeepData.Checked
    $createBackup = $chkCreateBackup.Checked
    $Script:UninstallState.DeepDockerClean = $radioDeepClean.Checked
    
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
        # Step 1: Create backup
        if ($createBackup) {
            $lblStatus.Text = "Step 1/5: Creating backup..."
            $progressUninstall.Value = 10
            Add-LogEntry "Creating backup to Desktop..."
            
            New-Item -ItemType Directory -Path $Script:Config.BackupPath -Force | Out-Null
            
            # Backup database
            $dbSource = Join-Path $Script:UninstallState.InstallPath "data"
            if (Test-Path $dbSource) {
                $dbDest = Join-Path $Script:Config.BackupPath "database"
                Copy-Item -Path $dbSource -Destination $dbDest -Recurse -Force
                Add-LogEntry "Database backed up" "Success"
            }
            
            # Backup existing backups
            $backupSource = Join-Path $Script:UninstallState.InstallPath "backups"
            if (Test-Path $backupSource) {
                $backupDest = Join-Path $Script:Config.BackupPath "backups"
                Copy-Item -Path $backupSource -Destination $backupDest -Recurse -Force
                Add-LogEntry "Previous backups copied" "Success"
            }
            
            # Backup configuration
            $envFiles = @(".env", "backend\.env", "frontend\.env")
            foreach ($envFile in $envFiles) {
                $envSource = Join-Path $Script:UninstallState.InstallPath $envFile
                if (Test-Path $envSource) {
                    $envDest = Join-Path $Script:Config.BackupPath $envFile
                    $envDestDir = Split-Path $envDest -Parent
                    New-Item -ItemType Directory -Path $envDestDir -Force | Out-Null
                    Copy-Item -Path $envSource -Destination $envDest -Force
                }
            }
            Add-LogEntry "Configuration backed up" "Success"
            
            $Script:UninstallState.BackupCreated = $true
            Add-LogEntry "Backup complete: $($Script:Config.BackupPath)" "Success"
        } else {
            Add-LogEntry "Skipping backup (user choice)"
        }
        
        # Step 2: Stop containers
        $lblStatus.Text = "Step 2/5: Stopping Docker containers..."
        $progressUninstall.Value = 30
        Add-LogEntry "Stopping SMS containers..."
        
        $null = docker stop $Script:Config.ContainerName 2>$null
        Add-LogEntry "Container stopped" "Success"
        
        # Step 3: Remove containers
        $lblStatus.Text = "Step 3/5: Removing Docker containers..."
        $progressUninstall.Value = 50
        Add-LogEntry "Removing SMS containers..."
        
        $null = docker rm $Script:Config.ContainerName 2>$null
        Add-LogEntry "Container removed" "Success"
        
        # Step 4: Docker cleanup
        $lblStatus.Text = "Step 4/5: Cleaning up Docker images..."
        $progressUninstall.Value = 65
        
        if ($Script:UninstallState.DeepDockerClean) {
            Add-LogEntry "Performing DEEP Docker cleanup..."
            
            # Run DOCKER.ps1 -DeepClean if available (v2.0 consolidated script)
            $dockerScript = Join-Path $Script:UninstallState.InstallPath "DOCKER.ps1"
            if (Test-Path $dockerScript) {
                Add-LogEntry "Running deep cleanup script..."
                & $dockerScript -DeepClean
                Add-LogEntry "Deep cleanup completed" "Success"
            } else {
                # Manual deep cleanup
                Add-LogEntry "Removing all SMS images..."
                docker images --filter "reference=sms-*" -q | ForEach-Object {
                    docker rmi -f $_ 2>$null
                }
                
                Add-LogEntry "Pruning builder cache..."
                docker builder prune -af 2>$null
                
                Add-LogEntry "Pruning system..."
                docker system prune -af 2>$null
                
                if (-not $Script:UninstallState.KeepData) {
                    Add-LogEntry "Removing Docker volumes..." "Warning"
                    docker volume rm $Script:Config.DataVolumeName 2>$null
                }
                
                Add-LogEntry "Deep cleanup completed" "Success"
            }
        } else {
            Add-LogEntry "Removing SMS Docker image..."
            docker rmi -f "$($Script:Config.DockerImageName):$($Script:Config.Version)" 2>$null
            docker rmi -f "$($Script:Config.DockerImageName):latest" 2>$null
            Add-LogEntry "Docker image removed" "Success"
            
            if (-not $Script:UninstallState.KeepData) {
                Add-LogEntry "Removing Docker volume..." "Warning"
                docker volume rm $Script:Config.DataVolumeName 2>$null
            }
        }
        
        # Step 5: Remove application files
        $lblStatus.Text = "Step 5/5: Removing application files..."
        $progressUninstall.Value = 85
        Add-LogEntry "Removing application directory..."
        
        if ($Script:UninstallState.KeepData) {
            # Keep data and backups
            Add-LogEntry "Preserving data and backups..."
            
            $dataDir = Join-Path $Script:UninstallState.InstallPath "data"
            $backupsDir = Join-Path $Script:UninstallState.InstallPath "backups"
            
            # Move to temp location
            $tempData = Join-Path $env:TEMP "SMS_Data_Preserve"
            if (Test-Path $dataDir) {
                Move-Item -Path $dataDir -Destination (Join-Path $tempData "data") -Force
            }
            if (Test-Path $backupsDir) {
                Move-Item -Path $backupsDir -Destination (Join-Path $tempData "backups") -Force
            }
            
            # Remove application directory
            if (Test-Path $Script:UninstallState.InstallPath) {
                Remove-Item -Path $Script:UninstallState.InstallPath -Recurse -Force
                Add-LogEntry "Application files removed" "Success"
            }
            
            # Restore data
            New-Item -ItemType Directory -Path $Script:UninstallState.InstallPath -Force | Out-Null
            if (Test-Path (Join-Path $tempData "data")) {
                Move-Item -Path (Join-Path $tempData "data") -Destination $dataDir -Force
            }
            if (Test-Path (Join-Path $tempData "backups")) {
                Move-Item -Path (Join-Path $tempData "backups") -Destination $backupsDir -Force
            }
            
            Add-LogEntry "Data and backups preserved in: $($Script:UninstallState.InstallPath)" "Success"
        } else {
            # Remove everything
            if (Test-Path $Script:UninstallState.InstallPath) {
                Remove-Item -Path $Script:UninstallState.InstallPath -Recurse -Force
                Add-LogEntry "All application files removed" "Success"
            }
        }
        
        # Complete
        $progressUninstall.Value = 100
        $lblStatus.Text = "Uninstallation complete!"
        Add-LogEntry ""
        Add-LogEntry "========================================" "Success"
        Add-LogEntry "Uninstallation completed successfully!" "Success"
        Add-LogEntry "========================================" "Success"
        
        $Script:UninstallState.UninstallSuccess = $true
        $btnNext.Enabled = $true
        
    } catch {
        $Script:UninstallState.UninstallSuccess = $false
        $Script:UninstallState.ErrorMessage = $_.Exception.Message
        
        $lblStatus.Text = "Uninstallation failed!"
        $lblStatus.ForeColor = $Script:Colors.Error
        Add-LogEntry ""
        Add-LogEntry "========================================" "Error"
        Add-LogEntry "Uninstallation failed: $($_.Exception.Message)" "Error"
        Add-LogEntry "========================================" "Error"
        
        [System.Windows.Forms.MessageBox]::Show(
            "Uninstallation failed:`n`n$($_.Exception.Message)`n`nPlease check the log for details.",
            "Uninstallation Failed",
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

function Show-UninstallerPage {
    param([int]$Index)
    
    if ($Script:CurrentPanel) {
        $Script:CurrentPanel.Visible = $false
    }
    
    $Script:CurrentPageIndex = $Index
    $Script:CurrentPanel = $Script:WizardPages[$Index]
    $Script:CurrentPanel.Visible = $true
    
    $btnBack = $Script:Form.Controls.Find("btnBack", $true)[0]
    $btnNext = $Script:Form.Controls.Find("btnNext", $true)[0]
    
    $btnBack.Enabled = ($Index -gt 0)
    
    switch ($Script:CurrentPanel.Name) {
        "Uninstallation" {
            $btnNext.Text = "Uninstall"
            $btnNext.BackColor = $Script:Colors.Error
        }
        "Completion" {
            $btnNext.Text = "Finish"
            $btnNext.BackColor = $Script:Colors.Primary
            $btnBack.Enabled = $false
            
            # Update completion message
            $lblMessage = $Script:Form.Controls.Find("lblCompletionMessage", $true)[0]
            if ($Script:UninstallState.BackupCreated) {
                $message = @"
The Student Management System has been successfully uninstalled.
"@
                if ($Script:UninstallState.KeepData) {
                    $message += "`n`nYour data has been preserved in:`n    $($Script:UninstallState.InstallPath)"
                }
                if ($Script:UninstallState.BackupCreated) {
                    $message += "`n`nBackup created at:`n    $($Script:Config.BackupPath)"
                }
                $message += "`n`nThank you for using the Student Management System!"
                $lblMessage.Text = $message
            }
        }
    }
    
    $Script:Form.Refresh()
}

function Move-ToNextStep {
    $currentPageName = $Script:WizardPages[$Script:CurrentPageIndex].Name
    
    switch ($currentPageName) {
        "Uninstallation" {
            $btnNext = $Script:Form.Controls.Find("btnNext", $true)[0]
            if ($btnNext.Text -eq "Uninstall") {
                # Confirm uninstallation
                $result = [System.Windows.Forms.MessageBox]::Show(
                    "Are you sure you want to uninstall the Student Management System?`n`nThis action cannot be undone.",
                    "Confirm Uninstallation",
                    [System.Windows.Forms.MessageBoxButtons]::YesNo,
                    [System.Windows.Forms.MessageBoxIcon]::Warning
                )
                
                if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
                    Start-Uninstallation
                    $btnNext.Text = "Next >"
                }
                return
            }
        }
        "Completion" {
            $Script:Form.Close()
            return
        }
    }
    
    if ($Script:CurrentPageIndex -lt ($Script:WizardPages.Count - 1)) {
        Show-UninstallerPage ($Script:CurrentPageIndex + 1)
    }
}

function Move-ToPreviousStep {
    if ($Script:CurrentPageIndex -gt 0) {
        Show-UninstallerPage ($Script:CurrentPageIndex - 1)
    }
}

function Close-Uninstaller {
    $result = [System.Windows.Forms.MessageBox]::Show(
        "Are you sure you want to cancel the uninstallation?",
        "Cancel Uninstallation",
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

function Start-UninstallerWizard {
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    
    if (-not $isAdmin) {
        [System.Windows.Forms.MessageBox]::Show(
            "This uninstaller requires administrator privileges.`n`nPlease right-click the uninstaller and select 'Run as Administrator'.",
            "Administrator Rights Required",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Warning
        )
        exit 1
    }
    
    $Script:Form = Initialize-UninstallerForm
    
    $Script:WizardPages = @(
        (New-WelcomePage),
        (New-OptionsPage),
        (New-DockerCleanupPage),
        (New-UninstallationPage),
        (New-CompletionPage)
    )
    
    foreach ($page in $Script:WizardPages) {
        $Script:Form.Controls.Add($page)
    }
    
    $lblHeader = New-Object System.Windows.Forms.Label
    $lblHeader.Text = "Student Management System - Uninstaller"
    $lblHeader.Location = New-Object System.Drawing.Point(20, 20)
    $lblHeader.Size = New-Object System.Drawing.Size(600, 35)
    $lblHeader.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
    $lblHeader.ForeColor = $Script:Colors.Error
    $Script:Form.Controls.Add($lblHeader)
    
    $buttonPanel = New-ButtonPanel
    $Script:Form.Controls.Add($buttonPanel)
    
    Show-UninstallerPage 0
    
    [void]$Script:Form.ShowDialog()
}

# ============================================================================
# RUN UNINSTALLER
# ============================================================================

Start-UninstallerWizard
