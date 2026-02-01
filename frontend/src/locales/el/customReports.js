// Greek translations for Custom Reports module (Phase 6)
export default {
  // Page titles
  customReports: 'Προσαρμοσμένες Αναφορές',
  reportBuilder: 'Δημιουργός Αναφορών',
  myReports: 'Οι Αναφορές Μου',
  templates: 'Πρότυπα Αναφορών',
  generatedReports: 'Δημιουργημένες Αναφορές',

  // Navigation
  createNew: 'Δημιουργία Νέας Αναφοράς',
  viewAll: 'Προβολή Όλων των Αναφορών',
  viewTemplates: 'Περιήγηση Προτύπων',
  backToList: 'Επιστροφή στις Αναφορές',

  // Builder sections
  reportConfiguration: 'Διαμόρφωση Αναφοράς',
  dataSelection: 'Επιλογή Δεδομένων',
  fieldsAndColumns: 'Πεδία & Στήλες',
  filtersAndSorting: 'Φίλτρα & Ταξινόμηση',
  previewAndGenerate: 'Προεπισκόπηση & Δημιουργία',

  // Report properties
  reportName: 'Όνομα Αναφοράς',
  reportDescription: 'Περιγραφή',
  reportType: 'Τύπος Αναφοράς',
  entityType: 'Πηγή Δεδομένων',
  outputFormat: 'Μορφή Εξόδου',
  schedule: 'Προγραμματισμός',
  emailRecipients: 'Παραλήπτες Email',

  // Entity types
  entity_students: 'Μαθητές',
  entity_courses: 'Μαθήματα',
  entity_grades: 'Βαθμοί',
  entity_attendance: 'Παρουσίες',
  entity_enrollments: 'Εγγραφές',

  // Output formats
  format_pdf: 'Έγγραφο PDF',
  format_excel: 'Υπολογιστικό Φύλλο Excel',
  format_csv: 'Αρχείο CSV',

  // Fields configuration
  availableFields: 'Διαθέσιμα Πεδία',
  selectedFields: 'Επιλεγμένα Πεδία',
  addField: 'Προσθήκη Πεδίου',
  removeField: 'Αφαίρεση',
  reorderFields: 'Σύρετε για αναδιάταξη',
  fieldName: 'Όνομα Πεδίου',
  fieldLabel: 'Προσαρμοσμένη Ετικέτα',

  // Filters
  addFilter: 'Προσθήκη Φίλτρου',
  filterField: 'Πεδίο',
  filterOperator: 'Τελεστής',
  filterValue: 'Τιμή',
  removeFilter: 'Αφαίρεση Φίλτρου',
  
  // Filter operators
  operator_equals: 'Ίσο',
  operator_not_equals: 'Όχι Ίσο',
  operator_contains: 'Περιέχει',
  operator_starts_with: 'Αρχίζει Με',
  operator_ends_with: 'Τελειώνει Με',
  operator_greater_than: 'Μεγαλύτερο Από',
  operator_less_than: 'Μικρότερο Από',
  operator_between: 'Μεταξύ',
  operator_in: 'Στη Λίστα',

  // Sorting
  sortBy: 'Ταξινόμηση Κατά',
  sortOrder: 'Σειρά',
  ascending: 'Αύξουσα',
  descending: 'Φθίνουσα',
  addSort: 'Προσθήκη Κανόνα Ταξινόμησης',

  // Templates
  useTemplate: 'Χρήση Αυτού του Προτύπου',
  saveAsTemplate: 'Αποθήκευση ως Πρότυπο',
  templateName: 'Όνομα Προτύπου',
  isPublic: 'Κάντε το Δημόσιο',
  isFavorite: 'Σήμανση ως Αγαπημένο',
  standardTemplates: 'Τυπικά Πρότυπα',
  myTemplates: 'Τα Πρότυπά Μου',
  sharedTemplates: 'Κοινόχρηστα Πρότυπα',

  // Pre-built templates (10 standard)
  template_student_roster: 'Κατάλογος Μαθητών',
  template_student_roster_desc: 'Πλήρης κατάλογος μαθητών με στοιχεία επικοινωνίας',
  template_student_performance: 'Σύνοψη Επίδοσης Μαθητών',
  template_student_performance_desc: 'Επισκόπηση ακαδημαϊκής επίδοσης ανά μαθητή',
  template_course_enrollment: 'Αναφορά Εγγραφών Μαθημάτων',
  template_course_enrollment_desc: 'Στατιστικά εγγραφών ανά μάθημα',
  template_grade_distribution: 'Κατανομή Βαθμών',
  template_grade_distribution_desc: 'Κατανομή βαθμών σε όλα τα μαθήματα',
  template_attendance_summary: 'Σύνοψη Παρουσιών',
  template_attendance_summary_desc: 'Ποσοστά και μοτίβα παρουσιών',
  template_missing_assignments: 'Ελλιπείς Εργασίες',
  template_missing_assignments_desc: 'Μαθητές με ελλιπείς ή ανολοκλήρωτες εργασίες',
  template_honor_roll: 'Πίνακας Αριστείας',
  template_honor_roll_desc: 'Μαθητές υψηλής επίδοσης κατά GPA',
  template_course_schedule: 'Πρόγραμμα Μαθημάτων',
  template_course_schedule_desc: 'Πλήρης επισκόπηση προγράμματος μαθημάτων',
  template_student_transcript: 'Αναλυτική Βαθμολογία Μαθητή',
  template_student_transcript_desc: 'Πλήρης ακαδημαϊκή βαθμολογία',
  template_attendance_alerts: 'Ειδοποιήσεις Παρουσιών',
  template_attendance_alerts_desc: 'Μαθητές με ανησυχητικά μοτίβα παρουσιών',

  // Generation
  generateReport: 'Δημιουργία Αναφοράς',
  generating: 'Δημιουργία...',
  regenerate: 'Επαναδημιουργία',
  downloadReport: 'Λήψη',
  viewReport: 'Προβολή Αναφοράς',
  emailReport: 'Αποστολή με Email',
  scheduleReport: 'Προγραμματισμός Αναφοράς',

  // Schedule options
  runOnce: 'Εκτέλεση Μία Φορά',
  runDaily: 'Καθημερινά',
  runWeekly: 'Εβδομαδιαία',
  runMonthly: 'Μηνιαία',
  runCustom: 'Προσαρμοσμένος Προγραμματισμός',
  scheduleTime: 'Ώρα Εκτέλεσης',
  scheduleDay: 'Ημέρα της Εβδομάδας',
  scheduleDayOfMonth: 'Ημέρα του Μήνα',

  // Report list
  lastRun: 'Τελευταία Εκτέλεση',
  nextRun: 'Επόμενη Εκτέλεση',
  status: 'Κατάσταση',
  actions: 'Ενέργειες',
  createdBy: 'Δημιουργήθηκε Από',
  createdAt: 'Ημερομηνία Δημιουργίας',
  size: 'Μέγεθος Αρχείου',

  // Status
  status_draft: 'Πρόχειρο',
  status_pending: 'Σε Αναμονή',
  status_running: 'Σε Εκτέλεση',
  status_completed: 'Ολοκληρώθηκε',
  status_failed: 'Απέτυχε',
  status_cancelled: 'Ακυρώθηκε',

  // Actions
  edit: 'Επεξεργασία',
  delete: 'Διαγραφή',
  duplicate: 'Αντιγραφή',
  share: 'Κοινοποίηση',
  export: 'Εξαγωγή',
  archive: 'Αρχειοθέτηση',

  // Messages
  reportCreated: 'Η αναφορά δημιουργήθηκε επιτυχώς',
  reportUpdated: 'Η αναφορά ενημερώθηκε επιτυχώς',
  reportDeleted: 'Η αναφορά διαγράφηκε επιτυχώς',
  generationStarted: 'Η δημιουργία αναφοράς ξεκίνησε',
  generationComplete: 'Η αναφορά δημιουργήθηκε επιτυχώς',
  generationFailed: 'Η δημιουργία αναφοράς απέτυχε',
  noReports: 'Δεν βρέθηκαν αναφορές',
  noTemplates: 'Δεν υπάρχουν διαθέσιμα πρότυπα',
  confirmDelete: 'Είστε σίγουροι ότι θέλετε να διαγράψετε αυτήν την αναφορά;',
  confirmDeleteTemplate: 'Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το πρότυπο;',

  // Errors
  errorLoading: 'Σφάλμα κατά τη φόρτωση των αναφορών',
  errorGenerating: 'Σφάλμα κατά τη δημιουργία της αναφοράς',
  errorSaving: 'Σφάλμα κατά την αποθήκευση της αναφοράς',
  errorDeleting: 'Σφάλμα κατά τη διαγραφή της αναφοράς',
  missingFields: 'Παρακαλώ επιλέξτε τουλάχιστον ένα πεδίο',
  missingName: 'Παρακαλώ εισάγετε όνομα αναφοράς',
  invalidSchedule: 'Μη έγκυρη διαμόρφωση προγραμματισμού',

  // Validation
  nameRequired: 'Το όνομα αναφοράς είναι υποχρεωτικό',
  entityRequired: 'Παρακαλώ επιλέξτε πηγή δεδομένων',
  formatRequired: 'Παρακαλώ επιλέξτε μορφή εξόδου',
  fieldsRequired: 'Παρακαλώ επιλέξτε τουλάχιστον ένα πεδίο',

  // Help text
  helpDragFields: 'Σύρετε και αποθέστε πεδία για να τα συμπεριλάβετε στην αναφορά σας',
  helpFilters: 'Προσθέστε φίλτρα για να περιορίσετε τα δεδομένα σας',
  helpSorting: 'Καθορίστε πώς θα ταξινομηθούν τα αποτελέσματα',
  helpSchedule: 'Προαιρετικά προγραμματίστε αυτήν την αναφορά να εκτελείται αυτόματα',
  helpEmail: 'Εισάγετε διευθύνσεις email για αποστολή της αναφοράς (διαχωρισμένες με κόμμα)',

  // Empty states
  emptyReports: 'Δεν έχετε δημιουργήσει καμία αναφορά ακόμα',
  emptyTemplates: 'Δεν υπάρχουν πρότυπα που να ταιριάζουν στην αναζήτησή σας',
  emptyGenerated: 'Δεν έχουν δημιουργηθεί αναφορές ακόμα',
  createFirstReport: 'Δημιουργήστε την πρώτη σας αναφορά για να ξεκινήσετε',

  // Bulk operations
  selectAll: 'Επιλογή Όλων',
  deselectAll: 'Αποεπιλογή Όλων',
  bulkDelete: 'Διαγραφή Επιλεγμένων',
  bulkExport: 'Εξαγωγή Επιλεγμένων',
  bulkArchive: 'Αρχειοθέτηση Επιλεγμένων',
  selectedCount: '{{count}} επιλεγμένα',

  // Stats
  totalReports: 'Συνολικές Αναφορές',
  activeSchedules: 'Ενεργοί Προγραμματισμοί',
  recentGenerations: 'Πρόσφατες Δημιουργίες',
  favoriteReports: 'Αγαπημένες Αναφορές',
};
