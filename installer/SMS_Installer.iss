; Student Management System - Inno Setup Installer Script
; Requires Inno Setup 6.x (https://jrsoftware.org/isinfo.php)

#define MyAppName "Student Management System"
#define MyAppShortName "SMS"
#define MyAppPublisher "AUT MIEEK"
#define MyAppURL "https://github.com/bs1gr/AUT_MIEEK_SMS"
#define MyAppExeName "DOCKER_TOGGLE.vbs"

; Read version from VERSION file
#define VersionFile FileOpen("..\VERSION")
#define MyAppVersion Trim(FileRead(VersionFile))
#expr FileClose(VersionFile)

[Setup]
; Unique application ID - DO NOT CHANGE
AppId={{B5A1E2F3-C4D5-6789-ABCD-EF0123456789}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}/issues
AppUpdatesURL={#MyAppURL}/releases
DefaultDirName={autopf}\{#MyAppShortName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
LicenseFile=..\LICENSE
InfoBeforeFile=installer_welcome.rtf
InfoAfterFile=installer_complete.rtf
OutputDir=..\dist
OutputBaseFilename=SMS_Installer_{#MyAppVersion}
; SetupIconFile - Using default Inno Setup icon (project favicon is placeholder)
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
WizardSizePercent=120
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64
MinVersion=10.0
; UninstallDisplayIcon - Using default (project favicon is placeholder)

; Modern look
WizardImageFile=wizard_image.bmp
WizardSmallImageFile=wizard_small.bmp

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Messages]
WelcomeLabel1=Welcome to {#MyAppName} Setup
WelcomeLabel2=This will install {#MyAppName} version {#MyAppVersion} on your computer.%n%nThe installer will:%n- Copy application files%n- Create desktop shortcuts%n- Configure the environment%n%nDocker Desktop is required. The setup will guide you through installation if needed.

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "installdocker"; Description: "Open Docker Desktop download page (if not installed)"; GroupDescription: "Prerequisites:"

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

[Icons]
; Start Menu
Name: "{group}\{#MyAppName}"; Filename: "wscript.exe"; Parameters: """{app}\DOCKER_TOGGLE.vbs"""; WorkingDir: "{app}"; Comment: "Start/Stop SMS Docker container"
Name: "{group}\SMS Documentation"; Filename: "{app}\README.md"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"

; Desktop shortcut
Name: "{autodesktop}\{#MyAppName}"; Filename: "wscript.exe"; Parameters: """{app}\DOCKER_TOGGLE.vbs"""; WorkingDir: "{app}"; Comment: "Start/Stop SMS Docker container"; Tasks: desktopicon

[Run]
; Open Docker download page if requested
Filename: "cmd"; Parameters: "/c start https://www.docker.com/products/docker-desktop/"; Description: "Open Docker Desktop download page"; Flags: postinstall shellexec skipifsilent; Tasks: installdocker

; Option to launch app after install
Filename: "wscript.exe"; Parameters: """{app}\DOCKER_TOGGLE.vbs"""; Description: "Launch {#MyAppName}"; Flags: postinstall nowait skipifsilent unchecked; WorkingDir: "{app}"

; Open README
Filename: "{app}\README.md"; Description: "View README documentation"; Flags: postinstall shellexec skipifsilent unchecked

[Code]
var
  DockerPage: TWizardPage;
  DockerStatusLabel: TLabel;
  DockerInstalled: Boolean;

function IsDockerInstalled: Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec('cmd', '/c docker --version', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

procedure InitializeWizard;
begin
  // Check Docker status
  DockerInstalled := IsDockerInstalled;
  
  // Create custom Docker status page
  DockerPage := CreateCustomPage(wpSelectTasks, 'Docker Desktop Status', 
    'Docker Desktop is required to run the Student Management System');
  
  DockerStatusLabel := TLabel.Create(DockerPage);
  DockerStatusLabel.Parent := DockerPage.Surface;
  DockerStatusLabel.Left := 0;
  DockerStatusLabel.Top := 0;
  DockerStatusLabel.Width := DockerPage.SurfaceWidth;
  DockerStatusLabel.Height := 200;
  DockerStatusLabel.WordWrap := True;
  
  if DockerInstalled then
  begin
    DockerStatusLabel.Caption := 
      '✓ Docker Desktop is INSTALLED' + #13#10 + #13#10 +
      'Great! Your system is ready to run the Student Management System.' + #13#10 + #13#10 +
      'After installation completes:' + #13#10 +
      '1. Make sure Docker Desktop is running' + #13#10 +
      '2. Double-click the SMS desktop shortcut' + #13#10 +
      '3. Wait for the container to build (first run takes ~5 minutes)' + #13#10 +
      '4. Access the app at http://localhost:8080';
    DockerStatusLabel.Font.Color := clGreen;
  end
  else
  begin
    DockerStatusLabel.Caption := 
      '⚠ Docker Desktop is NOT DETECTED' + #13#10 + #13#10 +
      'Docker Desktop is required but was not found on your system.' + #13#10 + #13#10 +
      'To install Docker Desktop:' + #13#10 +
      '1. Visit https://www.docker.com/products/docker-desktop/' + #13#10 +
      '2. Download Docker Desktop for Windows' + #13#10 +
      '3. Run the installer and restart your computer' + #13#10 +
      '4. Start Docker Desktop before launching SMS' + #13#10 + #13#10 +
      'You can continue with SMS installation, but Docker must be installed before running the app.' + #13#10 +
      'Check the "Open Docker Desktop download page" option on the next page.';
    DockerStatusLabel.Font.Color := $000080FF; // Orange color
  end;
  DockerStatusLabel.Font.Size := 10;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  EnvContent: String;
begin
  if CurStep = ssPostInstall then
  begin
    // Create default .env files if they don't exist
    if not FileExists(ExpandConstant('{app}\backend\.env')) then
    begin
      EnvContent := 
        '# Backend Environment Configuration' + #13#10 +
        '# Copy from .env.example and modify as needed' + #13#10 +
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

[UninstallDelete]
Type: filesandordirs; Name: "{app}\data"
Type: filesandordirs; Name: "{app}\logs"
Type: filesandordirs; Name: "{app}\backups"
Type: filesandordirs; Name: "{app}\backend\__pycache__"
Type: filesandordirs; Name: "{app}\frontend\node_modules"
Type: filesandordirs; Name: "{app}\frontend\dist"
