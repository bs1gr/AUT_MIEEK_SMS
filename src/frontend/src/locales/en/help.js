// The answers of Utils > Help & Documentation. Read against the pages on 18 November 2026:
// every button, tab and path named here was looked at in a running copy, and what the
// answers say about grades and absences was tried there. Keep it so: when a page changes,
// its answer changes with it. The keys are used by components/tools/HelpDocumentation.tsx;
// i18n/__tests__/helpContent.test.ts keeps the two languages and the component in step.
export default {
  // ===========================
  // HELP PAGE
  // ===========================
  helpTitle: 'Help & Documentation',
  everythingYouNeed: 'Answers to the questions the pages raise',
  searchDocumentation: 'Search help topics...',
  topics: 'topics',
  noResults: 'No help articles found. Try different keywords.',
  stillNeedHelp: 'Still Need Help?',
  additionalResources: 'Resources & Support',
  userGuide: 'Quick Guide',
  comprehensivePDF: 'A one-page summary, as a PDF',
  videoTutorials: 'Video Tutorials',
  stepByStep: 'Visual step-by-step guides',
  contactSupport: 'Contact Support',
  personalizedAssistance: 'Direct assistance from the team',
  downloadEnglishPDF: 'Download English PDF',
  downloadGreekPDF: 'Download Greek PDF',
  comingSoon: 'Coming soon...',
  reportIssue: 'Report Issue on GitHub',
  discussionForum: 'Discussion Forum',

  // ===========================
  // 🚀 QUICK START
  // ===========================
  helpGettingStarted: '🚀 Quick Start',
  helpHowToAddStudent: 'How do I add a student?',
  helpAddStudentAnswer: '1. Open "Students"\n2. Click "Add Student"\n3. Fill in Student ID, First Name, Last Name and Email Address; the other fields are optional\n4. Click "Add Student" at the bottom of the window\n\n📌 The Student ID must be unique and cannot be changed afterwards.',
  helpHowToNavigate: 'How do I find my way around?',
  helpNavigateAnswer: 'The navigation has nine entries:\n• Dashboard: the figures, the students needing attention, and Analytics\n• Search: students, courses and grades\n• Attendance: the day\'s attendance, the lesson log, the absence limits\n• Grades: one student\'s grades in one course\n• Students and Courses: the records\n• Calendar: the week\'s teaching schedule\n• Utils: exports, imports, settings, reports, notifications and this help\n• System: system health, the Control Panel, credits\n\nAt the top right: the bell with your notifications, the language switch and the sign-out button.',
  helpWhatDoINeed: 'What do I need to get started?',
  helpWhatNeedAnswer: '1. An account. An administrator creates it, or you ask for one with "Request access" on the sign-in page and wait until an administrator approves it\n2. Students: "Students" → "Add Student"\n3. A course: "Courses" → "Add Course", then its evaluation rules and its teaching schedule\n4. Students enrolled in the course (tab "Enrollment"). A new course is inactive and becomes active when it has students\n5. Then record attendance and grades',

  // ===========================
  // 📝 STUDENT MANAGEMENT
  // ===========================
  helpStudentManagement: '📝 Student Management',
  helpHowToEditStudent: 'How do I change a student\'s details?',
  helpEditStudentAnswer: '1. Open "Students" and find the student\'s card\n2. Click "Edit"\n3. Change what is needed. The Student ID cannot be changed\n4. Click "Save Changes"\n\n💡 Unticking "Active" takes the student off the list of active students and deletes nothing.',
  helpHowToDeleteStudent: 'How do I delete a student?',
  helpDeleteStudentAnswer: '1. Open "Students" and find the student\'s card\n2. Click "Delete" and confirm\n\n⚠️ The student disappears from every page, together with the grades, attendance and enrolments. No page brings them back. To keep the records, use "Edit" and untick "Active" instead.',
  helpHowToSearchStudent: 'How do I find a student?',
  helpSearchStudentAnswer: 'On the "Students" page, type in the search box: the list narrows as you type, by name, Student ID or e-mail address. Two boxes filter by Academic Year and Class Division.\n\nThe "Search" page looks through students, courses and grades. It finds a name whether typed in capitals or small letters, and a Greek name with or without its accents, and it can filter and sort what it found.',

  // ===========================
  // ⚙️ COURSE EVALUATION RULES
  // ===========================
  helpCourseEvaluation: '⚙️ Course Evaluation Rules',
  helpWhatAreEvaluationRules: 'What are evaluation rules?',
  helpEvaluationRulesAnswer: 'They say what the final grade of a course is made of. Each rule is a category (Midterm Exam, Final Exam, Quizzes, Lab Work, Homework, Project, Class Participation, Continuous Assessment, Attendance), or a name of the course\'s own, with a weight in per cent. The weights should add up to 100%. A rule takes the grades of its category by its words, whatever the accents; Attendance counts the share of periods attended; Continuous Assessment also takes every graded activity no other rule takes.\n\nThe same tab holds the course\'s two absence limits, and how much each participation observation takes from a day\'s Class Participation.',
  helpHowToSetEvaluationRules: 'How do I set evaluation rules?',
  helpSetEvaluationRulesAnswer: '1. Open "Courses"\n2. Choose the course under "Select Course to Configure"\n3. On the tab "Evaluation Rules", click "Add Rule" and give a category and its weight\n4. Check that "Total Weight" reads 100%\n5. Click "Save Changes"',
  helpCanIChangeRules: 'Can I change the rules during the semester?',
  helpChangeRulesAnswer: 'Yes. Final grades are worked out from the rules every time they are shown, so a change counts at once for every student of the course, and nothing is kept of the earlier result. Tell the students before you change the rules.',

  // ===========================
  // 💾 WHAT SAVES BY ITSELF
  // ===========================
  helpAutosaveFeatures: '💾 Saving',
  helpWhatIsAutosave: 'Which pages save by themselves?',
  helpAutosaveAnswer: 'Three places have no Save button and store what you enter a moment after you stop:\n• Attendance: the statuses, the day\'s ratings and the participation observations\n• The lesson log: the material covered and the teacher\'s notes\n• Your own notes about a student ("View Performance" → "Notes")\n\nEverywhere else you save with a button: "Save Changes" for a course\'s rules and schedule, "Save Grade" for a grade, "Add Student" or "Save Changes" for a student.',
  helpHowDoIKnowSaving: 'How do I know that it was saved?',
  helpKnowSavingAnswer: 'The Attendance page shows "Changes pending..." until everything is stored. Wait until it is gone before you close the page or sign out.',
  helpWhatIfAutosaveFails: 'What if the connection drops while I am entering attendance?',
  helpAutosaveFailAnswer: 'What you entered stays on the page, and "Changes pending..." stays visible. Do not close the page: check the connection. When the server answers again, the page stores the changes.',

  // ===========================
  // 🆕 VERSIONS, SIGN-IN, SEMESTER FILES
  // ===========================
  helpRecentImprovements: '🆕 Versions, Sign-in and Semester Files',
  helpWhatsNewInLatest: 'Which version am I using, and what is new in it?',
  helpWhatsNewAnswer: 'The version stands at the foot of every page. After a new version is installed, a banner and a notification in the bell tell every user what changed. Whoever looks after the installation checks for a newer version under "System" → "Show Control Panel" → "Updates".',
  helpSessionExportImport: 'What is Session Export/Import?',
  helpSessionExportImportAnswer: 'It writes everything of one semester (courses, students, enrolments, grades, attendance, daily performance and the lesson log) into one JSON file, and reads such a file back, here or in another installation. It is for administrators and teachers: to an account without a role the panel says that the account may not use it. A grade is recognised by its student, course, assignment name and category.',
  helpHowToExportSemester: 'How do I export a semester?',
  helpExportSemesterAnswer: '1. "Utils" → "Export" → "Session Export/Import"\n2. Choose the semester\n3. Click "Export Session": the file is downloaded',
  helpHowToImportSemester: 'How do I import a semester?',
  helpImportSemesterAnswer: '1. "Utils" → "Export" → "Session Export/Import"\n2. "Select File": the JSON file of the semester\n3. Choose "Update Existing" or "Skip Existing"\n4. "Validate" checks the file and changes nothing\n5. "Import Session"\n\n⚠️ Make a backup first: the import makes a copy of the database by itself only where the database is a single file (SQLite), not on PostgreSQL.',
  helpWhatIsRateLimitIncrease: 'What are rate limits?',
  helpRateLimitIncreaseAnswer: 'The server accepts only so many requests a minute from one user, so that a faulty page or script cannot overload it. If a page answers that there were too many requests, wait a minute and try again. An administrator sets the limits under "System" → "Show Control Panel" → "Rate Limits".',
  helpPersistentLogin: 'Why am I still signed in after reloading the page?',
  helpPersistentLoginAnswer: 'The browser keeps your sign-in, so a reload or a new tab does not ask for the password again. On a computer that others use, sign out with the button at the top right.',

  // ===========================
  // ✓ ATTENDANCE TRACKING
  // ===========================
  helpAttendanceTracking: '✓ Attendance Tracking',
  helpHowToRecordAttendance: 'How do I record attendance?',
  helpRecordAttendanceAnswer: '1. Open "Attendance" and choose the course at the top right\n2. Click the day in the calendar. The days on which the course is taught stand out; a day with attendance recorded is green\n3. Mark each student: Present, Absent, Late or Excused. "Quick Actions" sets one status for everybody\n4. For a day with several periods, "Show per-period attendance" under a student opens the periods one by one\n\n⚡ There is no Save button. The page saves a moment after your last click and shows "Changes pending..." until it has.',
  helpHowToRecordLesson: 'How do I record what I taught?',
  helpRecordLessonAnswer: '1. Go to Attendance and select a course and a date\n2. Find the "Lesson log" card under the student list\n3. Write the material covered and, separately, your own notes\n4. If the day has several periods, pick the period first\n\n⚡ Autosaves 2 seconds after you stop typing. The notes are visible to teachers and administrators only.',
  helpWhereToReviewLessonLog: 'Where can I review or edit earlier entries?',
  helpReviewLessonLogAnswer: 'At the bottom of the Attendance page, open "Lesson log history" for the selected course. The newest entries come first; click Edit on an entry to change it. Changes save automatically, and each entry shows who edited it last.\n\n📄 PDF and Excel buttons above the list download the material covered, by date and period. Your notes are left out unless you tick "Include the teacher\'s notes".',
  helpWhatDoAttendanceStatusesMean: 'What do the statuses mean?',
  helpAttendanceStatusAnswer: '• Present: in class\n• Late: arrived late; counts as attended\n• Absent: did not attend\n• Excused: absent with a reason\n\n⚠️ Absent and Excused periods both count towards the absence limits. Only Absent periods count for a course\'s absence penalty.',
  helpWhatIsAbsencePenalty: 'What are the absence limits (ΜΙΕΕΚ)?',
  helpAbsencePenaltyAnswer: 'Absences are counted in periods, against the periods of the whole semester: the periods per week of the Teaching Schedule times 14 weeks. Absent and Excused count; Late does not.\n• Over the Class Participation limit (10% unless the course says otherwise), the Class Participation share of the final grade counts as 0\n• Over the fail limit (30%), attendance is insufficient and the course is failed\n\nThe table "Absence limits (ΜΙΕΕΚ)" on the Attendance page shows for each student the absences so far, how many are allowed and how many are left. Both limits are set per course under "Evaluation Rules". The application shows the state; it blocks nothing and sends no message.',
  helpDoesAttendanceAffectFinal: 'Does attendance change the final grade?',
  helpAttendanceAffectAnswer: 'In up to four ways:\n• Over the Class Participation limit, Class Participation counts as 0\n• A participation observation ticked for a day takes part of that day\'s Class Participation\n• If the course has an absence penalty ("Add Course" or "Edit Course": "Absence penalty (points per absence)"), every Absent period takes that many points off the final grade. Excused and Late periods are not counted for it\n• If the course has an evaluation rule "Attendance", that rule counts the share of periods attended: Present and Late count as attended, Absent and Excused do not. The number of Lates is still shown on the grade sheets and in the final-grade breakdown',

  // ===========================
  // 📈 DAILY PERFORMANCE & PARTICIPATION
  // ===========================
  helpDailyPerformance: '📈 Daily Performance & Participation',
  helpWhatIsDailyPerformance: 'What is daily performance?',
  helpDailyPerformanceAnswer: 'A rating for one day, given from the Attendance page. For each category of the course that is rated by the day you can give a score from 0 to 10; a day\'s score counts in its category like one more grade.\n\nUnder the scores are the participation observations: tick the ones that apply to the student on that day.',
  helpHowToRateDailyPerformance: 'How do I rate a student for the day?',
  helpRateDailyPerformanceAnswer: '1. "Attendance": choose the course and the day\n2. Click "Rate" next to the student. It is not offered for a student marked "Absent" or "Excused" in every period of the day, and the ratings saved for that day are cleared\n3. For a category, tick "Include in today\'s assessment" and set the score. Without the tick no score is recorded\n4. Tick the participation observations that apply\n5. Close the window\n\nThe rating is saved with the attendance.',
  helpWhatAreParticipationObservations: 'What do the participation observations do?',
  helpParticipationObservationsAnswer: 'Each attended day is worth an equal part of the Class Participation share of the final grade. An observation ticked for a day takes its percentage of that day\'s part: as delivered, "No participation" 60%, "Minor participation (mobile usage)" 40%, "Minor participation" 20%. If several are ticked, the most severe one counts. The rest of the day\'s part stays, for the student\'s presence.\n\nThe percentages are set per course under "Courses" → "Evaluation Rules".',

  // ===========================
  // 📊 GRADE MANAGEMENT
  // ===========================
  helpGradeManagement: '📊 Grade Management',
  helpHowToAddGrades: 'How do I record a grade?',
  helpAddGradesAnswer: '1. Open "Grades" and choose the student and the course\n2. Under "Grade Entry": the assignment\'s name, its category, the points earned and the points possible\n3. Click "Save Grade"\n\n"Grade History" lists the student\'s grades in the course, each with "Edit" and "Delete". The summary on the right shows the final grade so far.',
  helpHowDoesWeightWork: 'What does the Weight of a grade do?',
  helpWeightAnswer: 'It says how often the grade counts in the average of its category: a grade with weight 2 counts like two grades. Leave the box empty for 1; the highest is 3.\n\nInside a category the weight decides how much a grade counts in the category\'s average; how much the category counts in the final grade is set in the course\'s evaluation rules. In a course without evaluation rules (or where no rule takes the student\'s grades) there are no categories to weigh: the final grade is the mean of all the grades, each counted as often as its Weight says.\n\nFor Midterm Exam and Final Exam one grade alone counts, the retake if there is one, else the latest, so the box is closed for them.',
  helpHowIsFinalGradeCalculated: 'How is the final grade worked out?',
  helpFinalGradeCalculatedAnswer: 'It is the weighted average of the categories, by the course\'s evaluation rules:\n• A category\'s average is the average of its grades, each as a percentage and counted as often as its Weight says (1 unless you typed another). For Midterm Exam and Final Exam it is one grade alone: the retake, when one of the grades is marked as the retake, else the latest sitting\n• A Continuous Assessment rule («Συνεχής Αξιολόγηση») also takes every graded activity no other rule takes: homework, exercises, quizzes, projects, presentations, lab work; not the midterm or the final, unless the course has no rule of its own for it\n• A category without a grade yet is left out, so the figure is "the final grade so far"\n\nExample: Midterm Exam 75% (weight 30) and Homework 85% (weight 10) give (75×30 + 85×10) ÷ 40 = 77.5%.\n\nThen the deductions: the participation observations, the Class Participation limit and the course\'s absence penalty. A final grade under 50% fails the course.\n\nA retake: when a student sits the midterm or the final exam again (or sits it for the first time after missing it, when the first sitting has no grade), enter the grade with the day the exam was taken in "Date the exam was taken" and tick "Retake". The retake replaces the earlier sitting in the final grade, which no longer counts (the Grade History marks it "Replaced by the retake: not counted"). A retake of the final exam under 50 fails the course whatever the final grade, which is still worked out and shown; a midterm retake only replaces the first.\n\nWithout evaluation rules (or when no rule takes the student\'s grades) the final grade is the mean of the grades: each as a percentage, counted as often as its Weight says, and Midterm Exam and Final Exam once each, by the retake, else the latest sitting. Daily ratings do not count in it, and of the deductions only the course\'s absence penalty comes off it.',
  helpDoDailyPerformanceAffectFinal: 'Does daily performance change the final grade?',
  helpDailyPerformanceAffectAnswer: 'Yes. A day\'s score in a category counts like one more grade of that category, and a participation observation takes part of the day\'s Class Participation.',
  helpHowIsGPACalculated: 'How are the GPA, the Greek grade and the letter worked out?',
  helpGPACalculationAnswer: 'All three come from the final grade as a percentage:\n• GPA = percentage ÷ 25 (100% = 4.0, 75% = 3.0)\n• Greek scale = percentage ÷ 5 (100% = 20, 75% = 15)\n• Letter: A+ from 97, A from 93, A- from 90, B+ from 87, B from 83, B- from 80, C+ from 77, C from 65, D from 50, F under 50',

  // ===========================
  // 📊 PERFORMANCE & ANALYTICS
  // ===========================
  helpPerformanceAnalytics: '📊 Performance & Analytics',
  helpWhatIsGradeBreakdown: 'What is the grade breakdown?',
  helpGradeBreakdownAnswer: 'For one student in one course: the average of each graded category, its weight and what it adds to the final grade, and the final grade as a percentage, a GPA, a letter and on the Greek scale of 0 to 20.',
  helpHowToViewBreakdown: 'How do I see a student\'s grades?',
  helpViewBreakdownAnswer: '1. "Students" → "View Profile" on the student\'s card\n2. Under the enrolled courses, click "View Breakdown" next to a course\n\n"View Performance" on the card opens a report over all the student\'s courses, and the "Grades" page shows the same summary for the student and course you choose.',
  helpWhatIsGreekGrade: 'What is the Greek scale?',
  helpGreekGradeAnswer: 'The scale from 0 to 20: the percentage divided by 5, shown with its word (for example "15.5/20, Καλώς"). 10 is the pass mark.',

  // ===========================
  // 📅 CALENDAR & SCHEDULE EXPORT
  // ===========================
  helpCalendarSchedule: '📅 Calendar & Schedule Export',
  helpHowToExportSchedule: 'How do I put my teaching schedule into my own calendar?',
  helpExportScheduleAnswer: '1. "Courses" → choose the course → tab "Teaching Schedule"\n2. For each weekday: the number of periods, the start time and the length of a period\n3. Click "Save Changes"\n4. "Export Schedule" downloads an .ics file\n5. Import the file into Google Calendar, Outlook or the calendar of your phone',
  helpWhatIsICSFile: 'What is an ICS file?',
  helpICSFileAnswer: 'A calendar file that Google Calendar, Outlook, Apple Calendar and the calendars of phones can read. Import it and the lessons appear as events.',
  helpScheduleNotShowing: 'Why is there no "Export Schedule" button?',
  helpScheduleNotShowingAnswer: 'The button appears once the course has a teaching schedule. Set the periods of at least one weekday on the tab "Teaching Schedule" and click "Save Changes".',

  // ===========================
  // 📤 DATA EXPORT
  // ===========================
  helpDataExport: '📤 Data Export & Import',
  helpWhatExportFormats: 'Which formats can I export to?',
  helpExportFormatsAnswer: '✓ Excel (.xlsx): for working with the figures\n✓ PDF: for printing\n✓ CSV: for other programs\n\nThe name of each file carries the date and time.',
  helpHowToExportStudentData: 'How do I export data?',
  helpHowToImportData: 'How do I import students or courses from a file?',
  helpImportDataAnswer: '1. "Utils" → "Imports"\n2. Choose "Students" or "Courses"\n3. "Upload files": one or more CSV or JSON files. Or paste the records under "Paste JSON (optional)"\n4. Click "Run preview": the page shows what would happen to each row (create, update, skip) and what is wrong with it, and changes nothing\n5. Click "Confirm & Import". It is offered when no row has an error\n6. "Background job status" below shows the import while it runs, and what it did\n\nA record that already exists is left as it is, unless you tick "Allow updates to existing records". "Skip duplicates" takes a record that is in the files twice only once.\n\nAdministrators and teachers can import. A whole semester is moved with "Session Export/Import", which is for administrators.',
  helpExportStudentDataAnswer: '1. "Utils" → "Export" → "Export Center"\n2. Pick Students List, Courses List, Attendance Records, All Grades or Course Enrollments\n3. "Choose format": PDF, Excel or CSV\n\nEach file holds all the records of its kind. For a selection (one student, one course, a range of dates), build a report under "Utils" → "Reports".',

  // ===========================
  // 🎨 CUSTOMIZATION
  // ===========================
  helpLanguageLocalization: '🎨 Customization',
  helpHowToChangeLanguage: 'How do I change the language?',
  helpChangeLanguageAnswer: 'Click the language switch at the top right: EN for English, ΕΛ for Greek. The page changes at once, and the choice is remembered on this device.',
  helpWhatIsLocalized: 'What exists in both languages?',
  helpLocalizedAnswer: 'Every page, form and message, and this help. What you type yourself (the names of students, courses and assignments) stays as you typed it.',
  helpWhyGreekEnglishCategories: 'Why does a category have a different name in each language?',
  helpLocalizationCategoriesAnswer: 'The categories of grades (Midterm Exam, Homework and the others) are stored once and shown in the language of the page. A grade entered on the Greek page counts in the same category as one entered on the English page.',
  helpHowToChangeTheme: 'How do I change how the pages look?',
  helpChangeThemeAnswer: '1. "Utils" → "Settings"\n2. Choose a theme in the box "Theme"; the preview under it shows the result\n\nThere are eight themes, two of them dark ("Modern Dark" and "ΜΙΕΕΚ Dark"). The choice applies at once and is remembered on this device, not in your account.',
  helpHowToChangeDateFormat: 'How do I change the date format and the timezone?',
  helpChangeDateFormatAnswer: '"Utils" → "Settings", under the themes: "Timezone" and "Date format" (DD/MM/YYYY, DD/MM/YY or MM/DD/YYYY). Both are remembered on this device.',

  // ===========================
  // 🏗️ SYSTEM MANAGEMENT
  // ===========================
  helpSystemManagement: '🏗️ System Management',
  helpHowToBackup: 'How do I back up my data?',
  helpBackupAnswer: 'The system backs itself up: while it is running it makes one encrypted backup a day and keeps the newest 30. Each server keeps its own, on the machine it runs on.\n\nTo see them or make one yourself:\n1. Open System → Control Panel → Maintenance → System Operations\n2. "Manage Backups" lists them (the automatic ones are marked) and shows when the last one was made\n3. "Backup Database" makes one now; "Download" saves a copy\n4. Store copies somewhere else too (external drive, another computer)\n\n⚠️ An encrypted backup (.enc) opens only on the installation that made it. Keep at least 2 backups in different places.',
  helpHowToRestore: 'How do I restore from a backup?',
  helpRestoreAnswer: '1. "System" → "Show Control Panel" → "Maintenance" → "System Operations" → "Manage Backups"\n2. "View Backups" lists them\n3. Click "Restore" next to the backup and confirm\n\n⚠️ Restoring replaces all current data with the data of that backup. For administrators.',
  helpSystemHealth: 'How do I check that the system is running?',
  helpSystemHealthAnswer: '"System" → "Show System Health" shows whether the application is running and since when, which database it uses, how many students and courses it holds, and the addresses it can be reached at.',
  helpCleanupObsolete: 'What are the buttons under Control Panel → Operations?',
  helpCleanupObsoleteAnswer: 'Tools for the person who looks after the installation: installing dependencies, removing temporary files, and the Docker tools (building the image, switching to a new data volume). They work only on the computer that runs the application and are not needed for everyday use.',

  // ===========================
  // 📋 REPORTS & TEMPLATES
  // ===========================
  helpCustomReports: '📋 Custom Reports & Templates',
  helpWhatAreCustomReports: 'What are custom reports?',
  helpCustomReportsAnswer: 'Your own lists of records. You choose the data (students, courses, grades, attendance or daily performance), the fields, filters and an order, and the format (PDF, Excel or CSV). They are under "Utils" → "Reports".',
  helpHowToCreateReport: 'How do I create a report?',
  helpCreateReportAnswer: '1. "Utils" → "Reports" → "Create New Report"\n2. Four steps: "Report Configuration" (name, data source, format), "Data Selection" (the fields), "Filters & Sorting" and "Preview & Generate"\n3. Save it: the report then stands under "My Reports". "Save and download" also makes its file and downloads it at once',
  helpWhatIsReportBuilder: 'What is the Report Builder?',
  helpReportBuilderAnswer: 'The form of four steps behind "Create New Report": the configuration, the fields, the filters and the order, and the preview.',
  helpHowToEditReport: 'How do I change a report?',
  helpEditReportAnswer: 'Under "My Reports", "Edit" on a report opens it in the Report Builder again.',
  helpHowToGenerateReport: 'How do I get the file of a report?',
  helpGenerateReportAnswer: 'Under "My Reports", click "Generate Report" on the report. The file then appears in the list of generated reports under it, with "Download". Or, in the last step of the Report Builder, "Save and download".',
  helpWhatAreTemplates: 'What are report templates?',
  helpTemplatesAnswer: 'Ready-made reports. "Utils" → "Reports" → "Report Templates" has five tabs: Standard Templates, CSV Export Templates, Analytics Templates, My Templates and Shared Templates.\n\nIf the lists are empty, an administrator clicks "Import Default Templates" once.',
  helpHowToUseTemplate: 'How do I use a template?',
  helpUseTemplateAnswer: '1. "Utils" → "Reports" → "Report Templates"\n2. Find the template: the search box, the kind of record and the format narrow the list\n3. Click "Use This Template"',
  helpHowToCreateTemplate: 'How do I make a template of my own?',
  helpCreateTemplateAnswer: 'Under "My Reports", "Save as Template" on a report. Creating, changing and deleting templates is for administrators.',
  helpHowToShareTemplate: 'How do I share a template?',
  helpShareTemplateAnswer: '"Share" on a template of "My Templates" moves it to "Shared Templates", where the other users find it.',
  helpWhatIsDataSourceTile: 'What do the "Data Source" tiles do?',
  helpDataSourceTileAnswer: 'They open the templates for one kind of record: students, courses, grades, attendance or enrolments.',
  helpWhatIsOutputFormatTile: 'What do the "Output Format" tiles do?',
  helpOutputFormatTileAnswer: 'They open the templates of one format: PDF, Excel or CSV.',
  helpWhatFiltersAvailable: 'Which filters can a report have?',
  helpFiltersAvailableAnswer: 'A field, a comparison and a value. The comparisons: equals, does not equal, contains, does not contain, starts with, ends with, greater than, greater than or equal, less than, less than or equal, between, and one of a list.',
  helpHowManySortRules: 'How many sort rules can I add?',
  helpSortRulesAnswer: 'Several. They apply in order, from the top.',
  helpCanIDuplicateReport: 'Can I copy a report?',
  helpDuplicateReportAnswer: 'Yes: "Duplicate" on a report under "My Reports" makes a copy that you can change.',
  helpWhereAreGeneratedReports: 'Where are the files of reports I generated?',
  helpGeneratedReportsAnswer: 'Under "My Reports", in the list of generated reports under each report, with "Download".',
  helpCanReportsEmail: 'Can a report be sent by e-mail?',
  helpReportsEmailAnswer: 'In the Report Builder, tick "Enable email delivery" and give the addresses that should receive the file. For this an administrator must first set up the outgoing mail server ("System" → "Show Control Panel" → "Maintenance" → "Email Configuration").',
  helpCanReportsSchedule: 'Can a report run by itself at set times?',
  helpReportsScheduleAnswer: 'In the Report Builder, tick "Schedule Report" and choose how often: daily, weekly, monthly or a schedule of your own. The report is then generated at those times while the application is running, and sent by e-mail if that is switched on.',

  // ===========================
  // 🧩 CUSTOM DASHBOARDS
  // ===========================
  helpCustomDashboards: '🧩 Custom Dashboards',
  helpWhatAreCustomDashboards: 'What are custom dashboards?',
  helpCustomDashboardsAnswer: 'Arrangements of the Analytics page that you save under a name. You choose which of its five charts to show: Final Grades by Course, Grades Over Time, Attendance by Course, Final Grade Distribution, Attendance vs Final Grade. One dashboard can be your default.',
  helpHowToCreateDashboard: 'How do I create a dashboard?',
  helpCreateDashboardAnswer: '1. "Dashboard" → "Analytics"\n2. "Manage" opens the Dashboard Manager\n3. Click "New Dashboard"\n4. Give it a name and, if you like, a description\n5. Tick the charts to include: at least one\n6. Save',
  helpHowToSetDefaultDashboard: 'How do I set my default dashboard?',
  helpSetDefaultDashboardAnswer: 'In the Dashboard Manager, click the star ("Set as Default") on a dashboard. It is the one the Analytics page opens with.',
  helpHowToEditDeleteDashboard: 'How do I change or delete a dashboard?',
  helpEditDeleteDashboardAnswer: 'In the Dashboard Manager: the pencil changes its name, description and charts; the bin deletes it, after a confirmation.',

  // ===========================
  // 🗄️ SEMESTER ARCHIVE
  // ===========================
  helpSemesterArchive: '🗄️ Semester Archive',
  helpWhatIsSemesterArchive: 'What is Semester Archive?',
  helpSemesterArchiveAnswer: "An admin-only operation that permanently converts each completed course of a semester into one summary academic record per student, then removes that course's detailed enrollment, grade, attendance, and daily-performance rows. A passed course (fully graded, at or above the pass threshold) is recorded as passed. A failed course is recorded as failed, with the reason: below the pass threshold, over the absence limit, or a final exam retake under 50; the student then takes the course again from the beginning, enrolled anew, with nothing of the failed attempt counting. Enrollments whose grading is not complete, or of a course without evaluation rules, are left untouched, and the student's profile itself is never altered directly.",
  helpSemesterArchiveVsSessionExport: 'How is this different from Session Export/Import?',
  helpSemesterArchiveVsSessionExportAnswer: "Session Export/Import (in the Export Center) copies a semester's full data to a JSON file — non-destructive, meant for backup or moving data between installations. Semester Archive instead changes the live database: it replaces a completed course's detailed records, passed or failed, with one permanent record (an encrypted backup of the removed data is still made automatically as part of the process).",
  helpHowToRunSemesterArchive: 'How do I run a Semester Archive? (Admin only)',
  helpRunSemesterArchiveAnswer: '1. Open "System"\n2. Click "Show Control Panel"\n3. Open the "Maintenance" tab\n4. Expand "System Operations" → "Semester Archive"\n5. Pick a semester, set the pass threshold and click "Preview": it lists the student and course pairs to be archived as passed, those to be recorded as failed (with the reason), and those left untouched\n6. Confirm\n7. Enrol each student who failed in the course again for its next run\n\n⚠️ This is permanent — the underlying records are removed after archiving.',
  helpWhereIsAcademicHistory: "Where do I see a student's archived courses?",
  helpAcademicHistoryAnswer: 'Open the student\'s profile page and look for the "Academic History" section. It only appears once at least one course has been archived for that student. A failed course shows in red, with the reason.',

  // ===========================
  // 🔐 ROLES & PERMISSIONS
  // ===========================
  helpRolesPermissions: '🔐 Roles & Permissions',
  helpWhatIsRBACConfiguration: 'What are roles and permissions?',
  helpRBACConfigurationAnswer: 'A role (Administrator, Teacher) is a set of permissions, and the server checks them at every request. The pages show the same buttons to everybody: a button your account may not use answers with a failure message.\n\nAn account without a role can sign in and nothing else.',
  helpHowToManagePermissions: 'How do I manage roles and permissions? (Admin only)',
  helpManagePermissionsAnswer: '"System" → "Show Control Panel" → "Maintenance" → "RBAC Configuration":\n• "Overview": the roles and every permission\n• "Users": every account with its number and its roles\n• "Assign Role to User": give an account a role, or revoke one. An account whose last role is revoked can do nothing until it is given a role again\n• "Permissions Catalog": grant a permission to a role or to one account, revoke it, and look up what an account holds',
  helpHowToChangeOwnPassword: 'How do I change my password?',
  helpChangeOwnPasswordAnswer: '1. "System" → "Show Control Panel" → "Maintenance" → "User Accounts"\n2. Under "Change Your Password": "Current password", "New password" and "Confirm password"\n3. Click "Update password"\n\nThe new password needs at least 8 characters, with an uppercase and a lowercase letter, a number and a symbol, and no spaces.\n\nEvery account has this form. If you forgot your password, an administrator sets a new one for you.',
  helpHowToSeeAuditLog: 'Where do I see who changed what? (Admin only)',
  helpAuditLogAnswer: '"System" → "Show Control Panel" → "Maintenance" → "Audit Log". Each line says when something was done, who did it, what it was and which record it is about: an account created, changed or deleted, a role given or taken away, a permission granted or revoked, a new password, an import.\n\n"What was done" and "Made by" narrow the list, and "From" and "To" limit it to a range of days. The newest entry is first.',
  helpHowToManageUserAccounts: 'How do I manage user accounts? (Admin only)',
  helpManageUserAccountsAnswer: '"System" → "Show Control Panel" → "Maintenance" → "User Accounts": create an account, approve a registration, change the name, the role and "Active", reset a password, delete an account. Unticking "Active" stops an account at once.',

  // ===========================
  // 🧰 CONTROL PANEL
  // ===========================
  helpUtilsOperations: '🧰 Control Panel',
  helpHowToAccessControlPanel: 'How do I open the Control Panel?',
  helpControlPanelAnswer: 'Open "System" and click "Show Control Panel". Its tabs are Operations, Updates, Diagnostics, Ports, Logs, Environment, Rate Limits and Maintenance. Most of it works only for an administrator, or on the computer that runs the application.',
  helpWhatIsDevTools: 'What is under "Maintenance"?',
  helpDevToolsAnswer: 'For administrators: User Accounts, RBAC Configuration, Audit Log, Email Configuration, Import/Export, System Operations (backup, restore, clearing the database, the semester archive) and Database Management.',
};
