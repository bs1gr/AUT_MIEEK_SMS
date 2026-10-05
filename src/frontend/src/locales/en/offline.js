export default {
  // Banner states
  offlineTitle: 'You are offline',
  offlineMessage: 'Changes will be saved locally and synced when your connection is restored.',
  backOnlineTitle: 'Back online',
  backOnlineMessage: 'Your connection has been restored. Pending changes will now sync.',
  databaseUnavailableTitle: 'The shared database is unreachable',
  databaseUnavailableMessage: 'The server cannot reach its database (QNAP). Student, attendance and grade changes are kept on this device and sent when it is back. Other changes cannot be saved until then.',

  // Pending sync counts (i18next v21+ plural suffixes: key = one, key_other = other)
  pendingChanges: '{{count}} pending change',
  pendingChanges_other: '{{count}} pending changes',
  pendingStudents: '{{count}} student update',
  pendingStudents_other: '{{count}} student updates',
  pendingAttendance: '{{count}} attendance record',
  pendingAttendance_other: '{{count}} attendance records',
  pendingGrades: '{{count}} grade entry',
  pendingGrades_other: '{{count}} grade entries',

  // Actions
  dismiss: 'Dismiss',
  syncing: 'Syncing…',
  syncComplete: 'All changes synced',
};
