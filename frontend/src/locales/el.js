/**
 * Greek Translations (Ελληνικά)
 * Student Management System
 */

export const el = {
  // ------------------------------------
  // System & General UI (Common)
  // ------------------------------------
  systemTitle: 'MIEEK Σύστημα Διαχείρισης Σπουδαστών - AUT Automotive Engineering',
  systemSubtitle: 'Ολοκληρωμένη Πλατφόρμα Ακαδημαϊκής Διαχείρισης',

  // Localization & Utilities
  locale: 'el-GR',
  dayNames: 'Κυρ,Δευ,Τρί,Τετ,Πέμ,Παρ,Σάβ',
  language: 'el',

  // Navigation
  dashboard: 'Επισκόπηση',
  students: 'Σπουδαστές',
  courses: 'Μαθήματα',
  attendance: 'Παρουσίες',
  grades: 'Βαθμοί',
  calendar: 'Ημερολόγιο',
  searchTab: 'Αναζήτηση',
  utilsTab: 'Εργαλεία',

  // Common Actions
  save: 'Αποθήκευση',
  cancel: 'Ακύρωση',
  close: 'Κλείσιμο',
  done: 'Ολοκληρώθηκε',
  confirm: 'Επιβεβαίωση',
  edit: 'Επεξεργασία',
  delete: 'Διαγραφή',
  remove: 'Αφαίρεση',
  preview: 'Προεπισκόπηση',
  clearAll: 'Εκκαθάριση Όλων',
  actions: 'Ενέργειες',
  description: 'Περιγραφή',
  optional: 'Προαιρετικό',
  search: 'Αναζήτηση',
  view: 'Προβολή',
  noData: 'Δεν υπάρχουν διαθέσιμα δεδομένα',

  // Server Control
  serverControl: 'Πίνακας Ελέγχου',
  backendStatus: 'Κατάσταση Διακομιστή',
  backendOnline: 'Διακομιστής Σε Σύνδεση',
  backendOffline: 'Διακομιστής Αποσύνδεσης',
  checking: 'Έλεγχος...',
  uptime: 'Χρόνος Διαθεσιμότητας',
  restart: 'Επανεκκίνηση',
  exit: 'Έξοδος',
  confirmExit: 'Επιβεβαίωση Εξόδου;',
  yesExit: 'Ναι, Έξοδος',
  exiting: 'Τερματισμός...',
  serverStopped: 'Ο Διακομιστής Σταμάτησε με Επιτυχία',
  canCloseWindow: 'Μπορείτε να κλείσετε αυτό το παράθυρο',

  // Common States & Messages
  loading: 'Φόρτωση...',
  saving: 'Αποθήκευση...',
  downloading: 'Λήψη...',
  dataLoadedSuccessfully: 'Τα δεδομένα φορτώθηκαν με επιτυχία',
  failedToLoadData: 'Αποτυχία φόρτωσης δεδομένων',
  failedToSaveData: 'Αποτυχία αποθήκευσης δεδομένων',
  fillRequiredFields: 'Συμπληρώστε όλα τα υποχρεωτικά πεδία',
  pleaseSelect: 'Επιλέξτε έναν σπουδαστή και ένα μάθημα',

  // Date/Time/Weight
  date: 'Ημερομηνία',
  selectedDate: 'Επιλεγμένη Ημερομηνία',
  weight: 'Βάρος',
  weightHelp: 'Υψηλότερο βάρος = πιο σημαντικό (1.0 είναι κανονικό)',

  // Grade Scales
  percentage: 'Ποσοστό',
  gpa: 'GPA',
  letterGrade: 'Γράμμα Βαθμού',
  greekGrade: 'Ελληνικός Βαθμός (0-20)',

  // Tabs
  powerTab: 'Σύστημα',

  // Search & Filtering (Phase 4)
  searchPlaceholder: 'Αναζήτηση...',
  searchType: 'Τύπος Αναζήτησης',
  noResults: 'Δεν βρέθηκαν αποτελέσματα',
  results: 'Αποτελέσματα',
  clear: 'Εκκαθάριση',

  // Saved Searches
  favoriteSearches: 'Αγαπημένες Αναζητήσεις',
  viewAllSavedSearches: 'Προβολή Όλων των Αποθηκευμένων Αναζητήσεων',
  noSavedSearches: 'Δεν υπάρχουν αποθηκευμένες αναζητήσεις',
  saveSearch: 'Αποθήκευση Αυτής της Αναζήτησης',
  saveSearchAs: 'Αποθήκευση αναζήτησης ως...',
  savedSearchName: 'Όνομα Αναζήτησης',
  savedSearchDescription: 'Περιγραφή (προαιρετικό)',
  searchSaved: 'Η αναζήτηση αποθηκεύτηκε με επιτυχία',
  failedToSaveSearch: 'Αποτυχία αποθήκευσης αναζήτησης',
  failedToDeleteSearch: 'Αποτυχία διαγραφής αναζήτησης',
  failedToToggleFavorite: 'Αποτυχία εναλλαγής αγαπημένου',
  searchDeleted: 'Η αναζήτηση διαγράφηκε με επιτυχία',

  // Advanced Filters
  advancedFilters: 'Προχωρημένα Φίλτρα',
  addFilter: 'Προσθήκη Φίλτρου',
  removeFilter: 'Αφαίρεση Φίλτρου',
  filterField: 'Πεδίο',
  filterOperator: 'Τελεστής',
  filterValue: 'Τιμή',
  equals: 'Ισοδυναμεί',
  contains: 'Περιέχει',
  startsWith: 'Ξεκινά με',
  greaterThan: 'Μεγαλύτερο από',
  lessThan: 'Μικρότερο από',
  between: 'Μεταξύ',
  applyFilters: 'Εφαρμογή Φίλτρων',
  resetFilters: 'Επαναφορά Φίλτρων',
  noFiltersApplied: 'Δεν έχουν εφαρμοστεί φίλτρα',

  // Saved Searches Management
  savedSearches: 'Αποθηκευμένες Αναζητήσεις',
  savedSearchesDescription: 'Διαχειρίστε και οργανώστε τις αποθηκευμένες αναζητήσεις σας',
  filterByType: 'Φίλτρο κατά Τύπο',
  favoritesOnly: 'Μόνο Αγαπημένα',
  noFavoriteSearches: 'Δεν βρέθηκαν αγαπημένες αναζητήσεις',
  createFirstSearch: 'Δημιουργήστε την πρώτη σας αναζήτηση για να ξεκινήσετε',
  toggleFavorite: 'Εναλλαγή Αγαπημένου',
  loadSearch: 'Φόρτωση Αναζήτησης',
  confirmDeleteSearch: 'Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την αναζήτηση;',
  showingSearches: 'Εμφάνιση {{count}} από {{total}} αναζητήσεων',
  filters: 'φίλτρα',
  all: 'Όλα',

  // Pagination & Search UI
  previous: 'Προηγούμενο',
  next: 'Επόμενο',
  page: 'Σελίδα',
  sortBy: 'Ταξινόμηση κατά',
  query: 'Ερώτημα',

  // Import/Export (Εισαγωγή/Εξαγωγή)
  importExport: {
    openExportDialog: 'Εξαγωγή Δεδομένων',
    exportData: 'Εξαγωγή Δεδομένων',
    exportType: 'Τύπος Εξαγωγής',
    students: 'Σπουδαστές',
    courses: 'Μαθήματα',
    grades: 'Βαθμοί',
    startExport: 'Έναρξη Εξαγωγής',
    download: 'Λήψη',
    cancel: 'Ακύρωση',
    status: {
      pending: 'Εν αναμονή...',
      processing: 'Επεξεργασία...',
      completed: 'Ολοκληρώθηκε',
      failed: 'Η εξαγωγή απέτυχε',
    },
    jobId: 'Αναγνωριστικό Εργασίας',
    pollingStatus: 'Ερώτηση ενημερώσεων...',
  },
};

export default el;
