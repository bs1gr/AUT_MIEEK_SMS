# PowerShell Terminal Encoding Fix

## Problem

If you see commands appearing with a `ψ` (Greek psi) character prefix like:
```
PS D:\SMS\student-management-system> ψgit status
ψgit: The term 'ψgit' is not recognized...
```

This is caused by **Greek DOS encoding (CodePage 737)** being used instead of UTF-8.

## Quick Fix

### Option 1: Run the automated fix (Recommended)

```powershell
.\scripts\FIX_ENCODING.ps1
```

Then:
1. Close ALL terminals in VS Code
2. Press `Ctrl+Shift+P` → "Developer: Reload Window"
3. Open a new terminal (`Ctrl+\``)
4. Test: Commands should work normally now!

### Option 2: Manual VS Code settings

Add to your **workspace** `.vscode/settings.json`:

```json
{
  "terminal.integrated.profiles.windows": {
    "PowerShell": {
      "source": "PowerShell",
      "args": [
        "-NoExit",
        "-Command",
        "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; [Console]::InputEncoding=[System.Text.Encoding]::UTF8; chcp 65001 | Out-Null"
      ]
    }
  },
  "files.encoding": "utf8",
  "terminal.integrated.unicodeVersion": "11"
}
```

## What the fix does

1. Sets PowerShell console to UTF-8 encoding (both input and output)
2. Changes code page to 65001 (UTF-8)
3. Prevents Greek/Cyrillic character corruption
4. Makes the fix permanent in your PowerShell profile

## Verification

After applying the fix, test with:
```powershell
git status
cd ..
ls
```

All commands should work without the `ψ` prefix!

## Technical Details

- **Root cause**: Windows defaults to system locale encoding (Greek DOS = CP 737)
- **Solution**: Force UTF-8 (CP 65001) for all terminal operations
- **Scope**: Fixes both VS Code terminal and regular PowerShell windows
- **Persistence**: Added to `$PROFILE` so it loads on every PowerShell startup
