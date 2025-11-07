# Mode-Aware UI Quick Reference

## What Changed?

The Control Panel at `http://localhost:8080/control` now **automatically detects** whether you're running in **Docker** or **Native** mode and **hides operations that won't work** in your current environment.

## Visual Indicators

### Docker Mode
```
🐳 Running in Docker Mode
Showing Docker-compatible operations only. For full control, 
use SMS.ps1 or SMART_SETUP.ps1 on host machine.
```

### Native Mode
- No banner shown
- All operations available

## Operations by Mode

| Operation | Docker Mode | Native Mode | Notes |
|-----------|-------------|-------------|-------|
| **Run Full Diagnostics** | ✅ Visible | ✅ Visible | Works in both modes |
| **Stop All Services** | ✅ Visible | ✅ Visible | Works in both modes |
| **Database Backup** | ✅ Visible | ✅ Visible | Works in both modes |
| **Database Restore** | ✅ Visible | ✅ Visible | Works in both modes |
| **Troubleshooting** | ✅ Visible | ✅ Visible | Works in both modes |
| **System Status** | ✅ Visible | ✅ Visible | Works in both modes |
| **Port Status** | ✅ Visible | ✅ Visible | Works in both modes |
| **Environment Details** | ✅ Visible | ✅ Visible | Works in both modes |
| **Start Application** | ❌ Hidden | ✅ Visible | Can't start Docker from inside Docker |
| **Restart Application** | ❌ Hidden | ✅ Visible | Requires Docker socket mount (not available) |
| **Install Frontend Deps** | ❌ Hidden | ✅ Visible | Requires host filesystem access |
| **Install Backend Deps** | ❌ Hidden | ✅ Visible | Requires host filesystem access |

## Quick Test

### After Fresh Setup
```powershell
.\SMART_SETUP.ps1
# Opens browser to http://localhost:8080/control
```

### Navigation Between Control Panel and Main App
- **From Control Panel**: Click green "🚀 Open Main Application" button
- **From Main App**: Click "Control Panel" button in top-right header (gear icon)
- Both open in new tabs for easy switching

### What You Should See in Docker Mode
1. **Blue banner** at top with Docker whale emoji 🐳
2. **"Mode" badge** shows "docker" in header
3. **4 buttons hidden**: Start, Restart, Install Frontend Deps, Install Backend Deps
4. **All other buttons visible** and working

### What You Should NOT See
- ❌ "Start Application" button
- ❌ "Restart Application" button
- ❌ "Install Frontend Dependencies" button  
- ❌ "Install Backend Dependencies" button
- ❌ Error messages when clicking impossible operations

## How It Works

1. **Page loads** → Calls `/api/v1/control/api/environment`
2. **Checks** `environment_mode` field
3. **If "docker"**:
   - Shows blue banner
   - Hides all `[data-mode="native"]` buttons
4. **If "native"**:
   - Hides banner
   - Shows all buttons

## Benefits

✅ **No Confusion** - Only see operations that work  
✅ **No Error Messages** - Impossible operations hidden, not shown  
✅ **Clear Guidance** - Banner explains how to get full control  
✅ **Simplified UX** - Matches Docker-only release goal  

## For Advanced Operations

If you need operations hidden in Docker mode:

### Restart Application
```powershell
# From host machine
docker compose restart

# Or use SMS.ps1
.\SMS.ps1 -Stop
# Then start again with SMART_SETUP.ps1 or SMS.ps1
```

### Other Host Operations
```powershell
# Use SMS.ps1 on host machine
.\SMS.ps1

# Or SMART_SETUP.ps1 for fresh install
.\SMART_SETUP.ps1 -Force
```

## Troubleshooting

### "I don't see the blue banner"
- Check Mode badge in header - should show "docker"
- If shows "native", you're not in Docker mode
- Refresh page (mode detection runs on load)

### "I see Start Application button in Docker mode"
- Page might be cached - hard refresh (Ctrl+F5)
- Check browser console for JavaScript errors
- Verify API returns `environment_mode: "docker"`

### "All buttons are hidden"
- Check browser console for errors
- Verify backend is running: `http://localhost:8080/health`
- Check API endpoint: `http://localhost:8080/api/v1/control/api/environment`

## Version Info

- **Release**: v1.3.8
- **Feature**: Mode-Aware UI
- **Documentation**: `docs/CONTROL_PANEL_MODE_AWARE_UI.md`
- **Implementation**: November 2025

## Related Commands

```powershell
# Fresh setup (clean + install + start)
.\SMART_SETUP.ps1

# Stop everything
.\SMS.ps1 -Stop

# Check status
.\SMS.ps1 -Status

# Full management menu
.\SMS.ps1
```

---

**Note**: This feature is part of the Docker-only release strategy for v1.3.8+. All installations now use Docker by default for consistency and simplified deployment.
