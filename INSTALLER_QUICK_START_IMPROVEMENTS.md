# SMS Installer - Quick Start Implementation (Phase 1)

**Goal**: Improve installation UX without major architectural changes  
**Timeline**: 2 weeks, 4 developers  
**Scope**: Installer pages only (Inno Setup)

---

## Quick Overview

### What We're Improving

1. **Installation Type Page** - Make Docker vs Dev choice obvious
2. **Docker Status Page** - System requirements validation  
3. **Installation Summary** - Clear post-install next steps
4. **Help Text** - Better user guidance throughout

### What We're NOT Changing

- Core Docker deployment logic
- SMS_Manager.exe (v1 stays as-is)
- Database configuration (already excellent)
- File structure or installer build process

---

## Phase 1a: Installation Type Page (3-4 hours)

### Current State
```
InstallationType=typeFullInstall
Component: "full_install/Docker Production Only"
  Description: "Minimal installation with Docker container (fastest, cleanest)"
Component: "full_install/Development Environment"
  Description: "Add Node.js, Python, and native development files"
```

### Target State
```
Visual Panels with:
  • Installation Type icon
  • Clear benefit list
  • Target user description
  • Disk space estimate
  • Help link
```

### Implementation Steps

#### Step 1: Update SMS_Installer.iss - Add Custom Messages

**Location**: `installer\SMS_Installer.iss` - [CustomMessages] section

```pascal
[CustomMessages]
english.InstallTypeTitle=Installation Type
english.InstallTypeSubtitle=Choose how you want to use SMS

english.DockerProductionTitle=Docker Production (RECOMMENDED FOR MOST USERS)
english.DockerProductionBenefits=
    • Fast: Installation takes 5-10 minutes%n
    • Small: Uses only ~300 MB on your disk%n
    • Simple: One-click start and stop%n
    • Best for: Teachers, school administrators
english.DockerProductionDiskSize=~300 MB total disk space

english.DevelopmentTitle=Development Setup (FOR SOFTWARE DEVELOPERS)
english.DevelopmentBenefits=
    • Full source code access%n
    • Live code reload (Vite, hot-reload)%n
    • Local debugging tools%n
    • Best for: Contributing to SMS, custom features
english.DevelopmentDiskSize=~2 GB (includes Python, Node.js, build tools)

english.WhatIsDocker=What is Docker?
english.DockerExplanation=
    Docker is a container platform that packages SMS with everything it needs.%n%n
    Benefits:%n
    • Easy updates (just reinstall)%n
    • No conflicts with other programs%n
    • Same setup on every PC%n%n
    [Visit https://www.docker.com for more info]

english.SystemRequirements=System Requirements
english.WindowsVersion=Windows 10 or later
english.DiskSpace=Sufficient disk space (see below)
english.InternetConnection=Internet for first-run Docker build

; Greek translations
greek.InstallTypeTitle=Τύπος Εγκατάστασης
greek.InstallTypeSubtitle=Επιλέξτε πώς θέλετε να χρησιμοποιήσετε το SMS
; ... (rest in Greek)
```

#### Step 2: Create Custom Installation Type Page

**Location**: `installer\SMS_Installer.iss` - [Code] section (Pascal Script)

