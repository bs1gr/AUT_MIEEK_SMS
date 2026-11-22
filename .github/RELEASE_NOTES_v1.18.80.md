## What's New in v1.18.80

### 📊 What's Included in v1.18.80

- **Changing a course's teaching schedule shows what it does to absences first.** Absence limits are counted from the periods per week for the whole semester. When a save changes the periods per week, or a fail or participation limit, the Courses page now shows the totals before and after, and every student whose status would change. It saves only after you confirm.
- **A schedule changed in the middle of a semester keeps the weeks already taught.** When the periods per week change in a course that already has attendance, the page asks from which week the change applies. The weeks before keep the number of periods they were taught with: going from 2 to 3 periods in week 8 gives 35 periods in the semester, not 42. "It was wrong from the start" counts the whole semester with the new number, as before. Edit Course has a new "Periods in the semester" box, for a total the curriculum fixes.
- **Every change to a course is in the audit log,** with who made it and what was there before (Control Panel > Maintenance > Audit Log).
- **Attendance recorded where the schedule no longer has a lesson is shown again.** When a day lost a period, the absences already recorded in it are shown, marked "outside the schedule"; they always counted in the absence limits. In the calendar, a date on a weekday the course no longer has opens when attendance was recorded on it.
- **SMS Lite no longer stops under a page left in the background.** A page in the background now counts as open for up to 5 hours. When the last page is closed, SMS Lite stops 30 seconds later. Logout works as before.
- **The Updates panel explains a failed update in the page's language,** with the technical detail below it.
- **Docker: an update from the Control Panel finishes by itself from this version on.** The host task started the rebuild wrongly from a folder whose name has a space ("C:\Program Files\SMS"). **The update to this version still stops after installing:** start SMS from SMS Manager once. Later updates finish by themselves.
- **Database:** one new column, a course's "periods in the semester", added at the first start. It is empty for every course, so nothing changes until a schedule is changed from a given week on. An installation still on v1.18.79 keeps working with a database that has it.
- **Android app:** no change of its own; the APK is a new build with the new version number.
- **Checked before release:** the commit gate, CI and the E2E tests on every change; the full backend and frontend suites; an upgrade from v1.18.79 of SMS Lite (on the same profile) and of a PostgreSQL 14 database.

### 📦 Installation

**Windows:** Download `SMS_Installer_1.18.80.exe` from the assets below. The installer is signed by AUT MIEEK; Windows shows that name in the security prompt. **SMS Lite v1.18.79** can install it from Control Panel > Updates. **SMS Lite up to v1.18.78:** run this installer once by hand.

**Android:** Download `SMS_Android_1.18.80.apk` and open it on the phone; it updates the installed app and keeps its settings.

**Docker:**
```powershell
.\infra\scripts\dev\DOCKER.ps1 -Update
```
From the Control Panel, the update to v1.18.80 stops after installing: start SMS from SMS Manager once.

**Native (Development):**
```powershell
.\infra\scripts\dev\NATIVE.ps1 -Start
```

### 📚 Documentation

- **[CHANGELOG](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/CHANGELOG.md)** - Full list of changes in this release
- **[User Guide](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/docs/user/USER_GUIDE_COMPLETE.md)** - End-user documentation
