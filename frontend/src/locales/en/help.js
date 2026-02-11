export default {
  // ===========================
  // HELP SYSTEM - NAVIGATION
  // ===========================
  helpTitle: 'Help & Documentation',
  everythingYouNeed: 'Find answers, tutorials, and guides',
  searchDocumentation: 'Search help topics...',
  topics: 'topics',
  noResults: 'No help articles found. Try different keywords.',
  stillNeedHelp: 'Still Need Help?',
  additionalResources: 'Resources & Support',
  userGuide: 'User Guide',
  comprehensivePDF: 'Complete reference guide',
  videoTutorials: 'Video Tutorials',
  stepByStep: 'Visual step-by-step guides',
  contactSupport: 'Contact Support',
  personalizedAssistance: 'Direct assistance from the team',
  downloadEnglishPDF: 'Download English PDF',
  downloadGreekPDF: 'Download Greek PDF',
  comingSoon: 'Coming soon...',
  reportIssue: 'Report Issue on GitHub',
  discussionForum: 'Discussion Forum',
  copyright: 'Built by Vasileios Samaras ©2025',

  // ===========================
  // 🚀 QUICK START
  // ===========================
  helpGettingStarted: '🚀 Quick Start',
  helpWhatDoINeed: 'What do I need to get started?',
  helpWhatNeedAnswer: '✓ Create an account\n✓ Add students & courses\n✓ Set evaluation rules for each course\n✓ Start tracking attendance & grades\n\nTip: Use sample data first to explore.',
  helpHowToNavigate: 'How do I navigate the system?',
  helpNavigateAnswer: 'Main sections:\n• Students - Manage records\n• Courses - Create courses & rules\n• Attendance - Track presence\n• Grades - Record grades\n• Analytics - View reports\n• Operations - Backups, exports, tools',
  helpInThreeMinutes: '3-Minute Setup',
  helpSetupAnswer: '1. Students → Add Student (name, ID, email)\n2. Courses → Add Course (set 40% exams + 30% hw + 30% participation)\n3. Attendance → Date/Course → Mark Present/Absent\n4. Grades → Add grades (exam, homework scores)\n5. Analytics → View final grades\n\nDone!',

  // ===========================
  // 📝 STUDENT MANAGEMENT
  // ===========================
  helpStudentManagement: '📝 Student Management',
  helpHowToAddStudent: 'How do I add a student?',
  helpAddStudentAnswer: '1. Click Students in navigation\n2. Click "Add Student" button\n3. Enter name, ID, email, phone\n4. Click "Save"\n\n📌 Student IDs must be unique.',
  helpHowToEditStudent: 'How do I edit student info?',
  helpEditStudentAnswer: '1. Find student in Students list\n2. Click Edit (pencil) icon\n3. Modify details\n4. Click "Save"\n\n✓ Changes apply immediately.',
  helpHowToDeleteStudent: 'How do I delete a student?',
  helpDeleteStudentAnswer: '1. Find student\n2. Click Delete (trash) icon\n3. Confirm deletion\n\n⚠️ Deletes grades & attendance. Consider archiving instead if available.',
  helpHowToSearchStudent: 'How do I search for students?',
  helpSearchStudentAnswer: 'Use the search box at the top:\n• Search by name: "John"\n• Search by ID: "12345"\n• Search by email: "john@school.com"\n\n💡 Search updates in real-time as you type.',

  // ===========================
  // ✓ ATTENDANCE TRACKING
  // ===========================
  helpAttendanceTracking: '✓ Attendance Tracking',
  helpHowToRecordAttendance: 'How do I mark attendance?',
  helpRecordAttendanceAnswer: '1. Go to Attendance section\n2. Select Date & Course\n3. Mark each student:\n   • Present\n   • Absent\n   • Late\n   • Excused\n4. Click "Save Attendance"\n\n⚡ Autosaves after 2 seconds.',
  helpWhatDoAttendanceStatusesMean: 'What do the statuses mean?',
  helpAttendanceStatusAnswer: '• ✓ Present: In class\n• ✗ Absent: Did not attend\n• ⏰ Late: Arrived late\n• 📋 Excused: Approved absence\n\n💡 Only unexcused absences affect grades.',

  // ===========================
  // 📊 GRADE MANAGEMENT
  // ===========================
  helpGradeManagement: '📊 Grade Management',
  helpHowToAddGrades: 'How do I record grades?',
  helpAddGradesAnswer: '1. Go to Grades section\n2. Select Student & Course\n3. Fill:\n   • Assignment name\n   • Category (exam, hw, etc.)\n   • Score earned\n   • Weight\n4. Click "Save"\n\n✓ System auto-calculates GPA.',
  helpHowDoesWeightWork: 'What is grade weight?',
  helpWeightAnswer: 'Weight = how much an assignment counts:\n• 1.0 = normal\n• 2.0 = counts double\n• 0.5 = counts half\n\nExample: 100% exam with 2.0 = two 100% homeworks.',
  helpHowIsGPACalculated: 'How is GPA calculated?',
  helpGPACalculationAnswer: 'GPA (0-4 scale):\n1. Average grades in each category\n2. Multiply by category weight\n3. Sum weighted categories\n4. Convert to 4.0 scale\n\nExample: 90% = 3.6 GPA, 100% = 4.0',
  helpHowIsFinalGradeCalculated: 'How is final grade calculated?',
  helpFinalGradeCalculatedAnswer: 'Final = weighted average of categories:\n\nExample:\n• Exams (40%): 85%\n• HW (30%): 95%\n• Participation (30%): 80%\n\nFinal = (85×0.4) + (95×0.3) + (80×0.3) = 86.5%\n\n⚠️ Absence penalty deducts points per unexcused absence.',

  // ===========================
  // 📈 DAILY PERFORMANCE & PARTICIPATION
  // ===========================
  helpDailyPerformance: '📈 Daily Performance & Participation',
  helpWhatIsDailyPerformance: 'What is daily performance?',
  helpDailyPerformanceAnswer: 'Rate student engagement each class (1-5 scale):\n• 1 = Not engaged\n• 5 = Excellent\n\nRatings average and count towards final grade.',
  helpHowToRateDailyPerformance: 'How do I rate daily performance?',
  helpRateDailyPerformanceAnswer: '1. Go to Attendance\n2. After marking attendance, rate present students:\n   • Click performance field\n   • Select 1-5\n3. Save attendance\n\n📌 Only present students can be rated.',
  helpWhatIsPerformanceMultiplier: 'What is the performance multiplier?',
  helpPerformanceMultiplierAnswer: 'Multiplier in evaluation rules = importance weight:\n• 1.0 = normal\n• 2.0 = double importance\n• 0.5 = half importance\n\nHigher = more weight on participation.',

  // ===========================
  // ⚙️ COURSE EVALUATION RULES
  // ===========================
  helpCourseEvaluation: '⚙️ Course Evaluation Rules',
  helpWhatAreEvaluationRules: 'What are evaluation rules?',
  helpEvaluationRulesAnswer: 'Rules define how grades are calculated:\n• Assign categories with percentages (40% exams, 30% hw, 30% participation)\n• Set daily performance multiplier\n• Set absence penalty\n• Categories must total 100%',
  helpHowToSetEvaluationRules: 'How do I set evaluation rules?',
  helpSetEvaluationRulesAnswer: '1. Go to Courses → edit course\n2. Go to "Evaluation Rules" tab\n3. Add/edit categories with percentages\n4. Click "Save"\n\n✓ Rules apply automatically to all students.',
  helpCanIChangeRules: 'Can I change rules mid-semester?',
  helpChangeRulesAnswer: 'Yes, but it recalculates all final grades for that course.\n\nBest practice:\n✓ Set rules at course creation\n✓ Announce changes to students\n✓ Test with sample data first',

  // ===========================
  // 📤 DATA EXPORT
  // ===========================
  helpDataExport: '📤 Data Export',
  helpWhatExportFormats: 'What export formats are available?',
  helpExportFormatsAnswer: '✓ Excel (.xlsx) - Best for analysis\n✓ PDF - Best for printing\n✓ CSV - Best for imports/other systems\n\nChoose based on your needs.',
  helpHowToExportStudentData: 'How do I export data?',
  helpExportStudentDataAnswer: '1. Go to Operations → Export Center\n2. Choose data type (students, grades, etc.)\n3. Select format (Excel/PDF/CSV)\n4. Click "Export"\n5. Download starts automatically\n\n✓ Exports include your applied filters.',

  // ===========================
  // 📅 CALENDAR & SCHEDULE EXPORT
  // ===========================
  helpCalendarSchedule: '📅 Calendar & Schedule Export',
  helpHowToExportSchedule: 'How do I add my teaching schedule to calendar?',
  helpExportScheduleAnswer: '1. Go to Courses → course name\n2. Click "Teaching Schedule" tab\n3. Enter class days, times, location\n4. Click "Export Schedule"\n5. Download ICS file\n6. Import to Google Calendar/Outlook\n\n✓ Now in your calendar app.',
  helpWhatIsICSFile: 'What is an ICS file?',
  helpICSFileAnswer: 'Universal calendar format supported by:\n✓ Google Calendar\n✓ Outlook\n✓ Apple Calendar\n✓ iPhone/Android calendars\n\nJust import the file to add events.',
  helpScheduleNotShowing: 'Why can\'t I export my schedule?',
  helpScheduleNotShowingAnswer: 'Export button appears only after you add a schedule:\n\n1. Open course details\n2. Go to "Teaching Schedule" tab\n3. Add days, times, location\n4. Save\n5. Export button should appear\n\n💡 Set consistent times for recurring classes.',

  // ===========================
  // 📊 PERFORMANCE & ANALYTICS
  // ===========================
  helpPerformanceAnalytics: '📊 Performance & Analytics',
  helpWhatIsGradeBreakdown: 'What is the grade breakdown?',
  helpGradeBreakdownAnswer: 'Detailed view of a student\'s performance showing:\n• Each category average\n• Attendance & daily performance impact\n• Final grade in multiple scales:\n  - Percentage (0-100%)\n  - GPA (0-4.0)\n  - Greek scale (0-20)\n  - Letter grade (A-F)',
  helpHowToViewBreakdown: 'How do I see a student\'s grades?',
  helpViewBreakdownAnswer: '1. Go to Students or Analytics\n2. Find the student\n3. For each course, click "View Breakdown"\n4. See all details and calculations\n\n📊 Use this to identify struggling students early.',
  helpWhatIsAbsencePenalty: 'What is absence penalty?',
  helpAbsencePenaltyAnswer: 'Automatic point deduction for unexcused absences:\n• Set per course (e.g., -2% per absence)\n• Applied to final grade automatically\n• Example: 3 absences × -2% = -6% from final grade\n\nUse to encourage attendance without manual adjustments.',

  // ===========================
  // 🎨 CUSTOMIZATION
  // ===========================
  helpLanguageLocalization: '🎨 Customization',
  helpHowToChangeLanguage: 'How do I change the language?',
  helpChangeLanguageAnswer: 'Click the language button (top right, near your name):\n• EN - English\n• EL - Ελληνικά (Greek)\n\n✓ Language changes instantly\n✓ Your choice is saved for next login',
  helpHowToChangeTheme: 'How do I change the appearance theme?',
  helpChangeThemeAnswer: '1. Go to Operations → Settings\n2. Select theme:\n   • Light - Bright, easy on eyes\n   • Dark - Less eye strain\n   • System - Follow OS preference\n3. Click "Save"\n\n✓ Theme applies immediately',
  helpWhatIsSystemTheme: 'What is "System" theme?',
  helpSystemThemeAnswer: '"System" theme automatically matches your device:\n• Windows/Mac dark mode → App goes dark\n• Light mode preference → App stays light\n\nUseful if you switch between day/night mode.',

  // ===========================
  // 🏗️ SYSTEM MANAGEMENT
  // ===========================
  helpSystemManagement: '🏗️ System Management',
  helpHowToBackup: 'How do I back up my data?',
  helpBackupAnswer: 'Automated backups happen daily. Manual backup:\n1. Go to Operations → Backups\n2. Click "Create Backup Now"\n3. Download the backup file\n4. Store safely (external drive, cloud)\n\n⚠️ Keep at least 2 backups in different locations.',
  helpHowToRestore: 'How do I restore from backup?',
  helpRestoreAnswer: '1. Go to Operations → Backups\n2. Click "Restore Backup"\n3. Upload the backup file\n4. Confirm restoration\n5. System reboots with restored data\n\n⚠️ Restoration overwrites current data. Backup first!',
  helpWhatIsSampleData: 'What is sample data?',
  helpSampleDataAnswer: 'Test data showing realistic usage:\n✓ 5 sample students\n✓ 3 sample courses\n✓ Sample grades & attendance\n✓ Sample performance ratings\n\nUse to explore features. Delete anytime.',
  helpSystemHealth: 'How do I check system health?',
  helpSystemHealthAnswer: 'Check system status:\n1. Go to Operations → System Health\n2. See backend/frontend status (🟢 OK or 🔴 Down)\n3. See server uptime & response time\n4. See database size\n\n✓ Green = working normally\n✓ Red = contact support',

  // ===========================
  // 📋 REPORTS & TEMPLATES
  // ===========================
  helpCustomReports: '📋 Custom Reports & Templates',
  helpWhatAreCustomReports: 'What are custom reports?',
  helpCustomReportsAnswer: 'Create any report you want:\n✓ Filter by student, course, date range\n✓ Choose which columns to include\n✓ Sort by any field\n✓ Export as PDF, Excel, CSV\n\nExamples: "Top performers", "Last 30 days attendance"',
  helpHowToCreateReport: 'How do I create a custom report?',
  helpCreateReportAnswer: '1. Go to Operations → Reports → Create\n2. 4-step wizard:\n   Step 1: Name & settings (format)\n   Step 2: Choose columns\n   Step 3: Add filters\n   Step 4: Set sort order\n3. Click "Save Report"\n4. Click "Generate" to create file\n\n✓ Save templates for recurring reports.',
  helpWhatAreTemplates: 'What are report templates?',
  helpTemplatesAnswer: 'Pre-built reports you can use directly:\n\n📋 System Templates:\n• Student Performance Summary\n• Attendance Report\n• Grade Distribution\n\n👤 My Templates: Reports you created\n🤝 Shared Templates: Others shared with you\n\nClick "Use Template" to generate immediately.',
  helpHowToUseTemplate: 'How do I use a template?',
  helpUseTemplateAnswer: '1. Go to Operations → Reports → Templates\n2. Browse or search for template\n3. Click "Use Template"\n4. (Optional) Adjust filters\n5. Click "Generate Report"\n6. Download the file\n\n✓ Templates save time on common reports.',

  // ===========================
  // ⚠️ TROUBLESHOOTING
  // ===========================
  helpTroubleshooting: '⚠️ Troubleshooting',
  helpGradesNotCalculating: 'Grades aren\'t calculating. Why?',
  helpGradesNotAnswer: 'Check these:\n1. ✓ Course has evaluation rules? (Courses → edit → Evaluation Rules)\n2. ✓ Rules add to 100%? (40% + 30% + 30% = 100%)\n3. ✓ Grades in correct category? (Exam vs Homework)\n4. ✓ Student enrolled in course?\n\n💡 Test with one student first.',
  helpAttendanceNotSaving: 'Attendance doesn\'t save. What\'s wrong?',
  helpAttendanceNotAnswer: '1. Check internet connection 🌐\n2. Try "Save Attendance" button manually\n3. Refresh page (Ctrl+R)\n4. Try different course/date\n5. Clear browser cache\n\n💡 Autosave happens 2 seconds after edits.',
  helpCannotViewGrades: 'I can\'t see student grades.',
  helpCannotViewAnswer: '1. Student enrolled in course?\n   Courses → check "Students" tab\n2. Do you have permission?\n   Teachers see own courses, admins see all\n3. Grades entered?\n   Grades tab → select student → select course\n\n💡 Empty courses won\'t show any grades.',
  helpSlowSystem: 'The system is slow.',
  helpSlowAnswer: 'Try these:\n1. Clear browser cache\n2. Disable browser extensions\n3. Try in Incognito/Private mode\n4. Restart computer\n\n💡 Check your internet speed.',
  helpDataLoss: 'I lost data! Can I recover it?',
  helpDataLossAnswer: 'Yes, likely!\n1. Go to Operations → Backups\n2. See daily automatic backups\n3. Click "Restore" next to desired date\n4. Confirm restoration\n\n✓ System restores to that date',
  helpWrongGrades: 'I entered grades but they calculated wrong.',
  helpWrongGradesAnswer: 'Check:\n1. Each grade in correct category?\n2. Category weights add to 100%?\n3. Performance multiplier set?\n4. Absence penalty applied?\n5. Daily performance ratings included?\n\n💡 View Grade Breakdown to see calculation details.',

  // ===========================
  // 💡 TIPS & TRICKS
  // ===========================
  helpTipsAndTricks: '💡 Tips & Tricks',
  helpBulkOperations: 'How do I do bulk operations?',
  helpBulkAnswer: 'Import multiple records at once:\n1. Go to Operations → Import\n2. Upload CSV (template provided)\n3. Select merge strategy\n4. Process\n\n✓ Import 500 students in seconds\n✓ Auto-detects duplicate IDs',
  helpAccessibility: 'Accessibility & Screen Readers',
  helpAccessibilityAnswer: 'Features for accessibility:\n✓ High contrast colors (A+ rating)\n✓ Keyboard navigation (Tab key)\n✓ Screen reader compatible\n✓ Adjustable font size\n✓ High contrast mode\n\n💡 Use OS accessibility tools for more.',
  helpAdvancedGradeCalculations: 'Can you show me grade calculations?',
  helpGradeExamplesAnswer: 'Example course rules:\n• Exams: 40% weight\n• Homework: 30% weight\n• Participation: 30% weight\n\nStudent grades:\n• Exam avg: 90% → 90 × 0.40 = 36\n• HW avg: 85% → 85 × 0.30 = 25.5\n• Part avg: 95% → 95 × 0.30 = 28.5\n\nFinal: 36 + 25.5 + 28.5 = 90% ✓',
  helpAbsencePenaltyExample: 'How does absence penalty work?',
  helpAbsencePenaltyExAnswer: 'Course with -2% penalty per unexcused absence:\n\nStudent has:\n• Grade: 85%\n• 3 unexcused absences\n• Penalty: 3 × -2% = -6%\n\nFinal: 85% - 6% = 79% ✓',
  helpWhatIfAutosaveFails: 'What if autosave fails?',
  helpAutosaveFailAnswer: 'Autosave is smart:\n✓ Retries automatically\n✓ Shows warning if network dies\n✓ Data stays on page (not lost)\n\nWhen network is back:\n✓ Automatically syncs\n✓ Or click "Save" manually',
};
