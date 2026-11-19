# User Guide (version 1.9.7, replaced)

This file was the user guide of version 1.9.7 (December 2025). It described an earlier
application, and many of its names, steps and numbers no longer hold. The earlier text is in
the history of the repository.

**The current guide is [USER_GUIDE_COMPLETE.md](USER_GUIDE_COMPLETE.md)**, checked against the
application in November 2026. Its Greek version is [ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md](ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md).
For installing and starting the application see [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md).

## What changed

| Then (1.9.7) | Now |
|---|---|
| Navigation: Dashboard, Students, Courses, Attendance, Grades, Performance, Utils, Operations. | Nine entries: Dashboard, Search, Attendance, Grades, Students, Courses, Calendar, Utils, System. There is no Performance and no Operations entry. |
| "Universal Autosave": everything saves by itself. | Three places save by themselves: attendance (with the day's ratings and observations), the lesson log, and your own notes about a student. Everything else has a button: Save Changes, Save Grade, Add Student. |
| Student notes were kept in the browser (localStorage). | Notes are kept on the server, one set for each account. Only that account sees them. |
| Daily Performance: a rating from 1 to 5 and a multiplier for each category. | A rating from 0 to 10, in steps of 0.5, for each category that is rated by the day, with participation observations. A day's rating counts as one more grade of its category, with weight 1. There is no multiplier. |
| Absences: an absence penalty. | Absences are counted in periods against two limits for each course: over 30% of the scheduled periods the course is failed; over 10% Class Participation counts as 0. The absence penalty still exists (Add Course, Edit Course). |
| Administrator tools under Utils > Developer Tools and under Operations, including "Load Sample Data". | System > Control Panel > Maintenance: User Accounts, RBAC Configuration, Audit Log, Email Configuration, Import/Export, System Operations (backup, restore, clearing the database, semester archive), Database Management. There is no sample-data button. |
| Fine-grained RBAC with a wildcard permission, managed under "Admin > RBAC". | Two roles, Administrator and Teacher, and "No role" for an account that has none. Roles are managed under System > Control Panel > Maintenance > RBAC Configuration. The Administrator role keeps all permissions (`*:*`). Students have no accounts. |

## Still true, and not in the current guide

**The two merge strategies of a session import** (Utils > Export > Session Export/Import, for
administrators and teachers):

- **Update Existing:** update existing records and create new ones.
- **Skip Existing:** only create new records, skip existing ones.

**Grade tables.**

- Percentage to letter, as the server counts it for the Final Grade Summary and the
  Analytics: A+ 97-100, A 93-96, A- 90-92, B+ 87-89, B 83-86, B- 80-82, C+ 77-79, C 65-76,
  D 50-64, F 0-49. The letter column of two exports of one student (the grades in Excel and
  the student report in PDF) uses another scale for the lower grades: C 70-76, D 60-69, F 0-59.
- The GPA of a final grade is the percentage divided by 100 and multiplied by 4.
- Percentage to the Greek scale: percentage divided by 100 and multiplied by 20 (75% is
  15/20). The word shown with it: 18 and above Άριστα, 16 and above Λίαν Καλώς, 13 and above
  Καλώς, 10 and above Μέτρια, below 10 Ανεπιτυχώς. A final grade under 50% (10/20) fails the
  course.

**The API explorer.** The server shows its API at `/docs` (Swagger UI) and `/redoc` (ReDoc):
`http://localhost:8080/docs` when started with `DOCKER.ps1`, `http://localhost:8000/docs` when
started with `NATIVE.ps1`. The endpoints are under `/api/v1`.
