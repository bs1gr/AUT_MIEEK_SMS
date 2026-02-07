/**
 * Greek translations for Search and Filters
 */

export default {
  page_title: 'Προχωρημένη Αναζήτηση',
  page_description: 'Αναζήτηση και φιλτράρισμα σπουδαστών, μαθημάτων και βαθμών',
  typeStudent: 'Σπουδαστές',
  typeCourse: 'Μαθήματα',
  typeGrade: 'Βαθμοί',
  search_placeholder: 'Αναζήτηση σπουδαστών, μαθημάτων, βαθμών...',
  search_label: 'Αναζήτηση',
  search_aria_label: 'Αναζήτηση σπουδαστών, μαθημάτων ή βαθμών',
  clear_search: 'Εκκαθάριση αναζήτησης',
  loading: 'Φόρτωση αποτελεσμάτων αναζήτησης',
  searching: 'Αναζήτηση...',
  filter_by_type: 'Τύπος',
  entity_type_aria_label: 'Φιλτράρισμα κατά τύπο οντότητας',
  all_types: 'Όλα',
  placeholder: {
    students: 'Αναζητήστε σπουδαστές...',
    courses: 'Αναζητήστε μαθήματα...',
    grades: 'Αναζητήστε βαθμούς...'
  },
  ariaLabel: 'Αναζήτηση',
  search: 'Αναζήτηση',
  noSuggestions: 'Δεν βρέθηκαν προτάσεις',
  unknown: 'Άγνωστο',
  type: {
    student: 'Σπουδαστής',
    course: 'Μάθημα',
    grade: 'Βαθμός'
  },
  stats: {
    students: 'Σπουδαστές',
    courses: 'Μαθήματα',
    grades: 'Βαθμοί'
  },
  // Γενικές ετικέτες για τη λίστα αποθηκευμένων αναζητήσεων
  filters: 'φίλτρα',
  noSavedSearches: 'Δεν υπάρχουν αποθηκευμένες αναζητήσεις',
  noFavoriteSearches: 'Δεν βρέθηκαν αγαπημένες αναζητήσεις',
  createFirstSearch: 'Δημιουργήστε την πρώτη σας αναζήτηση για να ξεκινήσετε',
  presets: {
    title: 'Προκαθορισμένα Φίλτρα',
    activeStudents: 'Ενεργοί Σπουδαστές',
    currentYear: 'Τρέχον Έτος',
    recentEnrollments: 'Πρόσφατες Εγγραφές',
    highCredit: 'Μαθήματα Υψηλών Μονάδων',
    coreCourses: 'Βασικά Μαθήματα',
    threeCredits: 'Μαθήματα 3 Μονάδων',
    highGrades: 'Υψηλοί Βαθμοί',
    passingOnly: 'Επιτυχόντες Βαθμοί',
    failing: 'Αποτυχόντες Βαθμοί',
  },
  saved: {
    title: 'Αποθηκευμένες Αναζητήσεις',
    description: 'Προβολή και διαχείριση των αποθηκευμένων αναζητήσεών σας',
    save: 'Αποθήκευση Αναζήτησης',
    load: 'Φόρτωση',
    delete: 'Διαγραφή',
    enterName: 'Εισάγετε όνομα αναζήτησης',
    nameRequired: 'Απαιτείται όνομα αναζήτησης',
    success: 'Η αναζήτηση αποθηκεύτηκε επιτυχώς',
    limit: 'Μέγιστο 10 αποθηκευμένες αναζητήσεις ανά τύπο',
    showingSearches: 'Εμφάνιση {{count}} από {{total}} αναζητήσεις',
    filterByType: 'Φιλτράρισμα ανά τύπο',
    favoritesOnly: 'Μόνο αγαπημένα',
    toggleFavorite: 'Εναλλαγή αγαπημένου',
    loadSearch: 'Φόρτωση αναζήτησης',
  },
  advanced: {
    title: 'Προχωρημένα Φίλτρα',
    apply: 'Εφαρμογή Φίλτρων',
    reset: 'Επαναφορά Φίλτρων',
    collapse: 'Σύμπτυξη Φίλτρων',
    expand: 'Ανάπτυξη Φίλτρων',
  },
  fields: {
    firstName: 'Όνομα',
    lastName: 'Επώνυμο',
    email: 'Email',
    status: 'Κατάσταση',
    academicYear: 'Ακαδημαϊκό Έτος',
    courseName: 'Όνομα Μαθήματος',
    courseCode: 'Κωδικός Μαθήματος',
    credits: 'Μονάδες',
    gradeMin: 'Ελάχιστος Βαθμός',
    gradeMax: 'Μέγιστος Βαθμός',
    gradeDateFrom: 'Ημερομηνία από',
    gradeDateTo: 'Ημερομηνία έως',
    passed: 'Επιτυχών',
    studentId: 'ID Σπουδαστή',
    courseId: 'ID Μαθήματος',
    enterValue: 'Εισάγετε τιμή'
  },
  filters: {
    title: 'Φίλτρα',
    custom: 'Προσαρμοσμένα Φίλτρα',
    byDateFrom: 'Από',
    byDateTo: 'Έως',
    gradeDateHint: 'Χρησιμοποιήστε το εύρος ημερομηνιών παραπάνω για φιλτράρισμα ιστορικών βαθμών.'
  },
  sort: {
    label: 'Ταξινόμηση κατά',
    directionLabel: 'Κατεύθυνση ταξινόμησης',
    relevance: 'Σχετικότητα',
    name: 'Όνομα',
    email: 'Email',
    created: 'Ημ/νία δημιουργίας',
    updated: 'Ημ/νία ενημέρωσης',
    asc: 'Αύξουσα',
    desc: 'Φθίνουσα'
  },
  pagination: {
    range: '{{start}}-{{end}} από {{total}} αποτελέσματα'
  },
  pageLabel: 'Σελίδα {{page}}',
  limitLabel: 'Αποτελέσματα ανά σελίδα',
  limitOption: '{{count}} ανά σελίδα',
  typeLabel: 'Τύπος',
  queryLabel: 'Ερώτημα',
  findings: 'Ευρήματα',
  resultsTitle: 'Αποτελέσματα',
  resultsSummary: '{{count}} συνολικά αποτελέσματα',
  noResults: 'Δεν βρέθηκαν αποτελέσματα',
  viewDetails: 'Προβολή λεπτομερειών',
  facets: {
    title: 'Βελτίωση αποτελεσμάτων',
    subtitle: 'Χρησιμοποιήστε τα facets για περιορισμό',
    total: '{{total}} αντιστοιχίες',
    status: 'Κατάσταση',
    enrollment_type: 'Τύπος φοίτησης',
    months: 'Μήνες',
    loading: 'Φόρτωση facets...',
    empty: 'Δεν υπάρχουν διαθέσιμα φίλτρα',
    search: 'Αναζήτηση τιμών...',
    values: {
      active: 'Ενεργός',
      inactive: 'Ανενεργός',
      suspended: 'Αναστολή',
      'full-time': 'Πλήρης φοίτηση',
      'part-time': 'Μερική φοίτηση'
    }
  },
  advancedFilters: {
    title: 'Προχωρημένα Φίλτρα',
    addFilter: 'Προσθήκη Φίλτρου',
    clearAll: 'Εκκαθάριση Όλων',
    removeFilter: 'Αφαίρεση αυτού του φίλτρου',
    empty: 'Δεν έχουν προστεθεί φίλτρα',
    min: 'Ελάχιστη τιμή',
    max: 'Μέγιστη τιμή',
    condition: {
      field: 'Πεδίο',
      operator: 'Τελεστής',
      value: 'Τιμή',
      selectField: 'Επιλέξτε πεδίο...',
      selectOperator: 'Επιλέξτε τελεστή...'
    },
    operators: {
      equals: 'Ισούται',
      contains: 'Περιέχει',
      startsWith: 'Ξεκινά με',
      greaterThan: 'Μεγαλύτερο από',
      lessThan: 'Μικρότερο από',
      between: 'Μεταξύ',
      isEmpty: 'Είναι κενό',
      isNotEmpty: 'Δεν είναι κενό'
    }
  },
  results: {
    loading: 'Φόρτωση αποτελεσμάτων...',
    empty: 'Δεν βρέθηκαν αποτελέσματα',
    emptyHint: 'Δοκιμάστε να προσαρμόσετε τα κριτήρια αναζήτησης ή τα φίλτρα',
    error: 'Σφάλμα φόρτωσης αποτελεσμάτων',
    retry: 'Δοκιμάστε Ξανά',
    result: 'αποτέλεσμα',
    results: 'αποτελέσματα',
    list: 'Αποτελέσματα αναζήτησης',
    sortBy: 'Ταξινόμηση κατά',
    relevance: 'Συνάφεια',
    sort: {
      relevance: 'Συνάφεια',
      name: 'Όνομα',
      newest: 'Νεότερα',
      updated: 'Πρόσφατα Ενημερωμένα'
    }
  },
  students: {
    status: {
      active: 'Ενεργός',
      inactive: 'Ανενεργός',
      graduated: 'Απόφοιτος'
    },
    courses: 'Μαθήματα',
    more: 'περισσότερα'
  },
  courses: {
    status: {
      active: 'Ενεργό',
      archived: 'Αρχειοθετημένο'
    },
    instructor: 'Διδάσκων'
  },
  grades: {
    points: 'μόρια',
    outOf: '/ {{max}}',
    student: 'Σπουδαστής',
    course: 'Μάθημα'
  },
  history: {
    title: 'Ιστορικό Αναζήτησης',
    clear: 'Εκκαθάριση Όλων',
    empty: 'Δεν υπάρχουν πρόσφατες αναζητήσεις.'
  },
  queryBuilder: {
    title: 'Προχωρημένος Κατασκευαστής Ερωτημάτων',
    group: 'Τελεστής ομάδας',
    and: 'ΚΑΙ',
    or: 'Ή',
    noteOr: 'Σημείωση: Η ομαδοποίηση OR είναι μόνο UI προς το παρόν· το backend εφαρμόζει επίπεδα φίλτρα.',
    noteAnd: 'Τα φίλτρα συνδυάζονται με AND.'
  },
  errorSearching: 'Σφάλμα κατά την αναζήτηση',
  equals: 'Ισούται',
  contains: 'Περιέχει',
  startsWith: 'Ξεκινά με',
  greaterThan: 'Μεγαλύτερο από',
  lessThan: 'Μικρότερο από',
  between: 'Μεταξύ',
  isEmpty: 'Είναι κενό',
  isNotEmpty: 'Δεν είναι κενό',
  advancedFilters: 'Προχωρημένα Φίλτρα',
  addFilter: 'Προσθήκη Φίλτρου',
  noFiltersApplied: 'Δεν έχουν εφαρμοστεί φίλτρα',
  filterField: 'Πεδίο Φίλτρου',
  filterOperator: 'Τελεστής Φίλτρου',
  filterValue: 'Τιμή Φίλτρου',
  resetFilters: 'Επαναφορά Φίλτρων',
  applyFilters: 'Εφαρμογή Φίλτρων'
};
