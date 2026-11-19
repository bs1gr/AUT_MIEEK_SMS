## What's New in v1.18.74

### 📊 What's Included in v1.18.74

- **Read this first: accounts have two roles now, Administrator and Teacher.** "Student", "Viewer" and "Guest" are gone. At its first start this version turns every account that had one of them into **No role**: it can still sign in, a line at the top of every page tells it why nothing opens, and an administrator can make it a Teacher under Control Panel > Maintenance > User Accounts. An account that also held the Teacher or Administrator role keeps that role.
- **Fixed: four ways an account kept, or got, access it should not have had.** An account changed to "Student" went on working as before. Pressing Save in User Accounts, with nothing changed, could turn an administrator into a teacher. Revoking an account's only role took nothing away. On SMS Lite and other SQLite installations, a deleted account's roles passed to the next account that was created. The administrator's full access can no longer be taken away by mistake.
- **A mark on the Attendance page is no longer lost on a slow connection.** A mark made while the day's records were still arriving, while an earlier mark was being saved, or just before another day, course or page was chosen, could vanish without a word. It is kept and saved now.
- **Clear on the Attendance page takes saved marks off.** It used to empty the page, and two seconds later the marks were back. Clear for the whole class asks first when saved marks are among them. In Greek the button read "Άκυρο"; it reads "Εκκαθάριση".
- **The Weight of a grade counts.** Within its category a grade counts as often as its Weight says. The number used to be stored and never read. A final grade changes only where one category holds grades of different weights.
- **Teachers can do more.** They import students and courses from a file (Utils > Imports), export and import a semester's session file (Utils > Export), and change their own password (Control Panel > Maintenance > User Accounts). Returning the whole database to a backup stays with the administrator.
- **The audit log says who did it.** Every change of an account, a role or a permission leaves an entry with its author, and Control Panel > Maintenance > Audit Log shows them to administrators. Before, no entry had an author and most changes left none.
- **The Import/Export panel of the Control Panel works.** Export Data makes a file of students, courses, grades or attendance as Excel, CSV or PDF. The import wizard checks a file, shows what is wrong with it row by row, and stores it only when asked to and only when nothing is wrong. Before, the panel's requests were refused, an export was an Excel file whatever was asked for, and the wizard stored nothing.
- **An import knows a grade by its category.** The same assignment under two categories is two grades: a session file or a grades file no longer makes one of them overwrite the other.
- **Installer.** The database chosen in the Docker wizard reaches a new installation (it was ignored, and a new installation ran on its own database whatever was chosen). An installation that already runs keeps its database and is told when the wizard was given another. The uninstaller's question says what it deletes and that the database is not among it. Both questions are in Greek too.
- **The pages say more of what they do.** The sign-in form's messages are in the page's language. The Permissions Catalog can grant a permission to a role and revoke it. The help's answers (Utils > Help & Documentation) and its one-page Quick Guide were read against the pages and corrected.
- **Documentation.** The user guide in English and Greek, the permission guides, the installation guide and twenty-three older guides now describe what the application does. Several described designs that were never built.
- **Database:** three small changes, made by themselves at the first start: the accounts and roles as described above; the Teacher role gets the permission for the session file; and on SQLite a permission's key becomes unique, as it already was on PostgreSQL. Records of students, courses, grades and attendance are not touched. Make a backup before updating, as always.
- **Android app:** the Attendance page (marks kept, Clear), the grade's Weight, the account pages and the Import/Export panel as above.
- **Checked before release:** the commit gate and CI on every change, the full backend suite (1,940 tests passed, 43 skipped by their own gates, none failed), the frontend suite (2,135 tests) and the browser end-to-end tests (77, none switched off). A smoke test of three editions, each as an administrator and as a teacher: the server from source on a first start; the server on PostgreSQL 14 upgraded from a database that v1.18.73 had made (the three database changes ran, the Student accounts became "No role", every record was still there); and the packaged SMS Lite upgraded from v1.18.73 with its data. In each: 45 to 48 checks through the API, the packaged-edition check, and ten pages in a browser with every answer of the server and every line of the console watched. The same checks were run against the released v1.18.73 first: eleven of them failed there, the things this release changes. Not checked: the installer was not installed (its script was compiled, its wizard and uninstaller were not run); the Docker image was built by CI and was not run on a PC this time; the Android app was not run on a device.
- **Known, and not new:** the copy the installer makes before an update does not include the database. A phone app newer than its server: on a server older than v1.18.74, Clear on the Attendance page still does nothing lasting.

### 📦 Installation

**Windows:** Download `SMS_Installer_1.18.74.exe` from the assets below. The installer is signed by AUT MIEEK; Windows shows that name in the security prompt.

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
