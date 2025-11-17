import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { useLanguage } from '@/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { adminOpsAPI, getHealthStatus, importAPI } from '@/api/api';
import { studentKeys } from '@/hooks/useStudentsQuery';
import { courseKeys } from '@/hooks/useCoursesQuery';
import { useStudentsStore, useCoursesStore } from '@/stores';
import { AppearanceThemeSelectorWidget, themeStyles } from './AppearanceThemeSelector';
import { useAppearanceTheme } from '@/contexts/AppearanceThemeContext';

type ToastState = { message: string; type: 'success' | 'error' | 'info' };

type HealthStatus = {
  status?: 'healthy' | 'degraded' | 'error' | string;
  version?: string;
  timestamp?: string;
  uptime?: number;
  database?: string;
  db?: string;
  statistics?: {
    students?: number;
    courses?: number;
  };
  students_count?: number;
  courses_count?: number;
  network?: {
    ips?: string[];
  };
  [key: string]: unknown;
};

type OperationResult =
  | null
  | {
      op: 'backup' | 'restore' | 'clear' | 'upload' | 'health';
      timestamp: string;
      data?: unknown;
      error?: boolean | string;
    };

type DevToolsVariant = 'standalone' | 'embedded';
type ImportType = 'courses' | 'students';
type ClearScope = 'all' | 'data_only';

export interface DevToolsPanelProps {
  variant?: DevToolsVariant;
  onToast: (toast: ToastState) => void;
}

const RAW_API_BASE = ((import.meta as any).env?.VITE_API_URL?.trim?.()) ?? '';
const FALLBACK_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080';
const sanitizedApiBase = RAW_API_BASE.replace(/\/api\/v1\/?$/, '');

let resolvedBackendUrl: URL;
try {
  resolvedBackendUrl = new URL(sanitizedApiBase || '/', FALLBACK_ORIGIN);
} catch (error) {
  console.warn('[DevToolsPanel] Falling back to window origin for backend URL resolution', error);
  resolvedBackendUrl = new URL(FALLBACK_ORIGIN);
}

const BACKEND_PATH_PREFIX = resolvedBackendUrl.pathname.replace(/\/$/, '') || '';
const FALLBACK_PROTOCOL = typeof window !== 'undefined' ? window.location.protocol || 'http:' : 'http:';
const FALLBACK_PORT_RAW = typeof window !== 'undefined' ? window.location.port || '' : '';
const BACKEND_PROTOCOL = resolvedBackendUrl.protocol || FALLBACK_PROTOCOL || 'http:';
const FRONTEND_PROTOCOL = FALLBACK_PROTOCOL || 'http:';

const MODE = (((import.meta as any).env?.MODE as string | undefined) ?? import.meta.env.MODE ?? 'production').toLowerCase();
const DEV_PORT_HINTS = new Set(['5173', '4173', '3000', '3001', '5174', '5175']);
const DEFAULT_DEV_BACKEND_PORT =
  (((import.meta as any).env?.VITE_DEV_BACKEND_PORT as string | undefined)?.trim?.()) ||
  '8000';

const resolvedBackendPortRaw = (resolvedBackendUrl.port ?? '').toString().trim();
const fallbackPortRaw = (FALLBACK_PORT_RAW ?? '').toString().trim();
const candidateBackendPort = resolvedBackendPortRaw || fallbackPortRaw || '';
const shouldForceDevBackendPort = MODE === 'development' && (!candidateBackendPort || DEV_PORT_HINTS.has(candidateBackendPort));

const BACKEND_PORT_RAW = shouldForceDevBackendPort ? DEFAULT_DEV_BACKEND_PORT : candidateBackendPort;
const normalizeDisplayPort = (port: string) => {
  if (!port) return '';
  const trimmed = port.trim();
  return trimmed === '80' || trimmed === '443' ? '' : trimmed;
};

const BACKEND_PORT_DISPLAY = normalizeDisplayPort(BACKEND_PORT_RAW);
const BACKEND_PORT_SEGMENT = BACKEND_PORT_DISPLAY ? `:${BACKEND_PORT_DISPLAY}` : '';
const BACKEND_PORT_LABEL = BACKEND_PORT_DISPLAY ? ` (${BACKEND_PORT_DISPLAY})` : '';

const FRONTEND_PORT_DISPLAY = normalizeDisplayPort(fallbackPortRaw);
const FRONTEND_PORT_SEGMENT = FRONTEND_PORT_DISPLAY ? `:${FRONTEND_PORT_DISPLAY}` : '';
const FRONTEND_PORT_LABEL = FRONTEND_PORT_DISPLAY ? ` (${FRONTEND_PORT_DISPLAY})` : '';

