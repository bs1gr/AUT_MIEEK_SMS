# SMS_Installer.iss Modification Guide

**Purpose**: Update the Inno Setup installer to use `SMS_Manager.exe` instead of `docker_manager.bat`

**Status**: Ready to apply (6 small changes required)

**Estimated Time**: 10-15 minutes

---

## Changes Required

### 1. Update App Executable Name Variable (Line ~66)

**Current:**
```pascal
#define MyAppExeName "docker_manager.bat"
```

**Change to:**
```pascal
#define MyAppExeName "SMS_Manager.exe"
```

---

### 2. Add SMS_Manager.exe to [Files] Section (After docker_manager.bat entry)

**Current:**
```pascal
Source: "..\docker_manager.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\run_docker_install.cmd"; DestDir: "{app}"; Flags: ignoreversion
```

**Add after these lines:**
```pascal
Source: "..\installer\dist\SMS_Manager.exe"; DestDir: "{app}"; Flags: ignoreversion
```

**Note**: This copies the pre-built executable from installer/dist/ into the installation directory

---

### 3. Update Start Menu Icon ([Icons] Section)

**Current:**
```pascal
Name: "{autopf}\{#MyAppName}"; Filename: "{app}\docker_manager.bat"; IconFilename: "{app}\favicon.ico"
```

**Change to:**
```pascal
Name: "{autopf}\{#MyAppName}"; Filename: "{app}\SMS_Manager.exe"; IconFilename: "{app}\favicon.ico"
```

**OR if you want to keep it exactly the same:**
```pascal
Name: "{autopf}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\favicon.ico"
```

---

### 4. Update Desktop Icon ([Icons] Section - Desktop shortcut)

**Current:**
```pascal
Name: "{commondesktop}\{#MyAppName}"; Filename: "cmd.exe"; Parameters: "/c ""{app}\docker_manager.bat"""; IconFilename: "{app}\favicon.ico"; WorkingDir: "{app}"
```

**Change to:**
```pascal
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\SMS_Manager.exe"; IconFilename: "{app}\favicon.ico"; WorkingDir: "{app}"
```

---

### 5. Optional - Update [Run] Post-Install Section

**If present** (check for any docker_manager.bat references in [Run] section):

**Current:**
```pascal
Filename: "{app}\docker_manager.bat";
```

**Change to:**
```pascal
Filename: "{app}\SMS_Manager.exe";
```

---

### 6. Optional - Deprecate Old Launcher in [Files]

**Choice A - Remove completely:**
```pascal
; Source: "..\docker_manager.bat"; DestDir: "{app}"; Flags: ignoreversion  [COMMENTED OUT]
```

**Choice B - Keep as fallback:**
```pascal
Source: "..\docker_manager.bat"; DestDir: "{app}"; Flags: ignoreversion  [KEEP AS IS]
```

**Recommendation**: Comment out (Choice A) since SMS_Manager.exe replaces it completely

---

## Summary of Changes

| Line | Section | Old | New | Type |
|------|---------|-----|-----|------|
| ~66 | Define | `docker_manager.bat` | `SMS_Manager.exe` | String variable |
| [Files] | Files | (missing) | Add SMS_Manager.exe | New line |
| [Icons] | Start Menu | `docker_manager.bat` | `SMS_Manager.exe` OR `{#MyAppExeName}` | Path reference |
| [Icons] | Desktop Icon | cmd.exe wrapper | SMS_Manager.exe | Executable change |
| [Run] | Post-Install | (if present) | Update exe name | Optional |
| [Files] | Cleanup | docker_manager.bat | (optional) comment out | Optional |

---

## Important Notes

1. **Pre-built Executable Location**:
   - Source: `installer/dist/SMS_Manager.exe` (28.51 MB)
   - Destination: `{app}\SMS_Manager.exe` (in installation folder)

2. **Backward Compatibility**:
   - Users upgrading from old installer will get:
     - Old docker_manager.bat removed (if commented out in [Files])
     - New SMS_Manager.exe installed
     - All data preserved (backup/database/settings)

3. **No Parameters Needed**:
   - Old: `cmd.exe /c "{app}\docker_manager.bat"` (wrapped execution)
   - New: `{app}\SMS_Manager.exe` (direct execution, no wrapper needed)

4. **Icon Reuse**:
   - Existing `{app}\favicon.ico` will be reused
   - SMS_Manager.exe displays with same icon as before

5. **Testing After Build**:
   - Verify new installer contains SMS_Manager.exe (check with 7-Zip or WinRAR)
   - Test on clean Windows machine
   - Verify desktop shortcut launches SMS_Manager.exe
   - Verify all menu commands work (START, STOP, RESTART, STATUS, LOGS, OPEN)

---

## Verification Checklist

After updating SMS_Installer.iss:

- [ ] Find all occurrences of "docker_manager.bat" in file (should find ~2-3)
- [ ] Replace with "SMS_Manager.exe" (or use variable if appropriate)
- [ ] Add SMS_Manager.exe to [Files] section
- [ ] Update [Icons] entries for Start Menu and Desktop
- [ ] Run Inno Setup compiler: `iscc.exe SMS_Installer.iss`
- [ ] Verify new installer builds without errors
- [ ] Check installer size hasn't changed dramatically (~5-10 MB increase expected for exe)
- [ ] Test installer on clean Windows or virtual machine

---

## Example [Files] Section (Complete)

```pascal
[Files]
; Core application files
Source: "..\backend\main.py"; DestDir: "{app}\backend"; Flags: ignoreversion
Source: "..\frontend\*"; DestDir: "{app}\frontend"; Flags: ignoreversion recursesubdirs

; Docker management
Source: "..\docker\*"; DestDir: "{app}\docker"; Flags: ignoreversion recursesubdirs
Source: "..\docker_manager.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\run_docker_install.cmd"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\installer\dist\SMS_Manager.exe"; DestDir: "{app}"; Flags: ignoreversion  [NEW LINE]

; Configuration
Source: "..\{app}\.env"; DestDir: "{app}"; Flags: ignoreversion
; ... other files ...
```

---

## Example [Icons] Section (Complete)

```pascal
[Icons]
Name: "{autopf}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\favicon.ico"  [UPDATED]
Name: "{autopf}\{#MyAppName}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\SMS_Manager.exe"; IconFilename: "{app}\favicon.ico"; WorkingDir: "{app}"  [UPDATED]
```

---

## Quick Apply Commands (For Reference)

If using text editor with find/replace:

1. Find: `#define MyAppExeName "docker_manager.bat"`
   Replace: `#define MyAppExeName "SMS_Manager.exe"`

2. Find: `cmd.exe"; Parameters: "/c ""{app}\docker_manager.bat""`
   Replace: `{app}\SMS_Manager.exe`

3. Find: `Filename: "{app}\docker_manager.bat"`
   Replace: `Filename: "{app}\SMS_Manager.exe"`

4. Find: `Filename: "cmd.exe"; Parameters: "/c ""{app}\docker_manager.bat""`
   Replace: `Filename: "{app}\SMS_Manager.exe"`

5. Add new line in [Files]: `Source: "..\installer\dist\SMS_Manager.exe"; DestDir: "{app}"; Flags: ignoreversion`

---

**Next Step**: Apply these 6 changes to SMS_Installer.iss, build the installer with Inno Setup, and test on a clean Windows machine.

**Questions?** Refer to SMS_MANAGER_IMPLEMENTATION_SUMMARY.md for technical details.
