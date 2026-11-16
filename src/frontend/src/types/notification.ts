/**
 * Notification Types and Interfaces
 * Types of the notification list, the unread count and the hook that reads them (REST API)
 */

export type NotificationType =
  | 'grade'
  | 'attendance'
  | 'announcement'
  | 'system'
  | 'course'
  | 'enrollment'
  | 'registration'
  | 'activation_email_failed'
  | 'backup_failed'
  | 'general';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: number;
  user_id: number;
  notification_type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  is_read: boolean;
  priority?: NotificationPriority;
  icon?: string;
  created_at: string;
  read_at?: string | null;
  deleted_at?: string | null;
}

export interface NotificationPreference {
  id?: number;
  user_id: number;
  // In-app notifications
  in_app_enabled: boolean;
  in_app_grade_updates: boolean;
  in_app_attendance: boolean;
  in_app_announcements: boolean;
  in_app_course_updates: boolean;
  // Email notifications
  email_enabled: boolean;
  email_grade_updates: boolean;
  email_attendance: boolean;
  email_announcements: boolean;
  email_course_updates: boolean;
  email_digest_frequency?: 'immediate' | 'daily' | 'weekly' | 'never';
  // SMS notifications (future)
  sms_enabled?: boolean;
  sms_grade_updates?: boolean;
  sms_attendance?: boolean;
}

export interface NotificationStats {
  total_count: number;
  unread_count: number;
  by_type: Record<NotificationType, number>;
  recent_count: number; // Last 24 hours
}

export interface NotificationFilter {
  unread_only?: boolean;
  notification_type?: NotificationType;
  priority?: NotificationPriority;
  start_date?: string;
  end_date?: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

// Hook options and return types
export interface UseNotificationsOptions {
  /**
   * Keep `unreadCount` current: read it when the component appears, when the browser comes
   * back online and when the page becomes visible again. For the component that shows the
   * count (the bell); the others only use the actions.
   */
  watchUnreadCount?: boolean;
}

export interface UseNotificationsReturn {
  // State
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;

  // Actions
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: number) => Promise<void>;
  fetchNotifications: (params?: { skip?: number; limit?: number; unread_only?: boolean }) => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
}

export interface NotificationContextValue extends UseNotificationsReturn {
  preferences: NotificationPreference | null;
  updatePreferences: (updates: Partial<NotificationPreference>) => Promise<void>;
}
