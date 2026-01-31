/**
 * Export Admin UI Translation Keys (English)
 * English localization for export management dashboard
 */

export const exportAdminEN = {
  // Main Dashboard
  title: 'Export Management Dashboard',
  description: 'Manage exports, schedules, and system settings',

  // Actions
  actions: {
    refresh: 'Refresh',
    newExport: 'New Export',
    create: 'Create',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    download: 'Download',
    view: 'View Details',
    rerun: 'Re-run Export',
    test: 'Test Connection',
    creating: 'Creating...',
    saving: 'Saving...',
    testing: 'Testing...',
  },

  // Quick Stats
  stats: {
    totalExports: 'Total Exports',
    recentExports: 'Recent Exports',
    activeSchedules: 'Active Schedules',
    successRate: 'Success Rate',
    allTime: 'All time',
    last30Days: 'Last 30 days',
    recurring: 'Recurring schedules',
    recentSuccess: 'Recent exports',
  },

  // Tabs
  tabs: {
    jobs: 'Export Jobs',
    schedules: 'Schedules',
    metrics: 'Metrics',
    analytics: 'Analytics',
    email: 'Email Settings',
    settings: 'System Settings',
  },

  // Export Status
  status: {
    completed: 'Completed',
    processing: 'Processing',
    pending: 'Pending',
    failed: 'Failed',
  },

  // Export Types
  type: {
    students: 'Students',
    courses: 'Courses',
    grades: 'Grades',
  },

  // Export Formats
  format: {
    excel: 'Excel',
    csv: 'CSV',
    pdf: 'PDF',
  },

  // Frequency
  frequency: {
    hourly: 'Hourly',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    custom: 'Custom (Cron)',
  },

  // Job List
  search: 'Search exports...',
  filterType: 'Filter by type',
  filterStatus: 'Filter by status',
  all: 'All',
  noJobs: 'No exports found',
  confirmDelete: 'Are you sure you want to delete this export?',
  noFile: 'File is not available for download',
  showing: 'Showing',
  of: 'of',

  columns: {
    id: 'ID',
    type: 'Type',
    format: 'Format',
    status: 'Status',
    progress: 'Progress',
    size: 'File Size',
    duration: 'Duration',
    created: 'Created',
    actions: 'Actions',
  },

  // Schedule
  schedule: {
    createTitle: 'Create New Schedule',
    createDescription: 'Set up an automated recurring export',
    name: 'Schedule Name',
    namePlaceholder: 'Weekly Students Export',
    type: 'Export Type',
    format: 'Export Format',
    frequency: 'Frequency',
    frequencyHelp: 'How often should this export run?',
    cron: 'Cron Expression',
    cronPlaceholder: '0 0 * * 1 (Every Monday at midnight)',
    cronHelp: 'Use cron expressions for custom schedules (e.g., "0 0 * * 1" for weekly on Monday)',
    activeSchedules: 'Active Schedules',
    noSchedules: 'No schedules configured yet',
    new: 'New Schedule',
    active: 'Active',
    inactive: 'Inactive',
    pause: 'Pause Schedule',
    resume: 'Resume Schedule',
    lastRun: 'Last run',
    nextRun: 'Next run',
    confirmDeleteSchedule: 'Are you sure you want to delete this schedule?',
  },

  // Metrics
  metrics: {
    duration: 'Export Duration Trends',
    durationDesc: 'Average time taken to complete exports over time',
    successRate: 'Success Rate Trends',
    successRateDesc: 'Successful and failed exports over time',
  },

  // Analytics
  analytics: {
    avgDuration: 'Average Duration',
    successRate: 'Success Rate',
    totalExports: 'Total Exports',
    byFormat: 'Performance by Format',
  },

  // Email Configuration
  email: {
    title: 'Email Configuration',
    description: 'Configure SMTP settings for export notifications',
    host: 'SMTP Host',
    port: 'SMTP Port',
    username: 'SMTP Username',
    password: 'SMTP Password',
    fromEmail: 'From Email Address',
    adminEmails: 'Admin Email Addresses',
    testButton: 'Send Test Email',
    notifyOnCompletion: 'Notify on completion',
    notifyOnFailure: 'Notify on failure',
    notifyOnScheduleFailure: 'Notify on schedule failure',
    hostPlaceholder: 'smtp.gmail.com',
    portPlaceholder: '587',
    usernamePlaceholder: 'your-email@gmail.com',
    passwordPlaceholder: '••••••••',
    fromEmailPlaceholder: 'noreply@example.com',
    adminEmailsPlaceholder: 'admin@example.com\nadmin2@example.com',
  },

  // Settings
  settings: {
    title: 'Export System Settings',
    description: 'Configure export system behavior and limits',
    retentionDays: 'Retention Period (Days)',
    maxConcurrent: 'Max Concurrent Exports',
    timeout: 'Export Timeout (Seconds)',
    maxRecords: 'Max Records per Export',
  },

  // Detail Modal
  detail: {
    title: 'Export Details',
    id: 'Export ID',
    type: 'Type',
    format: 'Format',
    status: 'Status',
    progress: 'Progress',
  },

  // Filter Builder
  filter: {
    title: 'Filter Builder',
    description: 'Apply filters to your exports',
  },

  // Schedule Builder
  scheduleBuilder: {
    title: 'Schedule Builder',
    description: 'Create a custom schedule for recurring exports',
  },

  // Common
  close: 'Close',
  loading: 'Loading...',
  error: 'Error',
  success: 'Success',
  units: {
    bytes: 'B',
    kilobytes: 'KB',
    megabytes: 'MB',
    secondsShort: 's',
  },
  errors: {
    loadFailed: 'Failed to load exports. Please try again.',
  },
};

