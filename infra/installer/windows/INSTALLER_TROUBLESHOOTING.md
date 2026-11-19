# Installer Troubleshooting Guide

**Written anew on 19 November 2026** against `SMS_Installer.iss`, `run_docker_install.cmd`
and `DOCKER.ps1` of v1.18.74 and after. The earlier text named a log file
(`docker_install_progress.log`) and a progress window that the installer no longer has.
Nothing here was tried on an installation; the steps are read from the scripts.

## The installer will not start, or Windows warns about it

The installer is signed with the project's own certificate, so Windows may show "Windows
protected your PC" or "Unknown publisher". See
[LITE_EDITION_GUIDE.md](../../../docs/deployment/LITE_EDITION_GUIDE.md), "Problem: Windows
blocks the installer or SMS_Lite.exe". The installer needs administrator rights.

## Docker edition: the page "Completing Installation" ends with an error

That page runs `run_docker_install.cmd`, which runs `DOCKER.ps1 -Install -Silent -NoShortcut`
in a console window: it makes `config\.env` and the volume `sms_data` and builds the Docker
image. It does not start SMS.

1. Check that Docker Desktop is running.
2. Read the two logs in the installation folder (normally `C:\Program Files\SMS`):
   `DOCKER_INSTALL.log` (what `DOCKER.ps1` did) and `DOCKER_INSTALL_WRAPPER.log` (which
   PowerShell was used and the exit code).
3. In PowerShell, as administrator, in the installation folder: `.\DOCKER.ps1 -Install`.
   It shows Docker's own output when the build fails.

## Docker edition: SMS does not start after the installation

The wizard does not start SMS. Start it with the **Student Management System** shortcut
(choose 1, START) or `.\DOCKER.ps1 -Start` in the installation folder; the address is
`http://localhost:8080`. `.\DOCKER.ps1 -Status` and `.\DOCKER.ps1 -Logs` say why it does not
come up. More: [DOCKER_OPERATIONS.md](../../../docs/deployment/DOCKER_OPERATIONS.md).

## SMS Lite does not start, or cannot reach the QNAP database

See [LITE_EDITION_GUIDE.md](../../../docs/deployment/LITE_EDITION_GUIDE.md). Its log is
`%LOCALAPPDATA%\SMS_Native_Lite_Simple\debug.log`.

## The first sign-in

Which account to use, for each edition and database:
[INSTALLATION_GUIDE.md](../../../docs/operations/INSTALLATION_GUIDE.md), section 3.

## Asking for help

Give the version (Settings > Apps, "Student Management System"), the edition, and the logs
named above. Remove any password from them first: `config\.env` holds passwords, and so did
`DOCKER_INSTALL.log` of v1.18.73 and earlier.
