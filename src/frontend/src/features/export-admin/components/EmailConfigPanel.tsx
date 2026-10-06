/**
 * SMTP settings form for the Control Panel (rendered by EmailSettingsPanel).
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { EmailConfigPanelProps } from '../types/email';

export const EmailConfigPanel: React.FC<EmailConfigPanelProps> = ({ config, onSave, onTest }) => {
  const { t } = useTranslation('exportAdmin');
  const [formData, setFormData] = React.useState(config);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);

  React.useEffect(() => {
    setFormData(config);
  }, [config]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave?.(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const recipient = formData.from_email || formData.smtp_username || '';
      await onTest?.(recipient);
    } finally {
      setIsTesting(false);
    }
  };

  const isConfigured = config.is_configured ?? false;

  return (
    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
      <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-linear-to-r/srgb from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-slate-900 dark:text-white">{t('email.title')}</CardTitle>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isConfigured
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-slate-400'}`} />
            {isConfigured ? t('email.statusActive') : t('email.statusNotConfigured')}
          </span>
        </div>
        <CardDescription className="text-slate-600 dark:text-slate-400">{t('email.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* SMTP Configuration Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* SMTP Host */}
          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-300 font-medium">{t('email.host')}</Label>
            <Input
              placeholder={t('email.hostPlaceholder')}
              value={formData.smtp_host || ''}
              onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
              className="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
            />
          </div>

          {/* SMTP Port */}
          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-300 font-medium">{t('email.port')}</Label>
            <Input
              type="number"
              placeholder={t('email.portPlaceholder')}
              value={formData.smtp_port || ''}
              onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) })}
              className="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-300 font-medium">{t('email.username')}</Label>
            <Input
              placeholder={t('email.usernamePlaceholder')}
              value={formData.smtp_username || ''}
              onChange={(e) => setFormData({ ...formData, smtp_username: e.target.value })}
              className="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-300 font-medium">{t('email.password')}</Label>
            <Input
              type="password"
              name="smtp_password"
              autoComplete="current-password"
              placeholder={t('email.passwordPlaceholder')}
              value={formData.smtp_password || ''}
              onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
              className="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
            />
          </div>
        </div>

        {/* From Email */}
        <div className="space-y-2">
          <Label className="text-slate-700 dark:text-slate-300 font-medium">{t('email.fromEmail')}</Label>
          <Input
            placeholder={t('email.fromEmailPlaceholder')}
            value={formData.from_email || ''}
            onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
            className="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
          />
        </div>

        {/* Admin Emails */}
        <div className="space-y-2">
          <Label className="text-slate-700 dark:text-slate-300 font-medium">{t('email.adminEmails')}</Label>
          <Textarea
            placeholder={t('email.adminEmailsPlaceholder')}
            value={(formData.admin_emails || []).join('\n')}
            onChange={(e) =>
              setFormData({
                ...formData,
                admin_emails: e.target.value.split('\n').filter((e) => e.trim()),
              })
            }
            className="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200 resize-none"
            rows={4}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('email.adminEmailsHint')}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t('actions.saving')}
              </div>
            ) : (
              t('actions.save')
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={isTesting}
            className="flex-1 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
          >
            {isTesting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 dark:border-slate-300 border-t-transparent" />
                {t('actions.testing')}
              </div>
            ) : (
              t('email.testButton')
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
