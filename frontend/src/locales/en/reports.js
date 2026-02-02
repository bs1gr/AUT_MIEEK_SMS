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
  totalDays: 'Total Days',
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Excused',
  unexcusedAbsences: 'Unexcused Absences',
  attendanceRateValue: '{{rate}}% ({{present}}/{{total}} days)',

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
  failed: 'Failed'
};
