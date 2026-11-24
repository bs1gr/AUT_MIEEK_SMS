## What's New in v1.18.81

### 📊 What's Included in v1.18.81

**Final grades change in some courses.** Several corrections to how the final grade is worked out make it one figure on every page; a course is affected when what is listed below applies to it.

- **A retake of an exam.** For a Midterm or Final Exam grade, the Grading page has "Date the exam was taken" and "Retake (replaces the earlier sitting)". The retake counts in the final grade and the earlier sitting no longer does (the Grade History marks it "not counted"). **A retake of the final exam under 50 fails the course** whatever the final grade, which is still worked out and shown: the Grading page, the grade sheets (§) and Analytics say so. Without a retake mark, an exam counts its latest sitting, as before.
- **A Late counts as attended** in an Attendance rule too, as it already did in the absence limits. The number of Lates is shown where the teacher evaluates: the grade sheets, the Grading page's breakdown, Analytics and the absence limits.
- **Evaluation rules find their grades whatever the spelling** ("ΤΕΛΙΚΗ ΕΞΕΤΑΣΗ", «Εργαστήρια»): a lab is never homework, a presentation is no attendance, a final quiz or a final presentation is coursework, not the final exam. A course has one midterm and one final, each counting one grade. A "Continuous Assessment" («Συνεχής Αξιολόγηση») rule takes every graded task no other rule takes.
  - A rule typed «Παρουσία» in the course editor before this version was saved as Class Participation: type it again to make it the Attendance rule.
  - A course made from the ΜΙΕΕΚ templates and saved in the course editor before this version has its continuous assessment rule as "Homework/Assignments": type «Συνεχής Αξιολόγηση» again in that rule.
- **A course without evaluation rules** (or grades no rule takes) has a final grade from its grades: each counted as often as its Weight says, an exam once, less the course's absence penalty. It shows on every page.
- **"Average" figures until the Final Exam is graded.** The Students page, the Student Profile and the student report show each course's average while its Final Exam is not graded yet, and its real final grade ("Final grade") once it is. The overall figures count each course once.
- **Grade sheets** (Utils > Reports, the Grading page, Analytics): one assessment, the whole course (every assessment) and the category totals, on screen, as PDF and as Excel.
- **Analytics by category:** each student's categories across their courses against the class's, with strengths and difficulties.
- **Attendance:** an Excused day closes Rate as an Absent one does, and the ratings already saved for it are cleared. A semester file's statuses are stored as the pages write them ("late" is a Late). Every export names the statuses in the Attendance page's words.
- **Semester archive:** a student over the absence limit, or with a final exam retake under 50, is kept out of the archive (the preview says why), with all their records.
- **Smaller fixes:** editing a grade can move it to another category or rename it; a course import keeps a course's own rule names and every rule; Analytics opens for a student who is no longer active; Greek words written in capitals lose their accents, as Greek does.
- **Database:** one new column, a grade's retake mark, added at the first start; no grade is a retake until a teacher marks one. An installation still on v1.18.80 keeps working with a database that has it.
- **Updated components:** FastAPI 0.165, SQLAlchemy 2.1.9, pydantic 2.14.4, and the weekly batch of frontend packages.
- **Android app:** no change of its own; the APK is a new build with the new version number.
- **Checked before release:** the commit gate, CI and the E2E tests on every change; the full backend and frontend suites; an upgrade from v1.18.80 of SMS Lite (on the same profile) and of a PostgreSQL 14 database, with v1.18.80 run again on the upgraded database; every page as a teacher and as an administrator, in English and in Greek.

### 📦 Installation

**Windows:** Download `SMS_Installer_1.18.81.exe` from the assets below. The installer is signed by AUT MIEEK; Windows shows that name in the security prompt. **SMS Lite v1.18.79 or later** can install it from Control Panel > Updates. **SMS Lite up to v1.18.78:** run this installer once by hand.

**Android:** Download `SMS_Android_1.18.81.apk` and open it on the phone; it updates the installed app and keeps its settings.

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
