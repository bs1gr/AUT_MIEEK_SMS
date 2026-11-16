import type { TFunction } from 'i18next';

interface NotificationTextSource {
  notification_type: string;
  title: string;
  message: string;
  data?: unknown;
}

/**
 * Title/message to display. Server-generated notices (e.g. pending registrations) store
 * English text; render those from their data in the UI language. `t` must be bound to
 * the `notifications` namespace.
 */
export function getNotificationText(
  notification: NotificationTextSource,
  t: TFunction,
): { title: string; message: string } {
  const data = (notification.data ?? {}) as {
    email?: string;
    full_name?: string | null;
    reason?: string;
    error?: string;
  };
  const vars = { name: data.full_name || data.email || '', email: data.email || '' };
  if (notification.notification_type === 'backup_failed') {
    // The server's reason is shown as it is: it is a technical message, the same in any language.
    return { title: t('backupFailed.title'), message: t('backupFailed.message', { error: data.error || '' }) };
  }
  if (notification.notification_type === 'registration') {
    return { title: t('registration.title'), message: t('registration.message', vars) };
  }
  if (notification.notification_type === 'activation_email_failed') {
    const key = data.reason === 'not_configured' ? 'messageNotConfigured' : 'message';
    return { title: t('activationEmailFailed.title'), message: t(`activationEmailFailed.${key}`, vars) };
  }
  return { title: notification.title, message: notification.message };
}
