/**
 * Greek translations for Search and Filters
 */

export default {
  placeholder: {
    students: 'Αναζητήστε φοιτητές...',
    courses: 'Αναζητήστε μαθήματα...',
    grades: 'Αναζητήστε βαθμούς...'
  },
  ariaLabel: 'Αναζήτηση',
  search: 'Αναζήτηση',
  noSuggestions: 'Δεν βρέθηκαν προτάσεις',
  unknown: 'Άγνωστο',
  type: {
    student: 'Φοιτητής',
    course: 'Μάθημα',
    grade: 'Βαθμός'
  },
  stats: {
    students: 'Φοιτητές',
    courses: 'Μαθήματα',
    grades: 'Βαθμοί'
  },
  presets: {
    title: 'Προκαθορισμένα Φίλτρα',
    activeStudents: 'Ενεργοί Φοιτητές',
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
    save: 'Αποθήκευση Αναζήτησης',
    load: 'Φόρτωση',
    delete: 'Διαγραφή',
    enterName: 'Εισάγετε όνομα αναζήτησης',
    nameRequired: 'Απαιτείται όνομα αναζήτησης',
    success: 'Η αναζήτηση αποθηκεύτηκε επιτυχώς',
    limit: 'Μέγιστο 10 αποθηκευμένες αναζητήσεις ανά τύπο',
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
    passed: 'Επιτυχών',
    studentId: 'ID Φοιτητή',
    courseId: 'ID Μαθήματος',
    enterValue: 'Εισάγετε τιμή'
  },
  filters: {
    title: 'Φίλτρα',
    custom: 'Προσαρμοσμένα Φίλτρα'
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
  resultsTitle: 'Αποτελέσματα',
  resultsSummary: '{{count}} συνολικά αποτελέσματα',
    noResults: 'Δεν βρέθηκαν αποτελέσματα',
  facets: {
    title: 'Βελτίωση αποτελεσμάτων',
    subtitle: 'Χρησιμοποιήστε τα facets για περιορισμό',
    total: '{{total}} αντιστοιχίες',
    status: 'Κατάσταση',
    enrollment_type: 'Τύπος φοίτησης',
    months: 'Μήνες',
    loading: 'Φόρτωση facets...',
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
    student: 'Φοιτητής',
    course: 'Μάθημα'
  }
};
