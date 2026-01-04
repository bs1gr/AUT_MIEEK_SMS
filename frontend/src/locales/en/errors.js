/**
 * Error message translations (English)
 * Part of Phase 1 v1.15.0 - Error Message Improvements
 * Target: 60% clarity → 95% clarity
 */

export default {
  // Resource not found (404)
  studentNotFound: 'Student not found. Please verify the student ID and try again.',
  courseNotFound: 'Course not found. Please check the course code and try again.',
  gradeNotFound: 'Grade record not found. It may have been deleted or never existed.',
  attendanceNotFound: 'Attendance record not found. Please verify the date and student ID.',
  enrollmentNotFound: 'Enrollment not found. The student may not be enrolled in this course.',
  jobNotFound: 'Background job not found. It may have been deleted or completed.',
  auditLogNotFound: 'Audit log entry not found. It may have been archived.',

  // Validation errors (400)
  invalidInput: 'Invalid input provided. Please check your data and try again.',
  invalidDateRange: 'Invalid date range. The start date must be before the end date.',
  invalidGrade: 'Invalid grade value. Grade must be between 0 and 20 (Greek grading scale).',
  invalidEmail: 'Invalid email address format. Please provide a valid email address.',
  duplicateEntry: 'This record already exists. Please check for duplicates.',
  missingRequiredField: 'Required field is missing. Please fill in all required fields.',
  invalidSemester: "Invalid semester format. Expected format: 'Fall 2024' or 'Spring 2024'.",
  invalidStudentId: 'Invalid student ID format. Please check the student ID.',
  invalidCourseCode: 'Invalid course code format. Please check the course code.',
  emptyStudentList: 'At least one student must be provided. Please select one or more students.',
  invalidPeriod: 'Invalid period specified. For custom period, both start and end dates are required.',

  // Authorization errors (403)
  accessDenied: "Access denied. You don't have permission to perform this action.",
  adminRequired: 'Administrator privileges required. Please contact an administrator.',
  jobAccessDenied: 'Access denied. You can only view your own background jobs.',

  // Business logic errors (400)
  alreadyEnrolled: 'Student is already enrolled in this course. Cannot enroll again.',
  jobCannotBeCancelled: 'Job cannot be cancelled because it has already completed or failed.',
  invalidJobStatus: 'Invalid job status. The job is in an unexpected state.',

  // Server errors (500)
  jobCreationFailed: 'Failed to create background job. Please try again later.',
  databaseError: 'A database error occurred. Please try again or contact support if the problem persists.',
  internalError: 'An unexpected error occurred. Our team has been notified. Please try again later.',

  // Generic error titles
  errorTitle: 'Error',
  warningTitle: 'Warning',
  infoTitle: 'Information',
  successTitle: 'Success',

  // Error actions
  tryAgain: 'Try Again',
  contactSupport: 'Contact Support',
  goBack: 'Go Back',
  dismiss: 'Dismiss',
  reportError: 'Report Error',
};
