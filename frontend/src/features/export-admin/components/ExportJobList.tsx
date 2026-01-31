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
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <Input
          placeholder={t('search')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('filterType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            <SelectItem value="students">{t('type.students')}</SelectItem>
            <SelectItem value="courses">{t('type.courses')}</SelectItem>
            <SelectItem value="grades">{t('type.grades')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('filterStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            <SelectItem value="completed">{t('status.completed')}</SelectItem>
            <SelectItem value="processing">{t('status.processing')}</SelectItem>
            <SelectItem value="pending">{t('status.pending')}</SelectItem>
            <SelectItem value="failed">{t('status.failed')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.id')}</TableHead>
              <TableHead>{t('columns.type')}</TableHead>
              <TableHead>{t('columns.format')}</TableHead>
              <TableHead>{t('columns.status')}</TableHead>
              <TableHead>{t('columns.progress')}</TableHead>
              <TableHead>{t('columns.size')}</TableHead>
              <TableHead>{t('columns.duration')}</TableHead>
              <TableHead>{t('columns.created')}</TableHead>
              <TableHead>{t('columns.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  {t('noJobs')}
                </TableCell>
              </TableRow>
            ) : (
              filteredJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-mono text-sm">{job.id.substring(0, 8)}</TableCell>
                  <TableCell className="capitalize">{t(`type.${job.export_type}`)}</TableCell>
                  <TableCell className="uppercase">{t(`format.${job.export_format}`)}</TableCell>
                  <TableCell>{getStatusBadge(job.status)}</TableCell>
                  <TableCell>
                    <div className="w-20">
                      <div className="h-2 w-full rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${job.progress_percent}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{job.progress_percent}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatFileSize(job.file_size_bytes)}</TableCell>
                  <TableCell>
                    {job.duration_seconds
                      ? `${job.duration_seconds.toFixed(2)}${t('units.secondsShort')}`
                      : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onJobSelected?.(job)}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t('actions.view')}
                        </DropdownMenuItem>
                        {job.status === 'completed' && (
                          <DropdownMenuItem onClick={() => handleDownload(job)}>
                            <Download className="mr-2 h-4 w-4" />
                            {t('actions.download')}
                          </DropdownMenuItem>
                        )}
                        {(job.status === 'completed' || job.status === 'failed') && (
                          <DropdownMenuItem onClick={() => handleRerun(job)}>
                            <RotateCw className="mr-2 h-4 w-4" />
                            {t('actions.rerun')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(job.id)}
                          className="text-destructive"
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
        <div className="text-sm text-muted-foreground">
          {t('showing')} {filteredJobs.length} {t('of')} {jobsData.data.total}
        </div>
      )}
    </div>
  );
};

export default ExportJobList;
