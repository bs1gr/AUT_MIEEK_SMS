# pip Version Management

> **Note ($11.9.7+)**: The script `SMART_SETUP.ps1` referenced in this document has been consolidated into `NATIVE.ps1`. Use `NATIVE.ps1 -Setup` for native development setup.

## Current Target Version: 25.3

The Student Management System uses **pip 25.3** in the backend virtual environment for compatibility and stability.

## Automatic Upgrade

### During Setup

When you run `NATIVE.ps1 -Setup`, pip is automatically upgraded to version 25.3:

```powershell
.\\NATIVE.ps1 -Setup
```

The script will:
1. Create virtual environment (`.venv`)
2. Check current pip version
3. Upgrade to pip 25.3 if different
4. Install all requirements

### Manual Upgrade

If you need to upgrade pip manually in an existing virtual environment:

```powershell
# Quick upgrade using helper script
.\scripts\dev\upgrade-pip.ps1

# Or manually activate venv and upgrade
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip==25.3
```

## Verification

Check your current pip version:

```powershell
# PowerShell
.\.venv\Scripts\python.exe -m pip --version

# Expected output:
# pip 25.3 from ...
```

## Why pip 25.3?

- **Latest stable release** as of January 2025
- **Improved dependency resolution**
- **Better error messages**
- **Security updates**
- **Performance improvements**

## Troubleshooting

### pip version mismatch warning

If you see warnings about pip being outdated:

```powershell
# Run the upgrade script
.\scripts\dev\upgrade-pip.ps1
```

### pip installation fails

If pip 25.3 isn't available:

```powershell
# Upgrade to latest available version
.\.venv\Scripts\python.exe -m pip install --upgrade pip
```

### Virtual environment doesn't exist

Create it first:

```powershell
.\SMART_SETUP.ps1 -PreferNative
```

## Files Modified

The following files ensure pip 25.3 is used:

- ✅ `SMART_SETUP.ps1` - Updated to target pip 25.3
- ✅ `scripts/dev/upgrade-pip.ps1` - New helper script

## Version History

| Date | Version | Notes |
|------|---------|-------|
| 2025-01-18 | 25.3 | Current target version |
| 2025-01-xx | 25.0.1 | Previous version |

## See Also

- [Python Virtual Environments](https://docs.python.org/3/library/venv.html)
- [pip Documentation](https://pip.pypa.io/)
- [pip Release Notes](https://pip.pypa.io/en/stable/news/)

