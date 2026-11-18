# Quick Start Guide

This guide starts the application from the project files: the Docker edition, and the
developer mode. To use the application once it runs, read
[USER_GUIDE_COMPLETE.md](USER_GUIDE_COMPLETE.md).

**End users install with the Windows installer.** Download `SMS_Installer_<version>.exe` from
the [latest release](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/latest) on the project's
GitHub page, run it as administrator and choose an edition: the Lite edition (`SMS_Lite.exe`,
standalone, no Docker) or the Docker edition (Docker Desktop required). See the
[README](../../README.md) and the [Lite edition guide](../deployment/LITE_EDITION_GUIDE.md).
The rest of this page is for starting the application from the project files.

**Read against the scripts:** 18 November 2026, `main` after v1.18.73 (`DOCKER.ps1`,
`NATIVE.ps1` and the code that creates the first administrator). The commands were not run for
this reading.

---

## Two modes

| Mode | Script | Ports | Use for |
|---|---|---|---|
| Docker | `.\infra\scripts\dev\DOCKER.ps1 -Start` | 8080 | Production |
| Native | `.\infra\scripts\dev\NATIVE.ps1 -Start` | 8000 and 5173 | Development and testing |

These are the only two ways to start the application from the project files. The older
scripts (`RUN.ps1`, `SMS.ps1`, `INSTALL.ps1`, `SMART_SETUP.ps1`) no longer exist.

## Where the scripts are

Get the project files by cloning the repository
(`git clone https://github.com/bs1gr/AUT_MIEEK_SMS.git`) or by downloading its ZIP from GitHub
and extracting it. In that folder the two scripts are in `infra\scripts\dev\`. There is no
`DOCKER.ps1` and no `NATIVE.ps1` in the top folder.

The installer copies the scripts to the installation folder, so in an installed copy you run
`.\DOCKER.ps1` and `.\NATIVE.ps1` there. The commands below are written for a project folder:
open PowerShell in it.

## Prerequisites

**Docker mode**

- Windows, with Docker Desktop installed. The script stops with a message if Docker is not
  available, and `-Install` warns if Docker is older than 20.10.0.
- PowerShell 5.1 or newer (the script's minimum).
- Python and Node.js are not needed on the computer: the image is built inside Docker.

**Native mode**

- Python 3.13 or newer (`pyproject.toml` asks for it).
- Node.js 20.19 or newer, or 22.12 or newer (the version of Vite in use declares that range).
  The script's own check is lower (Python 3.11, Node.js 18), so it can start with versions
  that are too old for the project.

## Docker mode

First time:

```powershell
.\infra\scripts\dev\DOCKER.ps1 -Install
```

`-Install` checks PowerShell and Docker, creates `config\.env` if it is missing (see
"Signing in for the first time"), creates the folders `data`, `data\.triggers`, `backups` and
`logs`, creates the Docker volume `sms_data`, builds the image (the script says it may take 5 to
10 minutes) and makes a desktop shortcut. At the end it asks "Start application now? (Y/n)".

Every time:

```powershell
.\infra\scripts\dev\DOCKER.ps1 -Start
```

`-Start` also creates `config\.env` if it is missing and builds the image if there is none, so
on a first run it is enough on its own. When the application answers, the script prints, among
other lines:

```text
SMS is now running!

  Web Interface:  http://localhost:8080
  API Docs:       http://localhost:8080/docs
  Health Check:   http://localhost:8080/health
```

Open `http://localhost:8080`.

## Signing in for the first time

In Docker mode and in native mode there is no ready-made administrator account. The scripts
make the settings for one, with a password that is generated on the computer, and print it.

- **Docker mode.** When `DOCKER.ps1` creates `config\.env`, it takes the template
  `config\.env.example`, puts a random `SECRET_KEY` and a random administrator password in it,
  and prints "Initial admin login", then the e-mail address and the password. The template's
  e-mail address is `admin@example.com`. If `config\.env` already exists, the administrator is
  the one named by `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD` in it.
- **Native mode.** When `src\backend\.env` is missing, `NATIVE.ps1 -Setup` makes it the same
  way and prints "Initial admin login".

The administrator account is made when the application starts for the first time on a database
that has no accounts. Changing `DEFAULT_ADMIN_PASSWORD` in the file afterwards does not change
an account that exists, unless `DEFAULT_ADMIN_FORCE_RESET` or `DEFAULT_ADMIN_AUTO_RESET` is
switched on.

Sign in on the first page with that e-mail address and password. The first sign-in of this
account asks for a new password, and nothing else opens until it is changed. Afterwards every
account, an administrator's too, changes its own password under **System** > **Control Panel** >
**Maintenance** > **User Accounts**, in the form "Change Your Password". An administrator sets a
new password for another account there with **Reset password**.

**Creating another administrator** in a database that already has accounts:

```powershell
docker exec -it sms-app python -m backend.db.cli.admin --email someone@example.com
```

The command asks for the password. In native mode run `python -m backend.db.cli.admin` the same
way, with the backend's virtual environment (`src\backend\.venv`) and the `src` folder on
`PYTHONPATH`, as `NATIVE.ps1` sets it for the backend. If the e-mail address is already in use,
the command says so and creates nothing.

