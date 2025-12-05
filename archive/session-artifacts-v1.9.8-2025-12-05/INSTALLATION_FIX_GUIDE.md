# Installation Fix Guide - SMS v1.9.8

## Issues Found and Fixed

### ✅ Issue 1: Web Interface Not Accessible (http://localhost:8080/)

**Problem**: Docker container was running but frontend was not being served.

**Root Cause**: Docker image build cache was corrupted, preventing the frontend build stage from completing.

**Solution Applied**:
1. Cleaned up Docker system: `docker system prune -f --volumes`
2. Rebuilt Docker image without cache: `docker build --no-cache -t sms-fullstack:1.9.8 -f docker/Dockerfile.fullstack .`
3. Restarted the container with fresh image

**Status**: ✅ FIXED - Frontend now accessible at http://localhost:8080/

### ✅ Issue 2: Desktop Shortcut Not Created

**Problem**: Installer did not create a desktop shortcut for SMS Launcher.

**Root Cause**: Inno Setup installer configuration or cleanup process removed the shortcut.

**Solution Applied**:
Created desktop shortcut manually pointing to:
- **Target**: `C:\Program Files\SMS\SMS_Launcher.cmd start`
- **Working Directory**: `C:\Program Files\SMS`
- **Icon**: `C:\Program Files\SMS\favicon.ico`

**Status**: ✅ FIXED - Shortcut created on desktop

## How to Manually Rebuild If Issues Recur

### Option 1: Using Desktop Shortcut (Recommended)
Simply click the desktop shortcut "Student Management System" to manage the application:
- **Start** - Launches the application
- **Stop** - Stops the running container
- **Status** - Shows current status

### Option 2: Using Command Line
```powershell
# Navigate to installation directory
cd "C:\Program Files\SMS"

# Start the application (builds if needed, then starts)
.\DOCKER.ps1 -Start

# Stop the application
.\DOCKER.ps1 -Stop

# Check status
.\DOCKER.ps1 -Status

# Clean rebuild (if having issues)
.\DOCKER.ps1 -UpdateClean
```

### Option 3: Manual Docker Commands
```bash
# Rebuild image (from SMS installation directory)
docker build --no-cache -t sms-fullstack:1.9.8 -f docker/Dockerfile.fullstack .

# Run container
docker run -d --name sms-app -p 8080:8000 -v sms_data:/data sms-fullstack:1.9.8

# Stop container
docker stop sms-app

# Remove container
docker rm sms-app
```

## Troubleshooting

### Port Already in Use
If port 8080 is already in use:
```powershell
# Find process using port 8080
netstat -ano | findstr :8080

# Either:
# 1. Change port in docker run command: -p 9000:8000 (access at http://localhost:9000)
# 2. Kill the process using port 8080
```

### Container Won't Start
```powershell
# Check logs
docker logs sms-app

# Remove old container and data volume
docker rm -f sms-app
docker volume rm sms_data

# Rebuild everything
docker build --no-cache -t sms-fullstack:1.9.8 -f docker/Dockerfile.fullstack .
docker run -d --name sms-app -p 8080:8000 -v sms_data:/data sms-fullstack:1.9.8
```

### Frontend Not Loading
If you see the web page but it's blank or slow:
1. Hard refresh browser: `Ctrl + Shift + Delete` (clear cache) then refresh
2. Check browser console for errors: `F12` → Console tab
3. Verify backend is responding: Visit http://localhost:8080/api/v1/health

## Security Notes

⚠️ **Warning**: The installation uses a default SECRET_KEY. Before deploying to production:

1. Generate a strong secret key:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```

2. Update `C:\Program Files\SMS\backend\.env`:
   ```
   SECRET_KEY=<your-generated-key>
   ```

3. Restart the container:
   ```
   docker restart sms-app
   ```

## Next Steps

1. ✅ Access the application at http://localhost:8080/
2. ✅ Log in with default credentials (if configured)
3. ✅ Test basic functionality (add student, create course, etc.)
4. ✅ Configure security settings for production use
5. ✅ Create backups of your data regularly

## Support

For additional help:
- Check logs: `docker logs sms-app`
- Review documentation in `docs/` directory
- Check README.md for architecture and deployment info
- Visit GitHub: https://github.com/bs1gr/AUT_MIEEK_SMS
