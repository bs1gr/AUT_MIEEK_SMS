/**
 * Export Admin Component Stubs
 * Placeholder implementations for remaining components
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useDateTimeFormatter } from '@/contexts/DateTimeSettingsContext';
import type {
  ExportMetricsChartProps,
  EmailConfigPanelProps,
  ExportSettingsPanelProps,
  ExportDetailModalProps,
  FormatMetrics,
  FilterBuilderProps,
  ScheduleBuilderProps,
} from '../types/export';

// ===== ExportMetricsChart.tsx =====
export const ExportMetricsChart: React.FC<ExportMetricsChartProps> = ({ metrics }) => {
  const { t } = useTranslation('exportAdmin');

  if (!metrics?.trend_data) return null;

  return (
    <div className="space-y-6">
      {/* Duration Trend Chart */}
      <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
          <CardTitle className="text-lg text-slate-900 dark:text-white">{t('metrics.duration')}</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">{t('metrics.durationDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.trend_data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
              <XAxis dataKey="date" stroke="#64748b" className="dark:stroke-slate-500 text-xs" />
              <YAxis stroke="#64748b" className="dark:stroke-slate-500 text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '0.5rem',
                  color: '#f1f5f9'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="duration_ms"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Success Rate Chart */}
      <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
          <CardTitle className="text-lg text-slate-900 dark:text-white">{t('metrics.successRate')}</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">{t('metrics.successRateDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.trend_data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
              <XAxis dataKey="date" stroke="#64748b" className="dark:stroke-slate-500 text-xs" />
              <YAxis stroke="#64748b" className="dark:stroke-slate-500 text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '0.5rem',
                  color: '#f1f5f9'
                }}
              />
              <Legend />
              <Bar dataKey="success_count" stackId="a" fill="#10b981" name={t('metrics.success')} />
              <Bar dataKey="failure_count" stackId="a" fill="#ef4444" name={t('metrics.failure')} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

// ===== EmailConfigPanel.tsx =====
export const EmailConfigPanel: React.FC<EmailConfigPanelProps> = ({ config, onSave, onTest }) => {
  const { t } = useTranslation('exportAdmin');
  const [formData, setFormData] = React.useState(config);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);

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
      await onTest?.();
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 pb-4">
        <CardTitle className="text-lg text-slate-900 dark:text-white">{t('email.title')}</CardTitle>
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

