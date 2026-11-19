# Docker Operations Guide

**Read against `DOCKER.ps1`:** 19 November 2026, `main` after v1.18.74. Nothing was started,
stopped or built for this reading; the section "Updating to a new release" is older (v1.18.57)
and was tried then. The last section lists what was never tried.

This file was the guide of version 1.9.3 (December 2025). It described two containers
(`sms-backend`, `sms-frontend`), a script `SMART_SETUP.ps1` and a "Power Tab", none of which
exist any more. The earlier text is in the repository's history.

The guide is for the administrator of a Docker installation: the Docker edition that the
installer puts on a Windows PC, or a checkout of the repository. How the installer gets
there is in [INSTALLATION_GUIDE.md](../operations/INSTALLATION_GUIDE.md).

## 1. What runs

One script does everything on the host: `DOCKER.ps1`. In an installation it is in the
install folder (normally `C:\Program Files\SMS`); in the repository it is
`infra\scripts\dev\DOCKER.ps1`. With no option it starts the application.

| | |
|---|---|
| Image | `sms-fullstack:<version>`, built on this PC from `Dockerfile.fullstack` (the version is the `VERSION` file) |
| Container | `sms-app`, `--restart unless-stopped`: Docker starts it again with Docker Desktop, unless you stopped it |
| Address | `http://localhost:8080` (port 8080 of the PC to port 8000 in the container; the port is fixed in the script) |
| Data volume | Docker volume `sms_data`, at `/data` in the container |
| Settings | `config\.env`. The script makes it at the first run from `config\.env.example`, with a random `SECRET_KEY` and a random administrator password |
| Folders of the host the container sees | `backups` (at `/app/backups`), `templates` (read-only) and `data\.triggers` (the requests of the Control Panel's Update) |

The front end and the API are in the one image; there is no separate web server container.

**The database** is what `config\.env` says:

- *Local SQLite (what a new `config\.env` gets):* `DATABASE_ENGINE=sqlite`, the file
  `/data/student_management.db` in the volume `sms_data`.
- *PostgreSQL on another machine (the shared QNAP database):* `SMS_DATABASE_PROFILE=remote`,
  `DATABASE_ENGINE=postgresql` and the `POSTGRES_*` values; see
  [QNAP_POSTGRES_SINGLE_SOURCE.md](QNAP_POSTGRES_SINGLE_SOURCE.md). From v1.18.74 a new
  installation gets these from the installer's wizard.
- *PostgreSQL on this PC:* with `DATABASE_ENGINE=postgresql` and a `POSTGRES_HOST` that is
  empty, `localhost` or `postgres`, the script runs a second container, `sms-postgres`
  (`postgres:16-alpine`, volume `sms_postgres_data`), and connects the application to it.
  `POSTGRES_PASSWORD` has to be set.

The script refuses to start with a `SECRET_KEY` shorter than 32 characters or one that
holds a placeholder word such as "change" or "example".

There is one more layout, `SMS_DEPLOYMENT_MODE=split` with PostgreSQL: the script then uses
Docker Compose (`docker-compose.yml` with `docker-compose.prod.yml`, a `backend` and a
`frontend` service). Nothing sets it by itself; a new `config\.env` says `single`.

## 2. The options

Run them in PowerShell, in the folder of the script. `.\DOCKER.ps1 -Help` prints the list.

| Option | What it does |
|---|---|
| `-Install` | Checks PowerShell and Docker, makes `config\.env`, the folders `data`, `backups`, `logs` and the volume `sms_data`, and builds the image (5-10 minutes the first time). Then it asks "Start application now? (Y/n)". The installer runs it with `-Silent -NoShortcut`: no question, no start. |
| `-Start` (or nothing) | Builds the image if it is not there, runs the container, waits until it is healthy, prints the addresses and opens the browser. If it already runs: "SMS is already running!" |
| `-Stop` | Stops the container. |
| `-Restart` | `-Stop`, then `-Start`. |
| `-Status` | Container, state, health, ports, volume. "SMS is not running" if there is no container. |
| `-Logs` | Follows the container's log from its last 100 lines. Ctrl+C ends it. |
| `-Backup` | Copies the SQLite database to `backups\database` (section 4). |
| `-Update` | A backup as `-Backup` makes it, then stops and removes the container, builds the image again from the files that are there (with the build cache) and starts. |
| `-UpdateClean` | The same, after the cleanup of `-PruneAll`, with `--pull --no-cache`. |
| `-WithMonitoring` | Starts the application and then Grafana and Prometheus (section 6). |
| `-StopMonitoring` | Stops Grafana and Prometheus only. |
| `-Prune`, `-PruneAll`, `-DeepClean` | Cleanup (section 5). |

In an installation the shortcut **Student Management System** opens `SMS_Manager.exe`, a
console menu for the same things: 1) START container and open web app, 2) STOP, 3) RESTART,
4) CHECK container status, 5) VIEW container logs, 6) OPEN web app, Q) QUIT.

