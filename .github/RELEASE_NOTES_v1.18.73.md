## What's New in v1.18.73

### 📊 What's Included in v1.18.73

- **The Search page does what it offers.** Sorting, the pages of a long result and the filters at the side did nothing. Now "Results per page", Previous and Next go through the result, and the count is of everything found, not of the first twenty. The list can be put in order of relevance, name, e-mail (students) or date (grades). The filters show how many records each value has, and a tick narrows the list. A grade in the list says whose it is, the mark and the day. When a search fails, the page says so in its own language, with a "Try again" button.
- **A Greek name is found however it is typed.** Capitals, accents and the final sigma no longer matter: "Παπαδόπουλος", "παπαδοπουλος" and "ΠΑΠΑΔΟΠΟΥΛΟΣ" find the same student. On SMS Lite, and on any other install that keeps its data in SQLite, a search for a Greek name used to find nothing at all; on PostgreSQL a surname stored in capitals was not found when typed in full.
- **Teachers can send a message to all users or to one role**, from Utils > Notifications. The server always let them; the page offered the form to administrators only. A message does not say who sent it, so sign it in the text if that matters.
- **The Students page says when its list could not be loaded**, with a "Try again" button. It used to say "No students found".
- **Notifications keep in step.** One marked as read or deleted changes the bell, the short list and the full list at once. An attempt to change another account's notification is refused as it should be; it used to end in a server error.
- **The Absence limits table fits a phone.** On a narrow screen each student is shown as a block; before, the last two columns, the status among them, were out of sight.
- **Fixed: the counts for the Search page's filters were given without a sign-in** (how many students are active, in each study year and enrolled in each year; no names). They need a sign-in now, like the search itself.
- **Fixed: five diagnostics endpoints for administrators answered with an error** on every server that requires a sign-in.
- **Fixed for SMS Lite:** at startup, when port 8000 is held by a program that does not answer, Lite is meant to stop that program. With the current system library that step failed without a word and Lite went on to start on the busy port.
- **Quieter logs.** One "slow query" line per slow statement, at one limit that a server far from its database can raise; `migrations.log` is written to `logs/` again; the query profiler keeps its newest 2,000 records instead of growing for as long as the server runs.
- **Documentation.** The two notification guides describe what the application does (they described a design that was never built).
- **Housekeeping:** six browser tests for things the application does not have, and four components that no page used, were removed.
- **Database:** no changes in this release.
- **Android app:** the Search page, the Students page's message and the form for teachers as above; nothing else changes.
- **Checked before release:** the commit gate and CI on every change, the full backend suite (1,739 passed, 0 failed), the frontend suite and the browser end-to-end tests (76, none switched off); and a smoke test of three editions, each as an administrator and as a teacher: the server from source on a first start, the Docker image on PostgreSQL 14 (and again after its container was replaced on the same data), and the packaged SMS Lite upgraded from v1.18.72 with its data. In each: 32 to 35 checks through the API, PDF and Excel exports with Greek text, and a pass through ten pages in a browser with every answer of the server and every line of the console watched. The same checks run against the released v1.18.72 build first: seven of them failed there, the seven things this release repairs. New in the release steps: the Docker image was built for amd64 and arm64 before the tag was made. Not checked: the installer was not installed, and the Android app was not run on a device.
- **Known, and not new:** the Import/Export page of the Control Panel does not load its history, and its export dialog does not work as offered, on a server that requires a sign-in. The exports under Utils > Export are another part of the application and work.

### 📦 Installation

**Windows:** Download `SMS_Installer_1.18.73.exe` from the assets below. The installer is signed by AUT MIEEK; Windows shows that name in the security prompt.

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


