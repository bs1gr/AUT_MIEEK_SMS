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
#define MyAppExeName "SMS_Manager.exe"
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
DisableDirPage=yes
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
Source: "..\.github\scripts\*"; DestDir: "{app}\.github\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs
; DEPLOYMENT OPTIMIZATION: Scripts folder excluded - only backup-database.sh needed (99% size reduction)
Source: "..\scripts\backup-database.sh"; DestDir: "{app}\scripts"; Flags: ignoreversion; Check: IsProductionInstall
Source: "..\templates\*"; DestDir: "{app}\templates"; Flags: ignoreversion recursesubdirs createallsubdirs

; Main scripts - Docker-only scripts always installed
Source: "..\DOCKER.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "dist\SMS_Manager.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\UNINSTALL_SMS_MANUALLY.ps1"; DestDir: "{app}"; Flags: ignoreversion

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

; Environment file template - needed for DOCKER.ps1 to create .env on first run
Source: "..\.env.example"; DestDir: "{app}"; DestName: ".env.example"; Flags: ignoreversion

; Dev documentation - only for dev environment
Source: "..\CONTRIBUTING.md"; DestDir: "{app}"; Flags: ignoreversion; Check: IsDevInstall
Source: "..\docs\DOCUMENTATION_INDEX.md"; DestDir: "{app}\docs"; Flags: ignoreversion; Check: IsDevInstall

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
; Legacy launcher cleanup
Type: files; Name: "{app}\docker_manager.bat"
Type: files; Name: "{app}\docker_manager.cmd"
; Note: data/, backups/, logs/ folders are handled by InitializeUninstall
; to give user choice whether to keep or delete them

[Icons]
; Start Menu - Docker Manager with proper container control
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\favicon.ico"; Comment: "Start/Stop/Manage SMS Docker container"
Name: "{group}\SMS Documentation"; Filename: "{app}\README.md"; IconFilename: "{app}\favicon.ico"
Name: "{group}\Manual Uninstaller (for broken installations)"; Filename: "pwsh.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\UNINSTALL_SMS_MANUALLY.ps1"""; WorkingDir: "{app}"; IconFilename: "{sys}\shell32.dll"; IconIndex: 31; Comment: "Remove SMS if standard uninstall fails"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"

; Desktop shortcut (optional) - Docker Manager with elevated privileges
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\favicon.ico"; Comment: "Start/Stop/Manage SMS Docker container"; Tasks: desktopicon


[Run]
; Open Docker download page if requested
Filename: "cmd"; Parameters: "/c start https://www.docker.com/products/docker-desktop/"; Flags: postinstall shellexec nowait; Tasks: installdocker

; --- Docker build and install: always use the batch file, never call PowerShell directly ---

; Option to launch app after install (only if Docker is running)
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchApp}"; Flags: postinstall nowait skipifsilent runascurrentuser; WorkingDir: "{app}"

; Open README
Filename: "{app}\README.md"; Description: "{cm:ViewReadme}"; Flags: postinstall shellexec skipifsilent unchecked

[Code]
var
  DockerPage: TWizardPage;
  DockerStatusLabel: TLabel;
  DockerInfoLabel: TLabel;
  RefreshButton: TButton;
  PostgresPage: TWizardPage;
  PgHostEdit: TEdit;
  PgPortEdit: TEdit;
  PgDbEdit: TEdit;
  PgUserEdit: TEdit;
  PgPassEdit: TEdit;
  PgSslEdit: TComboBox;
  DockerBuildPage: TWizardPage;
  DockerBuildStatusLabel: TLabel;
  PreviousVersion: String;
  PreviousInstallPath: String;
  IsUpgrade: Boolean;
  UpgradeBackupPath: String;
  PgHost: String;
  PgPort: String;
  PgDb: String;
  PgUser: String;
  PgPass: String;
  PgSsl: String;

// Forward declarations
function UrlEncode(const S: String): String; forward;
function StringReplaceAll(const Source, OldPattern, NewPattern: AnsiString): AnsiString; forward;
function TestPostgresTcpConnection(Host: String; Port: String): Boolean; forward;
function TestDockerReady: Boolean; forward;
function TestPostgresAuthConnection(Host, Port, DbName, UserName, Password, SslMode: String): Boolean; forward;

// Function to check if this is a dev environment install
function IsDevInstall: Boolean;
begin
  Result := False; // Production installer only supports Docker-only
end;

// Function to check if this is a production install (always true)
function IsProductionInstall: Boolean;
begin
  Result := True; // Production installer - always include production files
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
var
  Indicators: array of String;
  i: Integer;
begin
  Result := False;

  if (Path = '') or not DirExists(Path) then
    Exit;

  SetArrayLength(Indicators, 8);
  Indicators[0] := Path + '\VERSION';
  Indicators[1] := Path + '\SMS_Manager.exe';
  Indicators[2] := Path + '\docker_manager.cmd';
  Indicators[3] := Path + '\SMS Toggle.bat';
  Indicators[4] := Path + '\SMS Toggle.cmd';
  Indicators[5] := Path + '\DOCKER.ps1';
  Indicators[6] := Path + '\UNINSTALL_SMS_MANUALLY.ps1';
  Indicators[7] := Path + '\docker\docker-compose.yml';

  for i := 0 to GetArrayLength(Indicators) - 1 do
  begin
    if FileExists(Indicators[i]) then
    begin
      Result := True;
      Exit;
    end;
  end;
