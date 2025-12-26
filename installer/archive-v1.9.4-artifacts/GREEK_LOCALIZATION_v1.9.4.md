# Greek Localization Improvements - v1.9.4

## Summary

Complete Greek localization for the SMS installer with updated branding.

## Changes Made

### 1. Greek Language File (`Greek.isl`)

- ✅ Added all essential Greek translations for Inno Setup wizard pages
- ✅ Fixed UTF-8 encoding issues - all Greek characters display correctly
- ✅ Covers all user-facing installer UI elements:
  - Welcome, License, Destination, Components, Tasks pages
  - All buttons: Next (Επόμενο), Back (Πίσω), Cancel (Άκυρο), Install (Εγκατάσταση)
  - Status messages during installation
  - Error dialogs and prompts
  - Uninstaller messages

### 2. Wizard Banner (`wizard_image.bmp`)

- ✅ Updated from v1.9.2 to v1.9.4
- ✅ Integrated AUT logo at the top
- ✅ Professional blue gradient design
- ✅ Clear SMS branding with version number
- 🔧 Generated dynamically from `AUT_Logo.png` + VERSION file

### 3. Docker/SMS Custom Messages

All custom installer prompts in Greek:

- Docker detection and status
- Upgrade vs fresh install options
- Data preservation prompts
- Backup notifications
- Version-specific messages

## User Experience

**Before:** When selecting Greek language, most installer pages displayed in English with only license/notes in Greek.

**After:** Complete Greek localization throughout the entire installation process. Professional appearance with correct version display.

## Technical Details

- **Encoding:** UTF-8 with Windows-1253 code page
- **Inno Setup Version:** 6.0.5
- **Banner Dimensions:** 164×314 pixels
- **Total Greek Messages:** ~200 UI strings

## File Sizes

- Previous installer: ~5.5 MB
- Current installer: ~25.5 MB (includes backend .venv for offline installation)

## Testing Recommendations

1. Run installer and select Greek language
2. Verify all wizard pages display in Greek
3. Confirm banner shows "v1.9.4" with AUT logo
4. Test upgrade scenario with data preservation prompts
5. Verify uninstaller also displays in Greek

## Build Command

```powershell
& "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" ".\installer\SMS_Installer.iss"
```

Output: `dist\SMS_Installer_1.9.4.exe`

## Maintenance

To update version in banner for future releases:

1. Update `VERSION` file
2. Run: PowerShell script regenerates `wizard_image.bmp` automatically
3. Rebuild installer

Banner generation is automated and uses:

- `AUT_Logo.png` (root directory)
- `VERSION` file
- System.Drawing .NET library
