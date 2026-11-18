# Student Management System - Installation Guide

**Read against the installer and the scripts:** 18 November 2026, `main` after v1.18.73. Nothing was installed or run for this reading.

This file was the installation guide of version 1.9.8 (December 2025). It described downloading
the project and running `DOCKER.ps1` from the extracted folder, and it no longer matched how the
application is installed. The earlier text is in the repository's history.

The guide is for somebody who installs the application on Windows with the installer, and for
the administrator of that installation afterwards. "Read from the script" means that a statement
rests on reading `infra/installer/windows/SMS_Installer.iss` or another script, and that nobody
ran it. Section 10 lists what was never tried.

## 1. Which edition

Download `SMS_Installer_<version>.exe` from the
[latest release](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/latest) and run it as an
administrator (`PrivilegesRequired=admin`). The wizard asks for the language (English or
Greek) and then, on the page "Installation Type", for the edition:

| | Native Lite Edition | Docker Production Edition |
|---|---|---|
| What it is | `SMS_Lite.exe`, a program of this PC. No Docker. | One Docker container, `sms-app`, with a small menu program to start and stop it. |
| Needs | Windows 10 or later (`MinVersion=10.0`). | Windows 10 or later, Docker Desktop. |
| Database | Local SQLite on this PC, or the shared QNAP PostgreSQL database. | The wizard offers local SQLite or the shared QNAP PostgreSQL database (section 2). |

The wizard describes Lite as "Lightweight standalone executable (68 MB). Runs natively on
Windows without Docker. Supports local SQLite and optional QNAP PostgreSQL integration.
Perfect for individual PCs." and Docker as "Full-featured production deployment with Docker
containers. Includes all features, automatic updates, and containerized environment. Requires
Docker Desktop." The README recommends Lite "for individual teachers". A new install preselects
Docker; an update preselects the installed edition. The information page "Welcome to SMS
Installation" lists for Docker: Windows 10/11 (64-bit), Docker Desktop installed and running,
4 GB RAM minimum (8 GB recommended), 2 GB free disk space.

The installer is signed with the project's own certificate, so Windows may show "Windows
protected your PC" or block `SMS_Lite.exe` (Smart App Control); see
[LITE_EDITION_GUIDE.md](../deployment/LITE_EDITION_GUIDE.md), "Problem: Windows blocks the
installer or SMS_Lite.exe".

## 2. What the installer asks and does

Read from the script. There is no page for the folder: the application goes to `{autopf}\SMS`,
normally `C:\Program Files\SMS` (`DisableDirPage=yes`; `UNINSTALL_SMS_MANUALLY.ps1` also names
`C:\Program Files\SMS`). The pages, in the order the script creates them:

1. Language, welcome and licence pages, and **Installation Type**. The information page of
   section 1 is shown too.
2. **Docker edition, "Prerequisites Check".** Says whether Docker Desktop is installed ("Docker
   Desktop is NOT installed") and running, with a **Refresh** button and "First run will build
   the container (takes 5-10 minutes)". You can continue without Docker.
3. **Docker edition, "Database Configuration".** "QNAP PostgreSQL (shared NAS database -
   recommended)", preselected, or "Local SQLite (fallback when QNAP unreachable)". QNAP needs a
   credentials file (`.json`, `.env` or `.txt`, **Browse...**) with host, port, dbname, user
   and password.
4. **Lite edition, "QNAP Database Configuration (Optional)".** "Yes, I want to use QNAP
   PostgreSQL" (a credentials file, or QNAP IP or DNS name, Port, Database name, Username,
   Password; all five are needed) or "No, use local SQLite database". For a new local database
   it asks for "Administrator email:", "Full name (optional):", "Password (8+ characters, A-z,
   0-9, symbol):" and "Confirm password:". An existing local database is kept.
5. **Tasks:** "Keep user data (database, backups, settings)", a desktop shortcut, and, if Docker
   is missing, "Open Docker Desktop download page". The folders `data`, `logs`, `backups` are made.