## 3. Is it up

```powershell
.\DOCKER.ps1 -Status
```

The application answers at three addresses without a sign-in:

- `http://localhost:8080/health`: JSON with `status`, `version` and `database`;
- `http://localhost:8080/health/live`: the process answers;
- `http://localhost:8080/health/ready`: it is ready for requests.

In the application, **System** > **Show System Health** says which database is in use.

When it does not come up:

- **"Docker is not available".** Start Docker Desktop (the script also tries), then run
  `-Start` again.
- **"Container stopped unexpectedly" or "Timeout waiting for application".** `.\DOCKER.ps1 -Logs`.
- **Port 8080 is in use.** `netstat -ano | findstr ":8080"` shows the process. The port is
  fixed in the script.
- **The installer's page "Completing Installation" ended with an error.** Read
  `DOCKER_INSTALL.log` and `DOCKER_INSTALL_WRAPPER.log` in the install folder, then run
  `.\DOCKER.ps1 -Install`.

## 4. Backups

**The application's own backup** is the one to rely on: every running server makes an
encrypted backup when its newest is older than 24 hours and keeps the newest 30. They are
under **System** > **Show Control Panel** > **Maintenance** > **System Operations** >
**Manage Backups**, and in `backups\database` of the install folder. Where the key is, how
to restore and what to copy off the machine:
[BACKUP_AND_RESTORE.md](../admin/BACKUP_AND_RESTORE.md). A backup without its key cannot be
read.

**`.\DOCKER.ps1 -Backup`** copies the SQLite file out of the container (or out of the volume
when the container is stopped) to `backups\database\sms_backup_<date>_<time>_<hash>.db` and
keeps the newest 10. `-Update` and `-UpdateClean` do the same first. With a PostgreSQL
database there is no such file: the script says "No database file found - skipping backup"
and goes on. Then the application's own backup is the only one this PC makes.

## 5. Cleaning up

These options call Docker's own cleanup, which is **not limited to SMS**: on a PC that also
runs other containers they remove those containers' leftovers too.

| Option | Removes |
|---|---|
| `-Prune` | every stopped container, dangling images, and build cache older than an hour |
| `-PruneAll` | the same, and unused networks |
| `-DeepClean` | asks "Continue? (yes/no)"; then stops and removes `sms-app`, and removes all build cache, every stopped container, every unused image and unused networks |

None of them removes a volume: the database in `sms_data` stays.

**Bringing SMS back.** Every cleanup ends by printing the two commands for it:

- `.\DOCKER.ps1 -Start` recreates the container and builds the image again if the cleanup
  removed it (5-10 minutes);
- `.\DOCKER.ps1 -Update` makes a backup, rebuilds the image from the version that is
  installed, and starts it. After a new installer has been run, this is the update to that
  version.

