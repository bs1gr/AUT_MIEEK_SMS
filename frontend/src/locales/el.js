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
  dashboard: 'Πίνακας Ελέγχου',
  students: 'Σπουδαστές',
  courses: 'Μαθήματα',
  attendance: 'Παρουσίες',
  grades: 'Βαθμοί',
  calendar: 'Ημερολόγιο',
  utilsTab: 'Εργαλεία',

  // Common Actions
  save: 'Αποθήκευση',
  cancel: 'Ακύρωση',
  close: 'Κλείσιμο',
  done: 'Ολοκληρώθηκε',
  confirm: 'Επιβεβαίωση',
  edit: 'Επεξεργασία',
  delete: 'Διαγραφή',
  remove: 'Κατάργηση',
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
  backendOffline: 'Διακομιστής Χωρίς Σύνδεση',
  checking: 'Έλεγχος...',
  uptime: 'Χρόνος Λειτουργίας',
  restart: 'Επανεκκίνηση',
  exit: 'Έξοδος',
  confirmExit: 'Επιβεβαίωση Εξόδου;',
  yesExit: 'Ναι, Έξοδος',
  exiting: 'Τερματισμός...',
  serverStopped: 'Διακομιστής Σταμάτησε με Επιτυχία',
  canCloseWindow: 'Μπορείτε τώρα να κλείσετε το παράθυρο',

  // Common States & Messages
  loading: 'Φόρτωση...',
  saving: 'Αποθήκευση...',
  downloading: 'Λήψη...',
  dataLoadedSuccessfully: 'Τα δεδομένα φορτώθηκαν με επιτυχία',
  failedToLoadData: 'Αποτυχία φόρτωσης δεδομένων',
  failedToSaveData: 'Αποτυχία αποθήκευσης δεδομένων',
  fillRequiredFields: 'Συμπληρώστε όλα τα υποχρεωτικά πεδία',
  pleaseSelect: 'Παρακαλώ επιλέξτε ένα σπουδαστή και ένα μάθημα',

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
  powerTab: 'Power',

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
  failedToToggleFavorite: 'Αποτυχία αλλαγής αγαπημένου',
  searchDeleted: 'Η αναζήτηση διαγράφηκε με επιτυχία',
  
  // Advanced Filters
  advancedFilters: 'Προηγμένα Φίλτρα',
  addFilter: 'Προσθήκη Φίλτρου',
  removeFilter: 'Κατάργηση Φίλτρου',
  filterField: 'Πεδίο',
  filterOperator: 'Τελεστής',
  filterValue: 'Τιμή',
  equals: 'Ίσο με',
  contains: 'Περιέχει',
  startsWith: 'Ξεκινά με',
  greaterThan: 'Μεγαλύτερο από',
  lessThan: 'Μικρότερο από',
  between: 'Μεταξύ',
  applyFilters: 'Εφαρμογή Φίλτρων',
  resetFilters: 'Επαναφορά Φίλτρων',
  noFiltersApplied: 'Δεν εφαρμόζονται φίλτρα'
};

export default el;
