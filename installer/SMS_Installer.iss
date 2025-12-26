; ============================================================================
; Student Management System - Inno Setup Installer Script
; Version: 1.9.8 - Bilingual (English / Greek)
; Requires Inno Setup 6.x (https://jrsoftware.org/isinfo.php)
;
; NOTE: Inno Setup 6.x does not support UninstallExeName directive.
; Workaround: Uninstaller is renamed from unins000.exe to unins{version}.exe
; after installation using Pascal script in CurStepChanged(ssPostInstall).
; ============================================================================

#define MyAppName "Student Management System"
#define MyAppShortName "SMS"
#define MyAppPublisher "AUT MIEEK"
#define MyAppURL "https://www.mieek.ac.cy/index.php/el/"
#define MyAppGitHubURL "https://github.com/bs1gr/AUT_MIEEK_SMS"
#define MyAppExeName "DOCKER_TOGGLE.bat"
#define MyAppId "{B5A1E2F3-C4D5-6789-ABCD-EF0123456789}"

; Read version from VERSION file
#define VersionFile FileOpen("..\VERSION")
#define MyAppVersion Trim(FileRead(VersionFile))
#expr FileClose(VersionFile)

[Setup]
; Unique application ID - DO NOT CHANGE
AppId={{B5A1E2F3-C4D5-6789-ABCD-EF0123456789}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppGitHubURL}/issues
AppUpdatesURL={#MyAppGitHubURL}/releases
DefaultDirName={autopf}\{#MyAppShortName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
; License and info files are language-specific (set in [Languages])
OutputDir=..\dist
OutputBaseFilename=SMS_Installer_{#MyAppVersion}
SetupIconFile=..\favicon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
WizardSizePercent=120
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64
MinVersion=10.0
UninstallDisplayIcon={app}\favicon.ico
UninstallFilesDir={app}
UninstallDisplayName={#MyAppName} {#MyAppVersion}
ShowLanguageDialog=auto
DisableWelcomePage=no
; Version info for Windows (shows in Properties and UAC dialogs)
VersionInfoVersion={#MyAppVersion}
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription={#MyAppName} Installer
VersionInfoTextVersion={#MyAppVersion}
VersionInfoCopyright=Copyright (C) 2024-2025 {#MyAppPublisher}
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#MyAppVersion}
VersionInfoProductTextVersion={#MyAppVersion}
; Upgrade/Update behavior
UsePreviousAppDir=yes
UsePreviousGroup=yes
UsePreviousTasks=yes
UsePreviousSetupType=yes
CloseApplications=yes
RestartApplications=yes
AppMutex=StudentManagementSystemMutex

; Modern look
WizardImageFile=wizard_image.bmp
WizardSmallImageFile=wizard_small.bmp

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"; LicenseFile: "..\LICENSE"; InfoBeforeFile: "installer_welcome.rtf"; InfoAfterFile: "installer_complete.rtf"
Name: "greek"; MessagesFile: "Greek.isl"; LicenseFile: "LICENSE_EL.txt"; InfoBeforeFile: "installer_welcome_el.txt"; InfoAfterFile: "installer_complete_el.txt"

; Note: Greek messages use local Greek.isl (official Inno translation)
; English messages serve as fallback

[CustomMessages]
; English custom messages (Greek in Greek.isl)
english.DockerRequired=Docker Desktop Required
english.DockerNotFound=Docker Desktop was not detected.%n%nWould you like to open the Docker Desktop download page?
english.LaunchApp=Launch SMS after installation
english.CreateShortcut=Create desktop shortcut
english.BuildContainer=Build Docker container (first run, ~5-10 min)
english.Prerequisites=Prerequisites:
english.OpenDockerPage=Open Docker Desktop download page
english.DockerInstalled=Docker Desktop is installed and ready
english.DockerNotInstalled=Docker Desktop is NOT installed
english.DockerRunning=Docker Desktop is running
english.DockerNotRunning=Docker Desktop is not running - please start it
english.BuildingContainer=Building SMS Docker container...
english.FirstRunNote=First run will build the container (takes 5-10 minutes)
english.ExistingInstallDetected=Existing Installation Detected
english.ExistingVersionFound=Version %1 is already installed at:%n%2%n%nWhat would you like to do?
english.SameVersionFound=Version %1 is already installed at:%n%2%n%nWhat would you like to do?
english.UpgradeOption=Update/Overwrite (keep data and settings)
english.CleanInstallOption=Fresh Install (remove previous installation first)
english.CancelOption=Cancel installation
english.UpgradingFrom=Upgrading from version %1 to %2
english.BackupCreated=Backup created at: %1
english.KeepUserData=Keep user data (database, backups, settings)
english.RemoveOldVersion=Remove previous version before installing
english.UpgradePrompt=Click YES to update/overwrite, NO for fresh install, or CANCEL to abort.
english.KeepDataPrompt=Do you want to keep your data (database, backups, settings)?%n%nClick YES to keep data for future reinstall.%nClick NO to remove everything.
english.ViewReadme=View README documentation
english.DockerStatusTitle=Docker Desktop Check
english.DockerRefreshButton=Refresh
english.InstallationType=Installation Type
english.InstallDockerOnly=Docker Production Only (Recommended)
english.InstallDockerOnlyDesc=Minimal installation with Docker container (fastest, cleanest)
english.InstallDevEnvironment=Include Development Environment
english.InstallDevEnvironmentDesc=Add Node.js, Python, and native development files for local development

; Greek translations
greek.InstallationType=Τύπος Εγκατάστασης
greek.InstallDockerOnly=Μόνο Docker Production (Συνιστάται)
greek.InstallDockerOnlyDesc=Ελάχιστη εγκατάσταση με Docker container (ταχύτερη, καθαρότερη)
greek.InstallDevEnvironment=Συμπερίληψη Περιβάλλοντος Ανάπτυξης
greek.InstallDevEnvironmentDesc=Προσθήκη Node.js, Python και αρχείων για τοπική ανάπτυξη

[Tasks]
Name: "keepdata"; Description: "{cm:KeepUserData}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "installdocker"; Description: "{cm:OpenDockerPage}"; GroupDescription: "{cm:Prerequisites}"; Check: not IsDockerInstalled

[Files]
; Core application files - backend/frontend ALWAYS needed for Docker build
Source: "..\backend\*"; DestDir: "{app}\backend"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "__pycache__,*.pyc,*.pyo,.pytest_cache,logs\*,.env,tests,tools,*.isl,.venv,venv"
Source: "..\frontend\*"; DestDir: "{app}\frontend"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "node_modules,dist,.env,tests,.pytest_cache,playwright.config.ts"
Source: "..\docker\*"; DestDir: "{app}\docker"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\config\*"; DestDir: "{app}\config"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\scripts\*"; DestDir: "{app}\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "*.py,*.sh"
Source: "..\templates\*"; DestDir: "{app}\templates"; Flags: ignoreversion recursesubdirs createallsubdirs

; Main scripts - Docker-only scripts always installed
Source: "..\DOCKER.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\DOCKER_TOGGLE.bat"; DestDir: "{app}"; Flags: ignoreversion

Source: "run_docker_install.cmd"; DestDir: "{app}"; Flags: ignoreversion

; Development scripts - only for dev environment
Source: "..\NATIVE.ps1"; DestDir: "{app}"; Flags: ignoreversion; Check: IsDevInstall
Source: "..\COMMIT_READY.ps1"; DestDir: "{app}"; Flags: ignoreversion; Check: IsDevInstall

; Icon file
Source: "..\favicon.ico"; DestDir: "{app}"; Flags: ignoreversion

; Documentation - keep only essential for all users
Source: "..\README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\CHANGELOG.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\LICENSE"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\VERSION"; DestDir: "{app}"; Flags: ignoreversion

; Dev documentation - only for dev environment
Source: "..\CONTRIBUTING.md"; DestDir: "{app}"; Flags: ignoreversion; Check: IsDevInstall
Source: "..\START_HERE.md"; DestDir: "{app}"; Flags: ignoreversion; Check: IsDevInstall
Source: "..\DOCUMENTATION_INDEX.md"; DestDir: "{app}"; Flags: ignoreversion; Check: IsDevInstall

; Example env files - only for dev environment
Source: "..\backend\.env.example"; DestDir: "{app}\backend"; DestName: ".env.example"; Flags: ignoreversion; Check: IsDevInstall
Source: "..\frontend\.env.example"; DestDir: "{app}\frontend"; DestName: ".env.example"; Flags: ignoreversion; Check: IsDevInstall

; Create data directory
Source: "placeholder.txt"; DestDir: "{app}\data"; Flags: ignoreversion

[Dirs]
Name: "{app}\data"; Permissions: users-modify
Name: "{app}\logs"; Permissions: users-modify
Name: "{app}\backups"; Permissions: users-modify

[UninstallDelete]
; Clean up runtime-generated files and directories
; These are created during Docker builds or application runtime
Type: filesandordirs; Name: "{app}\backend\__pycache__"
Type: filesandordirs; Name: "{app}\backend\.pytest_cache"
Type: filesandordirs; Name: "{app}\backend\logs"
Type: filesandordirs; Name: "{app}\backend\.venv"
Type: filesandordirs; Name: "{app}\frontend\node_modules"
Type: filesandordirs; Name: "{app}\frontend\dist"
Type: files; Name: "{app}\backend\.env"
Type: files; Name: "{app}\frontend\.env"
Type: files; Name: "{app}\.env"
Type: files; Name: "{app}\config\lang.txt"
; Note: data/, backups/, logs/ folders are handled by InitializeUninstall
; to give user choice whether to keep or delete them

[Icons]
; Start Menu
Name: "{group}\{#MyAppName}"; Filename: "cmd.exe"; Parameters: "/c ""{app}\DOCKER_TOGGLE.bat"""; WorkingDir: "{app}"; IconFilename: "{app}\favicon.ico"; Comment: "Start/Stop SMS Docker container"
Name: "{group}\SMS Documentation"; Filename: "{app}\README.md"; IconFilename: "{app}\favicon.ico"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"

; Desktop shortcut (optional)
Name: "{autodesktop}\{#MyAppName}"; Filename: "cmd.exe"; Parameters: "/c ""{app}\DOCKER_TOGGLE.bat"""; WorkingDir: "{app}"; IconFilename: "{app}\favicon.ico"; Comment: "Start/Stop SMS Docker container"; Tasks: desktopicon


[Run]
; Open Docker download page if requested
Filename: "cmd"; Parameters: "/c start https://www.docker.com/products/docker-desktop/"; Flags: postinstall shellexec nowait; Tasks: installdocker

; --- Docker build and install: always use the batch file, never call PowerShell directly ---

; Option to launch app after install (only if Docker is running)
Filename: "cmd.exe"; Parameters: "/c ""{app}\DOCKER_TOGGLE.bat"""; Description: "{cm:LaunchApp}"; Flags: postinstall nowait skipifsilent runascurrentuser; WorkingDir: "{app}"

; Open README
Filename: "{app}\README.md"; Description: "{cm:ViewReadme}"; Flags: postinstall shellexec skipifsilent unchecked

[Code]
var
  DockerPage: TWizardPage;
  DockerStatusLabel: TLabel;
  DockerInfoLabel: TLabel;
  RefreshButton: TButton;
  DockerBuildPage: TWizardPage;
  DockerBuildStatusLabel: TLabel;
  PreviousVersion: String;
  PreviousInstallPath: String;
  IsUpgrade: Boolean;

// Function to check if this is a dev environment install
function IsDevInstall: Boolean;
begin
  Result := False; // Production installer only supports Docker-only
end;

// Function to check if this is a Docker install (always true for production)
function IsDockerInstall: Boolean;
begin
  Result := True; // Always Docker install for production
end;

// Function to check if this is an upgrade (for Tasks Check)
function IsUpgradeInstall: Boolean;
begin
  Result := IsUpgrade;
end;

function IsDockerInstalled: Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec('cmd', '/c docker --version', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

function IsDockerRunning: Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec('cmd', '/c docker info', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

function ContainerExists: Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec('cmd', '/c docker inspect sms-app', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

function GetUninstallString: String;
var
  UninstallStr: String;
begin
  Result := '';
  if RegQueryStringValue(HKLM, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1',
     'UninstallString', UninstallStr) then
    Result := UninstallStr
  else if RegQueryStringValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1',
     'UninstallString', UninstallStr) then
    Result := UninstallStr;
end;

function UninstallPreviousVersion: Boolean;
var
  UninstallStr: String;
  UninstallPath: String;
  ResultCode: Integer;
begin
  Result := True;
  UninstallStr := GetUninstallString;
  if UninstallStr <> '' then
  begin
    // Remove quotes from the uninstall string
    UninstallPath := RemoveQuotes(UninstallStr);
    Log('Attempting to run uninstaller: ' + UninstallPath);

    if FileExists(UninstallPath) then
    begin
      // Run uninstaller silently - use SW_SHOWNORMAL so we can see it working
      if Exec(UninstallPath, '/VERYSILENT /NORESTART /SUPPRESSMSGBOXES', '', SW_SHOWNORMAL, ewWaitUntilTerminated, ResultCode) then
      begin
        Log('Uninstaller returned code: ' + IntToStr(ResultCode));
        Result := (ResultCode = 0);
      end
      else
      begin
        Log('Failed to execute uninstaller');
        Result := False;
      end;
    end
    else
    begin
      Log('Uninstaller not found at: ' + UninstallPath);
      Result := False;
    end;
  end
  else
  begin
    Log('No uninstall string found in registry');
  end;
end;

function GetPreviousVersion: String;
var
  Version: String;
begin
  Result := '';
  if RegQueryStringValue(HKLM, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1',
     'DisplayVersion', Version) then
    Result := Version
  else if RegQueryStringValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1',
     'DisplayVersion', Version) then
    Result := Version;
end;

function GetPreviousInstallPath: String;
var
  Path: String;
begin
  Result := '';
  if RegQueryStringValue(HKLM, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1',
     'InstallLocation', Path) then
    Result := Path
  else if RegQueryStringValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1',
     'InstallLocation', Path) then
    Result := Path;
end;

function AppExistsOnDisk(Path: String): Boolean;
begin
  // Check if key app files exist at the path
  Result := (Path <> '') and (FileExists(Path + '\DOCKER_TOGGLE.vbs') or FileExists(Path + '\DOCKER.ps1'));
end;

function InitializeSetup: Boolean;
var
  Choice: Integer;
  Msg: String;
  ExistingPath: String;
  AppExists: Boolean;
  IsSameVersion: Boolean;
begin
  Result := True;
  IsUpgrade := False;

  // Clean up old shortcuts from previous installations
  DeleteFile(ExpandConstant('{userdesktop}\SMS Toggle.lnk'));
  DeleteFile(ExpandConstant('{commondesktop}\SMS Toggle.lnk'));

  PreviousVersion := GetPreviousVersion;
  PreviousInstallPath := GetPreviousInstallPath;

  // Check if app exists either via registry or on disk at default location
  if PreviousInstallPath = '' then
    ExistingPath := ExpandConstant('{autopf}\SMS')
  else
    ExistingPath := PreviousInstallPath;

  // Determine if app exists
  AppExists := (PreviousVersion <> '') or AppExistsOnDisk(ExistingPath);

  if not AppExists then
  begin
    // No existing installation - proceed with fresh install
    IsUpgrade := False;
    Result := True;
    Exit;
  end;

  // App exists - determine version info
  if PreviousVersion = '' then
    PreviousVersion := 'Unknown';
  if PreviousInstallPath = '' then
    PreviousInstallPath := ExistingPath;

  // Check if same version
  IsSameVersion := (PreviousVersion = '{#MyAppVersion}');

  // Build message
  if IsSameVersion then
    Msg := CustomMessage('SameVersionFound')
  else
    Msg := CustomMessage('ExistingVersionFound');
  StringChangeEx(Msg, '%1', PreviousVersion, True);
  StringChangeEx(Msg, '%2', PreviousInstallPath, True);

  // Show upgrade/overwrite options dialog
  Choice := MsgBox(Msg + #13#10#13#10 +
    CustomMessage('UpgradeOption') + #13#10 +
    CustomMessage('CleanInstallOption') + #13#10#13#10 +
    CustomMessage('UpgradePrompt'),
    mbConfirmation, MB_YESNOCANCEL);

  case Choice of
    IDYES:
      begin
        // Update/Overwrite - keep data, install over existing
        IsUpgrade := True;
        Result := True;
      end;
    IDNO:
      begin
        // Fresh install - remove previous installation first
        IsUpgrade := False;
        Result := True;
      end;
    IDCANCEL:
      begin
        Result := False;
      end;
  end;
end;

procedure UpdateDockerStatus(Sender: TObject);
var
  StatusText, InfoText: String;
begin
  if IsDockerInstalled then
  begin
    StatusText := '✓ ' + CustomMessage('DockerInstalled');
    DockerStatusLabel.Font.Color := clGreen;

    if IsDockerRunning then
      InfoText := '✓ ' + CustomMessage('DockerRunning')
    else
      InfoText := '⚠ ' + CustomMessage('DockerNotRunning');
  end
  else
  begin
    StatusText := '✗ ' + CustomMessage('DockerNotInstalled');
    InfoText := CustomMessage('DockerNotFound');
    DockerStatusLabel.Font.Color := $000080FF; // Orange
  end;

  InfoText := InfoText + #13#10#13#10 + CustomMessage('FirstRunNote');

  DockerStatusLabel.Caption := StatusText;
  DockerInfoLabel.Caption := InfoText;
end;

procedure InitializeWizard;
var
  DockerOnlyDesc: TLabel;
  DevEnvDesc: TLabel;
begin
  // Skip Installation Type page since only Docker-only is available for production
  // Create custom Docker Prerequisites page (early in wizard)
  DockerPage := CreateCustomPage(wpLicense, 'Prerequisites Check',
    'Verifying Docker Desktop installation and status');

  DockerStatusLabel := TLabel.Create(DockerPage);
  DockerStatusLabel.Parent := DockerPage.Surface;
  DockerStatusLabel.Left := 0;
  DockerStatusLabel.Top := 10;
  DockerStatusLabel.Width := DockerPage.SurfaceWidth;
  DockerStatusLabel.Height := 30;
  DockerStatusLabel.Font.Size := 14;
  DockerStatusLabel.Font.Style := [fsBold];

  DockerInfoLabel := TLabel.Create(DockerPage);
  DockerInfoLabel.Parent := DockerPage.Surface;
  DockerInfoLabel.Left := 0;
  DockerInfoLabel.Top := 50;
  DockerInfoLabel.Width := DockerPage.SurfaceWidth;
  DockerInfoLabel.Height := 150;
  DockerInfoLabel.WordWrap := True;
  DockerInfoLabel.Font.Size := 10;

  RefreshButton := TButton.Create(DockerPage);
  RefreshButton.Parent := DockerPage.Surface;
  RefreshButton.Left := 0;
  RefreshButton.Top := 210;
  RefreshButton.Width := 150;
  RefreshButton.Height := 30;
  RefreshButton.Caption := CustomMessage('DockerRefreshButton');
  RefreshButton.OnClick := @UpdateDockerStatus;

  UpdateDockerStatus(nil);

  // Create Docker build progress page (AFTER file copy, before finish)
  DockerBuildPage := CreateCustomPage(wpInstalling + 1, 'Completing Installation', 'Building SMS Docker container. This may take several minutes on first install.');
  DockerBuildStatusLabel := TLabel.Create(DockerBuildPage);
  DockerBuildStatusLabel.Parent := DockerBuildPage.Surface;
  DockerBuildStatusLabel.Left := 0;
  DockerBuildStatusLabel.Top := 10;
  DockerBuildStatusLabel.Width := DockerBuildPage.SurfaceWidth;
  DockerBuildStatusLabel.Height := 100;
  DockerBuildStatusLabel.WordWrap := True;
  DockerBuildStatusLabel.Font.Size := 10;
  DockerBuildStatusLabel.Caption := 'Preparing Docker container build...';
end;

procedure CurPageChanged(CurPageID: Integer);
var
  ResultCode: Integer;
  Cmd: String;
begin
  if CurPageID = DockerPage.ID then
    UpdateDockerStatus(nil);
  if (CurPageID = DockerBuildPage.ID) then
  begin
    WizardForm.NextButton.Enabled := False;
    DockerBuildStatusLabel.Caption := 'Building SMS Docker container...';
    try
      Cmd := ExpandConstant('{app}\run_docker_install.cmd');
      if FileExists(Cmd) then
      begin
        DockerBuildStatusLabel.Caption := 'Running Docker container setup...';
        WizardForm.StatusLabel.Caption := 'Setting up SMS Docker container (this may take several minutes)...';
        if Exec(Cmd, '', ExpandConstant('{app}'), SW_SHOW, ewWaitUntilTerminated, ResultCode) then
        begin
          if ResultCode = 0 then
            DockerBuildStatusLabel.Caption := 'SMS Docker container setup completed successfully.'
          else
            DockerBuildStatusLabel.Caption := 'Docker container setup encountered an issue. Please check Docker Desktop and try again.';
        end
        else
          DockerBuildStatusLabel.Caption := 'Failed to start Docker setup script.';
      end
      else
        DockerBuildStatusLabel.Caption := 'Docker setup script not found.';
    except
      DockerBuildStatusLabel.Caption := 'Error occurred during Docker container setup.';
    end;
    WizardForm.NextButton.Enabled := True;
  end;
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;
  // Skip Docker page if Docker is already installed and running
  if PageID = DockerPage.ID then
    Result := IsDockerInstalled and IsDockerRunning
  // Skip Docker build page if upgrading and container already exists (no rebuild needed)
  else if PageID = DockerBuildPage.ID then
    Result := IsUpgrade and ContainerExists;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  ErrorCode: Integer;
begin
  Result := True;

  if CurPageID = DockerPage.ID then
  begin
    if not IsDockerInstalled then
    begin
      if MsgBox(CustomMessage('DockerNotFound'), mbConfirmation, MB_YESNO) = IDYES then
      begin
        ShellExec('open', 'https://www.docker.com/products/docker-desktop/', '', '', SW_SHOWNORMAL, ewNoWait, ErrorCode);
      end;
      // Allow continue - user can install Docker later
    end;
  end;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  ResultCode: Integer;
  UninstallStr: String;
  UninstallPath: String;
  UpgradeStr: String;
begin
  Result := '';
  NeedsRestart := False;

  if IsUpgrade then UpgradeStr := 'True' else UpgradeStr := 'False';
  Log('PrepareToInstall: IsUpgrade = ' + UpgradeStr);
  Log('PrepareToInstall: PreviousInstallPath = ' + PreviousInstallPath);

  // Stop Docker container first (always, for both upgrade and fresh install)
  if ContainerExists then
  begin
    Log('Stopping Docker container...');
    Exec('cmd', '/c docker stop sms-app', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;

  // For Fresh Install (not upgrade), remove previous installation
  if not IsUpgrade then
  begin
    Log('Fresh install requested - checking for previous installation to remove');
    UninstallStr := GetUninstallString;

    if UninstallStr <> '' then
    begin
      UninstallPath := RemoveQuotes(UninstallStr);
      Log('Found uninstall string: ' + UninstallPath);

      if FileExists(UninstallPath) then
      begin
        Log('Running uninstaller for fresh install...');
        // Run the uninstaller
        if not UninstallPreviousVersion then
        begin
          Log('Warning: Uninstaller did not complete successfully');
        end
        else
        begin
          Log('Uninstaller completed successfully');
        end;

        // Wait a moment for file system to settle
        Sleep(1000);
      end
      else
      begin
        Log('Uninstaller file not found: ' + UninstallPath);
      end;
    end else if (PreviousInstallPath <> '') and DirExists(PreviousInstallPath) then
    begin
      // No uninstaller but files exist - try to clean up manually
      Log('No uninstaller found, cleaning up manually at: ' + PreviousInstallPath);
      Exec('cmd', '/c rmdir /S /Q "' + PreviousInstallPath + '\\backend"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      Exec('cmd', '/c rmdir /S /Q "' + PreviousInstallPath + '\\frontend"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      Exec('cmd', '/c rmdir /S /Q "' + PreviousInstallPath + '\\docker"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      Exec('cmd', '/c rmdir /S /Q "' + PreviousInstallPath + '\\scripts"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      Exec('cmd', '/c del /Q "' + PreviousInstallPath + '\\*.ps1"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      Exec('cmd', '/c del /Q "' + PreviousInstallPath + '\\*.vbs"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      Exec('cmd', '/c del /Q "' + PreviousInstallPath + '\\*.md"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    end
    else
    begin
      Log('No previous installation found to remove');
    end;
  end
  else
  begin
    Log('Upgrade mode - keeping existing installation');
  end;
end;


function GetPowerShellExe: String;
begin
  // Try pwsh.exe (PowerShell 7+) in PATH
  if FileExists(ExpandConstant('{cmd}\pwsh.exe')) then
    Result := 'pwsh.exe'
  // Try powershell.exe (Windows PowerShell) in PATH
  else if FileExists(ExpandConstant('{cmd}\powershell.exe')) then
    Result := 'powershell.exe'
  // Try default install locations for PowerShell 7
  else if FileExists('C:\\Program Files\\PowerShell\\7\\pwsh.exe') then
    Result := 'C:\\Program Files\\PowerShell\\7\\pwsh.exe'
  else if FileExists('C:\\Program Files (x86)\\PowerShell\\7\\pwsh.exe') then
    Result := 'C:\\Program Files (x86)\\PowerShell\\7\\pwsh.exe'
  // Try default install location for Windows PowerShell
  else if FileExists('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe') then
    Result := 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
  else
    Result := '';
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  EnvContent: String;
  BackupPath: String;
  NewShortcut, CommonShortcut, UserShortcut: String;
  ResultCode: Integer;
  PowerShellExe: String;
  OldUninstaller, NewUninstaller: String;
begin
  if CurStep = ssInstall then
  begin
    // Before installing, backup user data if upgrading and keepdata task is selected
    if IsUpgrade and WizardIsTaskSelected('keepdata') then
    begin
      BackupPath := ExpandConstant('{app}\backups\pre_upgrade_' + '{#MyAppVersion}');

      // Backup data directory if it exists
      if DirExists(ExpandConstant('{app}\data')) then
      begin
        ForceDirectories(BackupPath);
        Exec('cmd', '/c xcopy /E /I /Y "' + ExpandConstant('{app}\data') + '" "' + BackupPath + '\data"',
             '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      end;

      // Backup .env files if they exist
      if FileExists(ExpandConstant('{app}\backend\.env')) then
      begin
        ForceDirectories(BackupPath + '\config');
        FileCopy(ExpandConstant('{app}\backend\.env'), BackupPath + '\config\backend.env', False);
      end;
      if FileExists(ExpandConstant('{app}\frontend\.env')) then
      begin
        FileCopy(ExpandConstant('{app}\frontend\.env'), BackupPath + '\config\frontend.env', False);
      end;
    end;

    // Stop Docker container before updating files
    if ContainerExists then
    begin
      Exec('cmd', '/c docker stop sms-app', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    end;
  end
  else if CurStep = ssPostInstall then
  begin
    // Rename the uninstaller to include version number
    OldUninstaller := ExpandConstant('{app}\unins000.exe');
    NewUninstaller := ExpandConstant('{app}\unins{#MyAppVersion}.exe');

    if FileExists(OldUninstaller) and not FileExists(NewUninstaller) then
    begin
      Log('Renaming uninstaller from unins000.exe to unins{#MyAppVersion}.exe');
      if RenameFile(OldUninstaller, NewUninstaller) then
      begin
        // Update the uninstall registry entry to point to the renamed file
        RegWriteStringValue(HKLM, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1',
          'UninstallString', '"' + NewUninstaller + '"');
        RegWriteStringValue(HKLM, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1',
          'QuietUninstallString', '"' + NewUninstaller + '" /SILENT');
        RegWriteStringValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1',
          'UninstallString', '"' + NewUninstaller + '"');
        RegWriteStringValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1',
          'QuietUninstallString', '"' + NewUninstaller + '" /SILENT');
        Log('Uninstaller renamed successfully and registry updated');
      end
      else
      begin
        Log('Failed to rename uninstaller file');
      end;
    end;
  end;
end;

function InitializeUninstall: Boolean;
var
  ResultCode: Integer;
  DeleteUserData: Integer;
begin
  Result := True;

  // Stop container before uninstall
  Exec('cmd', '/c docker stop sms-app 2>nul', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Exec('cmd', '/c docker rm sms-app 2>nul', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

  // Ask user if they want to delete user data
  DeleteUserData := MsgBox(
    'Do you want to delete all user data?' + #13#10 + #13#10 +
    'This includes:' + #13#10 +
    '  • Database (data folder)' + #13#10 +
    '  • Backups (backups folder)' + #13#10 +
    '  • Logs (logs folder)' + #13#10 +
    '  • Configuration files (.env)' + #13#10 + #13#10 +
    'Click YES to delete everything.' + #13#10 +
    'Click NO to keep your data for reinstallation.',
    mbConfirmation, MB_YESNO);

  if DeleteUserData = IDYES then
  begin
    Log('User chose to delete all user data');
    DelTree(ExpandConstant('{app}\data'), True, True, True);
    DelTree(ExpandConstant('{app}\backups'), True, True, True);
    DelTree(ExpandConstant('{app}\logs'), True, True, True);
    DelTree(ExpandConstant('{app}\config'), True, True, True);
    DeleteFile(ExpandConstant('{app}\.env'));
    DeleteFile(ExpandConstant('{app}\backend\.env'));
    DeleteFile(ExpandConstant('{app}\frontend\.env'));
  end;

    Log('User chose to keep user data');
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
  begin
    // Clean up empty directories left behind
    RemoveDir(ExpandConstant('{app}\backend'));
    RemoveDir(ExpandConstant('{app}\frontend'));
    RemoveDir(ExpandConstant('{app}\docker'));
    RemoveDir(ExpandConstant('{app}\scripts'));
    RemoveDir(ExpandConstant('{app}\config'));
    RemoveDir(ExpandConstant('{app}\templates'));
    RemoveDir(ExpandConstant('{app}'));
  end;
end;
