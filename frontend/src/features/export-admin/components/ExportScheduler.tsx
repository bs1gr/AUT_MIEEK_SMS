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
import { Clock, Plus, Trash2, Edit2, MoreHorizontal, Play, Pause } from 'lucide-react';
import {
  useExportSchedules,
  useCreateSchedule,
  useDeleteSchedule,
  useToggleSchedule,
} from '../hooks/useExportAdmin';
import { ExportSchedulerProps, ScheduleFrequency, CreateScheduleRequest } from '../types/export';
import { format } from 'date-fns';

const ExportScheduler: React.FC<ExportSchedulerProps> = ({
  onScheduleCreated,
  onScheduleUpdated,
  onScheduleDeleted,
}) => {
  const { t } = useTranslation('exportAdmin');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
  const { data: schedulesData, isLoading } = useExportSchedules();
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

  const handleToggle = async (schedule: any) => {
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
    <div className="space-y-6">
      {/* Form Section */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t('schedule.createTitle')}</CardTitle>
            <CardDescription>{t('schedule.createDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Schedule Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('schedule.name')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('schedule.namePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Export Type */}
                <FormField
                  control={form.control}
                  name="export_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('schedule.type')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="students">{t('type.students')}</SelectItem>
                          <SelectItem value="courses">{t('type.courses')}</SelectItem>
                          <SelectItem value="grades">{t('type.grades')}</SelectItem>
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
                      <FormLabel>{t('schedule.format')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="excel">{t('format.excel')}</SelectItem>
                          <SelectItem value="csv">{t('format.csv')}</SelectItem>
                          <SelectItem value="pdf">{t('format.pdf')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Frequency */}
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('schedule.frequency')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="HOURLY">{t('frequency.hourly')}</SelectItem>
                          <SelectItem value="DAILY">{t('frequency.daily')}</SelectItem>
                          <SelectItem value="WEEKLY">{t('frequency.weekly')}</SelectItem>
                          <SelectItem value="MONTHLY">{t('frequency.monthly')}</SelectItem>
                          <SelectItem value="CUSTOM">{t('frequency.custom')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>{t('schedule.frequencyHelp')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Cron Expression (if CUSTOM) */}
                {form.watch('frequency') === 'CUSTOM' && (
                  <FormField
                    control={form.control}
                    name="cron_expression"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('schedule.cron')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('schedule.cronPlaceholder')}
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>{t('schedule.cronHelp')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Actions */}
                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={createScheduleMutation.isPending}
                  >
                    {createScheduleMutation.isPending ? t('actions.creating') : t('actions.create')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      form.reset();
                    }}
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t('schedule.activeSchedules')}</h3>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              {t('schedule.new')}
            </Button>
          )}
        </div>

        {schedules.length === 0 ? (
          <Card className="p-8 text-center">
            <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">{t('schedule.noSchedules')}</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {schedules.map((schedule) => (
              <Card key={schedule.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">{schedule.name}</h4>
                      <Badge variant={schedule.is_active ? 'default' : 'secondary'}>
                        {schedule.is_active ? t('schedule.active') : t('schedule.inactive')}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {t(`type.${schedule.export_type}`)}
                      </Badge>
                      <Badge variant="outline" className="uppercase">
                        {schedule.export_format}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t('schedule.frequency')}: {getFrequencyDisplay(schedule.frequency)}
                      {schedule.cron_expression && ` (${schedule.cron_expression})`}
                    </p>
                    {schedule.last_run_at && (
                      <p className="text-xs text-muted-foreground">
                        {t('schedule.lastRun')}: {format(new Date(schedule.last_run_at), 'PPpp')}
                      </p>
                    )}
                    {schedule.next_run_at && (
                      <p className="text-xs text-muted-foreground">
                        {t('schedule.nextRun')}: {format(new Date(schedule.next_run_at), 'PPpp')}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleToggle(schedule)}>
                        {schedule.is_active ? (
                          <>
                            <Pause className="mr-2 h-4 w-4" />
                            {t('schedule.pause')}
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            {t('schedule.resume')}
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(schedule.id)}
                        className="text-destructive"
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