end;

function ReadVersionFromDirectory(BasePath: String): String;
var
  VersionData: AnsiString;
begin
  Result := '';

  if FileExists(BasePath + '\VERSION') then
  begin
    if LoadStringFromFile(BasePath + '\VERSION', VersionData) then
    begin
      Result := Trim(String(VersionData));
      if Result = '' then
        Result := 'Unknown';
    end;
  end;
end;

function PreserveDirName(DirName: String): Boolean;
begin
  Result := (DirName = 'data') or (DirName = 'backups') or (DirName = 'logs') or (DirName = 'config');
end;

function PreserveFileName(FileName: String): Boolean;
begin
  Result := (FileName = '.env');
end;

procedure CleanupLegacyShortcuts;
begin
  Log('Cleaning legacy and stale shortcuts for upgrade...');

  { Legacy desktop shortcuts }
  DeleteFile(ExpandConstant('{userdesktop}\SMS Toggle.lnk'));
  DeleteFile(ExpandConstant('{commondesktop}\SMS Toggle.lnk'));

  { Current desktop shortcut (forces recreation with new target) }
  DeleteFile(ExpandConstant('{userdesktop}\{#MyAppName}.lnk'));
  DeleteFile(ExpandConstant('{commondesktop}\{#MyAppName}.lnk'));

  { Start menu shortcuts (legacy + current) }
  DeleteFile(ExpandConstant('{userprograms}\{#MyAppName}\SMS Toggle.lnk'));
  DeleteFile(ExpandConstant('{commonprograms}\{#MyAppName}\SMS Toggle.lnk'));
  DeleteFile(ExpandConstant('{userprograms}\{#MyAppName}\{#MyAppName}.lnk'));
  DeleteFile(ExpandConstant('{commonprograms}\{#MyAppName}\{#MyAppName}.lnk'));

  Log('Shortcut cleanup complete');
end;

procedure RemoveOldInstanceFiles(BasePath: String);
var
  FindRec: TFindRec;
  ItemPath: String;
begin
  if BasePath = '' then
    Exit;

  if FindFirst(BasePath + '\*', FindRec) then
  begin
    try
      repeat
        if (FindRec.Name <> '.') and (FindRec.Name <> '..') then
        begin
          ItemPath := BasePath + '\' + FindRec.Name;
          if FindRec.Attributes and FILE_ATTRIBUTE_DIRECTORY <> 0 then
          begin
            if not PreserveDirName(FindRec.Name) then
            begin
              Log('Removing old directory: ' + ItemPath);
              DelTree(ItemPath, True, True, True);
            end
            else
              Log('Preserving directory: ' + ItemPath);
          end
          else
          begin
            if not PreserveFileName(FindRec.Name) then
            begin
              Log('Removing old file: ' + ItemPath);
              DeleteFile(ItemPath);
            end
            else
              Log('Preserving file: ' + ItemPath);
          end;
        end;
      until not FindNext(FindRec);
    finally
      FindClose(FindRec);
    end;
  end;
end;

procedure LogAndRenameUninstallerSidecar(const OldPath, NewPath, LabelName: String);
begin
  if FileExists(OldPath) then
  begin
    Log('  Attempting to rename ' + LabelName + ': ' + OldPath + ' -> ' + NewPath);
    if FileExists(NewPath) then
    begin
      Log('    Removing previous ' + LabelName + ' at new path');
      if not DeleteFile(NewPath) then
        Log('    [WARN] Could not remove existing ' + LabelName + ' at new path');
    end;

    if RenameFile(OldPath, NewPath) then
      Log('    [OK] ' + LabelName + ' renamed successfully')
    else
      Log('    [WARN] Could not rename ' + LabelName + ' (likely locked by system)');
  end
  else
    Log('  ' + LabelName + ' not found at expected path: ' + OldPath);
end;

procedure CleanOldUninstallers(BasePath: String);
var
  FilePath: String;
  Patterns: array of String;
  i: Integer;
  Deleted: Integer;
begin
  Log('Cleaning old uninstaller files from: ' + BasePath);

  SetArrayLength(Patterns, 8);
  Patterns[0] := BasePath + '\unins000.exe';
  Patterns[1] := BasePath + '\unins000.dat';
  Patterns[2] := BasePath + '\unins000.msg';
  Patterns[3] := BasePath + '\unins1.12.3.exe';
  Patterns[4] := BasePath + '\unins1.12.3.dat';
  Patterns[5] := BasePath + '\unins1.17.6.exe';
  Patterns[6] := BasePath + '\unins1.17.6.dat';
  Patterns[7] := BasePath + '\unins1.17.7.exe';

  Deleted := 0;
  for i := 0 to GetArrayLength(Patterns) - 1 do
  begin
    FilePath := Patterns[i];
    if FileExists(FilePath) then
    begin
      if DeleteFile(FilePath) then
      begin
        Log('  [OK] Deleted: ' + FilePath);
        Deleted := Deleted + 1;
      end
      else
      begin
        Log('  [WARN] Could not delete (locked): ' + FilePath);
      end;
    end;
  end;

  Log('Uninstaller cleanup complete: ' + IntToStr(Deleted) + ' files deleted');
