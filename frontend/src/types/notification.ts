/**
 * Notification Types and Interfaces
 * Real-time notification system types for WebSocket and API integration
 */

export type NotificationType =
  | 'grade'
  | 'attendance'
  | 'announcement'
  | 'system'
  | 'course'
  | 'enrollment'
  | 'general';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: number;
  user_id: number;
  notification_type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any> | null;
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

// WebSocket event types
export interface NotificationEvent {
  type: 'notification' | 'notification_read' | 'notification_deleted' | 'bulk_read';
  data: Notification | { notification_id: number } | { count: number };
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: string;
}

// Hook return types
export interface UseNotificationsReturn {
  // State
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;

  // Actions
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: number) => Promise<void>;
  fetchNotifications: (params?: { skip?: number; limit?: number; unread_only?: boolean }) => Promise<void>;
  refreshUnreadCount: () => Promise<void>;

  // WebSocket
  connect: () => void;
  disconnect: () => void;
}

export interface NotificationContextValue extends UseNotificationsReturn {
  preferences: NotificationPreference | null;
  updatePreferences: (updates: Partial<NotificationPreference>) => Promise<void>;
}