```pascal
var
  InstallationTypePage: TCustomPage;
  DockerProdPanel: TPanel;
  DockerProdRadio: TRadioButton;
  DockerProdDesc: TLabel;
  DevelopmentPanel: TPanel;
  DevelopmentRadio: TRadioButton;
  DevelopmentDesc: TLabel;
  HelpButton: TButton;

procedure CreateInstallationTypePage();
var
  TopPos: Integer;
begin
  InstallationTypePage := CreateCustomPage(wpLicense,
    ExpandConstant('{cm:InstallTypeTitle}'),
    ExpandConstant('{cm:InstallTypeSubtitle}'));

  TopPos := 0;

  // ===== DOCKER PRODUCTION PANEL =====
  DockerProdPanel := TPanel.Create(InstallationTypePage);
  DockerProdPanel.Parent := InstallationTypePage.Surface;
  DockerProdPanel.Left := 0;
  DockerProdPanel.Top := TopPos;
  DockerProdPanel.Width := InstallationTypePage.Surface.Width;
  DockerProdPanel.Height := 140;
  DockerProdPanel.BevelOuter := bvRaised;
  DockerProdPanel.BevelWidth := 2;
  DockerProdPanel.Color := clWindow;

  // Radio button
  DockerProdRadio := TRadioButton.Create(InstallationTypePage);
  DockerProdRadio.Parent := DockerProdPanel;
  DockerProdRadio.Left := 15;
  DockerProdRadio.Top := 10;
  DockerProdRadio.Width := 300;
  DockerProdRadio.Height := 20;
  DockerProdRadio.Caption := ExpandConstant('{cm:DockerProductionTitle}');
  DockerProdRadio.Font.Style := [fsBold];
  DockerProdRadio.Font.Size := 11;
  DockerProdRadio.Checked := True;

  // Benefits text
  DockerProdDesc := TLabel.Create(InstallationTypePage);
  DockerProdDesc.Parent := DockerProdPanel;
  DockerProdDesc.Left := 35;
  DockerProdDesc.Top := 40;
  DockerProdDesc.Width := DockerProdPanel.Width - 70;
  DockerProdDesc.Height := 80;
  DockerProdDesc.WordWrap := True;
  DockerProdDesc.Caption := ExpandConstant('{cm:DockerProductionBenefits}') + #13 +
                            #13 +
                            ExpandConstant('{cm:DockerProductionDiskSize}');

  TopPos := TopPos + 150;

  // ===== DEVELOPMENT PANEL =====
  DevelopmentPanel := TPanel.Create(InstallationTypePage);
  DevelopmentPanel.Parent := InstallationTypePage.Surface;
  DevelopmentPanel.Left := 0;
  DevelopmentPanel.Top := TopPos;
  DevelopmentPanel.Width := InstallationTypePage.Surface.Width;
  DevelopmentPanel.Height := 140;
  DevelopmentPanel.BevelOuter := bvRaised;
  DevelopmentPanel.BevelWidth := 2;
  DevelopmentPanel.Color := clWindow;

  DevelopmentRadio := TRadioButton.Create(InstallationTypePage);
  DevelopmentRadio.Parent := DevelopmentPanel;
  DevelopmentRadio.Left := 15;
  DevelopmentRadio.Top := 10;
  DevelopmentRadio.Width := 300;
  DevelopmentRadio.Height := 20;
  DevelopmentRadio.Caption := ExpandConstant('{cm:DevelopmentTitle}');
  DevelopmentRadio.Font.Style := [fsBold];
  DevelopmentRadio.Font.Size := 11;

  DevelopmentDesc := TLabel.Create(InstallationTypePage);
  DevelopmentDesc.Parent := DevelopmentPanel;
  DevelopmentDesc.Left := 35;
  DevelopmentDesc.Top := 40;
  DevelopmentDesc.Width := DevelopmentPanel.Width - 70;
  DevelopmentDesc.Height := 80;
  DevelopmentDesc.WordWrap := True;
  DevelopmentDesc.Caption := ExpandConstant('{cm:DevelopmentBenefits}') + #13 +
                             #13 +
                             ExpandConstant('{cm:DevelopmentDiskSize}');

  // Help button
  HelpButton := TButton.Create(InstallationTypePage);
  HelpButton.Parent := InstallationTypePage.Surface;
  HelpButton.Left := 0;
  HelpButton.Top := InstallationTypePage.Surface.Height - 35;
  HelpButton.Width := 150;
  HelpButton.Height := 25;
  HelpButton.Caption := ExpandConstant('{cm:WhatIsDocker}');
  HelpButton.OnClick := @HelpButtonClick;
end;

procedure HelpButtonClick(Sender: TObject);
begin
  MsgBox(ExpandConstant('{cm:DockerExplanation}'),
    mbInformation,
    MB_OK);
end;

function GetInstallationType(): String;
begin
  if DockerProdRadio.Checked then
    Result := 'docker_production'
  else
    Result := 'development';
end;

function IsDockerOnlyInstall(): Boolean;
begin
  Result := DockerProdRadio.Checked;
end;

function IsDevInstall(): Boolean;
begin
  Result := DevelopmentRadio.Checked;
end;
```

#### Step 3: Update Installer Flow