/**
 * Export Admin UI Translation Keys (Greek)
 * Greek localization for export management dashboard
 */

export const exportAdminEL = {
  // Main Dashboard
  title: 'Διαχείριση Εξαγωγών',
  description: 'Διαχείριση εξαγωγών, χρονοδιαγραμμάτων και ρυθμίσεων συστήματος',

  // Actions
  actions: {
    refresh: 'Ανανέωση',
    newExport: 'Νέα Εξαγωγή',
    create: 'Δημιουργία',
    save: 'Αποθήκευση',
    cancel: 'Ακύρωση',
    delete: 'Διαγραφή',
    download: 'Λήψη',
    view: 'Προβολή Λεπτομερειών',
    rerun: 'Επανάληψη Εξαγωγής',
    test: 'Δοκιμή Σύνδεσης',
    creating: 'Δημιουργία...',
    saving: 'Αποθήκευση...',
    testing: 'Δοκιμή...',
  },

  // Quick Stats
  stats: {
    totalExports: 'Σύνολο Εξαγωγών',
    recentExports: 'Πρόσφατες Εξαγωγές',
    activeSchedules: 'Ενεργά Χρονοδιαγράμματα',
    successRate: 'Ποσοστό Επιτυχίας',
    allTime: 'Όλη την περίοδο',
    last30Days: 'Τελευταίες 30 μέρες',
    recurring: 'Επαναλαμβανόμενα χρονοδιαγράμματα',
    recentSuccess: 'Πρόσφατες εξαγωγές',
  },

  // Tabs
  tabs: {
    jobs: 'Εργασίες Εξαγωγής',
    schedules: 'Χρονοδιαγράμματα',
    metrics: 'Μετρικές',
    analytics: 'Ανάλυση',
    email: 'Ρυθμίσεις Email',
    settings: 'Ρυθμίσεις Συστήματος',
  },

  // Export Status
  status: {
    completed: 'Ολοκληρωμένη',
    processing: 'Σε Επεξεργασία',
    pending: 'Εκκρεμής',
    failed: 'Αποτυχία',
  },

  // Export Types
  type: {
    students: 'Φοιτητές',
    courses: 'Μαθήματα',
    grades: 'Βαθμοί',
  },

  // Export Formats
  format: {
    excel: 'Excel',
    csv: 'CSV',
    pdf: 'PDF',
  },

  // Frequency
  frequency: {
    hourly: 'Ωριαία',
    daily: 'Καθημερινή',
    weekly: 'Εβδομαδιαία',
    monthly: 'Μηνιαία',
    custom: 'Προσαρμοσμένη (Cron)',
  },

  // Job List
  search: 'Αναζήτηση εξαγωγών...',
  filterType: 'Φιλτράρισμα κατά τύπο',
  filterStatus: 'Φιλτράρισμα κατά κατάσταση',
  all: 'Όλα',
  noJobs: 'Δεν βρέθηκαν εξαγωγές',
  confirmDelete: 'Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την εξαγωγή;',
  noFile: 'Το αρχείο δεν είναι διαθέσιμο για λήψη',
  showing: 'Εμφάνιση',
  of: 'από',

  columns: {
    id: 'Αναγνωριστικό',
    type: 'Τύπος',
    format: 'Μορφή',
    status: 'Κατάσταση',
    progress: 'Πρόοδος',
    size: 'Μέγεθος Αρχείου',
    duration: 'Διάρκεια',
    created: 'Δημιουργήθηκε',
    actions: 'Ενέργειες',
  },

  // Schedule
  schedule: {
    createTitle: 'Δημιουργία Νέου Χρονοδιαγράμματος',
    createDescription: 'Ρύθμιση αυτοματοποιημένης επαναλαμβανόμενης εξαγωγής',
    name: 'Όνομα Χρονοδιαγράμματος',
    namePlaceholder: 'Εβδομαδιαία Εξαγωγή Φοιτητών',
    type: 'Τύπος Εξαγωγής',
    format: 'Μορφή Εξαγωγής',
    frequency: 'Συχνότητα',
    frequencyHelp: 'Πόσο συχνά θα πρέπει να εκτελείται αυτή η εξαγωγή;',
    cron: 'Έκφραση Cron',
    cronPlaceholder: '0 0 * * 1 (Κάθε Δευτέρα στα μεσάνυχτα)',
    cronHelp: 'Χρησιμοποιήστε εκφράσεις cron για προσαρμοσμένα χρονοδιαγράμματα',
    activeSchedules: 'Ενεργά Χρονοδιαγράμματα',
    noSchedules: 'Κανένα χρονοδιάγραμμα δεν έχει ρυθμιστεί ακόμα',
    new: 'Νέο Χρονοδιάγραμμα',
    active: 'Ενεργό',
    inactive: 'Ανενεργό',
    pause: 'Παύση Χρονοδιαγράμματος',
    resume: 'Συνέχιση Χρονοδιαγράμματος',
    lastRun: 'Τελευταία εκτέλεση',
    nextRun: 'Επόμενη εκτέλεση',
    confirmDeleteSchedule: 'Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το χρονοδιάγραμμα;',
  },

  // Metrics
  metrics: {
    duration: 'Τάσεις Διάρκειας Εξαγωγής',
    durationDesc: 'Μέσος χρόνος για ολοκλήρωση εξαγωγών με την πάροδο του χρόνου',
    successRate: 'Τάσεις Ποσοστού Επιτυχίας',
    successRateDesc: 'Επιτυχημένες και αποτυχημένες εξαγωγές με την πάροδο του χρόνου',
  },

  // Analytics
  analytics: {
    avgDuration: 'Μέση Διάρκεια',
    successRate: 'Ποσοστό Επιτυχίας',
    totalExports: 'Σύνολο Εξαγωγών',
    byFormat: 'Απόδοση κατά Μορφή',
  },

  // Email Configuration
  email: {
    title: 'Ρύθμιση Email',
    description: 'Ρύθμιση του SMTP για ειδοποιήσεις εξαγωγής',
    host: 'Διακομιστής SMTP',
    port: 'Θύρα SMTP',
    username: 'Όνομα χρήστη SMTP',
    password: 'Κωδικός πρόσβασης SMTP',
    fromEmail: 'Διεύθυνση Email Αποστολής',
    adminEmails: 'Διευθύνσεις Email Διαχειριστή',
    testButton: 'Αποστολή Δοκιμαστικού Email',
    notifyOnCompletion: 'Ειδοποίηση κατά ολοκλήρωση',
    notifyOnFailure: 'Ειδοποίηση κατά αποτυχία',
    notifyOnScheduleFailure: 'Ειδοποίηση κατά αποτυχίας χρονοδιαγράμματος',
    hostPlaceholder: 'smtp.gmail.com',
    portPlaceholder: '587',
    usernamePlaceholder: 'your-email@gmail.com',
    passwordPlaceholder: '••••••••',
    fromEmailPlaceholder: 'noreply@example.com',
    adminEmailsPlaceholder: 'admin@example.com\nadmin2@example.com',
  },

  // Settings
  settings: {
    title: 'Ρυθμίσεις Συστήματος Εξαγωγής',
    description: 'Ρύθμιση συμπεριφοράς και ορίων συστήματος εξαγωγής',
    retentionDays: 'Περίοδος Διατήρησης (Ημέρες)',
    maxConcurrent: 'Μέγιστες Ταυτόχρονες Εξαγωγές',
    timeout: 'Χρονικό Όριο Εξαγωγής (Δευτερόλεπτα)',
    maxRecords: 'Μέγιστες Εγγραφές ανά Εξαγωγή',
  },

  // Detail Modal
  detail: {
    title: 'Λεπτομέρειες Εξαγωγής',
    id: 'Αναγνωριστικό Εξαγωγής',
    type: 'Τύπος',
    format: 'Μορφή',
    status: 'Κατάσταση',
    progress: 'Πρόοδος',
  },

  // Filter Builder
  filter: {
    title: 'Κατασκευαστής Φίλτρων',
    description: 'Εφαρμόστε φίλτρα στις εξαγωγές σας',
  },

  // Schedule Builder
  scheduleBuilder: {
    title: 'Κατασκευαστής Χρονοδιαγράμματος',
    description: 'Δημιουργήστε ένα προσαρμοσμένο χρονοδιάγραμμα για επαναλαμβανόμενες εξαγωγές',
  },

  // Common
  close: 'Κλείσιμο',
  loading: 'Φόρτωση...',
  error: 'Σφάλμα',
  success: 'Επιτυχία',
  units: {
    bytes: 'B',
    kilobytes: 'KB',
    megabytes: 'MB',
    secondsShort: 's',
  },
  errors: {
    loadFailed: 'Αποτυχία φόρτωσης εξαγωγών. Παρακαλώ προσπαθήστε ξανά.',
  },
};
