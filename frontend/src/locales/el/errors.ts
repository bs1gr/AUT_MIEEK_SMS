/**
 * Error Messages - Greek Translations (Ελληνικά)
 * Used by ErrorMessage component and error handling throughout the app
 */

const errors_el = {
  // Validation errors
  VALIDATION_ERROR: 'Παρακαλώ ελέγξτε την εισαγωγή σας και προσπαθήστε ξανά',
  VALIDATION_REQUIRED: 'Αυτό το πεδίο είναι υποχρεωτικό',
  VALIDATION_EMAIL: 'Παρακαλώ εισάγετε μια έγκυρη διεύθυνση ηλεκτρονικής αλληλογραφίας',
  VALIDATION_MIN_LENGTH: 'Η εισαγωγή είναι πολύ σύντομη',
  VALIDATION_MAX_LENGTH: 'Η εισαγωγή είναι πολύ μεγάλη',
  VALIDATION_INVALID_FORMAT: 'Μη έγκυρη μορφή',
  VALIDATION_MISMATCHED_PASSWORD: 'Τα κωδικοί πρόσβασης δεν ταιριάζουν',

  // Network errors
  NETWORK_ERROR: 'Αδυναμία σύνδεσης με τον διακομιστή',
  NETWORK_TIMEOUT: 'Λήξη χρόνου αναμονής. Παρακαλώ προσπαθήστε ξανά',
  NETWORK_OFFLINE: 'Είστε αυτή τη στιγμή χωρίς σύνδεση',

  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'Μη έγκυρο όνομα χρήστη ή κωδικός πρόσβασης',
  AUTH_ACCOUNT_LOCKED: 'Ο λογαριασμός σας είναι προσωρινά κλειδωμένος. Παρακαλώ προσπαθήστε ξανά αργότερα',
  AUTH_SESSION_EXPIRED: 'Η συνεδρία σας έληξε. Παρακαλώ συνδεθείτε ξανά',
  UNAUTHORIZED: 'Πρέπει να είστε συνδεδεμένος για πρόσβαση σε αυτόν τον πόρο',

  // Permission errors
  PERMISSION_DENIED: 'Δεν έχετε δικαίωμα να εκτελέσετε αυτή την ενέργεια',
  FORBIDDEN: 'Πρόσβαση αρνήθηκε',

  // Not found errors
  NOT_FOUND: 'Ο ζητούμενος πόρος δεν βρέθηκε',

  // Conflict errors
  CONFLICT: 'Αυτός ο πόρος υπάρχει ήδη',
  DUPLICATE_EMAIL: 'Υπάρχει ήδη λογαριασμός με αυτό το email',

  // Server errors
  INTERNAL_SERVER_ERROR: 'Ένα απροσδόκητο σφάλμα συνέβη στον διακομιστή',
  SERVICE_UNAVAILABLE: 'Η υπηρεσία είναι προσωρινά μη διαθέσιμη',
  BAD_GATEWAY: 'Σφάλμα πύλης. Παρακαλώ προσπαθήστε ξανά',

  // Student specific
  STUDENT_NOT_FOUND: 'Ο φοιτητής δεν βρέθηκε',
  INVALID_STUDENT_ID: 'Μη έγκυρη μορφή ταυτότητας φοιτητή',

  // Grade specific
  GRADE_NOT_FOUND: 'Η εγγραφή βαθμού δεν βρέθηκε',
  INVALID_GRADE_VALUE: 'Ο βαθμός πρέπει να είναι μεταξύ 0 και του μέγιστου βαθμού',

  // Course specific
  COURSE_NOT_FOUND: 'Το μάθημα δεν βρέθηκε',
  COURSE_NOT_ENROLLED: 'Δεν είστε εγγεγραμμένος σε αυτό το μάθημα',

  // Generic
  UNKNOWN_ERROR: 'Ένα απροσδόκητο σφάλμα συνέβη',
  OPERATION_FAILED: 'Η λειτουργία απέτυχε. Παρακαλώ προσπαθήστε ξανά',
};

// Add suggestions as separate keys
const error_suggestions_el = {
  'VALIDATION_ERROR.suggestion': 'Παρακαλώ ελέγξτε τα επισημασμένα πεδία και διορθώστε τυχόν σφάλματα',
  'NETWORK_ERROR.suggestion': 'Ελέγξτε την σύνδεσή σας στο διαδίκτυο και προσπαθήστε ξανά',
  'NETWORK_TIMEOUT.suggestion': 'Το αίτημα διήρκεσε πολύ. Παρακαλώ προσπαθήστε ξανά',
  'AUTH_INVALID_CREDENTIALS.suggestion': 'Παρακαλώ ελέγξτε το όνομα χρήστη και τον κωδικό πρόσβασης',
  'AUTH_ACCOUNT_LOCKED.suggestion': 'Ο λογαριασμός σας έχει κλειδωθεί λόγω πολλών αποτυχημένων προσπαθειών σύνδεσης. Δοκιμάστε ξανά σε 30 λεπτά',
  'AUTH_SESSION_EXPIRED.suggestion': 'Κάντε κλικ στο κουμπί σύνδεσης για να ξεκινήσετε μια νέα συνεδρία',
  'UNAUTHORIZED.suggestion': 'Πρέπει να συνδεθείτε για πρόσβαση σε αυτή τη σελίδα',
  'PERMISSION_DENIED.suggestion': 'Επικοινωνήστε με τον διαχειριστή σας εάν πιστεύετε ότι πρόκειται για σφάλμα',
  'NOT_FOUND.suggestion': 'Ο πόρος που ψάχνετε ενδέχεται να έχει διαγραφεί',
  'DUPLICATE_EMAIL.suggestion': 'Δοκιμάστε να χρησιμοποιήσετε διαφορετικό email ή επαναφέρετε τον κωδικό πρόσβασης εάν πρόκειται για το λογαριασμό σας',
  'INTERNAL_SERVER_ERROR.suggestion': 'Παρακαλώ προσπαθήστε ξανά σε μερικές στιγμές. Εάν το πρόβλημα επιμένει, επικοινωνήστε με την υποστήριξη',
  'SERVICE_UNAVAILABLE.suggestion': 'Η υπηρεσία είναι προσωρινά μη διαθέσιμη. Παρακαλώ προσπαθήστε ξανά αργότερα',
};

export default {
  ...errors_el,
  ...error_suggestions_el,
};
