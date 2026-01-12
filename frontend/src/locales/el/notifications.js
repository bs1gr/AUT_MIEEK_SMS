/**
 * Greek localization for notifications
 */

export const notificationsEL = {
  title: 'Ειδοποιήσεις',
  empty: 'Δεν υπάρχουν ειδοποιήσεις ακόμα',
  markAllRead: 'Σημείωση όλων ως διαβασμένες',
  unreadCount: '{count, plural, one {# μη αναγνωσμένη ειδοποίηση} other {# μη αναγνωσμένες ειδοποιήσεις}}',
  of: 'από',
  loadingNotifications: 'Φόρτωση ειδοποιήσεων...',
  errorLoadingNotifications: 'Αποτυχία φόρτωσης ειδοποιήσεων',
  notificationSent: 'Η ειδοποίηση απεστάλη με επιτυχία',
  errorSendingNotification: 'Αποτυχία αποστολής ειδοποίησης',
  settings: 'Ρυθμίσεις Ειδοποιήσεων',
  preferences: 'Προτιμήσεις',
  general: 'Γενικά',
  inApp: 'Ειδοποιήσεις Εφαρμογής',
  email: 'Ειδοποιήσεις Email',
  sms: 'Ειδοποιήσεις SMS',
  enabled: 'Ενεργοποιημένη',
  disabled: 'Απενεργοποιημένη',
  gradeUpdates: 'Ενημερώσεις Βαθμών',
  attendanceChanges: 'Αλλαγές Παρουσίας',
  courseUpdates: 'Ενημερώσεις Μαθημάτων',
  systemMessages: 'Σύστημα Μηνυμάτων',
  assignmentPosted: 'Εργασία Δημοσιεύθηκε',
  quietHours: 'Ώρες Σιωπής',
  quietHoursStart: 'Ώρα Έναρξης (HH:MM)',
  quietHoursEnd: 'Ώρα Λήξης (HH:MM)',
  quietHoursDesc: 'Μην λαμβάνετε ειδοποιήσεις κατά τις ώρες αυτές',
  phone: 'Αριθμός Τηλεφώνου',
  saveSettings: 'Αποθήκευση Ρυθμίσεων',
  settingsSaved: 'Οι ρυθμίσεις αποθηκεύθηκαν με επιτυχία',
  settingsFailed: 'Αποτυχία αποθήκευσης ρυθμίσεων',
  websocketConnected: 'Συνδεδεμένο με το διακομιστή ειδοποιήσεων',
  websocketDisconnected: 'Αποσυνδεδεμένο από τον διακομιστή ειδοποιήσεων',
  websocketReconnecting: 'Επανασύνδεση με τον διακομιστή ειδοποιήσεων...',
  websocketError: 'Σφάλμα σύνδεσης ειδοποιήσεων',
  notificationsCount: 'Έχετε {count} ειδοποιήσεις',

  // Bell component
  bell: {
    ariaLabel: 'Ειδοποιήσεις',
    title: 'Ειδοποιήσεις',
    unreadCount: '{{count}} μη αναγνωσμένη(ες) ειδοποίηση(εις)',
    offline: 'Εκτός σύνδεσης',
  },

  // Dropdown component
  dropdown: {
    ariaLabel: 'Αναπτυσσόμενη λίστα ειδοποιήσεων',
    title: 'Ειδοποιήσεις',
    markAllRead: 'Σημείωση όλων ως διαβασμένες',
    viewAll: 'Προβολή όλων των ειδοποιήσεων',
    empty: 'Δεν υπάρχουν ειδοποιήσεις',
    loading: 'Φόρτωση ειδοποιήσεων...',
  },

  // Item component
  item: {
    markAsRead: 'Σημείωση ως διαβασμένη',
    delete: 'Διαγραφή ειδοποίησης',
  },

  // Notification types
  types: {
    grade: 'Βαθμός',
    attendance: 'Παρουσία',
    announcement: 'Ανακοίνωση',
    system: 'Σύστημα',
    course: 'Μάθημα',
    enrollment: 'Εγγραφή',
    general: 'Γενική',
  },

  // Time formats
  time: {
    justNow: 'Μόλις τώρα',
    minutesAgo: 'Πριν {{count}} λεπτό(ά)',
    hoursAgo: 'Πριν {{count}} ώρα(ες)',
    daysAgo: 'Πριν {{count}} ημέρα(ες)',
  },
};

export default notificationsEL;
