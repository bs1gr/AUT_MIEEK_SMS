/**
 * ExportScheduler.tsx
 * Component for creating and managing export schedules
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Clock, Plus, Trash2 } from 'lucide-react';
import {
  useExportSchedules,
  useCreateSchedule,
  useDeleteSchedule,
  useToggleSchedule,
} from '../hooks/useExportAdmin';
import { ExportSchedulerProps, ScheduleFrequency, CreateScheduleRequest, ExportSchedule } from '../types/export';
import { format } from 'date-fns';

const ExportScheduler: React.FC<ExportSchedulerProps> = ({
  onScheduleCreated,
  onScheduleUpdated,
  onScheduleDeleted,
}) => {
  const { t } = useTranslation('exportAdmin');
  const [showForm, setShowForm] = useState(false);

  // Form setup
  const form = useForm<CreateScheduleRequest>({
    defaultValues: {
      name: '',
      export_type: 'students',
      export_format: 'excel',
      frequency: 'DAILY',
    },
  });

  // API calls
  const { data: schedulesData, isLoading: _isLoading } = useExportSchedules();
  const createScheduleMutation = useCreateSchedule();
  const deleteScheduleMutation = useDeleteSchedule();
  const toggleScheduleMutation = useToggleSchedule();

  const schedules = schedulesData?.data || [];

  // Form submission
  const onSubmit = async (data: CreateScheduleRequest) => {
    await createScheduleMutation.mutateAsync(data);
    form.reset();
    setShowForm(false);
    onScheduleCreated?.({
      id: '',
      name: data.name,
      export_type: data.export_type,
      export_format: data.export_format || 'excel',
      frequency: data.frequency,
      cron_expression: data.cron_expression,
      filters: data.filters,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  // Handlers
  const handleDelete = async (scheduleId: string) => {
    if (confirm(t('confirmDeleteSchedule'))) {
      await deleteScheduleMutation.mutateAsync(scheduleId);
      onScheduleDeleted?.(scheduleId);
    }
  };

  const handleToggle = async (schedule: ExportSchedule) => {
    await toggleScheduleMutation.mutateAsync({
      scheduleId: schedule.id,
      isActive: !schedule.is_active,
    });
    onScheduleUpdated?.(schedule);
  };

  // Format frequency display
  const getFrequencyDisplay = (frequency: ScheduleFrequency) => {
    const display: Record<ScheduleFrequency, string> = {
      HOURLY: t('frequency.hourly'),
      DAILY: t('frequency.daily'),
      WEEKLY: t('frequency.weekly'),
      MONTHLY: t('frequency.monthly'),
      CUSTOM: t('frequency.custom'),
    };
    return display[frequency] || frequency;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Form Toggle Button */}
      {!showForm && (
        <Button
          onClick={() => setShowForm(true)}
          size="lg"
          className="w-full gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white transition-colors duration-200 shadow-md hover:shadow-lg"
        >
          <Plus className="h-4 w-4" />
          {t('actions.create')}
        </Button>
      )}

      {/* Form Section */}
      {showForm && (
        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg animate-in slide-in-from-top-4 duration-300">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800">
            <CardTitle className="text-lg text-slate-900 dark:text-white">{t('schedule.createTitle')}</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">{t('schedule.createDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Schedule Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">{t('schedule.name')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('schedule.namePlaceholder')}
                          {...field}
                          className="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Export Type */}
                  <FormField
                    control={form.control}
                    name="export_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">{t('schedule.type')}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-blue-500">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                            <SelectItem value="students" className="text-slate-900 dark:text-white">{t('type.students')}</SelectItem>
                            <SelectItem value="courses" className="text-slate-900 dark:text-white">{t('type.courses')}</SelectItem>
                            <SelectItem value="grades" className="text-slate-900 dark:text-white">{t('type.grades')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Export Format */}
                  <FormField
                    control={form.control}
                    name="export_format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">{t('schedule.format')}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-blue-500">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                            <SelectItem value="excel" className="text-slate-900 dark:text-white">{t('format.excel')}</SelectItem>
                            <SelectItem value="csv" className="text-slate-900 dark:text-white">{t('format.csv')}</SelectItem>
                            <SelectItem value="pdf" className="text-slate-900 dark:text-white">{t('format.pdf')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Frequency */}
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">{t('schedule.frequency')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                          <SelectItem value="HOURLY" className="text-slate-900 dark:text-white">{t('frequency.hourly')}</SelectItem>
                          <SelectItem value="DAILY" className="text-slate-900 dark:text-white">{t('frequency.daily')}</SelectItem>
                          <SelectItem value="WEEKLY" className="text-slate-900 dark:text-white">{t('frequency.weekly')}</SelectItem>
                          <SelectItem value="MONTHLY" className="text-slate-900 dark:text-white">{t('frequency.monthly')}</SelectItem>
                          <SelectItem value="CUSTOM" className="text-slate-900 dark:text-white">{t('frequency.custom')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-slate-600 dark:text-slate-400 text-xs">{t('schedule.frequencyHelp')}</FormDescription>
                      <FormMessage className="text-red-600 dark:text-red-400" />
                    </FormItem>
                  )}
                />

                {/* Cron Expression (if CUSTOM) */}
                {form.watch('frequency') === 'CUSTOM' && (
                  <FormField
                    control={form.control}
                    name="cron_expression"
                    render={({ field }) => (
                      <FormItem className="animate-in fade-in duration-200">
                        <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">{t('schedule.cron')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('schedule.cronPlaceholder')}
                            {...field}
                            value={field.value || ''}
                            className="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
                          />
                        </FormControl>
                        <FormDescription className="text-slate-600 dark:text-slate-400 text-xs">{t('schedule.cronHelp')}</FormDescription>
                        <FormMessage className="text-red-600 dark:text-red-400" />
                      </FormItem>
                    )}
                  />
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Button
                    type="submit"
                    disabled={createScheduleMutation.isPending}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium transition-colors duration-200 shadow-md hover:shadow-lg"
                  >
                    {createScheduleMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        {t('actions.creating')}
                      </div>
                    ) : (
                      t('actions.create')
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      form.reset();
                    }}
                    className="flex-1 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
                  >
                    {t('actions.cancel')}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Schedules List */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">{t('schedule.activeSchedules')}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('schedule.scheduleCount', { count: schedules.length })}</p>
          </div>
          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              size="sm"
              className="gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              <Plus className="h-4 w-4" />
              {t('schedule.new')}
            </Button>
          )}
        </div>

        {schedules.length === 0 ? (
          <Card className="p-8 text-center border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <Clock className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-600" />
            <p className="mt-4 text-slate-600 dark:text-slate-400 font-medium">{t('schedule.noSchedules')}</p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">{t('schedule.noSchedulesHint')}</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {schedules.map((schedule) => (
              <Card
                key={schedule.id}
                className="p-5 sm:p-6 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-lg transition-shadow duration-200"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Schedule Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-3">
                      <h4 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white truncate">{schedule.name}</h4>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant={schedule.is_active ? 'default' : 'secondary'}
                          className={schedule.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }
                        >
                          {schedule.is_active ? t('schedule.active') : t('schedule.inactive')}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 capitalize"
                        >
                          {t(`type.${schedule.export_type}`)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 uppercase text-xs"
                        >
                          {schedule.export_format}
                        </Badge>
                      </div>
                    </div>

                    {/* Schedule Details */}
                    <div className="space-y-2 text-sm">
                      <p className="text-slate-600 dark:text-slate-400">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{t('schedule.frequency')}:</span> {getFrequencyDisplay(schedule.frequency)}
                        {schedule.cron_expression && (
                          <span className="ml-2 font-mono text-xs text-slate-500 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                            {schedule.cron_expression}
                          </span>
                        )}
                      </p>
                      {schedule.last_run_at && (
                        <p className="text-slate-500 dark:text-slate-400 text-xs">
                          <span className="font-medium text-slate-600 dark:text-slate-300">{t('schedule.lastRun')}:</span> {format(new Date(schedule.last_run_at), 'PPpp')}
                        </p>
                      )}
                      {schedule.next_run_at && (
                        <p className="text-slate-500 dark:text-slate-400 text-xs">
                          <span className="font-medium text-slate-600 dark:text-slate-300">{t('schedule.nextRun')}:</span> {format(new Date(schedule.next_run_at), 'PPpp')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
                      >
                        <Plus className="h-5 w-5" />
                        <span className="sr-only">{t('actions.menu')}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                    >
                      <DropdownMenuItem
                        onClick={() => handleToggle(schedule)}
                        className="text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        {schedule.is_active ? (
                          <>
                            <Clock className="mr-2 h-4 w-4" />
                            <span>{t('schedule.pause')}</span>
                          </>
                        ) : (
                          <>
                            <Clock className="mr-2 h-4 w-4" />
                            <span>{t('schedule.resume')}</span>
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(schedule.id)}
                        className="text-red-600 dark:text-red-400 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('actions.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportScheduler;
