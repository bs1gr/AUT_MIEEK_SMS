## What's New in v1.18.82

### 📊 What's Included in v1.18.82

- **Semester Archive: fixed in v1.18.81.** The preview failed (an error, nothing listed) for any semester with a student over the absence limit or with a final exam retake under 50, so such a semester could be neither previewed nor archived.
- **A student who fails a course takes it again from the beginning.** The semester archive run now records a failed course in the student's Academic History as "Failed", with the reason (below the pass threshold, over the absence limit, a final exam retake under 50), and clears that course's grades, attendance and daily ratings, after the semester backup it makes; enrol the student in the course again for its next run. The preview lists them under "Will be recorded as failed". Grading still in progress, or a course without evaluation rules, is left as it was.
- **Analytics: PDF and Excel follow the filters on screen.** They covered every active student whatever the page showed. Now they say which class, division, course or student they cover, and carry the students and their strengths and difficulties by category (Excel: one sheet each, the figures as numbers), or the chosen student's courses and categories.
- **Custom reports:**
  - a report's saved sort applies (it never did), and one field can have several filters;
  - in the Report Builder a course is chosen by name, the categories are suggested, and "Save and download" saves the report and downloads its file in one step;
  - the CSV opens in Excel with Greek text intact;
  - the templates "Honor Roll", "Top Performers" and "At-Risk Students" filtered the average (0–100) as if it were 0–4: now 85 or more, and under 60; the stored copies are corrected unless someone changed them.
- **Utils → Reports** shows each page once: the grade sheets, my reports, the builder and the templates (the templates page has its own filters).
- **Grading page:** after a grade is saved, what you start typing for the next grade is no longer cleared when the page reloads the list.
- **Removed:** code no page used any more (an older Analytics page and 16 server functions nothing called).
- **Database:** two changes, made at the first start: the archive's record of a course can say why it failed (and counts failed courses per run), and the three report templates above get their new filters. An installation still on v1.18.81 keeps working with a database that has them, with one exception: once v1.18.82 saves a custom report, v1.18.81's list of custom reports answers with an error. **Update every installation that shares a database** (the cloud server included) together.
- **Android app:** no change of its own; the APK is a new build with the new version number.
- **Checked before release:** the commit gate, CI and the E2E tests on every change; the full backend and frontend suites; an upgrade from v1.18.81 of SMS Lite (on the same profile) and of a PostgreSQL 14 database, with v1.18.81 run again on the upgraded database; every page as a teacher and as an administrator, in English and in Greek.

### 📦 Installation

**Windows:** Download `SMS_Installer_1.18.82.exe` from the assets below. The installer is signed by AUT MIEEK; Windows shows that name in the security prompt. **SMS Lite v1.18.79 or later** can install it from Control Panel > Updates. **SMS Lite up to v1.18.78:** run this installer once by hand.

**Android:** Download `SMS_Android_1.18.82.apk` and open it on the phone; it updates the installed app and keeps its settings.

**Docker:**
```powershell
.\infra\scripts\dev\DOCKER.ps1 -Update
```
From v1.18.80 on, an update from the Control Panel finishes by itself.

**Native (Development):**
```powershell
.\infra\scripts\dev\NATIVE.ps1 -Start
```

### 📚 Documentation

- **[CHANGELOG](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/CHANGELOG.md)** - Full list of changes in this release
- **[User Guide](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/docs/user/USER_GUIDE_COMPLETE.md)** - End-user documentation
