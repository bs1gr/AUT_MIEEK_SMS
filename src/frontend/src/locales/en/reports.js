// English translations for Reports module
export default {
  // Report types
  studentPerformanceReport: 'Student Performance Report',
  bulkReport: 'Bulk Report',

  // Actions
  generate: 'Generate Report',
  generating: 'Generating Report...',
  newReport: 'New Report',
  print: 'Print Report',
  download: 'Download',
  export: 'Export',

  // Configuration
  period: 'Report Period',
  lastWeek: 'Last Week',
  lastMonth: 'Last Month',
  semester: 'Semester',
  year: 'Academic Year',
  custom: 'Custom Period',
  configuration: 'Configuration',
  period_week: 'Week',
  period_month: 'Month',
  period_semester: 'Semester',
  period_year: 'Year',
  period_custom: 'Custom',
  startDate: 'Start Date',
  endDate: 'End Date',

  // Include options
  includeData: 'Include Data',
  includeGrades: 'Include Grades',
  includeAttendance: 'Include Attendance',
  includePerformance: 'Include Performance',
  includeHighlights: 'Include Highlights',

  // Summaries
  attendanceSummary: 'Attendance Summary',
  gradesSummary: 'Grades Summary',
  performanceSummary: 'Performance Summary',
  courseBreakdown: 'Course Breakdown',
  recommendations: 'Recommendations',
  highlights: 'Highlights',

  // Attendance metrics
  email: 'Email',
  attendanceRate: 'Attendance Rate',
  // One record per teaching period (a day can have several), as the absence limits count them.
  totalDays: 'Periods recorded',
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Excused',
  unexcusedAbsences: 'Unexcused Absences',
  // Attended = Present + Late (plan todo 77), as the rate counts them.
  attendanceRateValue: '{{rate}}% ({{attended}}/{{total}} periods attended)',
  attendanceLateCount_one: '{{count}} late',
  attendanceLateCount_other: '{{count}} late',

  // Grade metrics
  average: 'Average',
  averageGrade: 'Average Grade',
  totalAssignments: 'Total Assignments',
  highest: 'Highest',
  highestGrade: 'Highest Grade',
  lowest: 'Lowest',
  lowestGrade: 'Lowest Grade',
  trend: 'Trend',
  grade: 'Grade',
  grades: 'Grades',
  attendance: 'Attendance',
  absences: 'Absences',

  // Trends
  trend_improving: 'Improving',
  trend_declining: 'Declining',
  trend_stable: 'Stable',

  // Performance
  performanceCategories: 'Performance by Category',
  category: 'Category',
  averageScore: 'Average Score',

  // Course notes
  courseNotes: 'Course Notes',
  courseNotesPlaceholder: 'Add notes for this course',

  // Recommendations
  rec_attendance_low: '⚠️ Attendance is below 75%. Regular attendance is crucial for academic success.',
  rec_attendance_medium: '✓ Attendance could be improved. Aim for 90%+ attendance rate.',
  rec_grades_failing: '⚠️ Grades are below passing threshold. Consider scheduling tutoring sessions.',
  rec_grades_needs_improvement: '✓ Grades need improvement. Review study habits and seek help in challenging subjects.',
  rec_grades_excellent: '🌟 Excellent academic performance! Keep up the great work.',
  rec_trend_declining: '⚠️ Grade trend is declining. Review recent assignments and identify areas needing improvement.',
  rec_trend_improving: '✓ Grade trend is improving. Continue the positive momentum!',
  rec_focus_courses: '📚 Focus on: {{courses}}. Consider extra study time or tutoring.',
  rec_satisfactory: '✓ Overall performance is satisfactory. Continue maintaining good study habits.',

  // Messages
  error: 'Error generating report. Please try again.',
  noData: 'No data available for the selected period.',
  reportGenerated: 'Report generated successfully',

  // Status
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',

  // Grade sheets (plan todo 75): every student of a course for one assessment, every
  // assessment, or by category. The category names are the server's, for the same words on
  // the page and in the PDF.
  gradeSheets: {
    title: 'Grade sheets',
    subtitle:
      'Every student of a course, A to Z by surname: one assessment, every assessment, or by category. Print it or save it as Excel.',
    back: 'Back to reports',
    advanced: 'Advanced report builder',
    course: 'Course',
    chooseCourse: 'Choose a course',
    kind: 'Sheet',
    kindAssessment: 'One assessment',
    kindMatrix: 'Every assessment',
    kindCategories: 'By category',
    assessment: 'Assessment',
    assessmentGraded: 'graded {{graded}} of {{enrolled}}',
    noAssessments: 'Nothing has been graded in this course yet.',
    noStudents: 'No students are enrolled in this course.',
    noColumns: 'Nothing has been graded in this course yet.',
    loading: 'Loading…',
    loadFailed: 'The grade sheet could not be loaded.',
    retry: 'Try again',
    coursesFailed: 'The courses could not be loaded.',
    forbidden: 'Your account cannot open grade sheets.',
    download: 'Download',
    downloadPdf: 'PDF to print',
    downloadExcel: 'Excel',
    exporting: 'Preparing the file…',
    exportFailed: 'The file could not be created. Please try again.',
    number: '#',
    regNo: 'Reg. no.',
    surname: 'Surname',
    firstName: 'First name',
    score: 'Score',
    percent: '%',
    remarks: 'Remarks',
    finalGrade: 'Final grade',
    deductions: 'Deductions',
    late: 'Late',
    average: 'Average',
    notGraded: 'Not graded',
    entries: '{{n}} grades, the latest shown',
    outOf: 'Out of {{max}}',
    summaryAssessment:
      'Graded: {{graded}} of {{enrolled}}. Average {{average}}, median {{median}}, highest {{highest}}, lowest {{lowest}}. Passed {{passed}}, failed {{failed}}.',
    summaryFinal:
      'Students: {{enrolled}}. Class average {{average}}. Passed {{passed}}, failed {{failed}}, no grade yet {{noGrade}}.',
    summaryFinalAbsences:
      'Students: {{enrolled}}. Class average {{average}}. Passed {{passed}}, failed {{failed}} ({{absences}} of them over the absence limit), no grade yet {{noGrade}}.',
    basisRules: 'One column per evaluation rule of the course: the average the final grade counts.',
    basisGrades:
      'This course has no evaluation rules: each category is the mean of its grades, each counted as often as its Weight says; an exam is its latest grade.',
    deductionsNote: 'Deductions: points the final grade loses for participation observations and unexcused absences.',
    lateNote: "Late: periods the student arrived late. They count as attended, not as absences; shown for the teacher's evaluation.",
    finalRules: "Final grade so far: from the course's evaluation rules, scaled to the work graded so far.",
    finalAverage:
      "Final grade: the mean of the student's grades, each counted as often as its Weight says and an exam by its latest grade, less any absence penalty (no evaluation rule applies).",
    finalAverageMarked:
      '† No evaluation rule matched these grades: the final grade is their mean (each by its Weight, an exam by its latest grade), less any absence penalty.',
    overLimit: '* Over the absence limit: the course is failed whatever the grade.',
    forfeitedNote: '‡ Over the Class Participation absence limit: the category counts 0.',
    ratingsOnly: 'No assessment has been graded yet: the final grades so far come from the daily ratings.',
    overLimitBadge: 'Over the absence limit',
    forfeitedCell: 'Over the Class Participation absence limit: counts 0',
    averageBasisCell: 'No evaluation rule matched: the mean of the grades, by their Weight',
    openGradeSheets: 'Grade sheets',
    openGradeSheet: 'Grade sheet',
    cardDescription: "Print a course's list for one exam, every assessment, or by category.",
    categories: {
      midterm: 'Midterm Exam',
      final: 'Final Exam',
      exam: 'Exam',
      quiz: 'Quizzes',
      lab: 'Lab Work',
      homework: 'Homework',
      project: 'Project',
      presentation: 'Presentation',
      continuous: 'Continuous Assessment',
      participation: 'Class Participation',
      attendance: 'Attendance',
      // Grades saved without a category (Analytics, plan todo 75 stage 3)
      uncategorized: 'Uncategorized',
    },
  },
};
