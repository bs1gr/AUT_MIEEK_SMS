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
import {
  ExportMetricsChart,
  EmailConfigPanel,
  ExportSettingsPanel,
  ExportDetailModal,
  PerformanceAnalytics,
} from './index';

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
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-6">
        <div className="space-y-2 flex-1">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400">
            {t('description')}
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          size="lg"
          className="w-full sm:w-auto gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">{t('actions.refresh')}</span>
          <span className="sm:hidden text-xs">{t('actions.refresh')}</span>
        </Button>
      </div>

      {/* Error Alert */}
      {jobsError && (
        <Alert variant="destructive" className="border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20">
          <AlertDescription className="text-red-800 dark:text-red-200">
            {t('errors.loadFailed')}
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 auto-rows-max">
        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('stats.totalExports')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalExports}</div>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{t('stats.allTime')}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('stats.recentExports')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.recentExports}</div>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{t('stats.last30Days')}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('stats.activeSchedules')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.activeSchedules}</div>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{t('stats.recurring')}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('stats.successRate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              {stats.successRate.toFixed(1)}%
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{t('stats.recentSuccess')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value as TabValue)}
        className="w-full space-y-6"
      >
        <div className="relative">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 bg-slate-200 dark:bg-slate-700 p-1 rounded-lg border border-slate-300 dark:border-slate-600">
            <TabsTrigger 
              value="jobs"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200 text-xs sm:text-sm"
            >
              {t('tabs.jobs')}
            </TabsTrigger>
            <TabsTrigger 
              value="schedules"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200 text-xs sm:text-sm"
            >
              {t('tabs.schedules')}
            </TabsTrigger>
            <TabsTrigger 
              value="metrics"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200 text-xs sm:text-sm"
            >
              {t('tabs.metrics')}
            </TabsTrigger>
            <TabsTrigger 
              value="analytics"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200 text-xs sm:text-sm"
            >
              {t('tabs.analytics')}
            </TabsTrigger>
            <TabsTrigger 
              value="email"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200 text-xs sm:text-sm"
            >
              {t('tabs.email')}
            </TabsTrigger>
            <TabsTrigger 
              value="settings"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200 text-xs sm:text-sm"
            >
              {t('tabs.settings')}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">{t('tabs.jobs')}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {jobsData?.data?.total ?? 0} {t('total')}
              </p>
            </div>
            <Button
              size="lg"
              className="w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white transition-colors duration-200 shadow-md hover:shadow-lg"
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
        <TabsContent value="schedules" className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">{t('tabs.schedules')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {schedulesData?.data?.length ?? 0} {t('total')}
            </p>
          </div>
          <ExportScheduler
            onScheduleCreated={handleRefresh}
            onScheduleUpdated={handleRefresh}
            onScheduleDeleted={handleRefresh}
          />
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">{t('tabs.metrics')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('last7Days')}
            </p>
          </div>
          {metricsData?.data ? (
            <ExportMetricsChart
              metrics={metricsData.data}
              period="month"
              onPeriodChange={handleRefresh}
            />
          ) : (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
              <p className="text-slate-500 dark:text-slate-400">{t('loading')}</p>
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">{t('tabs.analytics')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('performanceAnalysis')}
            </p>
          </div>
          {metricsData?.data ? (
            <PerformanceAnalytics
              metrics={metricsData.data}
              onPeriodChange={() => handleRefresh()}
            />
          ) : (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
              <p className="text-slate-500 dark:text-slate-400">{t('loading')}</p>
            </div>
          )}
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">{t('tabs.email')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('emailConfiguration')}
            </p>
          </div>
          <EmailConfigPanel onSave={handleRefresh} onTest={async () => {}} />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">{t('tabs.settings')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('exportSettings')}
            </p>
          </div>
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