// ===== ExportSettingsPanel.tsx =====
export const ExportSettingsPanel: React.FC<ExportSettingsPanelProps> = ({ settings, onSave }) => {
  const { t } = useTranslation('exportAdmin');
  const [formData, setFormData] = React.useState(settings);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave?.(formData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 pb-4">
        <CardTitle className="text-lg text-slate-900 dark:text-white">{t('settings.title')}</CardTitle>
        <CardDescription className="text-slate-600 dark:text-slate-400">{t('settings.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Settings Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Retention Days */}
          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-300 font-medium">{t('settings.retentionDays')}</Label>
            <Input
              type="number"
              value={formData.retention_days || 30}
              onChange={(e) =>
                setFormData({ ...formData, retention_days: parseInt(e.target.value) })
              }
              className="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('settings.retentionDaysHint')}</p>
          </div>

          {/* Max Concurrent */}
          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-300 font-medium">{t('settings.maxConcurrent')}</Label>
            <Input
              type="number"
              value={formData.max_concurrent_exports || 5}
              onChange={(e) =>
                setFormData({ ...formData, max_concurrent_exports: parseInt(e.target.value) })
              }
              className="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('settings.maxConcurrentHint')}</p>
          </div>

          {/* Timeout */}
          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-300 font-medium">{t('settings.timeout')}</Label>
            <Input
              type="number"
              value={formData.export_timeout_seconds || 300}
              onChange={(e) =>
                setFormData({ ...formData, export_timeout_seconds: parseInt(e.target.value) })
              }
              className="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('settings.timeoutHint')}</p>
          </div>

          {/* Max Records */}
          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-300 font-medium">{t('settings.maxRecords')}</Label>
            <Input
              type="number"
              value={formData.max_records_per_export || 100000}
              onChange={(e) =>
                setFormData({ ...formData, max_records_per_export: parseInt(e.target.value) })
              }
              className="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('settings.maxRecordsHint')}</p>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium transition-colors duration-200 shadow-md hover:shadow-lg"
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
        </div>
      </CardContent>
    </Card>
  );
};

// ===== ExportDetailModal.tsx =====
export const ExportDetailModal: React.FC<ExportDetailModalProps> = ({ open, onClose, export: exp }) => {
  const { t } = useTranslation('exportAdmin');
  const { formatDateTime } = useDateTimeFormatter();

  if (!open) return null;

  const resolvedType = exp?.export_type ? t(`type.${exp.export_type}`) : '-';
  const resolvedFormat = exp?.export_format ? t(`format.${exp.export_format}`) : '-';
  const resolvedStatus = exp?.status ? t(`status.${exp.status}`) : '-';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl animate-in slide-in-from-top-4 duration-300">
        {/* Header */}
        <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl text-slate-900 dark:text-white">{t('detail.title')}</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400 mt-1">{exp?.id}</CardDescription>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors duration-200"
          >
            <span className="text-2xl">×</span>
          </button>
        </CardHeader>

        {/* Content */}
        <CardContent className="pt-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">{resolvedStatus}</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">{t('detail.currentStatus')}</p>
            </div>
            {exp?.progress_percent && (
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{exp.progress_percent}%</p>
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Export Type */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">{t('detail.type')}</p>
              <p className="text-base font-medium text-slate-900 dark:text-white">{resolvedType}</p>
            </div>

            {/* Export Format */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">{t('detail.format')}</p>
              <p className="text-base font-medium text-slate-900 dark:text-white">{resolvedFormat}</p>
            </div>

            {/* File Size */}
            {exp?.file_size_bytes && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">{t('detail.fileSize')}</p>
                <p className="text-base font-medium text-slate-900 dark:text-white">
                  {(exp.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}

            {/* Duration */}
            {exp?.duration_seconds && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">{t('detail.duration')}</p>
                <p className="text-base font-medium text-slate-900 dark:text-white">
                  {Math.round(exp.duration_seconds * 1000)} {t('detail.milliseconds')}
                </p>
              </div>
            )}

            {/* Created Date */}
            {exp?.created_at && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">{t('detail.created')}</p>
                <p className="text-base font-medium text-slate-900 dark:text-white">
                  {formatDateTime(exp.created_at)}
                </p>
              </div>
            )}

            {/* Updated Date */}
            {exp?.updated_at && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">{t('detail.updated')}</p>
                <p className="text-base font-medium text-slate-900 dark:text-white">
                  {formatDateTime(exp.updated_at)}
                </p>
              </div>
            )}
          </div>

          {/* Error Message (if any) */}
          {exp?.error_message && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-xs font-semibold text-red-900 dark:text-red-200 uppercase">{t('detail.error')}</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-2">{exp.error_message}</p>
            </div>
          )}

          {/* Progress Bar */}
          {exp?.progress_percent !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('detail.progress')}</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{exp.progress_percent}%</p>
              </div>
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                  style={{ width: `${exp.progress_percent}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-6">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
          >
            {t('actions.close')}
          </Button>
        </div>
      </Card>
    </div>
  );
};

// ===== PerformanceAnalytics.tsx =====
export const PerformanceAnalytics: React.FC<ExportMetricsChartProps> = ({ metrics }) => {
  const { t } = useTranslation('exportAdmin');

  if (!metrics) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('analytics.avgDuration')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.average_duration_seconds?.toFixed(2)}{t('detail.seconds')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('analytics.successRate')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.success_rate_percent?.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('analytics.totalExports')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_exports}</div>
          </CardContent>
        </Card>
      </div>

      {metrics.by_format && (
        <Card>
          <CardHeader>
            <CardTitle>{t('analytics.byFormat')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(metrics.by_format).map(([format, data]) => (
                <div key={format} className="rounded-lg border p-4">
                  <p className="text-sm font-medium capitalize">{format}</p>
                  <p className="text-2xl font-bold">{(data as FormatMetrics).count}</p>
                  <p className="text-xs text-muted-foreground">
                    {(data as FormatMetrics).success_rate?.toFixed(1)}% {t('success')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ===== FilterBuilder.tsx =====
export const FilterBuilder: React.FC<FilterBuilderProps> = () => {
  const { t } = useTranslation('exportAdmin');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('filter.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{t('filter.description')}</p>
      </CardContent>
    </Card>
  );
};

// ===== ScheduleBuilder.tsx =====
export const ScheduleBuilder: React.FC<ScheduleBuilderProps> = () => {
  const { t } = useTranslation('exportAdmin');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('scheduleBuilder.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{t('scheduleBuilder.description')}</p>
      </CardContent>
    </Card>
  );
};
