# Backups and restore: what the system does, and what stays the administrator's job

**Applies from**: v1.18.71
**Audience**: the administrator of an installation

Until v1.18.71 nothing made a backup on a schedule, although the in-app help said
"Automated backups happen daily". A backup existed when somebody asked for one. The same work
found that a backup of a PostgreSQL database could not be restored through the application at
all. Both are described under "What was wrong before" at the end.

## What happens by itself

Every running server makes its own backup of the database it uses:

- One minute after it starts, and then once an hour, it checks how old its newest automatic
  backup is. If there is none, or the newest is older than 24 hours, it makes one.
- The backup is encrypted and named `auto_backup_<date>_<time>.enc`.
- The newest 30 automatic backups are kept; older ones are deleted. **Backups somebody made by
  hand are never deleted by this.**
- A check by age, not at a fixed hour, on purpose: SMS Lite and a PC that is switched off at
  night are never up at "02:00", and a server that restarts often does not make a backup at
  every start.
- A test run, and a start with `DISABLE_STARTUP_TASKS`, make no backup.

Where to see it: **System → Control Panel → Maintenance → System Operations → Manage Backups**.
The box at the top says how often the server backs itself up, when it last did, and, if the
last attempt failed, why. Automatic backups carry the label "Automatic" in the list. In the
server log the lines start with `Automatic database backup` (`created`, `skipped` or
`FAILED`).

| Setting | Default | Meaning |
|---|---|---|
| `AUTO_BACKUP_ENABLED` | `true` | `false` switches the automatic backup off; the page and the log then say so |
| `AUTO_BACKUP_INTERVAL_HOURS` | `24` | how old the newest automatic backup may get |
| `AUTO_BACKUP_KEEP` | `30` | how many automatic backups are kept |
| `BACKUPS_DIR` | per edition, below | the folder that holds `database/` |
| `BACKUP_KEYS_DIR` | per edition, below | the folder that holds the key, `master.key` |

## Where the files are

Each server keeps its backups on the machine it runs on. Two servers on one shared database
(the cloud host and a PC) each make their own: two copies in two places, neither of them on the
machine that holds the database.

| Edition | Backups | Key (`master.key`) |
|---|---|---|
| Cloud host (`docker-compose.cloud.yml`) | volume `sms_cloud_data`: `/data/backups/database` | same volume: `/data/.keys` |
| Docker on a PC (`DOCKER.ps1`) | `backups\database` in the install folder (mounted as `/app/backups`) | volume `sms_data`: `/data/.keys` |
| SMS Lite (installed) | `backups\database` in the install folder | `%LOCALAPPDATA%\SMS_Native_Lite_Simple\local-secrets\backup-keys` |
| From source (`NATIVE.ps1`) | `backups/database` in the checkout | `src/.keys` in the checkout |

## What a backup contains

- **SQLite**: the whole database file, as one consistent snapshot.
- **PostgreSQL**: every row of every table as of one moment (a single snapshot, so a save that
  happens while the backup runs cannot leave a row without the row it points at), and the id
  counters. It does **not** contain the table definitions: the application builds those itself
  (Alembic migrations). The backup records which version of the definitions it was made at.
- Not in a backup: the key, the settings (`.env`), the saved mail settings.

## The key

An encrypted backup (`.enc`) opens only with the `master.key` of the installation that made it.
Without that key the file is unreadable, for everybody.

- Keep one copy of the key somewhere else than the backups (a USB stick, a password manager):
  a backup and its key in the same folder protect nothing, and a backup whose key is lost is
  worthless.
- A copy of a backup that is taken to another machine needs the key put into that machine's
  key folder before it can be restored there.

## Restoring

**In the application:** Manage Backups → **Restore** next to the backup → confirm. Restoring
replaces all current data with the data of that backup. It is done in one step on the server:
either everything is restored or nothing is changed, and the answer says which.

**After the database itself is lost** (the machine that held it is gone):

1. Set up an empty PostgreSQL database and point the application at it (same release as the
   one that made the backup). At its first start the application builds the tables; with
   `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD` set it also creates an administrator to
   log in with.
2. Make sure the backup is in the backups folder and its key in the key folder (table above).
   On the server that made the backup both are already there.
3. Log in, open Manage Backups, Restore. The accounts come back with everything else, so the
   next login is with an account from the backup.

This was run on 2026-11-16 on PostgreSQL 14 (the version of the shared database) with the
Docker image: database replaced by an empty one, restore, all rows back, new rows accepted.
The same day the first automatic backup of the shared database (30 tables, 2,265 rows) was
restored into a throwaway PostgreSQL 14 and compared with the live database: the same row
count and the same content checksum in every table.

**Limits to know:**

- A PostgreSQL backup restores into a database whose tables are at the **same version** as when
  the backup was made. After an update that changed the database, an older backup is refused
  with a message that names both versions; it restores with the release that made it. Make a
  backup right after such an update.
- A `pg_dump` script (the `backup_*.sql` / `.enc` files a Docker install made before this
  release, or one made by hand) creates the tables itself, so it only goes into an **empty**
  database. Into a database that has the tables the application refuses it and changes nothing.
- Use the same kind of PostgreSQL for a replacement database as the lost one was (the shared
  database runs a Debian-based server). An Alpine-based one sorts text differently under the
  same collation name: the data restores identically, but lists sorted by name come out in
  another order.

## What the system does not do

- **It does not take copies off the machine.** The backups of the cloud host are on the cloud
  host. Download one now and then (the Download button, or the commands in
  [the cloud runbook](../deployment/CLOUD_HOST_ORACLE.md#backups)) and keep it, with a copy of
  the key, somewhere else.
- **It does not test a restore.** Do one on a scratch database after each update that changes
  the database.
- **It does not clean older backups of what was removed later.** Backups and archives made
  before 2026-11-13 may still contain health text
  ([PRIVACY_AND_GDPR.md](PRIVACY_AND_GDPR.md)).

## What was wrong before

Found on 2026-11-16 while the automatic backup was built and its restore was tried:

- **Nothing was scheduled.** The help text was the only place a daily backup existed.
- **The key was kept next to the code.** In a Docker container that is the container's own
  layer, which an update throws away: after any update, every encrypted backup made before it
  failed with "Failed to decrypt backup:" and nothing after the colon. On the cloud host the
  backups themselves were inside the container as well. In SMS Lite it is the program folder.
  A Docker install that made encrypted backups with an earlier release has the key only inside
  its current container: copy it out **before** updating
  (`scripts/recover_master_key_from_docker.ps1`), and put it into `/data/.keys` afterwards.
- **A PostgreSQL backup made where `pg_dump` is installed (the Docker editions, the cloud host)
  could not be restored into the database it came from.** Restore answered "success", restored
  nothing, and moved every id counter back, so the next new row collided with an existing one.
  The application now writes its own data-only format on every edition, and a script that
  `psql` cannot apply is refused as a whole.
- **From the page, an encrypted PostgreSQL backup could not be restored at all**: it was
  decrypted into the browser and uploaded again, and the upload accepts SQLite files only.
- The "Backup Database" button was disabled after any health check, on every edition.
- **An encrypted backup of a SQLite database left its readable copy beside it on Windows**
  (builds up to v1.18.70). If the backups folder has a `backup_….db` file with the same name
  as a `backup_….enc`, delete the `.db` file: nothing removes it for you.
