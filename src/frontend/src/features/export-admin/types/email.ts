/**
 * Types for the SMTP settings form and its API.
 */

export interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_username?: string;
  smtp_password?: string;
  from_email: string;
  admin_emails: string[];
  notify_on_completion: boolean;
  notify_on_failure: boolean;
  notify_on_schedule_failure: boolean;
  is_configured?: boolean;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    request_id?: string;
    timestamp?: string;
    version?: string;
  };
}

export interface EmailConfigPanelProps {
  config: EmailConfig;
  onSave?: (config: EmailConfig) => Promise<void>;
  onTest?: (recipientEmail: string) => Promise<void>;
}