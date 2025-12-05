# Quick Start: Desktop Shortcut for SMS

## 🎯 What You Get

A desktop icon that toggles your SMS application with **ONE CLICK**:
- Click once → **Start** SMS ✅
- Click again → **Stop** SMS 🛑

---

## 📋 Setup (Do This Once)

### Step 1: Create the Shortcut

Open PowerShell in your SMS project directory and run:

```powershell
.\CREATE_DESKTOP_SHORTCUT.ps1
```

**That's it!** A shortcut named "SMS Toggle" appears on your Desktop.

---

## 🚀 Daily Use

### Starting SMS

1. **Double-click** "SMS Toggle" on Desktop
2. Wait ~10 seconds for startup
3. Window shows: "SMS started successfully"
4. Access at: **http://localhost:8080**

### Stopping SMS

1. **Double-click** "SMS Toggle" on Desktop
2. Window shows: "SMS stopped successfully"
3. Done!

---

## 🔧 How It Works

```
You Click → DOCKER_TOGGLE.ps1 → Checks Status → Runs Opposite Action
                                      ↓
                              Running? → Stop
                              Stopped? → Start
```

---

## ⚠️ Prerequisites

- ✅ Docker Desktop must be **running**
- ✅ SMS project files installed
- ✅ PowerShell available

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Docker is not available" | Start Docker Desktop first |
| Shortcut not working | Re-run `CREATE_DESKTOP_SHORTCUT.ps1` |
| Port conflict | Stop other apps using port 8080 |

---

## 💡 Pro Tips

### Pin to Taskbar
Drag "SMS Toggle" from Desktop to your Taskbar for even faster access!

### Check Status Without Changing
Use traditional command instead:
```powershell
.\DOCKER.ps1 -Status
```

### Alternative Commands
```powershell
.\DOCKER.ps1 -Start     # Start only (no toggle)
.\DOCKER.ps1 -Stop      # Stop only (no toggle)
.\DOCKER.ps1 -Restart   # Restart
```

---

## 📊 What Happens Behind the Scenes

### On Click:
1. ✓ Checks if Docker is running
2. ✓ Checks if SMS container exists
3. ✓ Detects current state (running/stopped)
4. ✓ Executes opposite action
5. ✓ Shows clear feedback
6. ✓ Waits for your keypress to close

### Safe Operations:
- Uses your existing `DOCKER.ps1` script
- Maintains all backups and health checks
- Respects all configuration settings
- No data loss risk

---

## 📁 Files Created

```
student-management-system/
├── DOCKER_TOGGLE.ps1              ← Toggle logic
├── CREATE_DESKTOP_SHORTCUT.ps1    ← Setup script (run once)
└── docs/
    └── DESKTOP_SHORTCUT_GUIDE.md  ← Full documentation
```

Plus on your Desktop:
```
Desktop/
└── SMS Toggle.lnk                 ← Your clickable shortcut
```

---

## ✨ Benefits

| Feature | Benefit |
|---------|---------|
| **One-click** | No PowerShell commands to remember |
| **Smart toggle** | Always does what you need |
| **Visual feedback** | See exactly what's happening |
| **Desktop access** | Launch from anywhere |
| **Safe** | Uses proven DOCKER.ps1 script |

---

## 🎓 Example Session

```
Morning:
  [Double-click] → ✅ SMS Started → Work on grades

Lunch Break:
  [Double-click] → 🛑 SMS Stopped → Save resources

Afternoon:
  [Double-click] → ✅ SMS Started → Continue work

End of Day:
  [Double-click] → 🛑 SMS Stopped → Go home
```

---

## 📖 Full Documentation

For complete details, see: `docs/DESKTOP_SHORTCUT_GUIDE.md`

For SMS operation: `docs/user/QUICK_START_GUIDE.md`

---

**Enjoy your one-click SMS control! 🎉**
