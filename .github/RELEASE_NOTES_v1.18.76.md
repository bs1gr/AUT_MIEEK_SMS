## What's New in v1.18.76

### 📊 What's Included in v1.18.76

- **The Android app keeps you signed in.** Until now the app forgot the sign-in every time it was closed and about every 30 minutes, because its renewal never reached the server. It now renews at the server you chose and stays signed in for up to 30 days, like a browser. Signing out ends it on the server too. Browsers and SMS Lite are unchanged.
- **The Android app works with the phone's password manager.** After a typed sign-in, the phone offers to save the password (Google Password Manager, Samsung Pass, or the autofill service you chose). When the sign-in page opens, the phone's list of saved sign-ins appears, and one tap signs you in; a button "Sign in with a saved password" opens it again. The e-mail field is marked as the user name, so password managers keep e-mail and password together.
- **The server serves several requests at once.** 230 endpoints that never wait on anything now run in the server's worker threads, so one slow request no longer holds up everyone else. Measured with a database as slow as the cloud server's: with 20 requests at once, the health check waited at most 0.15 s instead of about 3.2 s.
- **A failure is answered with an error status.** Search, custom reports, import/export and dashboards answered some refusals and failures with "200 OK" and the error in the body; a client reading only the status took the failure for an answer (for example, the download of a missing report saved the error as a "PDF"). They now answer 404, 403, 409, 422 or 500 with the same body. The Search page and the import/export screens show the server's own message.
- **Rate limits on 51 more write endpoints.** The check that every write endpoint has a rate limit had never looked at `async` endpoints; 51 of them (roles, permissions, dashboards, custom reports, imports and exports, feedback, saved searches) had none. They have one now. The limits are per client and minute (500 writes, 200 heavy operations, 1,000 reads by default) and changeable in the Control Panel; ordinary use does not reach them.
- **SMS Lite's database enforces its links where it can.** On a clean SQLite database a record that others still point at can no longer be deleted and leave orphans behind (PostgreSQL always did this). A database that already has such rows keeps working as before, and the log names the tables.
- **Database:** no change. Records of students, courses, grades and attendance are not touched.
- **Android app:** the two items at the top; the APK is a new build.
- **Checked before release:** the commit gate and CI on every change; the full backend suite (1,991 tests passed, 43 skipped, none failed) and the frontend suite; the Android app on a phone with v1.18.75 (closed and reopened: back at the sign-in page, and the server never saw a renewal) and, with this release's code, in the Android emulator against a scratch server (closed and reopened: still signed in; after the access token ran out: renewed and went on; signed out: the server revoked the session). Saving and picking a real saved password could not be tried before release: the emulator has no password manager.
- **Known, and not new:** the copy the installer makes before an update does not include the database.

### 📦 Installation

**Windows:** Download `SMS_Installer_1.18.76.exe` from the assets below. The installer is signed by AUT MIEEK; Windows shows that name in the security prompt.

**Android:** Download `SMS_Android_1.18.76.apk` and open it on the phone; it updates the installed app and keeps its settings. Sign in once more after the update; from then on the app keeps the sign-in.

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
