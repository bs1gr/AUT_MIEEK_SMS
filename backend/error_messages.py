"""
User-friendly error messages for the Student Management System.

Part of Phase 1 v1.15.0 - Error Message Improvements
Target: 60% clarity → 95% clarity

This module provides structured error messages with:
- Clear, actionable descriptions
- Bilingual support (EN/EL)
- Consistent error codes
- User-friendly language instead of technical jargon
"""

from typing import Any, Dict, Optional


# Error codes for common scenarios
class ErrorCode:
    """Standard error codes for the application."""

    # Resource not found (404)
    STUDENT_NOT_FOUND = "STUDENT_NOT_FOUND"
    COURSE_NOT_FOUND = "COURSE_NOT_FOUND"
    GRADE_NOT_FOUND = "GRADE_NOT_FOUND"
    ATTENDANCE_NOT_FOUND = "ATTENDANCE_NOT_FOUND"
    ENROLLMENT_NOT_FOUND = "ENROLLMENT_NOT_FOUND"
    JOB_NOT_FOUND = "JOB_NOT_FOUND"
    AUDIT_LOG_NOT_FOUND = "AUDIT_LOG_NOT_FOUND"

    # Validation errors (400)
    INVALID_INPUT = "INVALID_INPUT"
    INVALID_DATE_RANGE = "INVALID_DATE_RANGE"
    INVALID_GRADE = "INVALID_GRADE"
    INVALID_EMAIL = "INVALID_EMAIL"
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY"
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD"
    INVALID_SEMESTER = "INVALID_SEMESTER"
    INVALID_STUDENT_ID = "INVALID_STUDENT_ID"
    INVALID_COURSE_CODE = "INVALID_COURSE_CODE"
    EMPTY_STUDENT_LIST = "EMPTY_STUDENT_LIST"
    INVALID_PERIOD = "INVALID_PERIOD"

    # Authorization errors (403)
    ACCESS_DENIED = "ACCESS_DENIED"
    ADMIN_REQUIRED = "ADMIN_REQUIRED"
    JOB_ACCESS_DENIED = "JOB_ACCESS_DENIED"

    # Business logic errors (400)
    ALREADY_ENROLLED = "ALREADY_ENROLLED"
    JOB_CANNOT_BE_CANCELLED = "JOB_CANNOT_BE_CANCELLED"
    INVALID_JOB_STATUS = "INVALID_JOB_STATUS"

    # Server errors (500)
    JOB_CREATION_FAILED = "JOB_CREATION_FAILED"
    DATABASE_ERROR = "DATABASE_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"


# Error message templates (English)
ERROR_MESSAGES_EN: Dict[str, str] = {
    # Resource not found
    ErrorCode.STUDENT_NOT_FOUND: "Student not found. Please verify the student ID and try again.",
    ErrorCode.COURSE_NOT_FOUND: "Course not found. Please check the course code and try again.",
    ErrorCode.GRADE_NOT_FOUND: "Grade record not found. It may have been deleted or never existed.",
    ErrorCode.ATTENDANCE_NOT_FOUND: "Attendance record not found. Please verify the date and student ID.",
    ErrorCode.ENROLLMENT_NOT_FOUND: "Enrollment not found. The student may not be enrolled in this course.",
    ErrorCode.JOB_NOT_FOUND: "Background job not found. It may have been deleted or completed.",
    ErrorCode.AUDIT_LOG_NOT_FOUND: "Audit log entry not found. It may have been archived.",
    # Validation errors
    ErrorCode.INVALID_INPUT: "Invalid input provided. Please check your data and try again.",
    ErrorCode.INVALID_DATE_RANGE: "Invalid date range. The start date must be before the end date.",
    ErrorCode.INVALID_GRADE: "Invalid grade value. Grade must be between 0 and 20 (Greek grading scale).",
    ErrorCode.INVALID_EMAIL: "Invalid email address format. Please provide a valid email address.",
    ErrorCode.DUPLICATE_ENTRY: "This record already exists. Please check for duplicates.",
    ErrorCode.MISSING_REQUIRED_FIELD: "Required field is missing. Please fill in all required fields.",
    ErrorCode.INVALID_SEMESTER: "Invalid semester format. Expected format: 'Fall 2024' or 'Spring 2024'.",
    ErrorCode.INVALID_STUDENT_ID: "Invalid student ID format. Please check the student ID.",
    ErrorCode.INVALID_COURSE_CODE: "Invalid course code format. Please check the course code.",
    ErrorCode.EMPTY_STUDENT_LIST: "At least one student must be provided. Please select one or more students.",
    ErrorCode.INVALID_PERIOD: "Invalid period specified. For custom period, both start and end dates are required.",
    # Authorization errors
    ErrorCode.ACCESS_DENIED: "Access denied. You don't have permission to perform this action.",
    ErrorCode.ADMIN_REQUIRED: "Administrator privileges required. Please contact an administrator.",
    ErrorCode.JOB_ACCESS_DENIED: "Access denied. You can only view your own background jobs.",
    # Business logic errors
    ErrorCode.ALREADY_ENROLLED: "Student is already enrolled in this course. Cannot enroll again.",
    ErrorCode.JOB_CANNOT_BE_CANCELLED: "Job cannot be cancelled because it has already completed or failed.",
    ErrorCode.INVALID_JOB_STATUS: "Invalid job status. The job is in an unexpected state.",
    # Server errors
    ErrorCode.JOB_CREATION_FAILED: "Failed to create background job. Please try again later.",
    ErrorCode.DATABASE_ERROR: "A database error occurred. Please try again or contact support if the problem persists.",
    ErrorCode.INTERNAL_ERROR: "An unexpected error occurred. Our team has been notified. Please try again later.",
}

