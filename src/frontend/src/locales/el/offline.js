export default {
  // Banner states
  offlineTitle: 'Είστε εκτός σύνδεσης',
  offlineMessage: 'Οι αλλαγές θα αποθηκευτούν τοπικά και θα συγχρονιστούν όταν αποκατασταθεί η σύνδεσή σας.',
  backOnlineTitle: 'Επιστροφή σε σύνδεση',
  backOnlineMessage: 'Η σύνδεσή σας αποκαταστάθηκε. Οι εκκρεμείς αλλαγές θα συγχρονιστούν τώρα.',
  databaseUnavailableTitle: 'Η κοινή βάση δεδομένων δεν είναι διαθέσιμη',
  databaseUnavailableMessage: 'Ο διακομιστής δεν μπορεί να συνδεθεί με τη βάση δεδομένων (QNAP). Οι αλλαγές σε φοιτητές, παρουσίες και βαθμούς κρατούνται σε αυτή τη συσκευή και αποστέλλονται μόλις επανέλθει. Άλλες αλλαγές δεν μπορούν να αποθηκευτούν μέχρι τότε.',

  // Pending sync counts (i18next v21+ plural suffixes: key = one, key_other = other)
  pendingChanges: '{{count}} εκκρεμής αλλαγή',
  pendingChanges_other: '{{count}} εκκρεμείς αλλαγές',
  pendingStudents: '{{count}} ενημέρωση φοιτητή',
  pendingStudents_other: '{{count}} ενημερώσεις φοιτητών',
  pendingAttendance: '{{count}} εγγραφή παρουσίας',
  pendingAttendance_other: '{{count}} εγγραφές παρουσίας',
  pendingGrades: '{{count}} καταχώρηση βαθμού',
  pendingGrades_other: '{{count}} καταχωρήσεις βαθμών',

  // Actions
  dismiss: 'Απόρριψη',
  syncing: 'Συγχρονισμός…',
  syncComplete: 'Όλες οι αλλαγές συγχρονίστηκαν',
};
