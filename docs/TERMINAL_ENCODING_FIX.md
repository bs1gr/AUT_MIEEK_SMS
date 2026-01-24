# Terminal Encoding Fix - Updated Jan 13, 2026

## Problem

VS Code terminal was displaying corrupted Unicode characters (ψ) at the start of commands, preventing command execution.

**Symptoms:**
- Commands prefixed with `ψ` character
- Error: `The term 'ψcommand' is not recognized`
- Terminal encoding corruption
- Issue appeared specifically in PowerShell integrated terminal

## Root Cause

Windows PowerShell was not properly configured for UTF-8 encoding when integrated into VS Code terminal, causing encoding mismatch and character corruption.

## Solution (Updated v2 - Jan 13, 2026)

### 1. Enhanced PowerShell Profile

**File**: `.vscode/powershell-profile.ps1`

**Key Changes:**
- **Critical Fix First**: Set UTF-8 encoding BEFORE any other operations
- Ensures `[System.Console]::OutputEncoding` is UTF-8
- Sets code page 65001 (UTF-8) via `chcp 65001`
- Disables all progress bars and verbose output that can corrupt terminal
- Sets clean environment variables (TERM=dumb, PYTHONIOENCODING=utf-8)
- Provides clear feedback during initialization

**Configuration:**

```powershell
[System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[System.Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Set code page to UTF-8 (65001)

cmd /c "chcp 65001 >nul 2>&1"

# Disable corrupting output

$ProgressPreference = 'SilentlyContinue'
$VerbosePreference = 'SilentlyContinue'
$DebugPreference = 'SilentlyContinue'

```text
### 2. Updated VS Code Settings

**File**: `.vscode/settings.json`

**Key Changes:**
- Configured custom PowerShell profile "PowerShell (SMS)"
- Sets default profile to use the encoding fix
- Added environment variables for UTF-8 (PYTHONIOENCODING, TERM)
- Disabled GPU acceleration and local echo (stability)
- Disabled shell integration (prevents feature code corruption)
- Plain text output rendering

**Configuration:**

```json
"terminal.integrated.defaultProfile.windows": "PowerShell (SMS)",
"terminal.integrated.profiles.windows": {
  "PowerShell (SMS)": {
    "source": "PowerShell",
    "args": [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      ". '.vscode/powershell-profile.ps1'"
    ]
  }
},
"terminal.integrated.env.windows": {
  "PYTHONIOENCODING": "utf-8",
  "PYTHONUNBUFFERED": "1",
  "TERM": "dumb",
  "GIT_TERMINAL_PROMPT": "0"
}

```text
## How to Apply the Fix

### Option 1: Use New Terminal (Recommended)

1. Close current VS Code terminal (corrupted session)
2. Open new terminal: `Ctrl+Shift+` (backtick)
3. New terminal will automatically load the profile
4. Encoding should be fixed immediately

### Option 2: Reload VS Code

1. Close VS Code completely
2. Re-open VS Code
3. New terminal sessions will use the updated profile

### Option 3: Manual Reload in Current Terminal

If you want to try in current terminal:

```powershell
. .vscode/powershell-profile.ps1

```text
## Verification

After applying the fix, verify in terminal:

```powershell
# Check console encoding

[System.Console]::OutputEncoding
# Should show: System.Text.UTF8Encoding

# Check code page

cmd /c chcp
# Should show: Active code page: 65001

# Try commands without ψ corruption

git status
python --version
.\RUN_TESTS_BATCH.ps1 -h

```text
## What This Fixes

✅ **Fixes:**
- ψ character corruption at command start
- PowerShell command execution failures
- UTF-8 encoding mismatch between Python and terminal
- Progress bar corruption
- Terminal display issues with special characters

✅ **Stability Improvements:**
- Cleaner terminal output (no stray progress bars)
- Better Python output handling
- Git integration more reliable
- Less chance of encoding-related crashes

## Files Modified

1. `.vscode/powershell-profile.ps1` - Enhanced with UTF-8 encoding setup (v2)
2. `.vscode/settings.json` - Configured to use new profile and environment variables

## Troubleshooting

### Still seeing ψ characters?

1. Close all VS Code terminals completely
2. Close VS Code
3. Delete any corrupted PowerShell session files
4. Re-open VS Code fresh
5. Open new terminal

### Terminal still slow/frozen?

1. Try: `Ctrl+L` to clear
2. If that doesn't work, close terminal tab and open new one
3. The new terminal will be clean

### Profile not loading?

1. Check `.vscode/settings.json` has the correct profile configuration
2. Verify `.vscode/powershell-profile.ps1` exists
3. Try manually: `. .vscode/powershell-profile.ps1` in terminal

## Related Documentation

- **Greek Encoding Fix**: `docs/GREEK_ENCODING_FIX.md` (for installer assets, different issue)
- **Terminal Diagnostics**: `diagnose_terminal_encoding.ps1` (debugging script)
- **PowerShell Profile**: `.vscode/powershell-profile.ps1` (the fix)

## Version History

| Date | Version | Changes |
|------|---------|---------|
| Jan 13, 2026 | 2.0 | Updated profile with critical UTF-8 encoding setup first, added environment variables, improved feedback |
| Previous | 1.0 | Initial PowerShell profile |

---

**Created**: January 13, 2026
**Status**: Active and in use
**Next Review**: If terminal encoding issues appear in future sessions

