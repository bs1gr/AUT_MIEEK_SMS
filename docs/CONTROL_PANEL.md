# System Control Panel

**Professional web-based control panel for the Student Management System**

## 📍 Access

- **URL**: http://localhost:8080/#control
- **Navigation**: Click "⚙️ System Control" tab in the main application

## 🎯 Features

### Dashboard Tab
- **Real-time Status Cards**: Backend, Frontend, Docker, Database
- **Quick Actions**: Start/Stop Frontend, Refresh Status, Stop All
- **System Information**: Python version, Node.js version, last update time
- **Auto-refresh**: Status updates every 5 seconds

### Operations Tab
- **Dependency Management**
  - Install Frontend Dependencies (`npm install`)
  - Install Backend Dependencies (`pip install -r requirements.txt`)
  
- **Docker Operations**
  - Build Docker Fullstack Image
  - Requires Docker Desktop running
  
- **Maintenance**
  - Clean Python Cache (`__pycache__`, `*.pyc` files)

### Diagnostics Tab
- **Comprehensive System Checks**:
  - Python environment (version, path, virtual env)
  - Node.js and npm (version, installation)
  - Docker Desktop (running status, version)
  - Database (file existence, accessibility)
  - Frontend dependencies (`node_modules`)
  - Backend dependencies (`venv`)
  
- **Color-coded Status Indicators**:
  - 🟢 Green (OK): System healthy
  - 🟡 Yellow (Warning): Minor issues, system functional
  - 🔴 Red (Error): Critical issues requiring attention

### Ports Tab
- **Real-time Port Monitoring**:
  - Backend ports: 8000-8002
  - Frontend ports: 5173-5180
  - Process information (name, PID) for occupied ports
  
- **Usage States**:
  - **In Use**: Port occupied by a process
  - **Available**: Port free for use

### Logs Tab
- **Backend Log Viewer**:
  - Last 50 structured JSON log entries
  - Syntax highlighting by log level (INFO, WARNING, ERROR)
  - Timestamp and message display
  - Scrollable view with overflow handling

### Environment Tab
- **Detailed Environment Information**:
  - **Python**: Version, path, virtual environment status
  - **Node.js**: Version, npm version, installation path
  - **Docker**: Version information
  - **System**: Platform, working directory

## 🔧 API Endpoints

All APIs are accessible at `/api/v1/control/api/*`:

### Status & Monitoring
```http
GET /api/v1/control/api/status
GET /api/v1/control/api/diagnostics
GET /api/v1/control/api/ports
GET /api/v1/control/api/environment
```

### Logs
```http
GET /api/v1/control/api/logs/backend?lines=50
```

### Operations
```http
POST /api/v1/control/api/operations/install-frontend-deps
POST /api/v1/control/api/operations/install-backend-deps
POST /api/v1/control/api/operations/docker-build
POST /api/v1/control/api/operations/cleanup
```

### Legacy Control (Backward Compatibility)
```http
GET  /control/api/status
POST /control/api/start
POST /control/api/stop
POST /control/api/stop-all
POST /control/api/stop-backend
```

## 🚀 Usage Examples

### Check System Status
1. Navigate to Control Panel → Dashboard
2. View status cards for all services
3. System automatically refreshes every 5 seconds

### Install Dependencies
1. Go to Operations tab
2. Click "Install Frontend Dependencies" for npm packages
3. Click "Install Backend Dependencies" for Python packages
4. Monitor progress via toast notifications

### Troubleshoot Issues
1. Go to Diagnostics tab
2. Click "Refresh" to run comprehensive checks
3. Review color-coded results:
   - Green = Everything OK
   - Yellow = Minor issues (system still functional)
   - Red = Critical problems requiring attention
4. Expand details section for more information

### Monitor Port Usage
1. Go to Ports tab
2. View all monitored ports (8000-8002, 5173-5180)
3. See which processes occupy ports
4. Click "Refresh" for latest data

### View Backend Logs
1. Go to Logs tab
2. View last 50 log entries with syntax highlighting
3. Click "Refresh" for latest logs
4. Scroll through historical entries

### Check Environment
1. Go to Environment tab
2. Review Python, Node.js, Docker, and System information
3. Verify paths and versions

## 🔄 Replacing Old Scripts

The Control Panel **replaces** the following PowerShell scripts:

| Old Script | Replacement | Location |
|------------|-------------|----------|
| `DEVTOOLS.ps1` | Full replacement | Diagnostics Tab |
| `DEBUG_PORTS.ps1` | Full replacement | Ports Tab |
| `DIAGNOSE_FRONTEND.ps1` | Full replacement | Diagnostics Tab |
| `CLEANUP.ps1` | Full replacement | Operations Tab → Maintenance |
| `INSTALL.ps1` | Partial (dependencies) | Operations Tab |

**Scripts still needed**:
- `RUN.ps1` / `QUICKSTART.ps1` - Initial startup
- `STOP.ps1` - CLI shutdown
- `DOCKER_*.ps1` - Docker-specific operations

## 💡 Benefits

1. **Unified Interface**: All operations in one place
2. **No Terminal Required**: Complete web-based management
3. **Real-time Monitoring**: Live status updates
4. **Professional UX**: Modern, responsive design
5. **Cross-platform**: Works in Docker and native mode
6. **Beginner Friendly**: No command-line knowledge needed
7. **Troubleshooting Tools**: Comprehensive diagnostics
8. **Operation Feedback**: Clear success/error messages

## 🛠️ Technical Details

- **Frontend**: React + Tailwind CSS + lucide-react icons
- **Backend**: FastAPI + psutil for system monitoring
- **Architecture**: RESTful APIs with router pattern
- **Authentication**: None (localhost only)
- **State Management**: React hooks with auto-refresh
- **Error Handling**: Try-catch with user-friendly messages

## 📝 Development

### Adding New Operations

1. Add endpoint to `backend/routers/routers_control.py`:
```python
@router.post("/operations/my-operation", response_model=OperationResult)
async def my_operation():
    # Implementation
    return OperationResult(success=True, message="Done")
```

2. Add button in `frontend/src/components/ControlPanel.jsx`:
```jsx
<button onClick={() => runOperation('my-operation', 'Success message')}>
  My Operation
</button>
```

### Adding New Diagnostics

1. Add check in `routers_control.py` → `run_diagnostics()`:
```python
results.append(DiagnosticResult(
    category="My Check",
    status="ok",  # or "warning", "error"
    message="Check passed",
    details={"key": "value"}
))
```

## 🐛 Troubleshooting

### Control Panel Not Loading
- **Issue**: Tab not visible
- **Solution**: Clear browser cache, force refresh (Ctrl+F5)
- **Check**: Verify Docker image built after commit 87bac56

### APIs Returning 404
- **Issue**: Endpoints not found
- **Solution**: Verify backend router registered in `main.py`
- **Check**: Look for "Control" in startup logs

### Operations Failing
- **Issue**: Operations return errors
- **Solution**: Check Diagnostics tab for system issues
- **Common**: Docker not running, missing dependencies

### Slow Performance
- **Issue**: Control panel sluggish
- **Solution**: Reduce auto-refresh frequency (change from 5s to 10s)
- **Check**: Review backend logs for errors

## 📚 See Also

- [Main README](../README.md) - General system documentation
- [Docker Guide](DOCKER.md) - Docker deployment
- [Quick Reference](QUICKREF.md) - Command reference
