## What's New in v1.18.70

### 📊 What's Included in v1.18.70

- **Security: the stay-signed-in token no longer works as a login.** The app keeps you signed in with a second, long-lived token (30 days) that is only meant for renewing your session. The server also accepted it wherever the normal 30-minute token is accepted, and signing out did not end that. It is now accepted for renewing the session only. Nothing changes in how you sign in or stay signed in.
- **One attendance mark per period and one rating per category, enforced by the database.** Saving the same daily rating twice used to store it twice, and the category averages then counted it twice. Saving a rating again now updates it, and two saves arriving at the same moment can no longer create a second row.
- **Fixed: the server wrote nothing to its log.** After starting, a server recorded no errors, no warnings and no request lines in `logs/app.log` (or in `docker logs`), in every edition. It logs again. If you ever had to diagnose a problem and found the log empty, this was why.
- **A quieter, safer log.** A refused sign-in (wrong password, locked account) is one line instead of a full error trace, and a save that is refused or retried no longer writes the database statement and its values into the log.
- **Old sign-in records are cleared.** Every sign-in and every session renewal left a row behind for good. Rows that can no longer be used are now removed when the server starts and once a day. Nobody is signed out by this.
- **For developers:** `NATIVE.ps1 -Start` shows which startup stage the backend is in, no longer restarts a stack that is already running, and keeps the development packages in step with `requirements.txt`.
- **Database:** one migration (`a7d4e9c2b5f8`), applied by itself at the first start. Where a period or a rating was stored more than once, it keeps one row (the newest rating) and hides the others; nothing is deleted. It then adds two unique indexes.
- **Android app:** no changes in this release beyond the version number. Updating the server is what matters.
- **Checked before release:** the commit gate, CI, the full backend suite (1489 passed, 0 failed) and the browser end-to-end tests; and a smoke test of three editions, each as an administrator and as a teacher: the server from source, the packaged SMS Lite upgraded from v1.18.69 with its data, and the Docker image on PostgreSQL 16 upgraded from a v1.18.69 database. In each: the upgrade itself (repeated rows hidden, sessions kept), about 30 API checks, PDF and Excel exports with Greek text, and a pass through the main pages in a browser. Not checked: the installer was not installed, and the Android app was not run on a device.

### 📦 Installation

**Windows:** Download `SMS_Installer_1.18.70.exe` from the assets below. The installer is signed by AUT MIEEK; Windows shows that name in the security prompt.

**Docker:**
```powershell
.\infra\scripts\dev\DOCKER.ps1 -Update
```

**Native (Development):**
```powershell
.\infra\scripts\dev\NATIVE.ps1 -Start
```

### 📚 Documentation

- **[CHANGELOG](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/CHANGELOG.md)** - Full list of changes in this release
- **[User Guide](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/docs/user/USER_GUIDE_COMPLETE.md)** - End-user documentation


