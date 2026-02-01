// English translations for Custom Reports module (Phase 6)
export default {
  // Page titles
  customReports: 'Custom Reports',
  reportBuilder: 'Report Builder',
  myReports: 'My Reports',
  templates: 'Report Templates',
  generatedReports: 'Generated Reports',
  reports: 'Reports',
  createReport: 'Create Report',
  reportsDescription: 'Create, manage, and generate custom reports for your institution.',
  templatesDescription: 'Browse pre-built templates or create your own reusable reports.',

  // Navigation
  createNew: 'Create New Report',
  viewAll: 'View All Reports',
  viewTemplates: 'Browse Templates',
  backToList: 'Back to Reports',

  // Builder sections
  reportConfiguration: 'Report Configuration',
  dataSelection: 'Data Selection',
  fieldsAndColumns: 'Fields & Columns',
  filtersAndSorting: 'Filters & Sorting',
  previewAndGenerate: 'Preview & Generate',
  previewTitle: 'Preview',
  previewName: 'Name',
  previewDescription: 'Description',
  previewEntityType: 'Entity Type',
  previewOutputFormat: 'Output Format',
  previewFields: 'Fields',
  previewFilters: 'Filters',
  previewSorting: 'Sorting',
  previewNone: 'None',
  previewNotAvailable: 'N/A',
  previewFiltersCount: '{{count}} filter(s)',
  previewSortingCount: '{{count}} rule(s)',

  // Report properties
  reportName: 'Report Name',
  reportDescription: 'Description',
  reportType: 'Report Type',
  entityType: 'Data Source',
  outputFormat: 'Output Format',
  schedule: 'Schedule',
  emailRecipients: 'Email Recipients',

  // Entity types
  entity_students: 'Students',
  entity_courses: 'Courses',
  entity_grades: 'Grades',
  entity_attendance: 'Attendance',
  entity_enrollments: 'Enrollments',

  // Output formats
  format_pdf: 'PDF Document',
  format_excel: 'Excel Spreadsheet',
  format_csv: 'CSV File',

  // Fields configuration
  availableFields: 'Available Fields',
  selectedFields: 'Selected Fields',
  addField: 'Add Field',
  removeField: 'Remove',
  reorderFields: 'Drag to reorder',
  fieldName: 'Field Name',
  fieldLabel: 'Custom Label',

  // Filters
  addFilter: 'Add Filter',
  filterField: 'Field',
  filterOperator: 'Operator',
  filterValue: 'Value',
  removeFilter: 'Remove Filter',

  // Filter operators
  operator_equals: 'Equals',
  operator_not_equals: 'Not Equals',
  operator_contains: 'Contains',
  operator_starts_with: 'Starts With',
  operator_ends_with: 'Ends With',
  operator_greater_than: 'Greater Than',
  operator_less_than: 'Less Than',
  operator_between: 'Between',
  operator_in: 'In List',

  // Sorting
  sortBy: 'Sort By',
  sortOrder: 'Order',
  ascending: 'Ascending',
  descending: 'Descending',
  addSort: 'Add Sort Rule',

  // Templates
  useTemplate: 'Use This Template',
  saveAsTemplate: 'Save as Template',
  templateName: 'Template Name',
  isPublic: 'Make Public',
  isFavorite: 'Mark as Favorite',
  standardTemplates: 'Standard Templates',
  myTemplates: 'My Templates',
  sharedTemplates: 'Shared Templates',
  noStandardTemplates: 'No standard templates available',
  searchTemplates: 'Search templates...',
  allEntityTypes: 'All entity types',

  // Pre-built templates (10 standard)
  template_student_roster: 'Student Roster',
  template_student_roster_desc: 'Complete list of students with contact information',
  template_student_performance: 'Student Performance Summary',
  template_student_performance_desc: 'Academic performance overview by student',
  template_course_enrollment: 'Course Enrollment Report',
  template_course_enrollment_desc: 'Enrollment statistics by course',
  template_grade_distribution: 'Grade Distribution',
  template_grade_distribution_desc: 'Grade distribution across courses',
  template_attendance_summary: 'Attendance Summary',
  template_attendance_summary_desc: 'Attendance rates and patterns',
  template_missing_assignments: 'Missing Assignments',
  template_missing_assignments_desc: 'Students with missing or incomplete work',
  template_honor_roll: 'Honor Roll',
  template_honor_roll_desc: 'High-performing students by GPA',
  template_course_schedule: 'Course Schedule',
  template_course_schedule_desc: 'Complete course schedule overview',
  template_student_transcript: 'Student Transcript',
  template_student_transcript_desc: 'Complete academic transcript',
  template_attendance_alerts: 'Attendance Alerts',
  template_attendance_alerts_desc: 'Students with concerning attendance patterns',

  // Generation
  generateReport: 'Generate Report',
  generating: 'Generating...',
  regenerate: 'Regenerate',
  downloadReport: 'Download',
  viewReport: 'View Report',
  emailReport: 'Email Report',
  scheduleReport: 'Schedule Report',

  // Schedule options
  runOnce: 'Run Once',
  runDaily: 'Daily',
  runWeekly: 'Weekly',
  runMonthly: 'Monthly',
  runCustom: 'Custom Schedule',
  scheduleTime: 'Run Time',
  scheduleDay: 'Day of Week',
  scheduleDayOfMonth: 'Day of Month',

  // Report list
  lastRun: 'Last Run',
  nextRun: 'Next Run',
  status: 'Status',
  actions: 'Actions',
  createdBy: 'Created By',
  createdAt: 'Created At',
  size: 'File Size',

  // Generated reports section
  generatedReportsTitle: 'Generated Reports:',
  noGeneratedReports: 'No generated reports yet',
  loading: 'Loading...',
  generatedLabel: 'Generated',
  generatedNow: 'Generated just now',
  download: 'Download',
  downloadTooltip: 'Download generated report file',
  deleteGeneratedTooltip: 'Delete generated report',
  error: 'Error',
  processing: 'Processing...',
  completed: 'Completed',
  failed: 'Failed',

  // Status
  status_draft: 'Draft',
  status_pending: 'Pending',
  status_running: 'Running',
  status_completed: 'Completed',
  status_failed: 'Failed',
  status_cancelled: 'Cancelled',

  // Actions
  edit: 'Edit',
  delete: 'Delete',
  duplicate: 'Duplicate',
  share: 'Share',
  export: 'Export',
  archive: 'Archive',

  // Messages
  reportCreated: 'Report created successfully',
  reportUpdated: 'Report updated successfully',
  reportDeleted: 'Report deleted successfully',
  generatedReportDeleted: 'Generated report deleted successfully',
  generationStarted: 'Report generation started',
  generationStartedWithJob: 'Report generation started (Job ID: {{jobId}})',
  generationComplete: 'Report generated successfully',
  generationFailed: 'Report generation failed',
  noReports: 'No reports found',
  noTemplates: 'No templates available',
  confirmDelete: 'Are you sure you want to delete this report?',
  confirmDeleteTemplate: 'Are you sure you want to delete this template?',

  // Errors
  errorLoading: 'Error loading reports',
  errorGenerating: 'Error generating report',
  errorSaving: 'Error saving report',
  errorDeleting: 'Error deleting report',
  missingFields: 'Please select at least one field',
  missingName: 'Please enter a report name',
  invalidSchedule: 'Invalid schedule configuration',

  // Validation
  nameRequired: 'Report name is required',
  entityRequired: 'Please select a data source',
  formatRequired: 'Please select an output format',
  fieldsRequired: 'Please select at least one field',

  // Help text
  helpDragFields: 'Drag and drop fields to include in your report',
  helpFilters: 'Add filters to narrow down your data',
  helpSorting: 'Define how results should be ordered',
  helpSchedule: 'Optionally schedule this report to run automatically',
  helpEmail: 'Enter email addresses to send the report to (comma-separated)',

  // Empty states
  emptyReports: 'You haven\'t created any reports yet',
  emptyTemplates: 'No templates match your search',
  emptyGenerated: 'No reports have been generated yet',
  createFirstReport: 'Create your first report to get started',

  // Bulk operations
  selectAll: 'Select All',
  deselectAll: 'Deselect All',
  bulkDelete: 'Delete Selected',
  bulkExport: 'Export Selected',
  bulkArchive: 'Archive Selected',
  selectedCount: '{{count}} selected',

  // Stats
  totalReports: 'Total Reports',
  activeSchedules: 'Active Schedules',
  recentGenerations: 'Recent Generations',
  favoriteReports: 'Favorite Reports',
};