`-DeepClean` stops SMS to clean up. **If SMS was running before, it is rebuilt and started
again at the end** (since 19 November 2026; before, it stayed down and nothing said so).
`-Prune` and `-PruneAll` do not touch a running SMS container.

To remove the application's data as well, see section 7 of the
[installation guide](../operations/INSTALLATION_GUIDE.md): the uninstaller does not remove
the volume either.

## 6. Monitoring (optional)

`.\DOCKER.ps1 -WithMonitoring` starts the application and then the stack of
`docker-compose.monitoring.yml`: Grafana at `http://localhost:3000` (the script takes the
next free port if 3000 is in use, and prints it; `-GrafanaPort` sets another) and Prometheus
at `http://localhost:9090`. Grafana starts with the account `admin` / `admin`: change it
before anybody else can reach the port. `-StopMonitoring` stops the two; `-Stop` asks "Stop
monitoring stack too? (Y/n)" when they run.

## Updating to a new release

`DOCKER.ps1 -Update` and `-UpdateClean` rebuild the container from the files **already installed**;
they never download a newer release. A new release comes with its installer.

### From the Control Panel (v1.18.57 and later)

**Control Panel → Updates → Update on the host.** The installer registers a scheduled task on the
host, **SMS Update Watcher** (`scripts\update-watcher.ps1`). It starts at logon of the user who
installed SMS, with highest privileges, because the installer needs them. When asked from the
Control Panel, it:

1. reads the latest release and downloads `SMS_Installer_<version>.exe`;
2. installs it only if it matches the release's SHA-256 digest **and** is validly signed by
   AUT MIEEK;
3. runs it silently as the Docker edition (`/EDITION=docker`), then `DOCKER.ps1 -Update`.

The app is unavailable for a few minutes; the Updates tab keeps waiting and shows the result when
the app is back (`data\.triggers\update_status_<job>.json`, log: `logs\update-watcher.log`).
The container can only *ask* for an update: the task never runs anything taken from the request.

If the task is not running, the Update button is disabled and the tab says so. Check it with
`.\scripts\update-watcher.ps1 -Status`; register it again with `-Install` (as administrator) or by
re-running the installer.

### By hand

1. Run the new `SMS_Installer_<version>.exe` on the host; it keeps the Docker edition.
2. `.\DOCKER.ps1 -Update`

### From a checkout of the repository

```powershell
git pull
.\infra\scripts\dev\DOCKER.ps1 -Update        # or -UpdateClean
```

The cloud server does not use this script; its own steps are in
[CLOUD_HOST_ORACLE.md](CLOUD_HOST_ORACLE.md).

## What the container cannot do for itself

Starting, stopping, building and cleaning up are done on the host, with this script: the
container has no access to Docker. The one thing the Control Panel can set off on the host
is the update above, and only by leaving a request that the host's own task reads.

## What was never tried

- Nothing in sections 1 to 6 was run for this reading: they are `DOCKER.ps1` as its text
  stands, and the script itself was not run. The image it builds is built by CI on every
  change; it was last run on the project's PC in the smoke test before v1.18.73, started by
  the test's own commands and not by this script.
- The PostgreSQL container of this PC (`sms-postgres`), the `split` layout and the monitoring
  stack were not started.
- `-Prune`, `-PruneAll` and `-DeepClean` were not run against Docker; what they remove is read
  from the Docker commands in the script. The cleanup function itself was run with Docker
  replaced by stubs (`test_docker_cleanup_brings_sms_back.py`): the commands it gives, the
  message about bringing SMS back, and the start after `-DeepClean`.
- `-Backup` with a stopped container.

More: [INSTALLATION_GUIDE.md](../operations/INSTALLATION_GUIDE.md),
[BACKUP_AND_RESTORE.md](../admin/BACKUP_AND_RESTORE.md),
[QUICK_START_GUIDE.md](../user/QUICK_START_GUIDE.md),
[ARCHITECTURE.md](../development/ARCHITECTURE.md).
