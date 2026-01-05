/**
 * Error Messages - English Translations
 * Used by ErrorMessage component and error handling throughout the app
 */

const errors_en = {
  // Validation errors
  VALIDATION_ERROR: 'Please check your input and try again',
  VALIDATION_REQUIRED: 'This field is required',
  VALIDATION_EMAIL: 'Please enter a valid email address',
  VALIDATION_MIN_LENGTH: 'Input is too short',
  VALIDATION_MAX_LENGTH: 'Input is too long',
  VALIDATION_INVALID_FORMAT: 'Invalid format',
  VALIDATION_MISMATCHED_PASSWORD: 'Passwords do not match',

  // Network errors
  NETWORK_ERROR: 'Unable to connect to the server',
  NETWORK_TIMEOUT: 'Request timed out. Please try again',
  NETWORK_OFFLINE: 'You are currently offline',

  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'Invalid email or password',
  AUTH_ACCOUNT_LOCKED: 'Your account is temporarily locked. Please try again later',
  AUTH_SESSION_EXPIRED: 'Your session has expired. Please log in again',
  UNAUTHORIZED: 'You must be logged in to access this resource',

  // Permission errors
  PERMISSION_DENIED: 'You do not have permission to perform this action',
  FORBIDDEN: 'Access denied',

  // Not found errors
  NOT_FOUND: 'The requested resource was not found',

  // Conflict errors
  CONFLICT: 'This resource already exists',
  DUPLICATE_EMAIL: 'An account with this email already exists',

  // Server errors
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred on the server',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable',
  BAD_GATEWAY: 'Gateway error. Please try again',

  // Student specific
  STUDENT_NOT_FOUND: 'Student not found',
  INVALID_STUDENT_ID: 'Invalid student ID format',

  // Grade specific
  GRADE_NOT_FOUND: 'Grade record not found',
  INVALID_GRADE_VALUE: 'Grade must be between 0 and the maximum grade',

  // Course specific
  COURSE_NOT_FOUND: 'Course not found',
  COURSE_NOT_ENROLLED: 'You are not enrolled in this course',

  // Generic
  UNKNOWN_ERROR: 'An unexpected error occurred',
  OPERATION_FAILED: 'Operation failed. Please try again',
};

// Add suggestions as separate keys
const error_suggestions_en = {
  'VALIDATION_ERROR.suggestion': 'Please check the highlighted fields and correct any errors',
  'NETWORK_ERROR.suggestion': 'Check your internet connection and try again',
  'NETWORK_TIMEOUT.suggestion': 'The request took too long. Please try again',
  'AUTH_INVALID_CREDENTIALS.suggestion': 'Please check your email and password',
  'AUTH_ACCOUNT_LOCKED.suggestion': 'Your account has been locked due to too many failed login attempts. Try again in 30 minutes',
  'AUTH_SESSION_EXPIRED.suggestion': 'Click the login button to start a new session',
  'UNAUTHORIZED.suggestion': 'You need to log in to access this page',
  'PERMISSION_DENIED.suggestion': 'Contact your administrator if you believe this is an error',
  'NOT_FOUND.suggestion': 'The resource you are looking for may have been deleted',
  'DUPLICATE_EMAIL.suggestion': 'Try using a different email address or reset your password if this is your account',
  'INTERNAL_SERVER_ERROR.suggestion': 'Please try again in a few moments. If the problem persists, contact support',
  'SERVICE_UNAVAILABLE.suggestion': 'The service is temporarily unavailable. Please try again later',
};

export default {
  ...errors_en,
  ...error_suggestions_en,
};
