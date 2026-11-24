# User Guide - Student Management System

**Version:** 1.18.81
**Checked against the application:** 17 November 2026. Every page named here was opened in
a running copy as a teacher and as an administrator, and each window and form was opened and
read. Where something does not work, the guide says so. What sections 7 and 8 say about how
grades count was tried with grades on 18 November 2026.

This guide is for the people who use the pages: teachers first, administrators second. It
replaces a text of 1,560 lines that described the application as it was planned in 2025,
with pages, settings and shortcuts that were never built.

**Other guides**

| For | Read |
|---|---|
| This guide in Greek | [ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md](ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md) |
| Notifications and messages | [NOTIFICATIONS_USER_GUIDE.md](NOTIFICATIONS_USER_GUIDE.md) |
| Accounts, roles, permissions (administrators) | [../admin/RBAC_ADMIN_GUIDE.md](../admin/RBAC_ADMIN_GUIDE.md), [../admin/PERMISSION_MATRIX.md](../admin/PERMISSION_MATRIX.md) |
| Backups and restoring (administrators) | [../admin/BACKUP_AND_RESTORE.md](../admin/BACKUP_AND_RESTORE.md) |
| Personal data | [../admin/PRIVACY_AND_GDPR.md](../admin/PRIVACY_AND_GDPR.md) |
| Installing the application | [../operations/INSTALLATION_GUIDE.md](../operations/INSTALLATION_GUIDE.md) (read against the installer's script on 18 November 2026; nothing was installed for it) |

---

## Contents

1. [Signing in](#1-signing-in)
2. [The page](#2-the-page)
3. [Dashboard](#3-dashboard)
4. [Students](#4-students)
5. [Courses](#5-courses)
6. [Attendance](#6-attendance)
7. [Grades](#7-grades)
8. [Absences and the final grade](#8-absences-and-the-final-grade)
9. [Calendar](#9-calendar)
10. [Search](#10-search)
11. [Utils](#11-utils)
12. [Analytics](#12-analytics)
13. [System](#13-system)
14. [What an account may do](#14-what-an-account-may-do)
15. [What the application does not have](#15-what-the-application-does-not-have)
16. [When something goes wrong](#16-when-something-goes-wrong)

---

## 1. Signing in

The first page asks for **Email** and **Password**, then **Login**. A wrong address or
password answers "Invalid email or password". After several wrong tries the account is locked
for a while; an administrator's password reset unlocks it.

**Asking for an account.** Under "Need an account to access the system?", **Request access**
opens a form: Email, Password, Full name (optional), **Register**. The password needs at
least 8 characters, with an uppercase and a lowercase letter, a number and a symbol, and no
spaces. The account is a teacher's account and cannot sign in until an administrator approves
it. (An installation can switch registration off, or let new accounts in at once.)

**A new administrator** of a fresh installation has to change the password before anything
else opens.

**Signing out** is the button with the power sign at the top right.

**Changing your password.** Under System > Control Panel > Maintenance > User Accounts, in
the form "Change Your Password": the current password, the new one twice, then **Update
password**. Every account has the form. The new password needs at least 8 characters, with
an uppercase and a lowercase letter, a number and a symbol, and no spaces. If you forgot your
password, an administrator sets a new one (User Accounts > Reset password).

## 2. The page

Every page has the same frame.

- **Top right:** the bell with the number of unread notifications, and the language switch
  (**EN** / **ΕΛ**). Every page exists in English and in Greek; the choice is remembered on
  the device.
- **The navigation:** Dashboard, Search, Attendance, Grades, Students, Courses, Calendar,
  Utils, System. Every account sees all nine.
- **Send Feedback**, at the right edge: a box for a suggestion or a problem. What is sent
  reaches the feedback inbox of the administrators and teachers (Utils > Notifications).
- **The foot of the page:** the version, and **Privacy notice**, which says what personal
  data the application holds.

The bell and what arrives there are described in
[NOTIFICATIONS_USER_GUIDE.md](NOTIFICATIONS_USER_GUIDE.md).

## 3. Dashboard

The Dashboard has two views, **Overview** and **Analytics** (the second is the page of
section 12).

The Overview shows, from top to bottom:

- **Four counts:** Total Students (and how many are active), Active Courses (those with
  enrolments), Avg Class Size, Enrollment Rate.
- **Three figures:** the average final grade with the pass rate, attendance (Present and Late
  count as attended), and grading progress (enrolments with something graded, of all).
- **Top Performing Students:** active students with something graded, in order of final
  grade, of attendance or of exams.
- **Active Courses**, each with its evaluation rules.
- **Export Grades** and **Export Courses**, on those two cards, download files.
- **Students Needing Attention:** a student who is failing a course (final grade under 50%),
  has lost Class Participation (absences over 10%), or is near or over the 30% absence limit.
  Each line says which. **Open Analytics** leads to the details.
- **Attendance Not Recorded:** teaching days of the last week, by the courses' schedules,
  with no attendance entered. The application does not know holidays, so a day off can
  appear here. Courses without a teaching schedule cannot be checked, and the card says how
  many there are.
- **Year of Study Analytics** and **System Information** (counts of students, courses,
  configured courses, enrolments).

## 4. Students

The page lists the active students as cards, with their number: "Active Students (14)".

**Finding a student.** The search box narrows the list as you type. Two boxes filter by
**Academic Year** and **Class Division**; **Sort by** orders by name, class division or
academic year.

**Add Student** opens a window:

| Field | |
|---|---|
| Student ID | required, and unique |
| First Name, Last Name | required |
| Email Address | required |
| Phone Number, Address, Date of Birth, Enrollment Date | optional |
| Academic Year | Class A or Class B |
| Class Division | free text |

An empty form answers with what is missing ("Student ID is required", ...).

**On each card:**

- **View Profile** opens the student's page (below).
- **View Performance** opens a report in a window: the average grade as a percentage, on
  the Greek scale of 0 to 20 and as a letter; absences; a breakdown by course and by
  category with every graded assignment; attendance figures; the past grades and attendance
  by date; and **Notes**. The notes are your own: only your account sees them.
- **Edit** opens the same fields without the Student ID, which cannot be changed, and a
  box **Active**; **Save Changes** stores them.
- **Delete** asks "Are you sure you want to delete this student?".

**The student's page** (View Profile) shows the overall GPA, the average, attendance and the
number of highlights; the distribution of grades; **Recent Highlights** with **Add
Highlight** (a category, a rating from 0 to 10, a text; some ready-made texts); the
**Outlook**; the enrolled courses, each with **View Breakdown** (the final grade so far and
what each category contributes); the recent grades; and attendance, for all courses or one.

The Outlook is an estimate from the grades and attendance recorded so far: a risk level, the
trend, a forecast and a projection of the final grade. It needs at least three dated grades
and three attendance records, and it says itself that it should be checked against the real
assessments.

If the list cannot be loaded, the page says so and offers to try again.

## 5. Courses

**Add Course** opens a window: Course Code, Course Name, Description, Semester (Spring
Semester, Winter Semester, Academic Year, School Year or Custom, with the year), Credits,
Instructor, and "Absence penalty (points per absence)".

**A new course is inactive.** It becomes active when students are enrolled in it. An
inactive course is not offered on the Attendance and Grades pages. When a course is over,
mark it as ended on the Calendar page.

**Setting a course up.** Choose it under "Select Course to Configure". **Edit Course** and
**Delete** appear, and three tabs.

### Evaluation Rules

The rules say what the final grade is made of. Each rule is a **Category Name**, a
**Weight** in per cent and an optional description; **Add Rule** adds a line. The page adds
up the **Total Weight**: make it 100%. **Save Changes** stores the rules.

The categories the Grades page knows are Midterm Exam, Final Exam, Quizzes, Lab Work,
Homework, Project, Class Participation and Continuous Assessment.

A rule takes the grades of its category by the category's words: accents, capitals, a plural
and a hyphen do not matter, so "Εργαστήρια" takes the Lab Work grades, "ΤΕΛΙΚΗ ΕΞΕΤΑΣΗ" the
Final Exam grades and "Mid-Term Exam" the Midterm Exam grades. When a name holds the words of
several categories, the first of these wins: continuous assessment, a project, a lab, homework,
a quiz, participation, a presentation, the midterm, the final, attendance ("Παρουσία στο
Εργαστήριο" is a lab, "Εργασίες και Συμμετοχή" homework; "Τελική Εργασία" is homework, "Final
Project" a project, "Final Quiz" a quiz and "Τελική Παρουσίαση" a presentation: coursework, not
the final exam). A name that
is one of the app's categories in either language, as the app names it or in a common spelling
("Εργαστήρια", "Παρουσίες", "Τελική Εξέταση"), is saved as that category; any other name is kept
as typed and read by its words: "Εργαστ. Ασκήσεις" takes the Lab Work grades (a lab is never
homework), "Παρουσία και Συμμετοχή" is Class Participation, "1η Ενδιάμεση Εξέταση" the Midterm
Exam. A course's own name (say "Θεωρητική Εξέταση") takes the grades of that name, whatever the
accents and capitals. Saving a course never changes what its rules count.

A course has one midterm and one final: each counts one grade only, whatever its rules are
called. That is the **retake** when one of the grades is marked as the retake (section 7): it
replaces the earlier sitting, which no longer counts, whatever the dates. Without a retake it is
the latest sitting: the grade with the latest date (the day the exam was taken), then the one
entered last. A retake of the final exam under 50 fails the course whatever the final grade
(section 8); a midterm retake only replaces the first sitting. (Until November 2026 nothing told
a retake: a second sitting counted only by being dated later.) A rule with the word "Συνεχής" or "Continuous" in its name (Continuous
Assessment), with anything in brackets as in the ΜΙΕΕΚ templates, takes every graded activity of
the course that no other rule of the course takes: homework, exercises, quizzes, projects,
presentations, lab work, a course's own names, the grades filed under it, and their daily
ratings. Not Class Participation or attendance, and not a grade saved without a category. The
midterm and the final have rules of their own; where a course has none for one of them (the lab
templates, whose midterm is part of "Συνεχής Αξιολόγηση (… και Ενδιάμεση Εξέταση)"), that exam's
one grade counts in continuous assessment. In a course without a continuous assessment rule, a
grade that no rule takes counts nowhere. (Until November 2026 the templates' "Συνεχής Αξιολόγηση (Εκπόνηση
εργασιών στο σπίτι)" took the homework alone, and the course editor saved both template rules as
"Homework/Assignments": in a template course saved in the editor before then, type the rule's name again, say
"Συνεχής Αξιολόγηση", to make it the continuous assessment rule.)

The **Category Name** suggestions also offer **Attendance** (in Greek "Παρουσία"; a rule named
"Παρουσίες" or "Ποσοστό Παρουσίας" is the Attendance rule too): a rule with no grades of its own,
which counts the share of periods attended (section 8). Until November 2026 a rule typed
"Παρουσία" was saved as Class Participation and shows as such: type "Παρουσία" again on the rule
that was meant to count attendance, to make it the Attendance rule.

Two more things are set here:

- **Absence limits (ΜΙΕΕΚ):** the fail limit and the Class Participation limit, each as a
  percentage of the semester's periods. See section 8.
- **Participation observations:** how much of a day's Class Participation each observation
  takes when a teacher ticks it in Attendance. As delivered: "No participation" takes 60% of
  the day, "Minor participation (mobile usage)" 40%, "Minor participation" 20%. 0 means no
  deduction.

### Teaching Schedule

For each weekday from Monday to Friday: the number of periods, the start time and the length
of a period (45, 50, 60, 90 or 120 minutes). The page adds up the hours, the teaching days
and the periods per week. **Export Schedule** downloads it.

The schedule matters in three places: the Attendance page marks the course's teaching days,
the Calendar shows them, and the absence limits are counted from the periods per week.

### Enrollment

"All Students" on the left, with a search box and a tick box for each; **Enroll Selected**
enrols the ticked ones. "Enrolled Students" lists who is in the course, each with
**Unenroll**.

## 6. Attendance

1. Choose the **Course** at the top right.
2. Click a day in the calendar. The days on which the course is taught stand out; a day with
   attendance recorded is green. A day in the past is announced above the calendar ("Viewing
   past date").
3. Mark the students under **Mark Attendance**.

**Marking.** Each student has four buttons: Present, Absent, Late, Excused. **Quick
Actions** above the list sets one status for everybody, and **Clear** takes every mark of
the day off, the saved ones too: the page asks first when saved marks are among them, and
two seconds later they are deleted on the server as well. **Clear** beside a student's
periods takes that student's marks off without asking. (Until v1.18.73 a saved mark came
back a moment after **Clear**.) For a day
with several periods, **Show per-period attendance** under a student opens the periods one
by one ("Mark all periods absent" is there too).

**Saving.** There is no Save button. The page saves by itself two seconds after the last
click and says "Changes pending..." until it has. A mark that is still waiting is also sent
when you choose another day or another course, or open another page. (Until November 2026
such a mark was dropped, and so was one made while an earlier save was still on its way.)
Closing the browser or reloading the page inside those two seconds still loses it: wait for
"Changes pending..." to go.

**Attendance insights** counts the day's Present, Absent, Late and Excused, and says how
many of the records it expects are there ("Coverage: 100%, 8/8 records tracked").

**Rate**, next to a student (not offered for one marked Absent or Excused in every period of
the day: an absence; marking a day so also clears the ratings already saved for it), opens **Daily
Performance**: a score for each category of the course that is rated by the day (Homework and
Class Participation, in the course this was checked with), and under it the **participation
observations**. Tick only the observations that apply. A category is counted for the day
only when "Include in today's assessment" is ticked; otherwise no score is recorded.

**Lesson log.** Under the list, for the selected course and day: **Material covered** and
**Teacher's notes**, for each period of the day (Period 1, Period 2, ...). Both save
automatically. The notes are visible to teachers and administrators only.

**Absence limits.** A table for the course: for each student the absences so far out of the
semester's periods, how many of them were excused, whether Class Participation still counts,
how many absences are allowed and how many are left, and the status. See section 8.

**Lesson log history**, at the bottom: **Show** lists the entries, newest first, each with
**Edit** and with who edited it last. **PDF** and **Excel** download the material covered by
date and period; the teacher's notes are left out unless "Include the teacher's notes" is
ticked.

No e-mail and no notification is sent for low attendance.

## 7. Grades

Choose a **student** and a **course**. Only then does the page show the grades.

**Adding a grade.** Under "Grade Entry": the assignment's name, its category, the points
earned and the points possible. **Save Grade** stores it. A form with something missing
answers "Please fill in all required fields". The form also has a box **Weight**: how often
the grade counts in the average of its category. A grade with weight 2 counts like two
grades; an empty box is 1 and the highest is 3. The box is closed for Midterm Exam and Final
Exam, which take one grade alone (section 8).

**An exam and its retake.** For a Midterm Exam or a Final Exam grade (under any of its names,
"Τελική Εξέταση" or a course's own name for it) the form has two more fields. **Date the exam
was taken**: the day the student sat it, today unless you change it; it stays for the next
student's grade, so a class's exam is dated once. **Retake (replaces the earlier sitting)**:
tick it for the student who sits the exam again, or sits it late after missing it (a missed
sitting has no grade). The retake counts in the final grade and the earlier sitting no longer
does; the tick is cleared after each grade, so it never carries over to the next student. A
grade of another category cannot be a retake. **Edit** shows a grade's own date and tick.

**The summary** on the right shows the final grade so far: as a percentage, as a GPA, as a
letter and on the Greek scale of 0 to 20 with its word (for example "15.5/20, Καλώς"). Under
it stand the average of each graded category with its weight, and the course's evaluation
rules. Where no evaluation rule takes the student's grades, a note stands in place of the
category averages and says the final grade is the mean of the grades (section 8). **Refresh
Final Grade** works it out again.

**Grade History** lists every grade of the student in the course: assignment, category,
score, percentage, weight, letter, date. A retake is marked **Retake**, and the sitting it
replaced **Replaced by the retake: not counted**. **Edit** puts a grade back into the form;
**Delete** removes it.

**A failed retake.** A retake of the final exam under 50 fails the course whatever the final
grade, as the absence limit does: the page says so in red above the form and in the summary
("Failed: the final exam retake is under 50"), and the final grade is still worked out and
shown. The grade sheets mark such a student with **§** (Excel: a column "Final exam retake"),
and Analytics counts the course as failed.

**Print/Export Report** leads to the report templates of Utils > Reports, where the
breakdown can be exported.

## 8. Absences and the final grade

**The final grade** is the weighted average of the categories, by the course's evaluation
rules. While a category has no grade yet it is left out, so the figure is "the final grade
so far": with a midterm of 75% (weight 30) and homework of 85% (weight 10) it is 77.5%. A
final grade under 50% fails the course.

Within a category each grade counts as a percentage of its points, and as often as its
**Weight** says: 20/20 with weight 1 and 0/20 with weight 3 average 25%, not 50%. Grades
that all have the same weight average as usual. (Until November 2026 the Weight was stored
and not used: a category was the plain average of its grades. A final grade that has
grades of different weights in one category is therefore not what it was before.) Two
exceptions: for Midterm Exam and Final Exam one grade alone counts, the retake, else the latest
(section 5), and a day's rating
in a category (section 6) counts like one more grade of that category, with weight 1.

**Without evaluation rules.** In a course without rules, or where none of a student's grades
falls under any of its rules, the final grade is the mean of the grades instead: each grade as
a percentage, counted as often as its Weight says, and Midterm Exam and Final Exam once each,
by the retake, else the latest sitting. Daily ratings do not count in it, and whatever a rule counts for the
student besides grades (attendance, a rating) does not make the grade then. Of the deductions
only the absence penalty below comes off it: there is no Class Participation share to lose.
Homework of 60% (weight 1) and 90% (weight 2) and a quiz of 80% (weight 1) give (60 + 180 + 80)
÷ 4 = 80%. Without rules and without a grade there is no final grade (the Grading page shows
"-"). (Until November 2026 such a course had no final grade on the Grading page or in a
student's breakdown, while Analytics and the grade sheets showed the plain average of its
grades: every grade once, both sittings of an exam, and no absence penalty. A student whose
grades matched none of the rules had 0 on the Grading page.)

**Absences** are counted in periods:

- Absent and Excused periods count. Late does not.
- The semester's total is the periods per week (from the Teaching Schedule) times the
  semester's weeks (14, a setting of the server). A course of 3 periods a week has 42.
- **Over the Class Participation limit** (10% as delivered), the Class Participation share
  of the final grade counts as 0.
- **Over the fail limit** (30% as delivered), attendance is insufficient and the course is
  failed.

Both limits are set per course under Evaluation Rules. The application only shows this: on
the Attendance page, on the Dashboard under Students Needing Attention, and in Analytics.
Nothing is blocked, and nobody is told by e-mail.

**The absence penalty.** A course can have one ("Absence penalty (points per absence)" in
**Add Course** and **Edit Course**). Every Absent period then takes that many points off
the final grade; Excused and Late periods are not counted for it. With a penalty of 2, two
Absent periods turn a final grade of 75% into 71%.

**An Attendance rule.** A course can have an evaluation rule named Attendance. Its average is
the share of periods attended: Present and Late count as attended, Absent and Excused do not,
as everywhere in the application. A Late is never an absence, but the number of Lates is shown
beside a student's attendance for the teacher's evaluation: on the grade sheets, in the Final
Grade Summary of the Grades page and in a student's **View Breakdown**, in the student
performance report, in Analytics and in the absence limits of the Attendance page.

**Class Participation.** Each attended day is worth an equal part of the Class Participation
share. An observation ticked for a day takes its percentage of that day's part (the most
severe one, if several are ticked); the rest stays for the student's presence.

## 9. Calendar

The week from Monday to Friday, with the active courses on the days of their teaching
schedules: the course, its start time, and the periods ("08:00 · 2 × 45m").

- **Print Calendar** prints the week.
- **Mark course as ended**, next to a course, ends it. An ended course is inactive.
- **Inactive courses**, at the bottom, lists the courses that are not active, each with
  **Reactivate**.

## 10. Search

Choose the **Type** (Students, Courses or Grades) and type in **Query**.

- A name is found whether it is typed in capitals or small letters, and a Greek name is
  found with or without its accents.
- **Filters** appear at the left for what was found, each value with its count (for students:
  Active and Inactive). Tick values to narrow the list. Grades can also be limited by
  **Date from** and **Date to**.
- **Sort by** offers what the type can be ordered by (students: relevance, name, e-mail),
  in either direction. **Results per page** is 10, 20 or 50; **Previous** and **Next** turn
  the pages, and the page says how many results there are.

An account without a role has no search: the server refuses it.

## 11. Utils

Six tabs.

**Export.**

- *Export Center:* Students List, Courses List, Attendance Records, All Grades and Course
  Enrollments, each with **Choose format**; and **Print Calendar**. The file's name carries
  the date and time.
- *Session Export/Import:* everything of one semester in a file, and reading such a file
  back. For administrators and teachers; to an account without a role the panel says that
  the account may not use it.
- *Reports & Templates:* ways into the Reports tab.

**Imports.** For administrators and teachers: students or courses from CSV or JSON files.
Choose **Students** or **Courses**, pick the files under **Upload files** (or paste the
records), and click **Run preview**: the page shows what would happen to each row (create,
update, skip) and what is wrong with it, and changes nothing. **Confirm & Import** then does
it, and is offered when no row has an error; **Background job status** below shows the import
while it runs and what it did. A record that already exists is left as it is unless **Allow
updates to existing records** is ticked.

**Settings.** The **theme** of the pages, with a preview; the **timezone**; and the **date
format** (DD/MM/YYYY, DD/MM/YY or MM/DD/YYYY). They are remembered on the device, not in the
account.

**Reports.** Your own reports: choose a data source (students, courses, grades, attendance,
daily performance), the fields, filters and an order, and the format (PDF, Excel or CSV).
**My Reports** lists them; **Report Templates** offers ready-made ones. Creating, changing
and deleting templates is for administrators.

**Notifications.** For administrators and teachers: the form that sends a message to all
users or to the users of one role, and the **Feedback Inbox** with what was sent through
Send Feedback. See [NOTIFICATIONS_USER_GUIDE.md](NOTIFICATIONS_USER_GUIDE.md).

**Help & Documentation.** Eighty-two questions and answers in eighteen groups, with a
search box, in English and in Greek. They were read against the pages on 18 November 2026.
"Quick Guide", under the groups, downloads a one-page summary as a PDF; it is not this guide.

## 12. Analytics

Reached from the Dashboard (**Analytics**, or **Open Analytics** on a card).

**View** switches between **Student Analytics** and **Class Analytics**. Choose a student,
or an academic year and a class division, and optionally one course. The page shows the
enrolled courses and how many are graded, the average final grade with the numbers passing
and failing, attendance, and the state of the absence limit. **PDF** and **Excel** download
what is shown, for the filters chosen (the file says which): in Class Analytics the summary,
the class and course averages, every student of the selection and their strengths and
difficulties by category (Excel: one sheet each); in Student Analytics that student's courses
and categories. **Refresh** reads it again.

**Select Dashboard** and **Manage** are for arrangements of this page that you save under a
name ("Dashboard Manager").

An account without a role gets no figures here or on the Dashboard: the server refuses them.

## 13. System

Three cards, each with a **Show** button.

- **System Health:** whether the application is running, since when, which database it
  uses, how many students and courses it holds, and the addresses it can be reached at.
- **Control Panel:** tools for the person who looks after the installation. Its tabs are
  Operations, Updates, Diagnostics, Ports, Logs, Environment, Rate Limits (administrators)
  and Maintenance. Under **Maintenance** an administrator finds User Accounts, RBAC
  Configuration, Audit Log (who did what, and when), Email Configuration, Import/Export,
  System Operations (backup, restore,
  clearing the database, the semester archive) and Database Management.
- **Credits:** the author, the licence and the software the application is built on.

Most of the Control Panel works only on the computer that runs the application, or for an
administrator. A teacher who opens Maintenance > User Accounts gets the form for the own
password, and a line saying that the other accounts are managed by an administrator.

**Updates** checks whether a newer version is published. **System Operations** says whether
the automatic daily backup is switched on; [BACKUP_AND_RESTORE.md](../admin/BACKUP_AND_RESTORE.md)
has the rest.

The export dialog of Maintenance > Import/Export does not work in most of its choices; use
Utils > Export instead.

## 14. What an account may do

| Account | In short |
|---|---|
| Administrator | Everything |
| Teacher | Students, courses, enrolments, attendance, the lesson log, grades, reports, exports, imports of students and courses, a semester's session file, messages to all users. Not accounts, backups. |
| No role | Sign in. No page of records opens. An administrator took the account's roles away, or it was a Student, Viewer or Guest account before those three went (18 November 2026). |

Students have no accounts: a student is a record the teachers keep, not somebody who signs in.

Every account sees the same pages and buttons. What it may do is decided by the server at
each request, so an account that may not do something sees the button and gets a failure
message. An account without a role is told so by a line at the top of every page. A teacher sees and changes every student and every course: there are no permissions
per course or per class.

The full table is in [PERMISSION_MATRIX.md](../admin/PERMISSION_MATRIX.md).

## 15. What the application does not have

The earlier guide described these. They do not exist.

- A "Reports" entry in the navigation. Reports are under Utils.
- E-mails or notifications for low attendance, and attendance thresholds of 70 and 80 per
  cent. The limits are the two of section 8.
- A "System Settings" page. Theme, timezone and date format are under Utils > Settings; the
  rest is set on the server by whoever looks after the installation.
- Keyboard shortcuts.
- A page for a student to see the own grades.

## 16. When something goes wrong

| What you see | What it means |
|---|---|
| "Invalid email or password" | The address or the password is wrong. After several tries the account is locked for a while. |
| You registered and cannot sign in | The account waits for an administrator's approval. |
| A page opens and its lists are empty, with a failure message | Your account may not read that. Section 14. |
| A button answers with a failure message | Your account may not do that, or the server could not be reached. Try once more; then ask the administrator. |
| "Changes pending..." does not go away on the Attendance page | The page could not reach the server. Do not close it; check the connection. |
| The Students page says its list could not be loaded | The server did not answer. Use the button to try again. |
| "Access Denied" in the Control Panel | That panel is for administrators. |
| One run-together word where a sentence should be | A text is missing in the page. Tell the administrator what you were doing. |

For anything else: **Send Feedback** at the right edge of every page.