6. **Docker edition, "Completing Installation".** The wizard runs `run_docker_install.cmd` in a
   console window: `DOCKER.ps1 -Install -Silent -NoShortcut`, with PowerShell 7 if found,
   otherwise Windows PowerShell. It makes `config\.env` and the volume `sms_data` and builds the
   image ("Building SMS Docker container. This may take several minutes on first install.").
   It does not start the application.
7. **Finish:** "Launch SMS after installation" (checked), "View README documentation" (not).

The Docker edition also gets the scheduled task **SMS Update Watcher** (section 6). The Start
Menu group has **Student Management System**, **SMS Documentation**, the uninstaller and, for
Docker, "Manual Uninstaller (for broken installations)".

**Where SMS is already installed** a message box says: "Version X is already installed at: ...
Your data and settings will be preserved. Click YES to upgrade to version Y, or NO to cancel."
(same version: "Click YES to reinstall/repair, or NO to cancel installation."). There is no
"fresh install" choice.

**The database choice of the Docker edition.** The wizard writes it to `.env` in the install
folder (`SMS_Installer.iss:2209-2261`). `DOCKER.ps1`, which builds and starts the application,
reads `config\.env` there (`DOCKER.ps1:166`), and no code that reads the other file was found.
A new install therefore gets what `DOCKER.ps1` writes into `config\.env`: local SQLite
(`DOCKER.ps1:2010-2013`). This was not checked on an installed copy. After the first start,
**System** > **Show System Health** says which database is in use. `DOCKER.ps1` takes a QNAP
setup from `SMS_DATABASE_PROFILE=remote` and the `POSTGRES_*` values in `config\.env`
(`DOCKER.ps1:2203-2255`); see
[QNAP_POSTGRES_SINGLE_SOURCE.md](../deployment/QNAP_POSTGRES_SINGLE_SOURCE.md).

## 3. The first sign-in

There is no fixed default password. Read from the scripts and the Lite code:

- **Lite, local SQLite:** the e-mail address and password you typed in the installer. It saves
  them in `local-secrets\initial-admin.json` under `%LOCALAPPDATA%\SMS_Native_Lite_Simple`;
  Lite makes the account at its first start and deletes the file. A local database has no
  registration form: the administrator makes the accounts.
- **Lite, QNAP:** your existing account on the shared database. No account is made.
- **Lite, silent install or an older installer:** a fallback account with a public password;
  the application only lets you set a new one before it shows any data. See
  [LITE_EDITION_GUIDE.md](../deployment/LITE_EDITION_GUIDE.md), "First Login".
- **Docker edition:** `DOCKER.ps1` makes `config\.env` from `config\.env.example` with a random
  administrator password, and prints "Initial admin login", the e-mail address (the template
  has `admin@example.com`) and the password in the console window of step 6. The same values
  are `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD` in `config\.env` in the install
  folder. `DOCKER_INSTALL.log` there gets the address and where the password is kept, not
  the password (in v1.18.73 and earlier the log held the password too: delete that log
  once the first sign-in has changed it). The account is made when the application first starts on a database with no accounts,
  and its first sign-in asks for a new password before anything else opens
  (`backend/scripts/admin/bootstrap.py`). See also the
  [Quick Start](../user/QUICK_START_GUIDE.md), "Signing in for the first time".

Afterwards every account changes its own password under **System** > **Show Control Panel** >
**Maintenance** > **User Accounts**, in the form "Change Your Password", then **Update
password**. An administrator makes accounts there (**Create user**), approves requests
(**Approve**) and sets a new password for a forgotten one (**Reset password**). What each
account may do: [USER_GUIDE_COMPLETE.md](../user/USER_GUIDE_COMPLETE.md), section 14.

## 4. Starting and stopping

**Lite:** the shortcut starts `SMS_Lite.exe`, which opens `http://127.0.0.1:8000`. When it stops
by itself is in the Lite guide, "When SMS Lite Stops by Itself".

