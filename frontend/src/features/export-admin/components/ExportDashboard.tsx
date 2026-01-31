/**
 * ExportDashboard.tsx
 * Main admin dashboard for export management
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, RefreshCw, Plus } from 'lucide-react';

// Import child components
import ExportJobList from './ExportJobList';
import ExportScheduler from './ExportScheduler';
import ExportMetricsChart from './ExportMetricsChart';
import EmailConfigPanel from './EmailConfigPanel';
import ExportSettingsPanel from './ExportSettingsPanel';
import ExportDetailModal from './ExportDetailModal';
import PerformanceAnalytics from './PerformanceAnalytics';

// Import hooks
import {
  useExportJobs,
  useExportMetrics,
  useRefreshExports,
  useExportSchedules,
} from '../hooks/useExportAdmin';
import { ExportDashboardProps } from '../types/export';

type TabValue = 'jobs' | 'schedules' | 'metrics' | 'settings' | 'email' | 'analytics';

const ExportDashboard: React.FC<ExportDashboardProps> = ({ onRefresh }) => {
  const { t } = useTranslation('exportAdmin');
  const [activeTab, setActiveTab] = useState<TabValue>('jobs');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // API hooks
  const { data: jobsData, isLoading: jobsLoading, error: jobsError } = useExportJobs({
    skip: 0,
    limit: 10,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const { data: schedulesData } = useExportSchedules();
  const { data: metricsData } = useExportMetrics(7);

  const refreshExports = useRefreshExports();

  const handleRefresh = () => {
    refreshExports();
    onRefresh?.();
  };

  // Calculate quick stats
  const stats = {
    totalExports: jobsData?.data?.total ?? 0,
    recentExports: jobsData?.data?.items?.length ?? 0,
    activeSchedules: schedulesData?.data?.filter((s) => s.is_active).length ?? 0,
    successRate: metricsData?.data?.success_rate_percent ?? 0,
  };

  return (
    <div className="w-full space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('actions.refresh')}
        </Button>
      </div>

      {/* Error Alert */}
      {jobsError && (
        <Alert variant="destructive">
          <AlertDescription>{t('errors.loadFailed')}</AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.totalExports')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalExports}</div>
            <p className="text-xs text-muted-foreground">{t('stats.allTime')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.recentExports')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentExports}</div>
            <p className="text-xs text-muted-foreground">{t('stats.last30Days')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.activeSchedules')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSchedules}</div>
            <p className="text-xs text-muted-foreground">{t('stats.recurring')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.successRate')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{t('stats.recentSuccess')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="jobs">{t('tabs.jobs')}</TabsTrigger>
          <TabsTrigger value="schedules">{t('tabs.schedules')}</TabsTrigger>
          <TabsTrigger value="metrics">{t('tabs.metrics')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('tabs.analytics')}</TabsTrigger>
          <TabsTrigger value="email">{t('tabs.email')}</TabsTrigger>
          <TabsTrigger value="settings">{t('tabs.settings')}</TabsTrigger>
        </TabsList>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('tabs.jobs')}</h2>
            <Button
              onClick={() => setActiveTab('jobs')}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('actions.newExport')}
            </Button>
          </div>
          <ExportJobList
            onJobSelected={(job) => {
              setSelectedJobId(job.id);
              setShowDetailModal(true);
            }}
            onJobDeleted={handleRefresh}
            onJobDownloaded={() => {}}
          />
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="space-y-4">
          <h2 className="text-lg font-semibold">{t('tabs.schedules')}</h2>
          <ExportScheduler
            onScheduleCreated={handleRefresh}
            onScheduleUpdated={handleRefresh}
            onScheduleDeleted={handleRefresh}
          />
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <h2 className="text-lg font-semibold">{t('tabs.metrics')}</h2>
          {metricsData?.data && (
            <ExportMetricsChart
              metrics={metricsData.data}
              period="month"
              onPeriodChange={handleRefresh}
            />
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <h2 className="text-lg font-semibold">{t('tabs.analytics')}</h2>
          {metricsData?.data && (
            <PerformanceAnalytics
              metrics={metricsData.data}
              onPeriodChange={() => handleRefresh()}
            />
          )}
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-4">
          <h2 className="text-lg font-semibold">{t('tabs.email')}</h2>
          <EmailConfigPanel onSave={handleRefresh} onTest={async () => {}} />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <h2 className="text-lg font-semibold">{t('tabs.settings')}</h2>
          <ExportSettingsPanel onSave={handleRefresh} />
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      {selectedJobId && (
        <ExportDetailModal
          open={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedJobId(null);
          }}
        />
      )}
    </div>
  );
};

export default ExportDashboard;
