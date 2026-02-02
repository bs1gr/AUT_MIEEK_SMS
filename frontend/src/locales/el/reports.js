// Greek translations for Reports module (Ελληνικές μεταφράσεις για τη λειτουργία Αναφορών)
export default {
  // Report types
  studentPerformanceReport: 'Αναφορά Απόδοσης Μαθητή',
  bulkReport: 'Μαζική Αναφορά',

  // Actions
  generate: 'Δημιουργία Αναφοράς',
  generating: 'Δημιουργία Αναφοράς...',
  newReport: 'Νέα Αναφορά',
  print: 'Εκτύπωση Αναφοράς',
  download: 'Λήψη',
  export: 'Εξαγωγή',

  // Configuration
  configuration: 'Ρυθμίσεις',
  period: 'Περίοδος Αναφοράς',
  lastWeek: 'Τελευταία Εβδομάδα',
  lastMonth: 'Τελευταίος Μήνας',
  semester: 'Εξάμηνο',
  year: 'Ακαδημαϊκό Έτος',
  custom: 'Προσαρμοσμένη Περίοδος',
  period_week: 'Εβδομάδα',
  period_month: 'Μήνας',
  period_semester: 'Εξάμηνο',
  period_year: 'Έτος',
  period_custom: 'Προσαρμοσμένο',

  // Include options
  includeData: 'Συμπερίληψη Δεδομένων',
  includeGrades: 'Συμπερίληψη Βαθμών',
  includeAttendance: 'Συμπερίληψη Παρουσιών',
  includePerformance: 'Συμπερίληψη Απόδοσης',
  includeHighlights: 'Συμπερίληψη Επισημάνσεων',

  // Summaries
  attendanceSummary: 'Σύνοψη Παρουσιών',
  gradesSummary: 'Σύνοψη Βαθμών',
  performanceSummary: 'Σύνοψη Απόδοσης',
  courseBreakdown: 'Ανάλυση ανά Μάθημα',
  recommendations: 'Συστάσεις',
  highlights: 'Επισημάνσεις',

  // Attendance metrics
  attendanceRate: 'Ποσοστό Παρουσιών',
  totalDays: 'Συνολικές Ημέρες',
  present: 'Παρών',
  absent: 'Απών',
  late: 'Καθυστέρηση',
  excused: 'Δικαιολογημένος',
  unexcusedAbsences: 'Αδικαιολόγητες Απουσίες',
  attendanceRateValue: '{{rate}}% ({{present}}/{{total}} ημέρες)',

  // Grade metrics
  average: 'Μέσος Όρος',
  totalAssignments: 'Συνολικές Εργασίες',
  highest: 'Υψηλότερος',
  lowest: 'Χαμηλότερος',
  trend: 'Τάση',
  grade: 'Βαθμός',
  attendance: 'Παρουσία',
  absences: 'Απουσίες',

  // Trends
  trend_improving: 'Βελτιούμενη',
  trend_declining: 'Φθίνουσα',
  trend_stable: 'Σταθερή',

  // Performance
  performanceCategories: 'Απόδοση ανά Κατηγορία',
  category: 'Κατηγορία',
  averageScore: 'Μέση Βαθμολογία',

  // Recommendations (Συστάσεις)
  rec_attendance_low: '⚠️ Η παρουσία είναι κάτω από 75%. Η τακτική παρουσία είναι κρίσιμη για την ακαδημαϊκή επιτυχία.',
  rec_attendance_medium: '✓ Η παρουσία θα μπορούσε να βελτιωθεί. Στοχεύστε για ποσοστό παρουσίας 90%+.',
  rec_grades_failing: '⚠️ Οι βαθμοί είναι κάτω από το όριο επιτυχίας. Εξετάστε το ενδεχόμενο προγραμματισμού ιδιαίτερων μαθημάτων.',
  rec_grades_needs_improvement: '✓ Οι βαθμοί χρειάζονται βελτίωση. Επανεξετάστε τις μεθόδους μελέτης και ζητήστε βοήθεια στα δύσκολα μαθήματα.',
  rec_grades_excellent: '🌟 Εξαιρετική ακαδημαϊκή επίδοση! Συνεχίστε την εξαιρετική δουλειά.',
  rec_trend_declining: '⚠️ Η τάση των βαθμών είναι φθίνουσα. Επανεξετάστε τις πρόσφατες εργασίες και εντοπίστε τομείς που χρειάζονται βελτίωση.',
  rec_trend_improving: '✓ Η τάση των βαθμών βελτιώνεται. Συνεχίστε την θετική δυναμική!',
  rec_focus_courses: '📚 Εστιάστε σε: {{courses}}. Εξετάστε επιπλέον χρόνο μελέτης ή ιδιαίτερα μαθήματα.',
  rec_satisfactory: '✓ Η συνολική επίδοση είναι ικανοποιητική. Συνεχίστε να διατηρείτε καλές συνήθειες μελέτης.',

  // Messages
  error: 'Σφάλμα κατά τη δημιουργία αναφοράς. Παρακαλώ προσπαθήστε ξανά.',
  noData: 'Δεν υπάρχουν διαθέσιμα δεδομένα για την επιλεγμένη περίοδο.',
  reportGenerated: 'Η αναφορά δημιουργήθηκε επιτυχώς',

  // Status
  pending: 'Εκκρεμεί',
  processing: 'Επεξεργασία',
  completed: 'Ολοκληρώθηκε',
  failed: 'Απέτυχε'
};
