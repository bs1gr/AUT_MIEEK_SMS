## What's New in v1.18.69

### 📊 What's Included in v1.18.69

- **Fixed: attendance stayed "pending sync" on a slow server.** The Attendance page now saves a whole sheet (every student and period of one course and day, with the day's performance scores) in one request. Before, it sent one request per student and period; on a server whose database is far away (the cloud host) that took longer than the app waits, a good connection was treated as "offline", and the sheet stayed in the queue.
- **Fixed: the queued sheet was sent again and again.** While a sheet was waiting, every refresh of the Attendance page sent it again, also while an earlier attempt was still running. It is now sent when the page opens, when the connection or the database comes back, and every 30 seconds, one attempt at a time. The same rule now applies to queued grades, student edits and lesson-log text.
- **Fixed: lesson-log text typed during a slow save was not saved.** If a save failed or timed out while you kept typing in "Material covered" or "Teacher's notes", only the first characters were sent. The rest is now sent right after.
- **Works with older servers.** The phone app can be newer than the server it talks to; with a server older than v1.18.69 it saves attendance the old way.
- **To benefit, update both sides:** the server (installer, Docker or cloud host) and the Android app.
- **Database:** no changes.
- **Checked before release:** the commit gate, CI and the full backend suite (1402 passed); a browser end-to-end test that marks a student present and confirms one request went out, the server accepted it and the row is in the database; and the packaged SMS Lite build. Not checked: the fix on the phone against the cloud host, which is where the problem was seen.

### 📦 Installation

**Windows:** Download `SMS_Installer_1.18.69.exe` from the assets below. The installer is signed by AUT MIEEK; Windows shows that name in the security prompt.

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