**In [Code] section**, update `CurPageChanged()` procedure:

```pascal
procedure CurPageChanged(CurPageID: Integer);
begin
  if CurPageID = InstallationTypePage.ID then
  begin
    // User sees our new page
    // No special handling needed - just display
  end;
end;
```

---

## Phase 1b: Docker Status Page (2-3 hours)

### Current Approach
Dialog-based, static text, simple checks

### New Approach
Detailed checklist with system info and links

### Implementation

**Location**: `installer\SMS_Installer.iss` - [Code] section

```pascal
var
  DockerStatusPage: TCustomPage;
  DockerStatusList: TListBox;

procedure CreateDockerStatusPage();
var
  Label1: TLabel;
begin
  DockerStatusPage := CreateCustomPage(wpReady,
    'System Requirements Check',
    'Verifying Docker and system compatibility');

  // Title label
  Label1 := TLabel.Create(DockerStatusPage);
  Label1.Parent := DockerStatusPage.Surface;
  Label1.Left := 0;
  Label1.Top := 0;
  Label1.Width := 400;
  Label1.Caption := 'Checking your system...';

  // Checklist
  DockerStatusList := TListBox.Create(DockerStatusPage);
  DockerStatusList.Parent := DockerStatusPage.Surface;
  DockerStatusList.Left := 0;
  DockerStatusList.Top := 30;
  DockerStatusList.Width := DockerStatusPage.Surface.Width;
  DockerStatusList.Height := DockerStatusPage.Surface.Height - 30;

  // Populate checklist
  CheckSystemRequirements();
end;

procedure CheckSystemRequirements();
var
  HasDocker: Boolean;
  DockerRunning: Boolean;
  HasSpace: Boolean;
  Item: String;
begin
  DockerStatusList.Clear;

  // Check 1: Windows Version
  Item := 'Windows 10 or later: ';
  if GetWindowsVersion >= '10.0' then
    Item := Item + '✓ OK'
  else
    Item := Item + '✗ Not compatible';
  DockerStatusList.Items.Add(Item);

  // Check 2: Disk Space
  Item := 'Disk Space (need ~1 GB): ';
  HasSpace := GetFreeDiskSpace() > 1024; // MB
  if HasSpace then
    Item := Item + '✓ Sufficient (' + IntToStr(GetFreeDiskSpace()) + ' MB available)'
  else
    Item := Item + '✗ Not enough space';
  DockerStatusList.Items.Add(Item);

  // Check 3: Docker
  Item := 'Docker Desktop: ';
  HasDocker := DockerIsInstalled();
  if HasDocker then
    Item := Item + '✓ Installed'
  else
    Item := Item + '✗ Not installed - [Download]';
  DockerStatusList.Items.Add(Item);

  // Check 4: Docker Running
  Item := 'Docker Running: ';
  DockerRunning := DockerIsRunning();
  if DockerRunning then
    Item := Item + '✓ Running'
  else
    Item := Item + '⚠ Not running - Start Docker Desktop';
  DockerStatusList.Items.Add(Item);

  // Check 5: UAC
  Item := 'Admin Privileges: ';
  if IsAdminLoggedOn() then
    Item := Item + '✓ OK'
  else
    Item := Item + '⚠ Run installer as Administrator';
  DockerStatusList.Items.Add(Item);
end;

function DockerIsInstalled(): Boolean;
begin
  Result := FileExists('C:\Program Files\Docker\Docker\Docker.exe') or
            FileExists('C:\Program Files (x86)\Docker\Docker\Docker.exe');
end;

function DockerIsRunning(): Boolean;
var
  ResultCode: Integer;
begin
  RunCommand('docker info', ResultCode);
  Result := (ResultCode = 0);
end;

function GetFreeDiskSpace(): Integer;
begin
  // Return free disk space in MB
  // Implementation: Use Windows API or simple check
  Result := 50000; // Simplified
end;
```

---

## Phase 1c: Installation Summary Page (2-3 hours)

### New Page: Post-Install Summary

**Location**: Update [Run] section and add [Code]

