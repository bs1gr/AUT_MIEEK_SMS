# Installer Troubleshooting Guide

## Common Issues

### 1. Installer Terminates Prematurely
- Check for a file named `docker_install_progress.log` in the installer folder for error details.
- Ensure Docker Desktop is installed and running before starting the installer.
- Make sure PowerShell (pwsh.exe or powershell.exe) is available in your PATH.
- If the graphical progress bar does not appear, the installer will fall back to a console progress indicator.

### 2. No Progress Bar or GUI
- The progress bar requires Windows Presentation Framework (WPF). If unavailable, the installer will use a text-based progress indicator.
- This is normal on Windows Server Core or minimal Windows installations.

### 3. Docker Installation Fails
- Check that Docker Desktop is running and you have sufficient permissions.
- Review `docker_install_progress.log` for errors.
- Try running `DOCKER.ps1 -Install` manually in PowerShell for more details.

### 4. App Does Not Start After Install
- The installer attempts to start the app after Docker images are installed. If this fails, check the log file for errors.
- You can manually run `DOCKER.ps1 -Start` from the install directory.

## Support
If you continue to have issues, please provide the contents of `docker_install_progress.log` and any error messages to the support team or project maintainer.
