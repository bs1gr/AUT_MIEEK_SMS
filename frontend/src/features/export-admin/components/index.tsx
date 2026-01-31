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
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ===== ExportMetricsChart.tsx =====
export const ExportMetricsChart: React.FC<any> = ({ metrics, period, onPeriodChange }) => {
  const { t } = useTranslation('exportAdmin');

  if (!metrics?.trend_data) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('metrics.duration')}</CardTitle>
          <CardDescription>{t('metrics.durationDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.trend_data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="duration_ms" stroke="#3b82f6" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('metrics.successRate')}</CardTitle>
          <CardDescription>{t('metrics.successRateDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.trend_data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="success_count" stackId="a" fill="#10b981" />
              <Bar dataKey="failure_count" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

// ===== EmailConfigPanel.tsx =====
export const EmailConfigPanel: React.FC<any> = ({ config, onSave, onTest }) => {
  const { t } = useTranslation('exportAdmin');
  const [formData, setFormData] = React.useState(config || {});
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
    <Card>
      <CardHeader>
        <CardTitle>{t('email.title')}</CardTitle>
        <CardDescription>{t('email.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>{t('email.host')}</Label>
            <Input
              placeholder="smtp.gmail.com"
              value={formData.smtp_host || ''}
              onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
            />
          </div>
          <div>
            <Label>{t('email.port')}</Label>
            <Input
              type="number"
              placeholder="587"
              value={formData.smtp_port || ''}
              onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) })}
            />
          </div>
          <div>
            <Label>{t('email.username')}</Label>
            <Input
              placeholder="your-email@gmail.com"
              value={formData.smtp_username || ''}
              onChange={(e) => setFormData({ ...formData, smtp_username: e.target.value })}
            />
          </div>
          <div>
            <Label>{t('email.password')}</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={formData.smtp_password || ''}
              onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label>{t('email.fromEmail')}</Label>
          <Input
            placeholder="noreply@example.com"
            value={formData.from_email || ''}
            onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
          />
        </div>

        <div>
          <Label>{t('email.adminEmails')}</Label>
          <Textarea
            placeholder="admin@example.com&#10;admin2@example.com"
            value={(formData.admin_emails || []).join('\n')}
            onChange={(e) =>
              setFormData({
                ...formData,
                admin_emails: e.target.value.split('\n').filter((e) => e.trim()),
              })
            }
          />
        </div>

        <div className="flex gap-4">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? t('saving') : t('save')}
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={isTesting}>
            {isTesting ? t('testing') : t('email.testButton')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ===== ExportSettingsPanel.tsx =====
export const ExportSettingsPanel: React.FC<any> = ({ settings, onSave }) => {
  const { t } = useTranslation('exportAdmin');
  const [formData, setFormData] = React.useState(settings || {});
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
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.title')}</CardTitle>
        <CardDescription>{t('settings.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>{t('settings.retentionDays')}</Label>
            <Input
              type="number"
              value={formData.retention_days || 30}
              onChange={(e) =>
                setFormData({ ...formData, retention_days: parseInt(e.target.value) })
              }
            />
          </div>
          <div>
            <Label>{t('settings.maxConcurrent')}</Label>
            <Input
              type="number"
              value={formData.max_concurrent_exports || 5}
              onChange={(e) =>
                setFormData({ ...formData, max_concurrent_exports: parseInt(e.target.value) })
              }
            />
          </div>
          <div>
            <Label>{t('settings.timeout')}</Label>
            <Input
              type="number"
              value={formData.export_timeout_seconds || 300}
              onChange={(e) =>
                setFormData({ ...formData, export_timeout_seconds: parseInt(e.target.value) })
              }
            />
          </div>
          <div>
            <Label>{t('settings.maxRecords')}</Label>
            <Input
              type="number"
              value={formData.max_records_per_export || 100000}
              onChange={(e) =>
                setFormData({ ...formData, max_records_per_export: parseInt(e.target.value) })
              }
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? t('saving') : t('save')}
        </Button>
      </CardContent>
    </Card>
  );
};

// ===== ExportDetailModal.tsx =====
export const ExportDetailModal: React.FC<any> = ({ open, onClose, export: exp }) => {
  const { t } = useTranslation('exportAdmin');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{t('detail.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <p>
              <strong>{t('detail.id')}:</strong> {exp?.id}
            </p>
            <p>
              <strong>{t('detail.type')}:</strong> {exp?.export_type}
            </p>
            <p>
              <strong>{t('detail.format')}:</strong> {exp?.export_format}
            </p>
            <p>
              <strong>{t('detail.status')}:</strong> {exp?.status}
            </p>
            <p>
              <strong>{t('detail.progress')}:</strong> {exp?.progress_percent}%
            </p>
          </div>
          <Button onClick={onClose} variant="outline" className="w-full">
            {t('close')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// ===== PerformanceAnalytics.tsx =====
export const PerformanceAnalytics: React.FC<any> = ({ metrics, onPeriodChange }) => {
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
            <div className="text-2xl font-bold">{metrics.average_duration_seconds?.toFixed(2)}s</div>
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
              {Object.entries(metrics.by_format).map(([format, data]: any) => (
                <div key={format} className="rounded-lg border p-4">
                  <p className="text-sm font-medium capitalize">{format}</p>
                  <p className="text-2xl font-bold">{data.count}</p>
                  <p className="text-xs text-muted-foreground">{data.success_rate?.toFixed(1)}% success</p>
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
export const FilterBuilder: React.FC<any> = ({ entityType, value, onChange }) => {
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
export const ScheduleBuilder: React.FC<any> = ({ frequency, cronExpression, onChange }) => {
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