**Docker edition:** the shortcut opens `SMS_Manager.exe`, a console menu "Student Management
System - Docker Manager": 1) START container and open web app, 2) STOP container, 3) RESTART
container, 4) CHECK container status, 5) VIEW container logs, 6) OPEN web app, Q) QUIT. It says
"Docker Desktop is not running" if Docker Desktop is not. The address is
`http://localhost:8080`. In PowerShell, in the install folder:

```powershell
.\DOCKER.ps1 -Start       # start (also what no option does)
.\DOCKER.ps1 -Stop        # stop
.\DOCKER.ps1 -Status      # is it running
.\DOCKER.ps1 -Logs        # follow the logs
.\DOCKER.ps1 -Help        # all options
```

The container has `--restart unless-stopped`: Docker starts it again with Docker Desktop, unless
you stopped it. `http://localhost:8080/health` answers with JSON (`status`, `database`).

## 5. Where the data and the backups are

Read from the scripts. "Install folder" is normally `C:\Program Files\SMS`.

| | Docker edition | Lite edition |
|---|---|---|
| Database | Docker volume `sms_data`, `/data/student_management.db`, with the local SQLite profile | `%LOCALAPPDATA%\SMS_Native_Lite_Simple\sms_lite.db`, or the shared QNAP database |
| Settings | `config\.env` in the install folder | `%LOCALAPPDATA%\SMS_Native_Lite_Simple\local-secrets` |
| Backups | `backups\database` in the install folder | `backups\database` in the install folder |
| Logs | `.\DOCKER.ps1 -Logs`; `logs` in the install folder holds the update logs | `%LOCALAPPDATA%\SMS_Native_Lite_Simple\debug.log` |

The database of neither edition is in the install folder's `data` folder.

**The automatic backup:** every running server makes an encrypted backup when its newest is
older than 24 hours and keeps the newest 30. They are listed under **System** > **Show Control
Panel** > **Maintenance** > **System Operations** > **Manage Backups**. Where the key is kept,
how to restore, and what to copy off the machine: [BACKUP_AND_RESTORE.md](../admin/BACKUP_AND_RESTORE.md).
A backup without its key cannot be read.

`DOCKER.ps1 -Backup` and `-Update` copy the SQLite database to
`backups\database\sms_backup_<date>_<time>_<hash>.db` (newest 10 kept); with a PostgreSQL
profile there is no such file to copy.

## 6. Updating

Make a backup first (section 5).

- **Docker, from the application:** **System** > **Show Control Panel** > **Updates** >
  **Check for Updates** > **Update on the host**. The page says: "Update asks the host updater
  task to install the release on this server: it checks the installer's SHA-256 and signature,
  installs the Docker edition, then rebuilds and restarts the container. The app is unavailable
  for a few minutes." The task is **SMS Update Watcher**, registered by the installer
  (`scripts\update-watcher.ps1`, at the logon of the user who installed; log
  `logs\update-watcher.log`). If it is not running, the button is disabled and the tab says
  so; running the installer again sets it up.
- **Docker, by hand:** run the new `SMS_Installer_<version>.exe`, then `.\DOCKER.ps1 -Update`.
  `-Update` rebuilds from the files already installed, after a backup; `-UpdateClean` rebuilds
  without the cache. Neither downloads a newer release.
- **Lite, from the application:** **Updates** > **Check for Updates** > **Update SMS Lite**.
  The page says: "Update downloads the installer, checks its SHA-256 and installs only SMS
  Lite, keeping your data and settings. Windows asks for permission; SMS Lite then closes and
  starts again by itself in about a minute." A release without a published SHA-256 is not
  installed. By hand: run the new installer and answer **Yes**.

**What the installer does on an update:** it stops and removes the container `sms-app`; copies
the install folder's `data` folder and `.env` files to `backups\pre_upgrade_<date>_<time>` (and,
with "Keep user data" ticked, to `backups\pre_upgrade_<version>`); deletes the old program files
except `data`, `backups`, `logs`, `config` and `.env`; and installs the new ones. As the database
of neither edition is in `data` (section 5), those copies do not hold it.