end;

procedure CleanOldDockerImages;
var
  ResultCode: Integer;
begin
  Log('Cleaning old Docker images...');
  // Remove old sms-fullstack images (keep only latest)
  Exec('cmd', '/c docker rmi sms-fullstack:1.12.3 2>nul', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Exec('cmd', '/c docker rmi sms-fullstack:1.17.6 2>nul', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Log('Old Docker images removed');
end;

function DetectExistingInstallation(var OutPath: String; var OutVersion: String): Boolean;
var
  RegPath, RegistryVersion: String;
  DefaultPath: String;
begin
  Result := False;
  DefaultPath := ExpandConstant('{autopf}\{#MyAppShortName}');
  OutVersion := '';
  OutPath := '';

  // Check 1: Registry HKLM
  if RegQueryStringValue(HKLM, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1', 'InstallLocation', RegPath) then
  begin
    if AppExistsOnDisk(RegPath) then
    begin
      OutPath := RegPath;
      RegQueryStringValue(HKLM, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1', 'DisplayVersion', RegistryVersion);
      OutVersion := RegistryVersion;
      if OutVersion = '' then
        OutVersion := ReadVersionFromDirectory(OutPath);
      Log(Format('Found installation via HKLM registry: %s (version: %s)', [OutPath, OutVersion]));
      Result := True;
      Exit;
    end;
  end;

  // Check 2: Registry HKCU
  if RegQueryStringValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1', 'InstallLocation', RegPath) then
  begin
    if AppExistsOnDisk(RegPath) then
    begin
      OutPath := RegPath;
      RegQueryStringValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1', 'DisplayVersion', RegistryVersion);
      OutVersion := RegistryVersion;
      if OutVersion = '' then
        OutVersion := ReadVersionFromDirectory(OutPath);
      Log(Format('Found installation via HKCU registry: %s (version: %s)', [OutPath, OutVersion]));
      Result := True;
      Exit;
    end;
  end;

  // Check 3: Default installation path
  if AppExistsOnDisk(DefaultPath) then
  begin
    OutPath := DefaultPath;
    OutVersion := ReadVersionFromDirectory(DefaultPath);
    if OutVersion = '' then
      OutVersion := 'Unknown';
    Log(Format('Found installation at default path: %s (version: %s)', [DefaultPath, OutVersion]));
    Result := True;
    Exit;
  end;

  Log('No existing SMS installation detected');
end;

function InitializeSetup: Boolean;
var
  Choice: Integer;
  Msg: String;
  ExistingVersion: String;
  ExistingPath: String;
  AppExists: Boolean;
  IsSameVersion: Boolean;
begin
  Result := True;
  IsUpgrade := False;

  // Clean up old shortcuts from previous installations
  DeleteFile(ExpandConstant('{userdesktop}\SMS Toggle.lnk'));
  DeleteFile(ExpandConstant('{commondesktop}\SMS Toggle.lnk'));

  // Use robust detection function
  AppExists := DetectExistingInstallation(PreviousInstallPath, PreviousVersion);

  if not AppExists then
  begin
    // No existing installation - proceed with fresh install
    IsUpgrade := False;
    Log('InitializeSetup: Fresh installation, no existing SMS found');
    Result := True;
    Exit;
  end;

  // Installation exists - validate version
  Log('InitializeSetup: Existing installation found at: ' + PreviousInstallPath);
  Log('InitializeSetup: Existing version: ' + PreviousVersion + ', New version: {#MyAppVersion}');

  IsSameVersion := (PreviousVersion = '{#MyAppVersion}');

  // Build message based on version comparison
  if IsSameVersion then
  begin
    Msg := 'Version {#MyAppVersion} is already installed at:' + #13#10 +
           PreviousInstallPath + #13#10#13#10 +
           'Click YES to reinstall/repair, or NO to cancel installation.';
  end
  else
  begin
    Msg := 'Version ' + PreviousVersion + ' is already installed at:' + #13#10 +
           PreviousInstallPath + #13#10#13#10 +
           'Your data and settings will be preserved.' + #13#10#13#10 +
           'Click YES to upgrade to version {#MyAppVersion}, or NO to cancel.';
  end;

  // Show upgrade confirmation dialog
  Choice := MsgBox(Msg, mbInformation, MB_YESNO);

  case Choice of
    IDYES:
      begin
        // ALWAYS upgrade in-place (never fresh install if app exists)
        IsUpgrade := True;
        // CRITICAL: Ensure installation path is ALWAYS the same
        // DisableDirPage ensures no user selection, so {app} will be the existing path
        Log('InitializeSetup: Proceeding with upgrade');
        Result := True;
      end;
    IDNO:
      begin
        // User cancelled
        Log('InitializeSetup: User cancelled installation');
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

  // External PostgreSQL configuration page
  PostgresPage := CreateCustomPage(DockerPage.ID, 'External PostgreSQL',
    'Configure the external PostgreSQL database used by SMS');

  PgHostEdit := TEdit.Create(PostgresPage);
  PgHostEdit.Parent := PostgresPage.Surface;
  PgHostEdit.Left := 0;
  PgHostEdit.Top := 10;
  PgHostEdit.Width := PostgresPage.SurfaceWidth;
  PgHostEdit.Text := '';
  PgHostEdit.Hint := 'Host/IP (e.g., 192.168.1.10)';

  PgPortEdit := TEdit.Create(PostgresPage);
  PgPortEdit.Parent := PostgresPage.Surface;
  PgPortEdit.Left := 0;
  PgPortEdit.Top := 45;
  PgPortEdit.Width := PostgresPage.SurfaceWidth;
  PgPortEdit.Text := '5432';
  PgPortEdit.Hint := 'Port (default 5432)';

  PgDbEdit := TEdit.Create(PostgresPage);
  PgDbEdit.Parent := PostgresPage.Surface;
  PgDbEdit.Left := 0;
  PgDbEdit.Top := 80;
  PgDbEdit.Width := PostgresPage.SurfaceWidth;
  PgDbEdit.Text := 'student_management';
  PgDbEdit.Hint := 'Database name';

  PgUserEdit := TEdit.Create(PostgresPage);
  PgUserEdit.Parent := PostgresPage.Surface;
  PgUserEdit.Left := 0;
  PgUserEdit.Top := 115;
  PgUserEdit.Width := PostgresPage.SurfaceWidth;
  PgUserEdit.Text := 'sms_user';
  PgUserEdit.Hint := 'Username';

  PgPassEdit := TEdit.Create(PostgresPage);
  PgPassEdit.Parent := PostgresPage.Surface;
  PgPassEdit.Left := 0;
  PgPassEdit.Top := 150;
  PgPassEdit.Width := PostgresPage.SurfaceWidth;
  PgPassEdit.PasswordChar := '*';
  PgPassEdit.Text := '';
  PgPassEdit.Hint := 'Password';

  PgSslEdit := TComboBox.Create(PostgresPage);
  PgSslEdit.Parent := PostgresPage.Surface;
  PgSslEdit.Left := 0;
  PgSslEdit.Top := 185;
  PgSslEdit.Width := PostgresPage.SurfaceWidth;
  PgSslEdit.Style := csDropDownList;
  PgSslEdit.Items.Add('prefer');
  PgSslEdit.Items.Add('require');
  PgSslEdit.Items.Add('disable');
  PgSslEdit.ItemIndex := 0;

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

function ReadEnvValue(FilePath, Key: String): String;
var
  Data: AnsiString;
  Lines: TStringList;
  i: Integer;
  Line: String;
begin
  Result := '';
  if not FileExists(FilePath) then
    Exit;
  if not LoadStringFromFile(FilePath, Data) then
    Exit;
  Lines := TStringList.Create;
  try
    Lines.Text := String(Data);
    for i := 0 to Lines.Count - 1 do
    begin
      Line := Trim(Lines[i]);
      if (Line = '') or (Line[1] = '#') then
        Continue;
      if Pos(Key + '=', Line) = 1 then
      begin
        Result := Trim(Copy(Line, Length(Key) + 2, 999));
        Exit;
      end;
    end;
  finally
    Lines.Free;
  end;
end;

procedure LoadPostgresDefaults;
var
  EnvPath: String;
begin
  EnvPath := ExpandConstant('{app}\.env');
  PgHost := ReadEnvValue(EnvPath, 'POSTGRES_HOST');
  PgPort := ReadEnvValue(EnvPath, 'POSTGRES_PORT');
  PgDb := ReadEnvValue(EnvPath, 'POSTGRES_DB');
  PgUser := ReadEnvValue(EnvPath, 'POSTGRES_USER');
  PgPass := ReadEnvValue(EnvPath, 'POSTGRES_PASSWORD');
  PgSsl := ReadEnvValue(EnvPath, 'POSTGRES_SSLMODE');

  if PgHost <> '' then PgHostEdit.Text := PgHost;
  if PgPort <> '' then PgPortEdit.Text := PgPort;
  if PgDb <> '' then PgDbEdit.Text := PgDb;
  if PgUser <> '' then PgUserEdit.Text := PgUser;
  if PgPass <> '' then PgPassEdit.Text := PgPass;
  if PgSsl <> '' then
  begin
    if PgSslEdit.Items.IndexOf(PgSsl) >= 0 then
      PgSslEdit.ItemIndex := PgSslEdit.Items.IndexOf(PgSsl);
  end;
end;

procedure WritePostgresEnv;
var
  EnvPath: String;
  ExamplePath: String;
  Content: AnsiString;
  DbUrl: String;
  EncUser: String;
  EncPass: String;
  EncDb: String;
  DummyResult: Integer;
begin
  EnvPath := ExpandConstant('{app}\.env');
  ExamplePath := ExpandConstant('{app}\.env.example');

  PgHost := Trim(PgHostEdit.Text);
  PgPort := Trim(PgPortEdit.Text);
  PgDb := Trim(PgDbEdit.Text);
  PgUser := Trim(PgUserEdit.Text);
  PgPass := Trim(PgPassEdit.Text);
  PgSsl := PgSslEdit.Items[PgSslEdit.ItemIndex];

  EncUser := UrlEncode(PgUser);
  EncPass := UrlEncode(PgPass);
  EncDb := UrlEncode(PgDb);
  DbUrl := 'postgresql://' + EncUser + ':' + EncPass + '@' + PgHost + ':' + PgPort + '/' + EncDb;

  if FileExists(ExamplePath) then
  begin
    LoadStringFromFile(ExamplePath, Content);
    Content := StringReplaceAll(Content, 'DATABASE_ENGINE=postgresql', 'DATABASE_ENGINE=postgresql');
    if Pos('DATABASE_URL=', Content) = 0 then
      Content := Content + #13#10 + 'DATABASE_URL=' + DbUrl + #13#10
    else
      Content := StringReplaceAll(Content, 'DATABASE_URL=', 'DATABASE_URL=' + DbUrl + #13#10);
    Content := StringReplaceAll(Content, 'POSTGRES_HOST=postgres', 'POSTGRES_HOST=' + PgHost);
    Content := StringReplaceAll(Content, 'POSTGRES_PORT=5432', 'POSTGRES_PORT=' + PgPort);
    Content := StringReplaceAll(Content, 'POSTGRES_DB=student_management', 'POSTGRES_DB=' + PgDb);
    Content := StringReplaceAll(Content, 'POSTGRES_USER=sms_user', 'POSTGRES_USER=' + PgUser);
    if Pos('POSTGRES_PASSWORD=', Content) = 0 then
      Content := Content + #13#10 + 'POSTGRES_PASSWORD=' + PgPass + #13#10
    else begin
      Content := StringReplaceAll(Content, 'POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE', 'POSTGRES_PASSWORD=' + PgPass);
      Content := StringReplaceAll(Content, 'POSTGRES_PASSWORD=SecurePassword2026!', 'POSTGRES_PASSWORD=' + PgPass);
    end;
    Content := StringReplaceAll(Content, 'POSTGRES_SSLMODE=prefer', 'POSTGRES_SSLMODE=' + PgSsl);
    SaveStringToFile(EnvPath, Content, False);
  end
  else
  begin
    Content := 'DATABASE_ENGINE=postgresql' + #13#10 +
      'DATABASE_URL=' + DbUrl + #13#10 +
      'POSTGRES_HOST=' + PgHost + #13#10 +
      'POSTGRES_PORT=' + PgPort + #13#10 +
      'POSTGRES_DB=' + PgDb + #13#10 +
      'POSTGRES_USER=' + PgUser + #13#10 +
      'POSTGRES_PASSWORD=' + PgPass + #13#10 +
      'POSTGRES_SSLMODE=' + PgSsl + #13#10;
    SaveStringToFile(EnvPath, Content, False);
  end;
end;

procedure CurPageChanged(CurPageID: Integer);
var
  ResultCode: Integer;
  Cmd: String;
begin
  if CurPageID = DockerPage.ID then
    UpdateDockerStatus(nil);
  if CurPageID = PostgresPage.ID then
    LoadPostgresDefaults;
  if (CurPageID = DockerBuildPage.ID) then
  begin
    WritePostgresEnv;
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

  if CurPageID = PostgresPage.ID then
  begin
    PgHost := Trim(PgHostEdit.Text);
    PgPort := Trim(PgPortEdit.Text);
    PgDb := Trim(PgDbEdit.Text);
    PgUser := Trim(PgUserEdit.Text);
    PgPass := Trim(PgPassEdit.Text);

    if (PgHost = '') or (PgPort = '') or (PgDb = '') or (PgUser = '') or (PgPass = '') then
    begin
      MsgBox('All PostgreSQL fields are required.', mbError, MB_OK);
      Result := False;
      Exit;
    end;

    if (Lowercase(PgHost) = 'localhost') or (PgHost = '127.0.0.1') then
    begin
      MsgBox('For Docker installs, PostgreSQL cannot be reached via localhost.' + #13#10 +
        'Use host.docker.internal or the machine IP address instead.', mbError, MB_OK);
      Result := False;
      Exit;
    end;

    if StrToIntDef(PgPort, 0) <= 0 then
    begin
      MsgBox('PostgreSQL port must be a valid number.', mbError, MB_OK);
      Result := False;
      Exit;
    end;

    if not TestPostgresTcpConnection(PgHost, PgPort) then
    begin
      MsgBox('Unable to reach PostgreSQL on ' + PgHost + ':' + PgPort + '.' + #13#10 +
        'Please verify the host, port, and network/firewall settings.', mbError, MB_OK);
      Result := False;
      Exit;
    end;

    if not TestDockerReady then
    begin
      MsgBox('Docker Desktop must be running to validate PostgreSQL credentials.' + #13#10 +
        'Please start Docker Desktop and try again.', mbError, MB_OK);
      Result := False;
      Exit;
    end;

    if not TestPostgresAuthConnection(PgHost, PgPort, PgDb, PgUser, PgPass, PgSslEdit.Items[PgSslEdit.ItemIndex]) then
    begin
      MsgBox('PostgreSQL authentication failed.' + #13#10 +
        'Please verify username/password, database name, and SSL mode.', mbError, MB_OK);
      Result := False;
      Exit;
    end;
  end;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  ResultCode: Integer;
  BackupPath: String;
  BackupTimestamp: String;
  MetadataFile: String;
  MetadataContent: String;
begin
  Result := '';
  NeedsRestart := False;

  Log('PrepareToInstall: IsUpgrade = ' + Format('%d', [Integer(IsUpgrade)]));
  Log('PrepareToInstall: PreviousInstallPath = ' + PreviousInstallPath);
  Log('PrepareToInstall: PreviousVersion = ' + PreviousVersion);

  // ALWAYS stop Docker container first
  if ContainerExists then
  begin
    Log('Stopping Docker container sms-app...');
    Exec('cmd', '/c docker stop sms-app 2>nul', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Log('Removing Docker container sms-app...');
    Exec('cmd', '/c docker rm sms-app 2>nul', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;

  // UPGRADE: Backup all data before any changes
  if IsUpgrade and (PreviousInstallPath <> '') then
  begin
    Log('Upgrade detected - backing up existing data...');
    BackupTimestamp := GetDateTimeString('yyyy-mm-dd_hhmmss', '-', ':');
    BackupPath := PreviousInstallPath + '\backups\pre_upgrade_' + BackupTimestamp;
    UpgradeBackupPath := BackupPath;

    Log('Backup destination: ' + BackupPath);

    // Create backup directory
    if not DirExists(BackupPath) then
      ForceDirectories(BackupPath);

    // Backup data directory
    if DirExists(PreviousInstallPath + '\data') then
    begin
      Log('Backing up data directory...');
      Exec('cmd', '/c xcopy /E /I /Y "' + PreviousInstallPath + '\data" "' + BackupPath + '\data" 2>nul',
           '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      if ResultCode <> 0 then
        Log('Warning: Data backup may have encountered issues (code: ' + IntToStr(ResultCode) + ')');
    end;

    // Backup environment files
    if FileExists(PreviousInstallPath + '\backend\.env') then
    begin
      Log('Backing up backend .env...');
      if not DirExists(BackupPath + '\config') then
        ForceDirectories(BackupPath + '\config');
      FileCopy(PreviousInstallPath + '\backend\.env', BackupPath + '\config\backend.env', False);
    end;

    if FileExists(PreviousInstallPath + '\frontend\.env') then
    begin
      Log('Backing up frontend .env...');
      if not DirExists(BackupPath + '\config') then
        ForceDirectories(BackupPath + '\config');
      FileCopy(PreviousInstallPath + '\frontend\.env', BackupPath + '\config\frontend.env', False);
    end;

    if FileExists(PreviousInstallPath + '\.env') then
    begin
      Log('Backing up root .env...');
      if not DirExists(BackupPath + '\config') then
        ForceDirectories(BackupPath + '\config');
      FileCopy(PreviousInstallPath + '\.env', BackupPath + '\config\.env', False);
    end;

    // Backup config/lang.txt if exists
    if FileExists(PreviousInstallPath + '\config\lang.txt') then
    begin
      Log('Backing up language config...');
      if not DirExists(BackupPath + '\config') then
        ForceDirectories(BackupPath + '\config');
      FileCopy(PreviousInstallPath + '\config\lang.txt', BackupPath + '\config\lang.txt', False);
    end;

    Log('Backup completed at: ' + BackupPath);

    // CRITICAL: Remove old instance files BEFORE restoring from backup
    Log('Removing old instance files (backend/frontend/docker/scripts)...');
    RemoveOldInstanceFiles(PreviousInstallPath);

    // Clean old uninstaller files
    CleanOldUninstallers(PreviousInstallPath);

    // Clean old Docker images to prevent conflicts
    CleanOldDockerImages;

    Log('Old instance cleanup complete - ready for fresh install of new version');
  end;

  // Create/update installation metadata file
  if PreviousInstallPath <> '' then
  begin
    MetadataFile := PreviousInstallPath + '\install_metadata.txt';
  end
  else
  begin
    MetadataFile := ExpandConstant('{app}\install_metadata.txt');
  end;

  MetadataContent := 'INSTALLATION_VERSION=' + '{#MyAppVersion}' + #13#10 +
                     'INSTALLATION_DATE=' + GetDateTimeString('yyyy-mm-dd hh:mm:ss', '-', ':') + #13#10 +
                     'UPGRADE_FROM=' + PreviousVersion + #13#10 +
                     'INSTALLATION_PATH=' + ExpandConstant('{app}') + #13#10;

  Log('Creating installation metadata...');
  SaveStringToFile(MetadataFile, MetadataContent, False);
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

function TestPostgresTcpConnection(Host: String; Port: String): Boolean;
var
  ResultCode: Integer;
  PowerShellExe: String;
  Command: String;
begin
  Result := False;
  PowerShellExe := GetPowerShellExe;
  if PowerShellExe = '' then
    Exit;

  Command := '-NoProfile -ExecutionPolicy Bypass -Command "' +
    'if ((Test-NetConnection -ComputerName \"' + Host + '\" -Port ' + Port + ').TcpTestSucceeded) { exit 0 } else { exit 1 }"';

  if Exec(PowerShellExe, Command, '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
    Result := (ResultCode = 0);
end;

function TestDockerReady: Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec('cmd', '/c docker info', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

function UrlEncode(const S: String): String;
var
  i: Integer;
  c: Char;
  HexVal: Integer;
  HexStr: String;
begin
  Result := '';
  for i := 1 to Length(S) do
  begin
    c := S[i];
    if (c >= 'A') and (c <= 'Z') or
       (c >= 'a') and (c <= 'z') or
       (c >= '0') and (c <= '9') or
       (c = '-') or (c = '_') or (c = '.') or (c = '~') then
      Result := Result + c
    else begin
      HexVal := Ord(c);
      HexStr := Format('%02x', [HexVal]);
      Result := Result + '%' + HexStr;
    end;
  end;
end;

function StringReplaceAll(const Source, OldPattern, NewPattern: AnsiString): AnsiString;
var
  PosIndex: Integer;
  Temp: AnsiString;
begin
  Temp := Source;
  PosIndex := Pos(OldPattern, Temp);
  while PosIndex > 0 do
  begin
    Delete(Temp, PosIndex, Length(OldPattern));
    Insert(NewPattern, Temp, PosIndex);
    PosIndex := Pos(OldPattern, Temp);
  end;
  Result := Temp;
end;

function TestPostgresAuthConnection(Host, Port, DbName, UserName, Password, SslMode: String): Boolean;
var
  ResultCode: Integer;
  TempEnv: String;
  EnvContent: String;
  Command: String;
begin
  Result := False;

  TempEnv := ExpandConstant('{tmp}\sms_pg_auth_test.env');
  EnvContent := 'PGHOST=' + Host + #13#10 +
    'PGPORT=' + Port + #13#10 +
    'PGDATABASE=' + DbName + #13#10 +
    'PGUSER=' + UserName + #13#10 +
    'PGPASSWORD=' + Password + #13#10 +
    'PGSSLMODE=' + SslMode + #13#10;

  SaveStringToFile(TempEnv, EnvContent, False);

  Command := '/c docker run --rm --env-file "' + TempEnv + '" postgres:16-alpine psql -c "select 1"';
  if Exec('cmd', Command, '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
    Result := (ResultCode = 0);

  if FileExists(TempEnv) then
    DeleteFile(TempEnv);
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  EnvContent: String;
  BackupPath: String;
  NewShortcut, CommonShortcut, UserShortcut: String;
  ResultCode: Integer;
  PowerShellExe: String;
  OldUninstaller, NewUninstaller: String;
  OldUninstallerDat, NewUninstallerDat: String;
  OldUninstallerMsg, NewUninstallerMsg: String;
begin
  if CurStep = ssInstall then
  begin
    if IsUpgrade then
      CleanupLegacyShortcuts;

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

    // Remove legacy batch launchers if they exist
    if FileExists(ExpandConstant('{app}\docker_manager.bat')) then
    begin
      Log('Removing legacy launcher: docker_manager.bat');
      DeleteFile(ExpandConstant('{app}\docker_manager.bat'));
    end;
    if FileExists(ExpandConstant('{app}\docker_manager.cmd')) then
    begin
      Log('Removing legacy launcher: docker_manager.cmd');
      DeleteFile(ExpandConstant('{app}\docker_manager.cmd'));
    end;
  end
  else if CurStep = ssPostInstall then
  begin
    if IsUpgrade and (UpgradeBackupPath <> '') then
    begin
      Log('Post-install upgrade handling - preserving user data only');

      // CRITICAL FIX: DO NOT restore .env files from old backup!
      // The new installation includes fresh .env files with correct configuration.
      // Restoring old .env files causes 400 Bad Request errors due to stale credentials.

      Log('[SKIPPED] .env restoration - using fresh .env files from new installation');
      Log('  Reason: Old .env files contain stale credentials that cause login failures');
      Log('  Action: New .env files from v1.17.7 installation will be used');

      // Only restore user data (not configuration files)

      if FileExists(UpgradeBackupPath + '\config\lang.txt') then
      begin
        Log('Restoring language config from backup...');
        ForceDirectories(ExpandConstant('{app}\config'));
        FileCopy(UpgradeBackupPath + '\config\lang.txt', ExpandConstant('{app}\config\lang.txt'), False);
      end;
    end;

    // Rename the uninstaller to include version number
    OldUninstaller := ExpandConstant('{app}\unins000.exe');
    NewUninstaller := ExpandConstant('{app}\unins{#MyAppVersion}.exe');
    OldUninstallerDat := ExpandConstant('{app}\unins000.dat');
    NewUninstallerDat := ExpandConstant('{app}\unins{#MyAppVersion}.dat');
    OldUninstallerMsg := ExpandConstant('{app}\unins000.msg');
    NewUninstallerMsg := ExpandConstant('{app}\unins{#MyAppVersion}.msg');

    Log('Uninstaller post-install: Old=' + OldUninstaller + ', New=' + NewUninstaller);

    if FileExists(OldUninstaller) then
    begin
      Log('  Old uninstaller found, attempting rename...');

      // First try to delete any existing new uninstaller (from previous runs)
      if FileExists(NewUninstaller) then
      begin
        Log('  Removing previous new uninstaller: ' + NewUninstaller);
        if not DeleteFile(NewUninstaller) then
          Log('  [WARN] Could not remove old new uninstaller');
      end;

      // Now try to rename
      if RenameFile(OldUninstaller, NewUninstaller) then
      begin
        Log('  [OK] Uninstaller renamed successfully');
        // Keep companion files (.dat/.msg) aligned with the executable name
        LogAndRenameUninstallerSidecar(OldUninstallerDat, NewUninstallerDat, 'Uninstaller DAT');
        LogAndRenameUninstallerSidecar(OldUninstallerMsg, NewUninstallerMsg, 'Uninstaller MSG');
        // Update the uninstall registry entry to point to the renamed file
        RegWriteStringValue(HKLM, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1',
          'UninstallString', '"' + NewUninstaller + '"');
        RegWriteStringValue(HKLM, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1',
          'QuietUninstallString', '"' + NewUninstaller + '" /SILENT');
        RegWriteStringValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1',
          'UninstallString', '"' + NewUninstaller + '"');
        RegWriteStringValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1',
          'QuietUninstallString', '"' + NewUninstaller + '" /SILENT');
        Log('  Registry entries updated successfully');
      end
      else
      begin
        Log('  [WARN] Could not rename uninstaller (may be locked by system)');
        // Fallback: Update registry to point to unins000.exe
        Log('  Fallback: Using unins000.exe for uninstaller registry entries');
        RegWriteStringValue(HKLM, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1',
          'UninstallString', '"' + OldUninstaller + '"');
        RegWriteStringValue(HKLM, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1',
          'QuietUninstallString', '"' + OldUninstaller + '" /SILENT');
      end;
    end
    else
    begin
      Log('  Old uninstaller not found at: ' + OldUninstaller);
      Log('  [WARN] Inno Setup may not have created the uninstaller executable');
      Log('  Attempting to ensure uninstaller registry entries are set...');
      // Ensure registry entries point to unins000.exe even if file doesn''t exist (will be created later)
      RegWriteStringValue(HKLM, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1',
        'UninstallString', '"' + OldUninstaller + '"');
      RegWriteStringValue(HKLM, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1',
        'QuietUninstallString', '"' + OldUninstaller + '" /SILENT');
    end;

    // Post-install validation: ensure SMS_Manager.exe exists
    if not FileExists(ExpandConstant('{app}\SMS_Manager.exe')) then
    begin
      Log('[ERROR] SMS_Manager.exe missing after installation');
      MsgBox('Installation completed but SMS_Manager.exe is missing.' + #13#10 +
             'Please re-run the installer (Repair) or download the latest installer.',
             mbError, MB_OK);
    end
  end;
end;

function InitializeUninstall: Boolean;
var
  ResultCode: Integer;
  DeleteUserData: Integer;
  DeleteDockerImage: Integer;
begin
  Result := True;

  // Stop container before uninstall
  Exec('cmd', '/c docker stop sms-app 2>nul', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Exec('cmd', '/c docker rm sms-app 2>nul', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

  // Ask user if they want to delete Docker image
  DeleteDockerImage := MsgBox(
    'Do you want to remove the Docker image?' + #13#10 + #13#10 +
    'The Docker image is ~500MB-1GB and can be reused if you reinstall.' + #13#10 + #13#10 +
    'Click YES to remove the image and free up disk space.' + #13#10 +
    'Click NO to keep the image for faster reinstallation.',
    mbConfirmation, MB_YESNO);

  if DeleteDockerImage = IDYES then
  begin
    Log('User chose to delete Docker image');
    Exec('cmd', '/c docker rmi sms-fullstack 2>nul', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end
  else
  begin
    Log('User chose to keep Docker image');
  end;

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
  begin
    Log('User chose to keep user data');
  end;
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
