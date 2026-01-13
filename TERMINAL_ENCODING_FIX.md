# Terminal Encoding Fix - Greek Characters

**Issue**: Greek character artifacts (ψ symbol) appearing before commands in PowerShell terminal

**Root Cause**: Console encoding set to Greek (DOS) Code Page 737 instead of UTF-8

---

## Quick Fix (Temporary - Current Session Only)

Run these commands in the terminal:

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
chcp 65001
```

---

## Permanent Fix (Automatic on PowerShell Startup)

The fix has been saved to your PowerShell profile at:
`D:\Έγγραφα\PowerShell\Microsoft.PowerShell_profile.ps1`

**Profile Contents:**
```powershell
# Fix Greek character encoding artifacts in terminal
# Force UTF-8 encoding to prevent ψ symbols before commands
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 > $null
```

This will automatically apply UTF-8 encoding every time you start PowerShell.

---

## Manual Fix (If Profile Gets Reset)

1. Open PowerShell profile for editing:
   ```powershell
   notepad $PROFILE
   ```

2. Add these lines at the top of the file:
   ```powershell
   # Fix Greek character encoding artifacts
   [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
   [Console]::InputEncoding = [System.Text.Encoding]::UTF8
   chcp 65001 > $null
   ```

3. Save and close Notepad

4. Restart PowerShell or reload profile:
   ```powershell
   . $PROFILE
   ```

---

## Verification

Test that encoding is fixed:
```powershell
Write-Host "Testing clean output" -ForegroundColor Green
Get-Date
git status
```

**Expected**: No ψ symbols before commands
**If ψ still appears**: Run the Quick Fix commands above

---

## Profile Location

- **Current User Profile**: `$PROFILE` or `$HOME\Documents\PowerShell\Microsoft.PowerShell_profile.ps1`
- **Actual Path**: `D:\Έγγραφα\PowerShell\Microsoft.PowerShell_profile.ps1`

---

---

## Compatibility Verified ✓

The UTF-8 encoding fix has been tested and confirmed compatible with:

- ✅ **Git operations** - All git commands work normally
- ✅ **Python scripts** - Python 3.13.3 with full UTF-8 support including Greek characters (αβγ)
- ✅ **Node.js/npm** - v20.19.5 / npm 11.6.2 working correctly
- ✅ **PowerShell scripting** - Variables, paths, file operations all functional
- ✅ **Special characters** - Greek (Καλημέρα), symbols (✓✗→←), emojis all display correctly
- ✅ **Project scripts** - COMMIT_READY.ps1, NATIVE.ps1, RUN_TESTS_BATCH.ps1 all accessible
- ✅ **File operations** - Get-ChildItem, file reading/writing working normally
- ✅ **Development tools** - All coding and build commands unaffected

**No blocking issues detected** - Safe to use for all development work.

---

**Last Updated**: January 13, 2026
**Status**: Fix applied, saved to PowerShell profile, and compatibility verified ✓