## 7. Uninstalling

Use **Settings** > **Apps** ("Student Management System" with the version) or the uninstaller
in the Start Menu group. For both editions it asks two questions:

1. "Do you want to remove Docker images?" (`sms-fullstack` and `postgres`).
2. "Do you want to delete all user data?" It lists the database (data folder), backups, logs and
   configuration files (`.env`). **Yes** deletes the folders `data`, `backups`, `logs` and
   `config` and the `.env` files; **No** keeps them.

It also removes the containers of SMS and, for the Docker edition, the task **SMS Update
Watcher**. Nothing in the uninstaller or in `UNINSTALL_SMS_MANUALLY.ps1` removes the Docker
volume `sms_data` (the database of the Docker edition) or `%LOCALAPPDATA%\SMS_Native_Lite_Simple`
(the data of Lite). Docker's `docker volume rm sms_data` removes the volume; not tried.

"Manual Uninstaller (for broken installations)" runs `UNINSTALL_SMS_MANUALLY.ps1` (administrator,
`C:\Program Files\SMS` only). It asks about the Docker images, then deletes the whole install
folder, `backups` and `config\.env` included, without asking about data.

## 8. Reaching it from another computer (Docker edition)

The container publishes port 8080. The application accepts the host names `localhost` and
`127.0.0.1` and those in `TRUSTED_HOSTS`, a comma-separated list (`backend/middleware_config.py`).
To use this computer's address from another computer, add it to `TRUSTED_HOSTS` in
`config\.env` and restart. Windows Firewall was not looked at.

## 9. When something goes wrong

- **"Docker is not available" or "Docker is installed but not running".** Start Docker Desktop
  (`DOCKER.ps1` also tries), then `.\DOCKER.ps1 -Start`.
- **"Completing Installation" ends with an error.** Read `DOCKER_INSTALL.log` and
  `DOCKER_INSTALL_WRAPPER.log` in the install folder; then `.\DOCKER.ps1 -Install`.
- **Port 8080 is in use, or the page does not load.** The script has the port fixed. Try
  `netstat -ano | findstr ":8080"`, `.\DOCKER.ps1 -Status`, `-Logs` and
  `http://localhost:8080/health`.
- **Starting over.** `-UpdateClean` rebuilds without the cache. `-DeepClean` asks "Continue?
  (yes/no)", removes the build cache, stopped containers, unused images and networks, and keeps
  the volumes.

## 10. What was never tried

- No installer was run and no wizard page was seen: sections 2, 6 and 7 are the `.iss` read. No
  install, update or uninstall, no Update from the Control Panel in either edition, and no run
  of the **SMS Update Watcher** task.
- Which database a new Docker install uses (section 2) and what the pre-update copy holds
  (section 6) rest on reading two scripts against each other.
- Windows Firewall (section 8) and `docker volume rm sms_data` (section 7).
- Other systems. The installer is for Windows. To start the application from the project files
  see [QUICK_START_GUIDE.md](../user/QUICK_START_GUIDE.md). `scripts/linux_env_check.sh` checks
  the prerequisites on Linux and the compose files are in `infra/docker/compose/`; nothing for
  Linux or macOS was tried. A QNAP NAS has its own guide,
  [QNAP_DEPLOYMENT_GUIDE_COMPLETE.md](../deployment/QNAP_DEPLOYMENT_GUIDE_COMPLETE.md).

More: [USER_GUIDE_COMPLETE.md](../user/USER_GUIDE_COMPLETE.md),
[LITE_EDITION_GUIDE.md](../deployment/LITE_EDITION_GUIDE.md),
[DOCKER_OPERATIONS.md](../deployment/DOCKER_OPERATIONS.md),
[GitHub issues](https://github.com/bs1gr/AUT_MIEEK_SMS/issues).
