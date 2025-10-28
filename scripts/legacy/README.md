# Legacy Scripts

These scripts are kept for compatibility but are superseded by the unified SMS.ps1 interface.

## Available Scripts

- **RUN.ps1/.bat** - Start application in native mode
  - **Superseded by:** `QUICKSTART.ps1` or `SMS.ps1`
  - **Still works:** Yes, but not actively maintained
  
- **INSTALL.ps1/.bat** - Install dependencies
  - **Superseded by:** `SMS.ps1` → Setup menu or `SETUP.ps1`
  - **Still works:** Yes, but SMS.ps1 provides better error handling

---

## Why These Are Legacy

The new `SMS.ps1` unified management interface provides:
- ✅ Better error handling and user feedback
- ✅ Interactive menus for all operations
- ✅ Automatic mode detection (Docker vs Native)
- ✅ Integrated diagnostics and troubleshooting
- ✅ Single entry point for all operations

---

## Migration Guide

### If you were using `RUN.ps1`:

**Old way:**
```powershell
.\scripts\legacy\RUN.ps1
```

**New way (recommended):**
```powershell
.\QUICKSTART.ps1
# or
.\SMS.ps1  # then select option 1 (Start Application)
```

### If you were using `INSTALL.ps1`:

**Old way:**
```powershell
.\scripts\legacy\INSTALL.ps1
```

**New way (recommended):**
```powershell
.\scripts\SETUP.ps1
# or
.\SMS.ps1  # then select option 9 (Setup & Installation)
```

---

**Note:** These legacy scripts will remain available for backward compatibility but may not receive updates or new features.