**"Access Denied" in the Control Panel** means that the account is not an administrator. Sign in
with an administrator account. If you cannot sign in at all: a wrong e-mail address or password
answers "Invalid email or password" (after several tries the account is locked for a while),
and an account that was only registered waits for an administrator's approval.

## Native mode

First time (installs the Python and Node.js packages, and makes `src\backend\.env` as described
above):

```powershell
.\infra\scripts\dev\NATIVE.ps1 -Setup
```

Every time:

```powershell
.\infra\scripts\dev\NATIVE.ps1 -Start
```

The script waits until the services answer, then prints, among other lines:

```text
  Backend:  http://localhost:8000
  Frontend: http://localhost:5173
  API Docs: http://localhost:8000/docs
```

Open `http://localhost:5173`. The backend and the frontend reload when you change the code.

## Commands

```powershell
# Docker
.\infra\scripts\dev\DOCKER.ps1 -Start        # start
.\infra\scripts\dev\DOCKER.ps1 -Stop         # stop
.\infra\scripts\dev\DOCKER.ps1 -Restart      # restart
.\infra\scripts\dev\DOCKER.ps1 -Status       # is it running
.\infra\scripts\dev\DOCKER.ps1 -Logs         # follow the logs
.\infra\scripts\dev\DOCKER.ps1 -Update       # rebuild with the cache, with a backup
.\infra\scripts\dev\DOCKER.ps1 -UpdateClean  # rebuild without the cache, with a backup
.\infra\scripts\dev\DOCKER.ps1 -Backup       # make a database backup by hand
.\infra\scripts\dev\DOCKER.ps1 -Help         # all commands

# Native
.\infra\scripts\dev\NATIVE.ps1 -Start        # backend and frontend
.\infra\scripts\dev\NATIVE.ps1 -Backend      # backend only
.\infra\scripts\dev\NATIVE.ps1 -Frontend     # frontend only
.\infra\scripts\dev\NATIVE.ps1 -Stop         # stop all native processes
.\infra\scripts\dev\NATIVE.ps1 -Status       # what is running
.\infra\scripts\dev\NATIVE.ps1 -Help         # all commands
```

`DOCKER.ps1` without a command does the same as `-Start`.

## What `DOCKER.ps1 -Start` does

It checks that Docker is available, makes `config\.env` if it is missing, builds the image
`sms-fullstack` if there is none, starts one container, `sms-app` (port 8080 of the computer to
port 8000 of the container, the volume `sms_data` as the container's `/data`, the settings of
`config\.env`), waits until the container is healthy and prints the addresses.

This is the case unless `SMS_DEPLOYMENT_MODE` in `config\.env` is `split` with a PostgreSQL
database. Only then does the script use Docker Compose, with the files in
`infra\docker\compose\`, and it requires `DATABASE_ENGINE=postgresql`. There is no Compose
file in the top folder of the project, so `docker compose up -d --build` typed there finds
nothing. Use the script.

## Troubleshooting

**"Python not found" or "Node.js not found".** Install Python 3.13 or newer from
[python.org](https://www.python.org/downloads/) and Node.js (see Prerequisites) from
[nodejs.org](https://nodejs.org/), open a new PowerShell window, and check
`python --version` and `node --version`.

**Port 8080 is already in use (Docker).**

```powershell
netstat -ano | findstr ":8080"
.\infra\scripts\dev\DOCKER.ps1 -Stop
```

**Port 8000 is busy (native).** `NATIVE.ps1` uses only port 8000 for the backend. Run
`.\infra\scripts\dev\NATIVE.ps1 -Stop` and start again, or free port 8000 by hand.

**Which address?** With Docker use `http://localhost:8080`; with native mode use
`http://localhost:5173`. `-Status` of the script you started tells you what is running.

**Starting fresh.** `.\infra\scripts\dev\DOCKER.ps1 -UpdateClean` rebuilds the image without the
cache and makes a backup first. `.\infra\scripts\dev\DOCKER.ps1 -DeepClean` asks "Continue?
(yes/no)" and then removes the Docker build cache, the stopped containers, the unused images and
the unused networks. It keeps the volumes: the script says that the volume `sms_data` "contains
your data" and is preserved. After a `-DeepClean` the next `-Start` builds the image again.

## Linux

`scripts/linux_env_check.sh` checks the prerequisites; `--fix` applies safe fixes (it creates
folders and copies `.env` files from `.env.example`).

## More help

- Problems with a fresh installation:
  [FRESH_DEPLOYMENT_TROUBLESHOOTING.md](../operations/FRESH_DEPLOYMENT_TROUBLESHOOTING.md)
- The pages of the application: [USER_GUIDE_COMPLETE.md](USER_GUIDE_COMPLETE.md)
- The Greek quick start: [ΓΡΗΓΟΡΗ_ΕΚΚΙΝΗΣΗ.md](ΓΡΗΓΟΡΗ_ΕΚΚΙΝΗΣΗ.md)
- Problems and requests: [GitHub issues](https://github.com/bs1gr/AUT_MIEEK_SMS/issues)
