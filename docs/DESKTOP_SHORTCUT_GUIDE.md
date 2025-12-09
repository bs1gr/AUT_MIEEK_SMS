# Desktop Shortcut for SMS Docker Toggle

## Overview

This solution provides a **single-click** desktop shortcut to toggle your SMS Docker application between running and stopped states.

## Files Created

1. **`DOCKER_TOGGLE.ps1`** - Smart toggle script that detects current state and performs the opposite action
2. **`CREATE_DESKTOP_SHORTCUT.ps1`** - One-time setup script that creates the desktop shortcut

## Quick Setup

### Step 1: Create the Desktop Shortcut

Run this command once from PowerShell:

```powershell
.\CREATE_DESKTOP_SHORTCUT.ps1
```

This creates a shortcut named **"SMS Toggle"** on your Desktop.

### Step 2: Use the Shortcut

**Double-click the "SMS Toggle" shortcut on your Desktop:**

- **If SMS is stopped** → It will start the application
- **If SMS is running** → It will stop the application

A PowerShell window will appear showing the progress and status.

## How It Works

### Smart Detection

The toggle script automatically detects whether the SMS container is running:

- Checks Docker availability
- Queries container status
- Executes the appropriate action (start or stop)

### Visual Feedback

When you click the shortcut, you'll see:

- Current status (Running or Stopped)
- Action being performed (Starting or Stopping)
- Success/failure messages
- Next steps (URL for starting, "click again to stop" message)

### Example Output

**When Starting:**

```
═══════════════════════════════════════════════════════
  SMS Docker Toggle - Smart Start/Stop
═══════════════════════════════════════════════════════

ℹ️  SMS is currently stopped
🚀 Starting application...

✅ SMS started successfully

  📱 Access at: <http://localhost:8080>

ℹ️  Click the shortcut again to stop

Press any key to close...
```

**When Stopping:**

```
═══════════════════════════════════════════════════════
  SMS Docker Toggle - Smart Start/Stop
═══════════════════════════════════════════════════════

ℹ️  SMS is currently running
🛑 Stopping application...

✅ SMS stopped successfully

ℹ️  Click the shortcut again to start

Press any key to close...
```

## Technical Details

### DOCKER_TOGGLE.ps1

- Checks Docker availability
- Detects container status using `docker ps`
- Calls `DOCKER.ps1 -Start` or `DOCKER.ps1 -Stop`
- Provides clear visual feedback
- Waits for user keypress before closing

### Desktop Shortcut Properties

- **Target:** `powershell.exe`
- **Arguments:** `-ExecutionPolicy Bypass -NoProfile -WindowStyle Normal -File "DOCKER_TOGGLE.ps1"`
- **Icon:** Computer icon from shell32.dll
- **Working Directory:** SMS project directory

## Requirements

- Windows PowerShell 5.1+ or PowerShell 7+
- Docker Desktop installed and running
- SMS project files in the current directory
- `DOCKER.ps1` script (already exists in your project)

## Troubleshooting

### "Docker is not available"

- Ensure Docker Desktop is running
- Check Docker status with: `docker ps`

### "DOCKER.ps1 not found"

- Run `CREATE_DESKTOP_SHORTCUT.ps1` from the SMS project directory
- Verify `DOCKER.ps1` exists in the same directory

### Shortcut doesn't work

1. Right-click the shortcut → Properties
2. Verify "Start in" points to your SMS project directory
3. Re-run `CREATE_DESKTOP_SHORTCUT.ps1` to recreate it

### Execution Policy Error

The shortcut uses `-ExecutionPolicy Bypass` to avoid issues, but if you encounter problems:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Advanced Usage

### Manual Toggle (without shortcut)

```powershell
.\DOCKER_TOGGLE.ps1
```

### Direct Commands (traditional way)

```powershell
.\DOCKER.ps1 -Start    # Start only
.\DOCKER.ps1 -Stop     # Stop only
.\DOCKER.ps1 -Status   # Check status
```

## Customization

### Change Shortcut Name

1. Right-click "SMS Toggle" on Desktop
2. Click "Rename"
3. Enter new name (e.g., "Student Management")

### Change Shortcut Icon

1. Right-click shortcut → Properties
2. Click "Change Icon..."
3. Browse to an `.ico` file or choose from system icons

### Add to Taskbar

- Drag the desktop shortcut to your taskbar for even faster access

## Benefits

✅ **One-click operation** - No need to open PowerShell  
✅ **Smart toggle** - Automatically detects state  
✅ **Visual feedback** - Clear status messages  
✅ **Safe** - Uses existing tested DOCKER.ps1 script  
✅ **Convenient** - Desktop access from anywhere  

## Integration with Existing Scripts

The toggle script works seamlessly with your existing SMS scripts:

- Uses `DOCKER.ps1` for all operations
- Respects all Docker configurations
- Maintains backup and health check features
- Compatible with monitoring stack

## Version History

- **$11.9.7** (2025-01-25)
  - Initial release
  - Smart start/stop toggle
  - Desktop shortcut creator
  - Visual feedback and status messages
