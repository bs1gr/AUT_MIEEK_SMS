/**
 * ExportJobList.tsx
 * Component for browsing and managing export jobs
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, RotateCw, Trash2, Eye, MoreHorizontal } from 'lucide-react';
import { useExportJobs, useDeleteExport, useDownloadExport, useRerunExport } from '../hooks/useExportAdmin';
import { ExportJobListProps, ExportJob } from '../types/export';
import { formatDistanceToNow } from 'date-fns';

const ExportJobList: React.FC<ExportJobListProps> = ({
  onJobSelected,
  onJobDeleted,
  onJobDownloaded,
}) => {
  const { t } = useTranslation('exportAdmin');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // API calls
  const { data: jobsData, isLoading, error } = useExportJobs({
    skip: 0,
    limit: 50,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const deleteExportMutation = useDeleteExport();
  const downloadExportMutation = useDownloadExport();
  const rerunExportMutation = useRerunExport();

  const jobs = jobsData?.data?.items || [];

  // Filter jobs
  const filteredJobs = jobs.filter((job) => {
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchesType = typeFilter === 'all' || job.export_type === typeFilter;
    const matchesSearch =
      searchTerm === '' ||
      job.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.export_type.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesType && matchesSearch;
  });

  // Handlers
  const handleDelete = async (jobId: string) => {
    if (confirm(t('confirmDelete'))) {
      await deleteExportMutation.mutateAsync(jobId);
      onJobDeleted?.(jobId);
    }
  };

  const handleDownload = async (job: ExportJob) => {
    if (!job.file_path) {
      alert(t('noFile'));
      return;
    }

    await downloadExportMutation.mutateAsync(job.id);
    onJobDownloaded?.(job.id);
  };

  const handleRerun = async (job: ExportJob) => {
    await rerunExportMutation.mutateAsync(job.id);
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      processing: 'secondary',
      pending: 'outline',
      failed: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'default'} className="capitalize">
        {t(`status.${status}`)}
      </Badge>
    );
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes}${t('units.bytes')}`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}${t('units.kilobytes')}`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}${t('units.megabytes')}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-slate-200 dark:bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Filters Section */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">{t('filters')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="col-span-1 sm:col-span-2 lg:col-span-2">
            <Input
              placeholder={t('search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200">
              <SelectValue placeholder={t('filterType')} />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
              <SelectItem value="all" className="text-slate-900 dark:text-white">{t('all')}</SelectItem>
              <SelectItem value="students" className="text-slate-900 dark:text-white">{t('type.students')}</SelectItem>
              <SelectItem value="courses" className="text-slate-900 dark:text-white">{t('type.courses')}</SelectItem>
              <SelectItem value="grades" className="text-slate-900 dark:text-white">{t('type.grades')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200">
              <SelectValue placeholder={t('filterStatus')} />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
              <SelectItem value="all" className="text-slate-900 dark:text-white">{t('all')}</SelectItem>
              <SelectItem value="completed" className="text-slate-900 dark:text-white">{t('status.completed')}</SelectItem>
              <SelectItem value="processing" className="text-slate-900 dark:text-white">{t('status.processing')}</SelectItem>
              <SelectItem value="pending" className="text-slate-900 dark:text-white">{t('status.pending')}</SelectItem>
              <SelectItem value="failed" className="text-slate-900 dark:text-white">{t('status.failed')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
            <TableRow className="hover:bg-slate-50 dark:hover:bg-slate-700">
              <TableHead className="text-slate-700 dark:text-slate-300 font-semibold text-xs uppercase tracking-wide">{t('columns.id')}</TableHead>
              <TableHead className="text-slate-700 dark:text-slate-300 font-semibold text-xs uppercase tracking-wide">{t('columns.type')}</TableHead>
              <TableHead className="text-slate-700 dark:text-slate-300 font-semibold text-xs uppercase tracking-wide">{t('columns.format')}</TableHead>
              <TableHead className="text-slate-700 dark:text-slate-300 font-semibold text-xs uppercase tracking-wide">{t('columns.status')}</TableHead>
              <TableHead className="text-slate-700 dark:text-slate-300 font-semibold text-xs uppercase tracking-wide">{t('columns.progress')}</TableHead>
              <TableHead className="text-slate-700 dark:text-slate-300 font-semibold text-xs uppercase tracking-wide hidden lg:table-cell">{t('columns.size')}</TableHead>
              <TableHead className="text-slate-700 dark:text-slate-300 font-semibold text-xs uppercase tracking-wide hidden md:table-cell">{t('columns.duration')}</TableHead>
              <TableHead className="text-slate-700 dark:text-slate-300 font-semibold text-xs uppercase tracking-wide hidden sm:table-cell">{t('columns.created')}</TableHead>
              <TableHead className="text-slate-700 dark:text-slate-300 font-semibold text-xs uppercase tracking-wide text-right pr-2">{t('columns.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredJobs.length === 0 ? (
              <TableRow className="hover:bg-slate-50 dark:hover:bg-slate-700">
                <TableCell colSpan={9} className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <p className="font-medium">{t('noJobs')}</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredJobs.map((job) => (
                <TableRow 
                  key={job.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 transition-colors duration-150"
                >
                  <TableCell className="font-mono text-xs text-slate-700 dark:text-slate-300 font-medium">{job.id.substring(0, 8)}</TableCell>
                  <TableCell className="capitalize text-slate-700 dark:text-slate-300 font-medium">{t(`type.${job.export_type}`)}</TableCell>
                  <TableCell className="uppercase text-slate-700 dark:text-slate-300 font-medium tracking-wide">{t(`format.${job.export_format}`)}</TableCell>
                  <TableCell>{getStatusBadge(job.status)}</TableCell>
                  <TableCell>
                    <div className="w-24 space-y-1">
                      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 rounded-full"
                          style={{ width: `${job.progress_percent}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{job.progress_percent}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-700 dark:text-slate-300 hidden lg:table-cell text-sm">{formatFileSize(job.file_size_bytes)}</TableCell>
                  <TableCell className="text-slate-700 dark:text-slate-300 hidden md:table-cell text-sm">
                    {job.duration_seconds ? `${job.duration_seconds.toFixed(2)}${t('units.secondsShort')}` : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600 dark:text-slate-400 hidden sm:table-cell">
                    {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right pr-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors duration-150 h-8 w-8 p-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end"
                        className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      >
                        <DropdownMenuItem 
                          onClick={() => onJobSelected?.(job)}
                          className="text-slate-900 dark:text-white focus:bg-slate-100 dark:focus:bg-slate-700 cursor-pointer"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {t('actions.view')}
                        </DropdownMenuItem>
                        {job.status === 'completed' && (
                          <DropdownMenuItem 
                            onClick={() => handleDownload(job)}
                            className="text-slate-900 dark:text-white focus:bg-slate-100 dark:focus:bg-slate-700 cursor-pointer"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            {t('actions.download')}
                          </DropdownMenuItem>
                        )}
                        {(job.status === 'completed' || job.status === 'failed') && (
                          <DropdownMenuItem 
                            onClick={() => handleRerun(job)}
                            className="text-slate-900 dark:text-white focus:bg-slate-100 dark:focus:bg-slate-700 cursor-pointer"
                          >
                            <RotateCw className="mr-2 h-4 w-4" />
                            {t('actions.rerun')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(job.id)}
                          className="text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20 cursor-pointer"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('actions.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination info */}
      {jobsData?.data && (
        <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {t('showing')} <span className="font-semibold text-slate-900 dark:text-white">{filteredJobs.length}</span> {t('of')} <span className="font-semibold text-slate-900 dark:text-white">{jobsData.data.total}</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-500">
            {jobsLoading && 'Loading...'}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportJobList;