```pascal
var
  SummaryPage: TCustomPage;
  SummaryMemo: TMemo;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  
  if CurPageID = wpReady then
  begin
    // Before starting install, show summary
    ShowInstallationSummary();
  end;
end;

procedure ShowInstallationSummary();
var
  Summary: String;
begin
  Summary := 'Installation Summary' + #13#13;
  Summary := Summary + 'Type: ';
  
  if IsDockerOnlyInstall() then
    Summary := Summary + 'Docker Production' + #13
  else
    Summary := Summary + 'Development Setup' + #13;

  Summary := Summary + 'Location: ' + ExpandConstant('{app}') + #13;
  Summary := Summary + 'Disk Space: ~350 MB' + #13 + #13;
  
  Summary := Summary + 'Components to Install:' + #13;
  Summary := Summary + '✓ SMS Application Files' + #13;
  Summary := Summary + '✓ Docker Configuration' + #13;
  Summary := Summary + '✓ SMS_Manager (Docker Control)' + #13;
  
  if IsDevInstall() then
  begin
    Summary := Summary + '✓ Development Tools (Node.js, Python)' + #13;
    Summary := Summary + '✓ Source Code' + #13;
  end;

  Summary := Summary + #13 + 'Post-Installation:' + #13;
  Summary := Summary + '1. Click "Finish" to complete' + #13;
  Summary := Summary + '2. SMS Manager will open automatically' + #13;
  Summary := Summary + '3. Click "Start" to build and launch' + #13;
  Summary := Summary + '4. Open browser to http://localhost:8080' + #13;

  MsgBox(Summary, mbInformation, MB_OK);
end;
```

**Update [Run] section**:

```pascal
[Run]
; Post-install summary (custom dialog)
Filename: "cmd"; Parameters: "/c echo Installation complete!"; Flags: postinstall; \
  Description: "Show installation summary"

; Launch SMS_Manager to start container
Filename: "{app}\SMS_Manager.exe"; \
  Description: "Launch SMS Manager (start container here)"; \
  Flags: postinstall nowait skipifsilent runascurrentuser; \
  WorkingDir: "{app}"
```

---

## Phase 1d: Add Helpful Links (1-2 hours)

### Update Custom Messages with Links

**In [CustomMessages] section**:

```pascal
english.QuickStartTitle=Next Steps
english.QuickStartGuide=
    1. Open SMS Manager (shortcut on desktop)%n
    2. Click START to build Docker container (5-10 minutes first time)%n
    3. Open http://localhost:8080 in your browser%n%n
    [View Full Documentation]

english.DockerDownloadURL=https://www.docker.com/products/docker-desktop/
english.SmsDocumentationURL=https://github.com/bs1gr/AUT_MIEEK_SMS/wiki
english.SmsIssuesURL=https://github.com/bs1gr/AUT_MIEEK_SMS/issues
```

### Add Help Links to Dialogs

```pascal
procedure ShowHelpLinks();
begin
  // These can be called from various pages
  MsgBox('Need Help?' + #13#13 +
    'Documentation: [Open GitHub Wiki]' + #13 +
    'Report Issues: [Open GitHub Issues]' + #13 +
    'Contact Support: support@example.com',
    mbInformation,
    MB_OK);
end;
```

---

## Phase 1e: Greek Language Support (1-2 hours)

### Update installer\Greek.isl

**Location**: `installer\Greek.isl`

