## What's New in v1.18.68

### 📊 What's Included in v1.18.68

- **New: download the lesson log as PDF or Excel.** In "Lesson log history" on the Attendance page, the PDF and Excel buttons give the material covered by date and teaching period. The teacher's notes are left out unless you tick "Include the teacher's notes".
- **New: each lesson-log entry shows who edited it last**, in the history and in both downloads. Entries saved before this version show no name.
- **New: the semester export and import carry the lesson log**, so it moves with the semester to another installation. Older export files still import.
- **Privacy: health information is no longer recorded.** It is off by default (`HEALTH_DATA_ENABLED`); while off, the app neither stores, imports, shows nor exports it. Where an institution switches it on, only administrators see it, in the student's Edit dialog.
- **Privacy: your notes about students are now saved to your account on the server** instead of in the browser. Notes still in a browser are moved the first time you open the Students page, then removed from the browser. Only your own account sees them.
- **Privacy: a Privacy notice page** (English and Greek) is linked from the footer of every page, including the sign-in screen. The institution's contact details come from four `PRIVACY_*` settings.
- **Privacy, for administrators:** the student's Edit dialog can download every record held about that student (to answer an access request) and can erase a student permanently after the registry number is typed.
- **Fixed: the Attendance course list appeared slowly.** It now lists the active courses at once.
- **Fixed: a tab left open during an update showed "Unknown error".** It now reloads itself, or shows "A new version is available" with a Reload button.
- **Cloud hosting:** files and a runbook for running the app on an Oracle cloud VM against the existing database, an arm64 image build, and three optional settings that cut database round trips for a far-away database. Home installs are unchanged.
- **Database:** two additive changes are applied automatically on the first start (the last editor of a lesson-log entry, and a table for staff notes). Older installs keep working against the same database.
- **Checked before release:** the commit gate, CI and browser end-to-end tests on every change; each feature in a real browser on a throwaway database upgraded from the previous version, in English and Greek at desktop and phone width; the full backend suite; and the packaged SMS Lite build.

### 📦 Installation

**Windows:** Download `SMS_Installer_1.18.68.exe` from the assets below. The installer is signed by AUT MIEEK; Windows shows that name in the security prompt.

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


