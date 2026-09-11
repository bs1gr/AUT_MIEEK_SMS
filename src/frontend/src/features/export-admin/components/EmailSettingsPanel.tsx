/**
 * EmailSettingsPanel.tsx
 * Standalone wrapper around EmailConfigPanel for embedding outside the full
 * Export Management Dashboard (e.g. inside ControlPanel's Maintenance tab).
 */

import React from 'react';
import { EmailConfigPanel } from './index';
import {
  useEmailConfig,
  useUpdateEmailConfig,
  useTestEmailConfig,
} from '../hooks/useExportAdmin';

const EmailSettingsPanel: React.FC = () => {
  const { data: emailConfigData, isLoading } = useEmailConfig();
  const updateEmailConfig = useUpdateEmailConfig();
  const testEmailConfig = useTestEmailConfig();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <EmailConfigPanel
      config={emailConfigData?.data ?? {
        smtp_host: '',
        smtp_port: 587,
        smtp_username: '',
        smtp_password: '',
        from_email: '',
        admin_emails: [],
        notify_on_completion: true,
        notify_on_failure: true,
        notify_on_schedule_failure: true,
      }}
      onSave={async (config) => {
        await updateEmailConfig.mutateAsync(config);
      }}
      onTest={async (recipientEmail) => {
        await testEmailConfig.mutateAsync(recipientEmail || '');
      }}
    />
  );
};

export default EmailSettingsPanel;