# Error message templates (Greek - Ελληνικά)
ERROR_MESSAGES_EL: Dict[str, str] = {
    # Resource not found
    ErrorCode.STUDENT_NOT_FOUND: "Ο φοιτητής δεν βρέθηκε. Παρακαλώ επαληθεύστε τον αριθμό μητρώου και δοκιμάστε ξανά.",
    ErrorCode.COURSE_NOT_FOUND: ("Το μάθημα δεν βρέθηκε. Παρακαλώ ελέγξτε τον κωδικό μαθήματος και δοκιμάστε ξανά."),
    ErrorCode.GRADE_NOT_FOUND: "Η βαθμολογία δεν βρέθηκε. Μπορεί να έχει διαγραφεί ή να μην υπήρχε ποτέ.",
    ErrorCode.ATTENDANCE_NOT_FOUND: (
        "Η παρουσία δεν βρέθηκε. Παρακαλώ επαληθεύστε την ημερομηνία και τον αριθμό μητρώου."
    ),
    ErrorCode.ENROLLMENT_NOT_FOUND: ("Η εγγραφή δεν βρέθηκε. Ο φοιτητής μπορεί να μην είναι εγγεγραμμένος στο μάθημα."),
    ErrorCode.JOB_NOT_FOUND: "Η εργασία παρασκηνίου δεν βρέθηκε. Μπορεί να έχει διαγραφεί ή ολοκληρωθεί.",
    ErrorCode.AUDIT_LOG_NOT_FOUND: "Η καταχώρηση ελέγχου δεν βρέθηκε. Μπορεί να έχει αρχειοθετηθεί.",
    # Validation errors
    ErrorCode.INVALID_INPUT: "Μη έγκυρα δεδομένα. Παρακαλώ ελέγξτε τα δεδομένα σας και δοκιμάστε ξανά.",
    ErrorCode.INVALID_DATE_RANGE: (
        "Μη έγκυρο εύρος ημερομηνιών. Η ημερομηνία έναρξης πρέπει να είναι πριν την ημερομηνία λήξης."
    ),
    ErrorCode.INVALID_GRADE: "Μη έγκυρη βαθμολογία. Ο βαθμός πρέπει να είναι μεταξύ 0 και 20 (ελληνική κλίμακα).",
    ErrorCode.INVALID_EMAIL: "Μη έγκυρη μορφή email. Παρακαλώ δώστε μια έγκυρη διεύθυνση email.",
    ErrorCode.DUPLICATE_ENTRY: "Αυτή η εγγραφή υπάρχει ήδη. Παρακαλώ ελέγξτε για διπλότυπα.",
    ErrorCode.MISSING_REQUIRED_FIELD: "Λείπει υποχρεωτικό πεδίο. Παρακαλώ συμπληρώστε όλα τα απαιτούμενα πεδία.",
    ErrorCode.INVALID_SEMESTER: ("Μη έγκυρη μορφή εξαμήνου. Αναμενόμενη μορφή: 'Φθινόπωρο 2024' ή 'Άνοιξη 2024'."),
    ErrorCode.INVALID_STUDENT_ID: "Μη έγκυρη μορφή αριθμού μητρώου. Παρακαλώ ελέγξτε τον αριθμό μητρώου.",
    ErrorCode.INVALID_COURSE_CODE: "Μη έγκυρη μορφή κωδικού μαθήματος. Παρακαλώ ελέγξτε τον κωδικό μαθήματος.",
    ErrorCode.EMPTY_STUDENT_LIST: (
        "Πρέπει να παρέχεται τουλάχιστον ένας φοιτητής. Παρακαλώ επιλέξτε έναν ή περισσότερους φοιτητές."
    ),
    ErrorCode.INVALID_PERIOD: (
        "Μη έγκυρη περίοδος. Για προσαρμοσμένη περίοδο, απαιτούνται και οι δύο ημερομηνίες έναρξης και λήξης."
    ),
    # Authorization errors
    ErrorCode.ACCESS_DENIED: "Δεν επιτρέπεται η πρόσβαση. Δεν έχετε δικαιώματα για αυτήν την ενέργεια.",
    ErrorCode.ADMIN_REQUIRED: "Απαιτούνται δικαιώματα διαχειριστή. Παρακαλώ επικοινωνήστε με έναν διαχειριστή.",
    ErrorCode.JOB_ACCESS_DENIED: (
        "Δεν επιτρέπεται η πρόσβαση. Μπορείτε να δείτε μόνο τις δικές σας εργασίες παρασκηνίου."
    ),
    # Business logic errors
    ErrorCode.ALREADY_ENROLLED: "Ο φοιτητής είναι ήδη εγγεγραμμένος σε αυτό το μάθημα. Δεν μπορεί να εγγραφεί ξανά.",
    ErrorCode.JOB_CANNOT_BE_CANCELLED: ("Η εργασία δεν μπορεί να ακυρωθεί γιατί έχει ήδη ολοκληρωθεί ή απέτυχε."),
    ErrorCode.INVALID_JOB_STATUS: "Μη έγκυρη κατάσταση εργασίας. Η εργασία βρίσκεται σε μη αναμενόμενη κατάσταση.",
    # Server errors
    ErrorCode.JOB_CREATION_FAILED: "Αποτυχία δημιουργίας εργασίας παρασκηνίου. Παρακαλώ δοκιμάστε ξανά αργότερα.",
    ErrorCode.DATABASE_ERROR: (
        "Προέκυψε σφάλμα βάσης δεδομένων. Παρακαλώ δοκιμάστε ξανά ή επικοινωνήστε με την υποστήριξη."
    ),
    ErrorCode.INTERNAL_ERROR: (
        "Προέκυψε ένα απροσδόκητο σφάλμα. Η ομάδα μας έχει ενημερωθεί. Παρακαλώ δοκιμάστε ξανά αργότερα."
    ),
}


def get_error_message(code: str, lang: str = "en", custom_detail: Optional[str] = None) -> str:
    """
    Get a user-friendly error message for a given error code.

    Args:
        code: Error code from ErrorCode class
        lang: Language code ('en' or 'el')
        custom_detail: Optional custom details to append to the message

    Returns:
        User-friendly error message string
    """
    messages = ERROR_MESSAGES_EL if lang == "el" else ERROR_MESSAGES_EN

    message = messages.get(code) or messages.get(ErrorCode.INTERNAL_ERROR) or "An error occurred"

    if custom_detail:
        message = f"{message} Details: {custom_detail}"

    return message


def create_error_detail(code: str, lang: str = "en", custom_detail: Optional[str] = None, **kwargs) -> Dict[str, Any]:
    """
    Create a structured error detail dictionary.

    Args:
        code: Error code from ErrorCode class
        lang: Language code ('en' or 'el')
        custom_detail: Optional custom details
        **kwargs: Additional fields to include in the error detail

    Returns:
        Dictionary with error code, message, and any additional fields
    """
    detail = {"error_code": code, "message": get_error_message(code, lang, custom_detail)}

    detail.update(kwargs)

    return detail