```pascal
[CustomMessages]
greek.InstallTypeTitle=Τύπος Εγκατάστασης
greek.InstallTypeSubtitle=Επιλέξτε πώς θέλετε να χρησιμοποιήσετε το SMS

greek.DockerProductionTitle=Docker Production (ΣΥΝΙΣΤΆΤΑΙ ΓΙΑ ΤΗ ΠΛΕΙΟΨΗΦΊΑ)
greek.DockerProductionBenefits=
    • Γρήγορη: Εγκατάσταση σε 5-10 λεπτά%n
    • Μικρή: Χρησιμοποιεί μόνο ~300 MB στο δίσκο σας%n
    • Απλή: Εναρξη και διακοπή με ένα κλικ%n
    • Καλύτερο για: Εκπαιδευτικούς, διαχειριστές σχολείου
greek.DockerProductionDiskSize=~300 MB συνολικό χώρο δίσκου

greek.DevelopmentTitle=Ρύθμιση Ανάπτυξης (ΓΙΑ ΠΡΟΓΡΑΜΜΑΤΙΣΤΈΣ ΛΟΓΙΣΜΙΚΟΎ)
greek.DevelopmentBenefits=
    • Πρόσβαση στον πλήρη κώδικα πηγής%n
    • Ζωντανή επαναφόρτωση κώδικα%n
    • Εργαλεία τοπικής εντοπισμού σφαλμάτων%n
    • Καλύτερο για: Συμβολή στο SMS, προσαρμοσμένες δυνατότητες
greek.DevelopmentDiskSize=~2 GB (περιλαμβάνει Python, Node.js, εργαλεία δημιουργίας)

greek.WhatIsDocker=Τι είναι το Docker;
greek.DockerExplanation=
    Το Docker είναι μια πλατφόρμα δοχείου που συσκευάζει το SMS με όλα όσα χρειάζεται.%n%n
    Πλεονεκτήματα:%n
    • Εύκολες ενημερώσεις%n
    • Χωρίς συγκρούσεις με άλλα προγράμματα%n
    • Ίδια ρύθμιση σε κάθε PC%n%n
    [Επισκεφθείτε https://www.docker.com για περισσότερες πληροφορίες]
```

---

## Testing Checklist

### Before Commit
- [ ] Installer builds without errors: `iscc installer\SMS_Installer.iss`
- [ ] English dialogs render correctly
- [ ] Greek dialogs render correctly
- [ ] Text wrapping works on all custom pages
- [ ] Help links functional
- [ ] Radio buttons work (Docker vs Dev)

### Test Installation
- [ ] Fresh install on clean Windows 10 PC
- [ ] Fresh install on clean Windows 11 PC
- [ ] Upgrade from v1.18.23
- [ ] Docker Production option selected
- [ ] Development Environment option selected

### Test User Flow
- [ ] Installation Type page visible and clear
- [ ] Docker Status checks run
- [ ] Help links open
- [ ] Summary dialog shows correct info
- [ ] SMS Manager launches after install
- [ ] Desktop shortcut created
- [ ] Start Menu entry created

---

## Deployment

### Build Instructions

```powershell
# 1. Update version in VERSION file
"v1.18.24" | Set-Content ".\VERSION"

# 2. Build installer
& "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" "installer\SMS_Installer.iss"

# 3. Sign installer
.\installer\SIGN_INSTALLER.ps1

# 4. Verify
Get-ChildItem ".\dist\SMS_Installer_*.exe" -Latest | Format-Table Name, Length
```

### Release
```powershell
# Tag release
git tag v1.18.24
git push origin v1.18.24

# GitHub Release
gh release create v1.18.24 `
  --title "SMS v1.18.24 - Installer UX Improvements" `
  --notes "Improved installation wizard with clearer type selection and Docker status validation" `
  ./dist/SMS_Installer_1.18.24.exe
```

---

## Files to Modify

```
installer/
├── SMS_Installer.iss          ← Main changes (pages, messages, code)
├── Greek.isl                  ← Greek translations
└── README.md                  ← Update build instructions
```

## Files to Create (Optional)

```
docs/
├── INSTALLER_UX_GUIDE.md      ← User-facing guide
└── INSTALLER_CUSTOMIZATION.md ← Developer reference for future changes
```

---

## Time Estimate

| Task | Hours | Person |
|------|-------|--------|
| Installation Type Page | 3 | Dev 1 |
| Docker Status Page | 2 | Dev 1 |
| Summary Page | 2 | Dev 2 |
| Help Links & Links | 1 | Dev 2 |
| Greek Translations | 1 | Translator |
| Testing & Validation | 4 | QA |
| Documentation | 2 | Dev 1 |
| **TOTAL** | **15** | |

---

## Success Criteria

✅ Installation type choice is **immediately clear** to users  
✅ System requirements **validated before** installation  
✅ Post-install **next steps** are obvious  
✅ Help links **functional and relevant**  
✅ **No breaking changes** to existing workflows  
✅ **Greek translations** complete and accurate  
✅ **Installer still signs** correctly  
✅ **All tests pass** on Windows 10 & 11  

---

**Document Version**: 1.0  
**Created**: 2026-05-29  
