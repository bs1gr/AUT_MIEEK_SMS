; ============================================================================
; Student Management System - Inno Setup Installer Script
; Version: 1.9.3 - Bilingual (English / Greek)
; Requires Inno Setup 6.x (https://jrsoftware.org/isinfo.php)
; ============================================================================

#define MyAppName "Student Management System"
#define MyAppShortName "SMS"
#define MyAppPublisher "AUT MIEEK"
#define MyAppURL "https://www.mieek.ac.cy/index.php/el/"
#define MyAppGitHubURL "https://github.com/bs1gr/AUT_MIEEK_SMS"
#define MyAppExeName "DOCKER_TOGGLE.vbs"
#define MyAppId "{B5A1E2F3-C4D5-6789-ABCD-EF0123456789}"

; Read version from VERSION file
#define VersionFile FileOpen("..\VERSION")
#define MyAppVersion Trim(FileRead(VersionFile))
#expr FileClose(VersionFile)

; Uninstaller naming - easy to customize for future updates
#define UninstallerBaseName "Uninstall_SMS"
#define UninstallerExe UninstallerBaseName + "_" + MyAppVersion + ".exe"
#define UninstallerDat UninstallerBaseName + "_" + MyAppVersion + ".dat"

[Setup]
; Unique application ID - DO NOT CHANGE
AppId={{B5A1E2F3-C4D5-6789-ABCD-EF0123456789}
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
SetupIconFile=..\SMS_Toggle.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
WizardSizePercent=120
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64
MinVersion=10.0
UninstallDisplayIcon={app}\SMS_Toggle.ico
UninstallFilesDir={app}
UninstallDisplayName={#MyAppName} {#MyAppVersion}
ShowLanguageDialog=yes
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

; Note: Greek messages are in Greek.isl file
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
english.DockerStatusTitle=Docker Desktop Status
english.DockerRefreshButton=Refresh
; Greek custom messages
greek.DockerRequired=Απαιτείται το Docker Desktop
greek.DockerNotFound=Το Docker Desktop δεν εντοπίστηκε.%n%nΘέλετε να ανοίξετε τη σελίδα λήψης;
greek.LaunchApp=Εκκίνηση του SMS μετά την εγκατάσταση
greek.CreateShortcut=Δημιουργία συντόμευσης στην επιφάνεια εργασίας
greek.BuildContainer=Δημιουργία Docker container (~5-10 λεπτά)
greek.Prerequisites=Προαπαιτούμενα:
greek.OpenDockerPage=Άνοιγμα σελίδας λήψης Docker Desktop
greek.DockerInstalled=Το Docker Desktop είναι εγκατεστημένο
greek.DockerNotInstalled=Το Docker Desktop ΔΕΝ είναι εγκατεστημένο
greek.DockerRunning=Το Docker Desktop εκτελείται
greek.DockerNotRunning=Το Docker Desktop δεν εκτελείται
greek.BuildingContainer=Δημιουργία SMS Docker container...
greek.FirstRunNote=Η πρώτη εκτέλεση θα δημιουργήσει το container (5-10 λεπτά)
greek.ExistingInstallDetected=Εντοπίστηκε υπάρχουσα εγκατάσταση
greek.ExistingVersionFound=Η έκδοση %1 είναι ήδη εγκατεστημένη στη διαδρομή:%n%2%n%nΤι θέλετε να κάνετε;
greek.SameVersionFound=Η έκδοση %1 είναι ήδη εγκατεστημένη στη διαδρομή:%n%2%n%nΤι θέλετε να κάνετε;
greek.UpgradeOption=Ενημέρωση/Αντικατάσταση (διατήρηση δεδομένων)
greek.CleanInstallOption=Νέα εγκατάσταση (αφαίρεση προηγούμενης πρώτα)
greek.CancelOption=Ακύρωση
greek.UpgradingFrom=Αναβάθμιση από έκδοση %1 σε %2
greek.BackupCreated=Δημιουργήθηκε αντίγραφο ασφαλείας: %1
greek.KeepUserData=Διατήρηση δεδομένων χρήστη
greek.RemoveOldVersion=Αφαίρεση προηγούμενης έκδοσης
greek.UpgradePrompt=Πατήστε ΝΑΙ για ενημέρωση, ΟΧΙ για νέα εγκατάσταση, ή ΑΚΥΡΟ.
greek.KeepDataPrompt=Θέλετε να διατηρήσετε τα δεδομένα σας;%n%nΠατήστε ΝΑΙ για διατήρηση.%nΠατήστε ΟΧΙ για διαγραφή όλων.
greek.ViewReadme=Προβολή τεκμηρίωσης README
greek.DockerStatusTitle=Κατάσταση Docker Desktop
greek.DockerRefreshButton=Ανανέωση

[Tasks]
Name: "keepdata"; Description: "{cm:KeepUserData}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce; Check: IsUpgradeInstall
Name: "installdocker"; Description: "{cm:OpenDockerPage}"; GroupDescription: "{cm:Prerequisites}"; Check: not IsDockerInstalled

[Files]
; Core application files
Source: "..\backend\*"; DestDir: "{app}\backend"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "__pycache__,*.pyc,*.pyo,.pytest_cache,logs\*,.env"
Source: "..\frontend\*"; DestDir: "{app}\frontend"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "node_modules,dist,.env"
Source: "..\docker\*"; DestDir: "{app}\docker"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\config\*"; DestDir: "{app}\config"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\scripts\*"; DestDir: "{app}\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\templates\*"; DestDir: "{app}\templates"; Flags: ignoreversion recursesubdirs createallsubdirs

; Main scripts
Source: "..\DOCKER.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\NATIVE.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\DOCKER_TOGGLE.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\DOCKER_TOGGLE.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\CREATE_DESKTOP_SHORTCUT.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "run_docker_install.cmd"; DestDir: "{app}"; Flags: ignoreversion

; Icon file
Source: "..\SMS_Toggle.ico"; DestDir: "{app}"; Flags: ignoreversion

; Documentation
Source: "..\README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\CHANGELOG.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\LICENSE"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\VERSION"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\DESKTOP_SHORTCUT_QUICK_START.md"; DestDir: "{app}"; Flags: ignoreversion

; Example env files
Source: "..\backend\.env.example"; DestDir: "{app}\backend"; DestName: ".env.example"; Flags: ignoreversion
Source: "..\frontend\.env.example"; DestDir: "{app}\frontend"; DestName: ".env.example"; Flags: ignoreversion

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
Name: "{group}\{#MyAppName}"; Filename: "wscript.exe"; Parameters: """{app}\DOCKER_TOGGLE.vbs"""; WorkingDir: "{app}"; IconFilename: "{app}\SMS_Toggle.ico"; Comment: "Start/Stop SMS Docker container"
Name: "{group}\SMS Documentation"; Filename: "{app}\README.md"; IconFilename: "{app}\SMS_Toggle.ico"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"

; Desktop shortcut
Name: "{autodesktop}\{#MyAppName}"; Filename: "wscript.exe"; Parameters: """{app}\DOCKER_TOGGLE.vbs"""; WorkingDir: "{app}"; IconFilename: "{app}\SMS_Toggle.ico"; Comment: "Start/Stop SMS Docker container"

[Run]
; Open Docker download page if requested
Filename: "cmd"; Parameters: "/c start https://www.docker.com/products/docker-desktop/"; Flags: postinstall shellexec nowait; Tasks: installdocker

; Option to launch app after install (only if Docker is running)
Filename: "wscript.exe"; Parameters: """{app}\DOCKER_TOGGLE.vbs"""; Description: "{cm:LaunchApp}"; Flags: postinstall nowait skipifsilent runascurrentuser; WorkingDir: "{app}"; Check: IsDockerRunning

; Open README
Filename: "{app}\README.md"; Description: "{cm:ViewReadme}"; Flags: postinstall shellexec skipifsilent unchecked

[Code]
var
  DockerPage: TWizardPage;
  DockerStatusLabel: TLabel;
  DockerInfoLabel: TLabel;
  RefreshButton: TButton;
  PreviousVersion: String;
  PreviousInstallPath: String;
  IsUpgrade: Boolean;

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
begin
  // Create custom Docker status page
  DockerPage := CreateCustomPage(wpSelectTasks, CustomMessage('DockerRequired'), 
    CustomMessage('DockerStatusTitle'));
  
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
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if CurPageID = DockerPage.ID then
    UpdateDockerStatus(nil);
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;
  // Skip Docker page if Docker is already installed
  if PageID = DockerPage.ID then
    Result := IsDockerInstalled;
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
    end
    else if (PreviousInstallPath <> '') and DirExists(PreviousInstallPath) then
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

procedure CurStepChanged(CurStep: TSetupStep);
var
  EnvContent: String;
  BackupPath: String;
  ResultCode: Integer;
  NewShortcut, CommonShortcut, UserShortcut: String;
begin
  if CurStep = ssInstall then
  begin
    // Before installing, backup user data if upgrading and keepdata task is selected
    if IsUpgrade and IsTaskSelected('keepdata') then
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
  end;
  
  if CurStep = ssPostInstall then
  begin
    // Determine paths for the newly created correct shortcut and potential duplicates
    NewShortcut := ExpandConstant('{autodesktop}\{#MyAppName}.lnk');
    CommonShortcut := ExpandConstant('{commondesktop}\{#MyAppName}.lnk');
    UserShortcut := ExpandConstant('{userdesktop}\{#MyAppName}.lnk');

    // Clean up old shortcuts from previous versions (various naming patterns)
    // Be aggressive for the legacy "SMS Toggle" name, including numbered copies
    DeleteFile(ExpandConstant('{autodesktop}\SMS Toggle*.lnk'));
    DeleteFile(ExpandConstant('{commondesktop}\SMS Toggle*.lnk'));
    DeleteFile(ExpandConstant('{userdesktop}\SMS Toggle*.lnk'));

    // Also remove any duplicate/redundant shortcuts with the full app name,
    // BUT NEVER delete the one we just created at {autodesktop}
    if LowerCase(CommonShortcut) <> LowerCase(NewShortcut) then
      DeleteFile(CommonShortcut);
    if LowerCase(UserShortcut) <> LowerCase(NewShortcut) then
      DeleteFile(UserShortcut);
    // Clean up any manually created folder shortcuts (case-insensitive match via exact known name)
    DeleteFile(ExpandConstant('{autodesktop}\student-management-system - Shortcut.lnk'));
    DeleteFile(ExpandConstant('{userdesktop}\student-management-system - Shortcut.lnk'));
    Log('Cleaned up old/duplicate shortcuts');
    
    // Rename uninstaller to include version and update registry
    // Uses constants defined at top: UninstallerExe, UninstallerDat
    if FileExists(ExpandConstant('{app}\unins000.exe')) then
    begin
      RenameFile(ExpandConstant('{app}\unins000.exe'), ExpandConstant('{app}\{#UninstallerExe}'));
      RenameFile(ExpandConstant('{app}\unins000.dat'), ExpandConstant('{app}\{#UninstallerDat}'));
      // Update registry to point to renamed uninstaller
      RegWriteStringValue(HKLM, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1', 
        'UninstallString', '"' + ExpandConstant('{app}\{#UninstallerExe}') + '"');
      RegWriteStringValue(HKLM, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1', 
        'QuietUninstallString', '"' + ExpandConstant('{app}\{#UninstallerExe}') + '" /SILENT');
      Log('Renamed uninstaller to {#UninstallerExe}');
    end;
    
    // Save language preference for VBS script
    ForceDirectories(ExpandConstant('{app}\config'));
    if ActiveLanguage = 'greek' then
      SaveStringToFile(ExpandConstant('{app}\config\lang.txt'), 'el', False)
    else
      SaveStringToFile(ExpandConstant('{app}\config\lang.txt'), 'en', False);
    
    // Restore .env files from backup if upgrading
    if IsUpgrade and IsTaskSelected('keepdata') then
    begin
      BackupPath := ExpandConstant('{app}\backups\pre_upgrade_' + '{#MyAppVersion}');
      
      if FileExists(BackupPath + '\config\backend.env') then
        FileCopy(BackupPath + '\config\backend.env', ExpandConstant('{app}\backend\.env'), False);
      if FileExists(BackupPath + '\config\frontend.env') then
        FileCopy(BackupPath + '\config\frontend.env', ExpandConstant('{app}\frontend\.env'), False);
    end
    else
    begin
      // Create default .env files if they don't exist (new install)
      // Root .env (needed by DOCKER.ps1)
      if not FileExists(ExpandConstant('{app}\.env')) then
      begin
        EnvContent := 
          '# Root Environment Configuration' + #13#10 +
          'VERSION={#MyAppVersion}' + #13#10 +
          'SECRET_KEY=change-me-in-production-' + IntToStr(Random(999999)) + #13#10 +
          'DEBUG=0' + #13#10;
        SaveStringToFile(ExpandConstant('{app}\.env'), EnvContent, False);
      end;
      
      if not FileExists(ExpandConstant('{app}\backend\.env')) then
      begin
        EnvContent := 
          '# Backend Environment Configuration' + #13#10 +
          'DEBUG=0' + #13#10 +
          'SECRET_KEY=change-me-in-production' + #13#10 +
          'AUTH_MODE=permissive' + #13#10;
        SaveStringToFile(ExpandConstant('{app}\backend\.env'), EnvContent, False);
      end;
      
      if not FileExists(ExpandConstant('{app}\frontend\.env')) then
      begin
        EnvContent := 
          '# Frontend Environment Configuration' + #13#10 +
          'VITE_API_URL=/api/v1' + #13#10;
        SaveStringToFile(ExpandConstant('{app}\frontend\.env'), EnvContent, False);
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
  end
  else
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
