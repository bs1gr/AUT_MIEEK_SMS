## What's New in v1.18.75

### 📊 What's Included in v1.18.75

- **Notifications say who sent them.** A message in the bell now reads "From …" with the sender's name, so a teacher's message to everyone no longer looks like an administrator's. An administrator who sends to specific users picks them from a list of the active accounts by name (it used to ask for account numbers that no page shows). A message to everyone leaves out an account that switched its in-app notifications off; the system's own notices, such as a failed backup, still reach everyone. A notification deleted in the bell is removed from the database 30 days later.
- **Search finds a letter typed as two characters.** A vowel followed by a separate accent mark (as some keyboards and pasted texts give it) is found like the single accented letter, in Greek and in other alphabets, on SQLite and on PostgreSQL.
- **The Updates tab of the Control Panel works in the Docker edition.** The update check answered "Request failed with status code 403" there, because the tab did not send the login token. It does now; so do its two other calls (start the update, ask its status).
- **Installer: the information pages are right for both editions and both languages.** SMS Lite's wizard no longer asks for Docker Desktop, and its last page says what really happens. The Docker edition's page says what the wizard does next (it builds the image and starts nothing). The English pages said "v1.18.30" for 44 releases and now carry the version of the installer. Thirty-six texts of the wizard and the uninstaller that were English in a Greek wizard are in both languages now.
- **Docker's cleanup no longer leaves SMS down.** `DOCKER.ps1 -DeepClean` rebuilds and starts SMS again at the end when it was running before, and each of the three cleanups (`-Prune`, `-PruneAll`, `-DeepClean`) prints the two commands that bring SMS back. The data volume is kept.
- **Documentation.** The Docker guide (`DOCKER_OPERATIONS.md`) and the installer's README are written anew from the scripts, and the installer's troubleshooting guide with them. The older installer notes say at their head that they are records of their day. **`MANUAL_CLEANUP_GUIDE.md` had a step, `docker system prune -a -f --volumes`, that deletes the Docker edition's database volume once the container is stopped; it is gone from it.**
- **Removed:** two Search endpoints that could never answer (`POST /search/students/full-text` and `POST /search/students/advanced` answered every request with an error; no page called them), an old unused copy of the search code and four other pieces of code nothing used.
- **Database:** no change. Records of students, courses, grades and attendance are not touched.
- **Android app:** the notification texts above.
- **Checked before release:** the commit gate and CI on every change; the full backend suite (1,964 tests passed, none failed) and the frontend suite; a smoke test on a scratch server that ran the same 23 checks against v1.18.74 (7 failed, exactly the things this release changes) and against this release (23 passed); the newest backup of the shared database restored into a scratch PostgreSQL and upgraded, equal to the live database.
- **Known, and not new:** the copy the installer makes before an update does not include the database.

### 📦 Installation

**Windows:** Download `SMS_Installer_1.18.75.exe` from the assets below. The installer is signed by AUT MIEEK; Windows shows that name in the security prompt.

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