const BACKEND_HOSTNAME = resolvedBackendUrl.hostname || (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
const BACKEND_HOST = BACKEND_PORT_DISPLAY ? `${BACKEND_HOSTNAME}${BACKEND_PORT_SEGMENT}` : BACKEND_HOSTNAME;
const BACKEND_DISPLAY_ORIGIN = BACKEND_PATH_PREFIX
  ? `${BACKEND_PROTOCOL}//${BACKEND_HOST}${BACKEND_PATH_PREFIX}`
  : `${BACKEND_PROTOCOL}//${BACKEND_HOST}`;

const statusTone = (status?: HealthStatus['status']) => {
  if (status === 'healthy') return 'bg-emerald-600';
  if (status === 'degraded') return 'bg-amber-600';
  if (status === 'error') return 'bg-rose-600';
  return 'bg-slate-600';
};

const UPTIME_STORAGE_KEY = 'sms.operations.healthUptime';

const DevToolsPanel = ({ variant = 'standalone', onToast }: DevToolsPanelProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const setStudents = useStudentsStore((state) => state.setStudents);
  const setCourses = useCoursesStore((state) => state.setCourses);

  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [opLoading, setOpLoading] = useState<string | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearScope, setClearScope] = useState<ClearScope>('all');
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<ImportType>('courses');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [intervalMs, setIntervalMs] = useState(5000);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [result, setResult] = useState<OperationResult>(null);
  // Backups management state
  type BackupItem = { filename: string; path: string; size: number; created: string };
  const [backups, setBackups] = useState<BackupItem[] | null>(null);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [destPath, setDestPath] = useState('');
  const [selectedBackups, setSelectedBackups] = useState<Set<string>>(new Set());
  const uptimeTimerRef = useRef<{ uptimeSource: number; recordedAt: number } | null>(null);
  const [uptimeSeconds, setUptimeSeconds] = useState<number | null>(null);
  const { appearanceTheme: selectedTheme, setAppearanceTheme } = useAppearanceTheme();

  const identityLabel = useMemo(() => {
    if (!user) return null;
    if (user.email) return user.email;
    if (user.full_name) return user.full_name;
    return null;
  }, [user]);

  const theme = themeStyles[selectedTheme];
  
  const cardClass = variant === 'standalone' 
    ? `${theme.container} p-5 sm:p-6`
    : `${theme.container} p-4 sm:p-5`;

  const subtleCardClass = `${theme.subtleCard} flex flex-col gap-1`;

  const refreshAcademicData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: studentKeys.all, exact: false, refetchType: 'all' }),
      queryClient.invalidateQueries({ queryKey: courseKeys.all, exact: false, refetchType: 'all' }),
    ]);

    await Promise.all([
      queryClient.refetchQueries({ queryKey: studentKeys.all, type: 'active', exact: false }),
      queryClient.refetchQueries({ queryKey: courseKeys.all, type: 'active', exact: false }),
    ]);
  }, [queryClient]);

  const resetAcademicStores = useCallback(() => {
    setStudents([]);
    setCourses([]);
  }, [setStudents, setCourses]);

  const backendOrigin = BACKEND_DISPLAY_ORIGIN;
  const frontendOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const backendPathPrefix = BACKEND_PATH_PREFIX && BACKEND_PATH_PREFIX !== '/'
    ? (BACKEND_PATH_PREFIX.startsWith('/') ? BACKEND_PATH_PREFIX : `/${BACKEND_PATH_PREFIX}`)
    : '';
  const backendPortLabel = BACKEND_PORT_LABEL;
  const frontendPortLabel = FRONTEND_PORT_LABEL;

  const ipList = useMemo(() => {
    const ips = new Set<string>();
    const networkIps = Array.isArray(health?.network?.ips) ? health?.network?.ips : [];
    networkIps.forEach((ip) => {
      if (typeof ip === 'string' && ip.trim()) ips.add(ip.trim());
    });
    if (typeof window !== 'undefined') {
      [window.location.hostname, 'localhost', '127.0.0.1'].forEach((ip) => {
        if (ip) ips.add(ip);
      });
    }
    return Array.from(ips);
  }, [health]);

  const withTimestamp = (op: NonNullable<OperationResult>['op'], payload: Partial<OperationResult> = {}) => ({
    op,
    timestamp: new Date().toISOString(),
    ...payload,
  });

  const persistUptime = (uptimeSource: number, recordedAt: number) => {
    uptimeTimerRef.current = { uptimeSource, recordedAt };
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(UPTIME_STORAGE_KEY, JSON.stringify({ uptimeSource, recordedAt }));
      } catch (error) {
        console.warn('[DevToolsPanel] Failed to cache uptime state', error);
      }
    }
  };

  const updateUptime = (uptimeValue: unknown, timestamp?: string) => {
    const numeric = typeof uptimeValue === 'number' ? uptimeValue : Number(uptimeValue);
    if (!Number.isFinite(numeric) || numeric < 0) {
      return;
    }
    const recordedAt = timestamp ? Number(new Date(timestamp)) : Date.now();
    persistUptime(numeric, recordedAt);
    const adjusted = numeric + Math.max(0, (Date.now() - recordedAt) / 1000);
    setUptimeSeconds(adjusted);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const cached = sessionStorage.getItem(UPTIME_STORAGE_KEY);
      if (!cached) return;
      const parsed = JSON.parse(cached) as { uptimeSource?: unknown; recordedAt?: unknown };
      const source = typeof parsed?.uptimeSource === 'number' ? parsed.uptimeSource : Number(parsed?.uptimeSource);
      const recordedAt = typeof parsed?.recordedAt === 'number' ? parsed.recordedAt : Number(parsed?.recordedAt);
      if (!Number.isFinite(source) || source < 0 || !Number.isFinite(recordedAt)) return;
      const ref = { uptimeSource: source, recordedAt };
      uptimeTimerRef.current = ref;
      const adjusted = source + Math.max(0, (Date.now() - recordedAt) / 1000);
      setUptimeSeconds(adjusted);
    } catch (error) {
      console.warn('[DevToolsPanel] Failed to restore cached uptime', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const id = window.setInterval(() => {
      const ref = uptimeTimerRef.current;
      if (!ref) return;
      const adjusted = ref.uptimeSource + Math.max(0, (Date.now() - ref.recordedAt) / 1000);
      setUptimeSeconds(adjusted);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const runHealthCheck = useCallback(async () => {
    setHealthLoading(true);
    const now = new Date();
    try {
      const data = await getHealthStatus();
      setHealth(data);
      setResult(withTimestamp('health', { data }));
      setLastChecked(now.toLocaleTimeString());
      updateUptime((data as HealthStatus)?.uptime, data?.timestamp as string | undefined);
    } catch (error) {
      console.error('Health check failed', error);
      setHealth(null);
      setResult(withTimestamp('health', { error: true }));
      onToast({ message: t('utils.healthCheckFailed'), type: 'error' });
    } finally {
      setHealthLoading(false);
    }
  }, [onToast, t]);

  useEffect(() => {
    void runHealthCheck();
  }, [runHealthCheck]);

  // Load existing backups on mount so users immediately see available backups
  useEffect(() => {
    void loadBackups();
  }, [loadBackups]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const intervalId = window.setInterval(() => {
      if (!healthLoading) {
        void runHealthCheck();
      }
    }, Math.max(2000, intervalMs));
    return () => window.clearInterval(intervalId);
  }, [autoRefresh, intervalMs, healthLoading, runHealthCheck]);

  const handleBackup = async () => {
    setOpLoading('backup');
    try {
      // Use Control API endpoint
      const baseURL = import.meta.env.VITE_API_URL || '/api/v1';
      const response = await fetch(`${baseURL}/control/api/operations/database-backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Backup failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      setResult(withTimestamp('backup', { data }));
      onToast({ message: data.message || t('utils.backupSuccess'), type: 'success' });
      // Refresh backups list so the newly created backup appears immediately
      try {
        await loadBackups();
      } catch {}
      void runHealthCheck(); // Refresh health
    } catch (error) {
      console.error('Backup failed', error);
      setResult(withTimestamp('backup', { error: true }));
      onToast({ message: t('utils.backupError'), type: 'error' });
    } finally {
      setOpLoading(null);
    }
  };

  const baseURL = (import.meta.env.VITE_API_URL as string) || '/api/v1';

  const loadBackups = useCallback(async () => {
    setBackupsLoading(true);
    try {
      const res = await fetch(`${baseURL}/control/api/operations/database-backups`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { backups: BackupItem[] };
      setBackups(Array.isArray(data?.backups) ? data.backups : []);
      // Reset selection when reloading list
      setSelectedBackups(new Set());
    } catch (error) {
      console.error('Failed to load backups', error);
      onToast({ message: t('error'), type: 'error' });
    } finally {
      setBackupsLoading(false);
    }
  }, [baseURL, onToast, t]);

  const latestBackup = useMemo(() => (Array.isArray(backups) && backups.length > 0 ? backups[0] : null), [backups]);

  const downloadBackup = async (filename: string) => {
    try {
      const url = `${baseURL}/control/api/operations/database-backups/${encodeURIComponent(filename)}/download`;
      window.open(url, '_blank');
    } catch (e) {
      onToast({ message: t('error'), type: 'error' });
    }
  };

  const saveBackupToPath = async (filename: string, destination: string) => {
    if (!destination.trim()) {
      onToast({ message: t('pleaseEnterDestinationPath') ?? 'Please enter a destination path', type: 'error' });
      return;
    }
    setOpLoading(`save:${filename}`);
    try {
      const res = await fetch(
        `${baseURL}/control/api/operations/database-backups/${encodeURIComponent(filename)}/save-to-path`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ destination }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed');
      onToast({
        message: `${t('savedTo') || 'Saved to'}: ${data?.details?.destination ?? destination}`,
        type: 'success',
      });
    } catch (e: any) {
      onToast({ message: e?.message || (t('error') as string), type: 'error' });
    } finally {
      setOpLoading(null);
    }
  };

  const saveLatestToPath = async () => {
    if (!latestBackup) {
      onToast({ message: t('noBackupsFound') ?? 'No backups found', type: 'error' });
      return;
    }
    await saveBackupToPath(latestBackup.filename, destPath);
  };

  const downloadAllZip = () => {
    try {
      const url = `${baseURL}/control/api/operations/database-backups/archive.zip`;
      window.open(url, '_blank');
    } catch (e) {
      onToast({ message: t('error'), type: 'error' });
    }
  };

  const saveZipToPath = async () => {
    if (!destPath.trim()) {
      onToast({ message: t('pleaseEnterDestinationPath') ?? 'Please enter a destination path', type: 'error' });
      return;
    }
    setOpLoading('save-zip');
    try {
      const res = await fetch(`${baseURL}/control/api/operations/database-backups/archive/save-to-path`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ destination: destPath }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed');
      onToast({ message: `${t('savedZipTo') || 'Saved ZIP to'}: ${data?.details?.destination ?? destPath}`, type: 'success' });
    } catch (e: any) {
      onToast({ message: e?.message || (t('error') as string), type: 'error' });
    } finally {
      setOpLoading(null);
    }
  };

  const downloadSelectedZip = async () => {
    if (selectedBackups.size === 0) {
      onToast({ message: t('noBackupsSelected') ?? 'No backups selected', type: 'error' });
      return;
    }
    try {
      const res = await fetch(`${baseURL}/control/api/operations/database-backups/archive/selected.zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ filenames: Array.from(selectedBackups) }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
      a.download = `sms_backups_selected_${ts}.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 0);
    } catch (e: any) {
      onToast({ message: e?.message || (t('error') as string), type: 'error' });
    }
  };

  const saveSelectedZipToPath = async () => {
    if (selectedBackups.size === 0) {
      onToast({ message: t('noBackupsSelected') ?? 'No backups selected', type: 'error' });
      return;
    }
    if (!destPath.trim()) {
      onToast({ message: t('pleaseEnterDestinationPath') ?? 'Please enter a destination path', type: 'error' });
      return;
    }
    setOpLoading('save-selected-zip');
    try {
      const res = await fetch(`${baseURL}/control/api/operations/database-backups/archive/selected/save-to-path`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ destination: destPath, filenames: Array.from(selectedBackups) }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed');
      onToast({ message: `${t('savedZipTo') || 'Saved ZIP to'}: ${data?.details?.destination ?? destPath}`, type: 'success' });
    } catch (e: any) {
      onToast({ message: e?.message || (t('error') as string), type: 'error' });
    } finally {
      setOpLoading(null);
    }
  };

  const deleteSelectedBackups = async () => {
    if (selectedBackups.size === 0) {
      onToast({ message: t('noBackupsSelected') ?? 'No backups selected', type: 'error' });
      return;
    }
    setOpLoading('delete-selected');
    try {
      const res = await fetch(`${baseURL}/control/api/operations/database-backups/delete-selected`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ filenames: Array.from(selectedBackups) }),
      });
      const data = await res.json();
      if (!res.ok || data?.success !== true) throw new Error(data?.message || 'Failed');
      const count = Number(data?.details?.deleted_count ?? 0);
      onToast({ message: `${t('deletedBackups') || 'Deleted backups'}: ${count}`, type: 'success' });
      // Refresh list and clear selection
      await loadBackups();
      setSelectedBackups(new Set());
    } catch (e: any) {
      onToast({ message: e?.message || (t('error') as string), type: 'error' });
    } finally {
      setOpLoading(null);
    }
  };

  const toggleSelected = (filename: string, checked: boolean) => {
    setSelectedBackups((prev) => {
      const next = new Set(prev);
      if (checked) next.add(filename);
      else next.delete(filename);
      return next;
    });
  };

  const handleRestore = async () => {
    if (!restoreFile) {
      onToast({ message: t('noFileSelected'), type: 'error' });
      return;
    }
    setOpLoading('restore');
    try {
      const baseURL = import.meta.env.VITE_API_URL || '/api/v1';
      const formData = new FormData();
      formData.append('file', restoreFile);
      
      const response = await fetch(`${baseURL}/control/api/operations/database-upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const uploadResult = await response.json();
      const filename = uploadResult.details?.filename;
      
      if (!filename) {
        throw new Error('Failed to get uploaded filename');
      }
      
      // Now restore from the uploaded backup
      const restoreResponse = await fetch(`${baseURL}/control/api/operations/database-restore?backup_filename=${encodeURIComponent(filename)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!restoreResponse.ok) {
        throw new Error(`Restore failed: ${restoreResponse.statusText}`);
      }
      
      const data = await restoreResponse.json();
      setResult(withTimestamp('restore', { data }));
      onToast({ message: data.message || t('utils.restoreSuccess'), type: 'success' });
      setRestoreFile(null);
      await refreshAcademicData();
      void runHealthCheck(); // Refresh health
    } catch (error) {
      console.error('Restore failed', error);
      setResult(withTimestamp('restore', { error: true }));
      onToast({ message: t('utils.restoreError'), type: 'error' });
    } finally {
      setOpLoading(null);
    }
  };

  const handleClear = async () => {
    if (!clearConfirm) {
      onToast({ message: t('confirmRequired'), type: 'error' });
      return;
    }
    setOpLoading('clear');
    try {
      // Use adminops endpoint for clear since control API doesn't have it
      const data = await adminOpsAPI.clearDatabase(clearScope);
      setResult(withTimestamp('clear', { data }));
      onToast({ message: t('utils.clearSuccess'), type: 'success' });
      resetAcademicStores();
      await refreshAcademicData();
      setClearConfirm(false);
      void runHealthCheck(); // Refresh health
    } catch (error) {
      console.error('Clear database failed', error);
      setResult(withTimestamp('clear', { error: true }));
      onToast({ message: t('utils.clearError'), type: 'error' });
    } finally {
      setOpLoading(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      onToast({ message: t('noFilesSelected'), type: 'error' });
      return;
    }
    setOpLoading('upload');
    try {
      const data = await importAPI.uploadFile(importFile, importType);
      setResult(withTimestamp('upload', { data }));

      const created = Number((data as any)?.created ?? 0);
      const updated = Number((data as any)?.updated ?? 0);
      const errors = Array.isArray((data as any)?.errors) ? (data as any).errors.length : 0;
      if (data && typeof (data as any)?.uptime !== 'undefined') {
        updateUptime((data as any).uptime, (data as any)?.timestamp);
      }

      if (created > 0 || updated > 0) {
        onToast({
          message: `${t('utils.importSuccess')}: ${created} ${t('created')}, ${updated} ${t('updated')}`,
          type: errors > 0 ? 'info' : 'success',
        });
      } else if (errors > 0) {
        onToast({ message: `${t('utils.importError')}: ${errors} ${t('errors')}`, type: 'error' });
      } else {
        onToast({ message: t('utils.importNoChanges'), type: 'info' });
      }
      setImportFile(null);
      await refreshAcademicData();
    } catch (error: any) {
      console.error('Import failed', error);
      const detail = error?.response?.data?.detail?.message ?? t('utils.importError');
      setResult(withTimestamp('upload', { error: detail }));
      onToast({ message: detail, type: 'error' });
    } finally {
      setOpLoading(null);
    }
  };

  const statusLabel = health?.status ?? t('controlPanel.unknown');
  const studentCount = health?.statistics?.students ?? health?.students_count;
  const courseCount = health?.statistics?.courses ?? health?.courses_count;
  const databaseName = health?.database ?? health?.db ?? t('controlPanel.unknown');
  const fallbackUptime = Number.isFinite(Number(health?.uptime)) ? Number(health?.uptime) : null;
  const displayUptimeSeconds = Number.isFinite(uptimeSeconds ?? NaN) ? uptimeSeconds : fallbackUptime;
  const uptimeDisplayValue = typeof displayUptimeSeconds === 'number' && Number.isFinite(displayUptimeSeconds)
    ? Math.max(0, Math.floor(displayUptimeSeconds))
    : null;

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
        <div className={`px-4 py-3 text-white ${statusTone(health?.status)}`}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{t('utils.operationsMonitor')}</div>
                <p className="text-xs text-white/80">{t('utils.operationsMonitorDescription')}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {identityLabel && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 text-white/90">
                    <span>{t('controlPanel.signedInAs')}</span>
                    <span className="font-semibold text-white">{identityLabel}</span>
                  </span>
                )}
                <div className="flex items-center gap-2 text-white/85">
                  {health?.version ? <span>v{health.version}</span> : null}
                  {health?.timestamp ? <span>{new Date(health.timestamp).toLocaleString()}</span> : null}
                  {lastChecked ? <span>({t('controlPanel.checkedAt')} {lastChecked})</span> : null}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
                <span className="text-white/90">{t('utils.frontend')} ({frontendOrigin})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-300" />
                <span className="text-white/90">{t('utils.backend')} ({backendOrigin})</span>
              </div>
              <div className="ml-auto flex items-center gap-3">
                {variant === 'standalone' && (
                  <AppearanceThemeSelectorWidget
                    currentTheme={selectedTheme}
                    onThemeChange={setAppearanceTheme}
                  />
                )}
                <button
                  type="button"
                  onClick={runHealthCheck}
                  className="inline-flex items-center gap-2 rounded bg-white/20 px-3 py-1.5 text-xs font-medium transition hover:bg-white/30"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                  {healthLoading ? t('loading') : t('utils.checkHealth')}
                </button>
                <label className="inline-flex items-center gap-1 text-xs text-white/90">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(event) => setAutoRefresh(event.target.checked)}
                    aria-label={t('controlPanel.toggleAutoRefresh')}
                  />
                  {t('controlPanel.autoRefresh')}
                </label>
                <select
                  value={String(intervalMs)}
                  onChange={(event) => setIntervalMs(Number(event.target.value))}
                  className="rounded bg-white/20 px-2 py-1 text-xs text-white disabled:opacity-60"
                  aria-label={t('controlPanel.autoRefreshInterval')}
                  disabled={!autoRefresh}
                >
                  <option className="text-black" value="3000">
                    3s
                  </option>
                  <option className="text-black" value="5000">
                    5s
                  </option>
                  <option className="text-black" value="10000">
                    10s
                  </option>
                  <option className="text-black" value="30000">
                    30s
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 bg-white dark:bg-gray-800 p-4 sm:p-6 md:grid-cols-3">
          <div className={subtleCardClass}>
            <div className="text-xs text-slate-500 dark:text-gray-400">{t('controlPanel.database')}</div>
            <div className="text-sm font-semibold text-slate-800 dark:text-gray-100">{databaseName}</div>
          </div>
          <div className={subtleCardClass}>
            <div className="text-xs text-slate-500 dark:text-gray-400">{t('students')}</div>
            <div className="text-sm font-semibold text-slate-800 dark:text-gray-100">{studentCount ?? t('na')}</div>
          </div>
          <div className={subtleCardClass}>
            <div className="text-xs text-slate-500 dark:text-gray-400">{t('courses')}</div>
            <div className="text-sm font-semibold text-slate-800 dark:text-gray-100">{courseCount ?? t('na')}</div>
          </div>
          {typeof uptimeDisplayValue === 'number' && (
            <div className={`${subtleCardClass} md:col-span-3`}>
              <div className="text-xs text-slate-500 dark:text-gray-400">{t('controlPanel.uptime')}</div>
              <div className="text-sm font-semibold text-slate-800 dark:text-gray-100">{uptimeDisplayValue}s</div>
            </div>
          )}
          <div className={`${subtleCardClass} md:col-span-3`}>
            <div className="text-sm font-semibold text-slate-800 dark:text-gray-100">{t('controlPanel.availableEndpoints')}</div>
            <div className="text-xs text-slate-500 dark:text-gray-400">{t('utils.quickLinks')}</div>
            {ipList.length === 0 ? (
              <div className="mt-2 text-xs text-slate-500 dark:text-gray-400">{t('controlPanel.noIpsAvailable')}</div>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                {ipList.map((ip) => {
                  const ipDisplay = ip.includes(':') ? `[${ip}]` : ip;
                  const ipForUrl = ip.includes(':') && !ip.startsWith('[') ? `[${ip}]` : ip;
                  const backendHostBase = `${BACKEND_PROTOCOL}//${ipForUrl}${BACKEND_PORT_SEGMENT}`;
                  const frontendHostBase = `${FRONTEND_PROTOCOL}//${ipForUrl}${FRONTEND_PORT_SEGMENT}`;
                  const buildBackendHref = (suffix = '') => {
                    const suffixPart = suffix ? (suffix.startsWith('/') ? suffix : `/${suffix}`) : '';
                    return `${backendHostBase}${backendPathPrefix}${suffixPart}`;
                  };
                  const backendDisplayLine = backendPathPrefix
                    ? `${ipDisplay}${BACKEND_PORT_SEGMENT}${backendPathPrefix}`
                    : `${ipDisplay}${BACKEND_PORT_SEGMENT}`;

                  return (
                    <div key={ip} className="space-y-1">
                      <div className="font-mono text-xs text-slate-600 dark:text-gray-300">{backendDisplayLine}</div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {(
                          [
                            {
                              key: 'backend-root',
                              href: buildBackendHref(),
                              label: `${t('utils.backend')}${backendPortLabel}`,
                              className: 'text-indigo-600 dark:text-indigo-400 hover:underline',
                            },
                            {
                              key: 'backend-docs',
                              href: buildBackendHref('docs'),
                              label: `${t('utils.apiDocs')}${backendPortLabel}`,
                              className: 'text-indigo-600 dark:text-indigo-400 hover:underline',
                            },
                            {
                              key: 'backend-redoc',
                              href: buildBackendHref('redoc'),
                              label: `${t('utils.apiRedoc')}${backendPortLabel}`,
                              className: 'text-indigo-600 dark:text-indigo-400 hover:underline',
                            },
                            {
                              key: 'backend-openapi',
                              href: buildBackendHref('openapi.json'),
                              label: `${t('utils.openapiSpec')}${backendPortLabel}`,
                              className: 'text-indigo-600 dark:text-indigo-400 hover:underline',
                            },
                            {
                              key: 'backend-health',
                              href: buildBackendHref('health'),
                              label: `${t('utils.healthEndpoint')}${backendPortLabel}`,
                              className: 'text-sky-600 dark:text-sky-400 hover:underline',
                            },
                            {
                              key: 'backend-health-ready',
                              href: buildBackendHref('health/ready'),
                              label: `${t('utils.healthReadyEndpoint')}${backendPortLabel}`,
                              className: 'text-sky-600 dark:text-sky-400 hover:underline',
                            },
                            {
                              key: 'backend-health-live',
                              href: buildBackendHref('health/live'),
                              label: `${t('utils.healthLiveEndpoint')}${backendPortLabel}`,
                              className: 'text-sky-600 dark:text-sky-400 hover:underline',
                            },
                            {
                              key: 'frontend-root',
                              href: `${frontendHostBase}/`,
                              label: `${t('utils.frontend')}${frontendPortLabel}`,
                              className: 'text-emerald-700 dark:text-emerald-400 hover:underline',
                            },
                          ] as Array<{ key: string; href: string; label: string; className: string }>
                        ).map((link, index, array) => (
                          <Fragment key={link.key}>
                            <a
                              className={link.className}
                              href={link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {link.label}
                            </a>
                            {index < array.length - 1 ? (
                              <span className="text-slate-300 dark:text-gray-600">•</span>
                            ) : null}
                          </Fragment>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className={`${subtleCardClass} md:col-span-3`}>
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400">{t('utils.systemStatus')}</div>
            <div className="text-sm font-semibold text-slate-800 dark:text-gray-100">{statusLabel}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className={theme.card}>
          <h4 className={`mb-2 text-sm font-semibold ${theme.text}`}>{t('utils.backupDatabase')}</h4>
          <p className={`mb-4 text-xs ${theme.mutedText}`}>{t('utils.backupDesc')}</p>
          <button
            type="button"
            onClick={handleBackup}
            disabled={opLoading === 'backup'}
            className={`${theme.button} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {opLoading === 'backup' ? t('loading') : t('utils.backupDatabase')}
          </button>
        </div>

        <div className={theme.card}>
          <h4 className={`mb-2 text-sm font-semibold ${theme.text}`}>{t('utils.resetDatabase')}</h4>
          <p className={`mb-3 text-xs ${theme.mutedText}`}>{t('utils.uploadPreviouslySavedBackup')}</p>
          <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
            <label className={`${theme.secondaryButton} flex flex-1 cursor-pointer items-center gap-2`}>
              <span>{t('chooseFile')}</span>
              <span className={`flex-1 truncate text-[11px] ${theme.mutedText}`}>
                {restoreFile ? restoreFile.name : t('noFileChosen')}
              </span>
              <input
                type="file"
                accept=".db"
                className="hidden"
                onChange={(event: ChangeEvent<HTMLInputElement>) => setRestoreFile(event.target.files?.[0] ?? null)}
                aria-label={t('utils.selectBackupFile')}
              />
            </label>
            <button
              type="button"
              onClick={handleRestore}
              disabled={!restoreFile || opLoading === 'restore'}
              className={`${theme.button} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {opLoading === 'restore' ? t('loading') : t('utils.restoreDb')}
            </button>
          </div>
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{t('utils.appMayNeedRefresh')}</p>
        </div>

        <div className={theme.card}>
          <h4 className={`mb-2 text-sm font-semibold ${theme.text}`}>{t('utils.clear')}</h4>
          <p className={`mb-3 text-xs ${theme.mutedText}`}>{t('utils.deleteDataChooseScope')}</p>
          <label className={`mb-3 flex items-center gap-2 text-sm ${theme.text}`}>
            <input
              type="checkbox"
              checked={clearConfirm}
              onChange={(event) => setClearConfirm(event.target.checked)}
            />
            {t('confirm')}
          </label>
          <select
            value={clearScope}
            onChange={(event) => setClearScope(event.target.value as ClearScope)}
            className={`mb-3 w-full ${theme.input}`}
            aria-label={t('utils.selectClearScope')}
          >
            <option value="all">{t('utils.allCoursesStudentsRecords')}</option>
            <option value="data_only">{t('utils.dataOnlyKeepCoursesStudents')}</option>
          </select>
          <button
            type="button"
            onClick={handleClear}
            disabled={!clearConfirm || opLoading === 'clear'}
            className={`${theme.button} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {opLoading === 'clear' ? t('loading') : t('utils.clearDb')}
          </button>
        </div>

        <div className={theme.card}>
          <h4 className={`mb-2 text-sm font-semibold ${theme.text}`}>{t('utils.uploadJsonToImport')}</h4>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <select
              value={importType}
              onChange={(event) => setImportType(event.target.value as ImportType)}
              className={`w-full md:w-48 ${theme.input}`}
              aria-label={t('utils.selectImportType')}
            >
              <option value="courses">{t('courses')}</option>
              <option value="students">{t('students')}</option>
            </select>
            <label className={`${theme.secondaryButton} flex flex-1 cursor-pointer items-center gap-2`}>
              <span>{t('chooseFile')}</span>
              <span className={`flex-1 truncate text-[11px] ${theme.mutedText}`}>
                {importFile ? `${importFile.name}` : t('noFilesSelected')}
              </span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                aria-label={t('utils.selectJsonFiles')}
              />
            </label>
            <button
              type="button"
              onClick={handleImport}
              disabled={opLoading === 'upload'}
              className={`${theme.button} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {opLoading === 'upload' ? t('loading') : t('utils.importUpload')}
            </button>
          </div>
          <p className={`mt-2 text-xs ${theme.mutedText}`}>{t('utils.selectJsonFiles')}</p>
        </div>

        <div className={`${theme.card} md:col-span-2`}>
          <h4 className={`mb-2 text-sm font-semibold ${theme.text}`}>{t('utils.manageBackups') || 'Manage Backups'}</h4>
          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center">
            <label className={`text-xs ${theme.mutedText}`}>{t('destinationPath') || 'Destination path'}:</label>
            <input
              type="text"
              value={destPath}
              onChange={(e) => setDestPath(e.target.value)}
              placeholder={t('destinationPathPlaceholder') || 'e.g. C:\\Backups\\ or /home/user/Backups'}
              className={`w-full flex-1 ${theme.input}`}
            />
            <button
              type="button"
              onClick={saveLatestToPath}
              disabled={!latestBackup || opLoading?.startsWith('save:')}
              className={`${theme.secondaryButton} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {t('saveLatest') || 'Save Latest'}
            </button>
            <button type="button" onClick={downloadAllZip} className={theme.secondaryButton}>
              {t('downloadAllAsZip') || 'Download All as ZIP'}
            </button>
            <button type="button" onClick={saveZipToPath} className={theme.secondaryButton}>
              {t('saveZipToPath') || 'Save ZIP to Path'}
            </button>
          </div>

          <div className="mb-2 flex items-center gap-2">
            <button type="button" onClick={() => void loadBackups()} className={theme.secondaryButton}>
              {backupsLoading ? (t('loading') as string) : (t('viewBackups') || 'View Backups')}
            </button>
            <button type="button" onClick={downloadSelectedZip} className={theme.secondaryButton}>
              {t('downloadSelectedAsZip') || 'Download Selected as ZIP'}
            </button>
            <button type="button" onClick={saveSelectedZipToPath} className={theme.secondaryButton}>
              {t('saveSelectedZipToPath') || 'Save Selected ZIP to Path'}
            </button>
            <button
              type="button"
              onClick={deleteSelectedBackups}
              className={`${theme.secondaryButton} text-rose-700 border-rose-300 hover:bg-rose-50`}
            >
              {t('deleteSelected') || 'Delete Selected'}
            </button>
          </div>

          {Array.isArray(backups) ? (
            backups.length === 0 ? (
              <div className={`text-xs ${theme.mutedText}`}>{t('noBackupsFound') || 'No backups found'}</div>
            ) : (
              <div className="space-y-2">
                <div className={`text-xs ${theme.mutedText}`}>{t('availableBackups') || 'Available Backups'}:</div>
                {backups.map((b) => (
                  <div key={b.filename} className="flex items-center justify-between gap-3 rounded border border-slate-200 p-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedBackups.has(b.filename)}
                        onChange={(e) => toggleSelected(b.filename, e.target.checked)}
                        aria-label={b.filename}
                      />
                      <div>
                        <div className={`text-sm ${theme.text}`}>{b.filename}</div>
                        <div className={`text-xs ${theme.mutedText}`}>
                          {t('created')}: {new Date(b.created).toLocaleString()} • {(b.size / 1024).toFixed(2)} KB
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => void downloadBackup(b.filename)} className={theme.secondaryButton}>
                        {t('download') || 'Download'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveBackupToPath(b.filename, destPath)}
                        disabled={opLoading === `save:${b.filename}`}
                        className={`${theme.button} disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {t('saveToPath') || 'Save to Path'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className={`text-xs ${theme.mutedText}`}>{t('clickViewBackups') || 'Click "View Backups" to load list'}</div>
          )}
        </div>
      </div>

      {result && (
        <div className="rounded-lg border border-gray-700 dark:border-gray-600 bg-gray-900 dark:bg-gray-950 p-4 text-gray-100 shadow-inner">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-400">
            <span>{t('utils.systemStatus')}</span>
            <span>{new Date(result.timestamp).toLocaleString()}</span>
          </div>
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
};

export default DevToolsPanel;
export type { ToastState };
