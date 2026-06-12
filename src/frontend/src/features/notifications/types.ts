export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  types: {
    info: boolean;
    success: boolean;
    warning: boolean;
    error: boolean;
  };
}

export interface NotificationResponse {
  success: boolean;
  data: Notification | null;
  error?: {
    code: string;
    message: string;
  };
}

export interface NotificationsListResponse {
  success: boolean;
  data: Notification[];
  meta?: {
    total: number;
    unread: number;
  };
}
