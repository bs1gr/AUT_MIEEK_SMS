/**
 * English localization for notifications
 */

export const notificationsEN = {
  title: 'Notifications',
  empty: 'No notifications yet',
  markAllRead: 'Mark all as read',
  unreadCount: '{count, plural, one {# unread notification} other {# unread notifications}}',
  of: 'of',
  loadingNotifications: 'Loading notifications...',
  errorLoadingNotifications: 'Failed to load notifications',
  notificationSent: 'Notification sent successfully',
  errorSendingNotification: 'Failed to send notification',
  settings: 'Notification Settings',
  preferences: 'Preferences',
  general: 'General',
  inApp: 'In-app Notifications',
  email: 'Email Notifications',
  sms: 'SMS Notifications',
  enabled: 'Enabled',
  disabled: 'Disabled',
  gradeUpdates: 'Grade Updates',
  attendanceChanges: 'Attendance Changes',
  courseUpdates: 'Course Updates',
  systemMessages: 'System Messages',
  assignmentPosted: 'Assignment Posted',
  quietHours: 'Quiet Hours',
  quietHoursStart: 'Start Time (HH:MM)',
  quietHoursEnd: 'End Time (HH:MM)',
  quietHoursDesc: 'Do not receive notifications during these hours',
  phone: 'Phone Number',
  saveSettings: 'Save Settings',
  settingsSaved: 'Settings saved successfully',
  settingsFailed: 'Failed to save settings',
  websocketConnected: 'Connected to notification server',
  websocketDisconnected: 'Disconnected from notification server',
  websocketReconnecting: 'Reconnecting to notification server...',
  websocketError: 'Notification connection error',
  notificationsCount: 'You have {count} notifications',

  // Admin broadcast
  admin: {
    tabLabel: 'Notifications',
    title: 'Send Notification',
    description: 'Broadcast a message to all users, a role, or specific user IDs.',
    typeLabel: 'Notification type',
    targetLabel: 'Target audience',
    targetAll: 'All users',
    targetRole: 'Role',
    targetUsers: 'Specific users',
    roleLabel: 'Role',
    userIdsLabel: 'User IDs',
    userIdsPlaceholder: 'e.g., 12, 24, 57',
    userIdsHelp: 'Comma-separated numeric user IDs.',
    titleLabel: 'Title',
    messageLabel: 'Message',
    sendButton: 'Send notification',
    sending: 'Sending...',
    success: 'Notification broadcast sent.',
    error: 'Failed to send notification.',
    notAuthorized: 'Only admins with broadcast permission can send notifications.',
    validationTitle: 'Title is required.',
    validationMessage: 'Message is required.',
    validationUsers: 'Enter at least one valid user ID.',
  },

  roles: {
    admin: 'Admin',
    teacher: 'Teacher',
    student: 'Student',
    viewer: 'Viewer',
  },

  // Bell component
  bell: {
    ariaLabel: 'Notifications',
    title: 'Notifications',
    unreadCount: '{{count}} unread notification(s)',
    offline: 'Offline',
  },

  // Dropdown component
  dropdown: {
    ariaLabel: 'Notifications dropdown',
    title: 'Notifications',
    markAllRead: 'Mark all as read',
    viewAll: 'View all notifications',
    empty: 'No notifications',
    loading: 'Loading notifications...',
  },

  // Item component
  item: {
    markAsRead: 'Mark as read',
    delete: 'Delete notification',
    viewDetails: 'View details',
    hideDetails: 'Hide details',
    details: 'Details',
  },

  // Notification types
  types: {
    grade: 'Grade',
    attendance: 'Attendance',
    announcement: 'Announcement',
    system: 'System',
    course: 'Course',
    enrollment: 'Enrollment',
    general: 'General',
  },

  // Time formats
  time: {
    justNow: 'Just now',
    minutesAgo: '{{count}} minute(s) ago',
    hoursAgo: '{{count}} hour(s) ago',
    daysAgo: '{{count}} day(s) ago',
  },
};

export default notificationsEN;
