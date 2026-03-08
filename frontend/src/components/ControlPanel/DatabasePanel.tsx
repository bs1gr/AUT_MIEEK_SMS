import { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Server,
  RefreshCw,
  Download,
  Trash2,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Activity,
  FileText,
  Cpu,
} from 'lucide-react';
import { controlApiClient } from '@/api/api';
import { useLanguage } from '../../LanguageContext';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface InstanceInfo {
  name: string;
  label: string;
  host: string;
  port: number;
  dbname: string;
  is_primary: boolean;
  status: string;
  version: string | null;
  started_at: string | null;
  size_bytes: number | null;
  size_human: string | null;
  error: string | null;
}

interface BackupInfo {
  filename: string;
  size_bytes: number;
  size_human: string;
  created_at: string;
  instance: string;
  method: string;
  compressed: boolean;
}

interface BackupResult {
  success: boolean;
  filename: string | null;
  size_human: string | null;
  method: string | null;
  compressed: boolean | null;
  timestamp: string | null;
  error: string | null;
}

interface RestoreResult {
  success: boolean;
  method: string | null;
  statements_executed: number | null;
  errors: string[] | null;
  error: string | null;
}

interface TableStat {
  table: string;
  row_count: number;
  size: string;
}

interface DatabaseStats {
  name: string;
  table_count: number | null;
  tables: TableStat[] | null;
  active_connections: number | null;
  size_bytes: number | null;
  size_human: string | null;
  error: string | null;
}

interface DatabasePanelProps {
  controlApi: string;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

const DatabasePanel: React.FC<DatabasePanelProps> = () => {
  const { t } = useLanguage();

  const [instances, setInstances] = useState<InstanceInfo[]>([]);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [stats, setStats] = useState<Record<string, DatabaseStats>>({});
  const [loading, setLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState<string | null>(null);
  const [restoreLoading, setRestoreLoading] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [expandedInstance, setExpandedInstance] = useState<string | null>(null);

  /* ---- helpers ---- */
  const flash = useCallback((msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  }, []);

  /* ---- data fetching ---- */
  const fetchInstances = useCallback(async () => {
    try {
      const res = await controlApiClient.get<InstanceInfo[]>('/database/instances');
      setInstances(res.data);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load instances';
      setError(msg);
    }
  }, []);

  const fetchBackups = useCallback(async () => {
    try {
      const res = await controlApiClient.get<BackupInfo[]>('/database/backups');
      setBackups(res.data);
    } catch {
      /* non-critical */
    }
  }, []);

  const fetchStats = useCallback(async (name: string) => {
    try {
      const res = await controlApiClient.get<DatabaseStats>(`/database/instances/${encodeURIComponent(name)}/stats`);
      setStats((prev) => ({ ...prev, [name]: res.data }));
    } catch {
      /* non-critical */
    }
  }, []);

  /* ---- initial load ---- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await fetchInstances();
      await fetchBackups();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchInstances, fetchBackups]);

  /* ---- actions ---- */
  const handleCreateBackup = useCallback(async (name: string) => {
    setBackupLoading(name);
    setError(null);
    try {
      const res = await controlApiClient.post<BackupResult>(
        `/database/instances/${encodeURIComponent(name)}/backup?compress=true`,
      );
      if (res.data.success) {
        flash(`${t('db.backupCreated') || 'Backup created'}: ${res.data.filename ?? ''}`);
        await fetchBackups();
      } else {
        setError(res.data.error || 'Backup failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup failed');
    } finally {
      setBackupLoading(null);
    }
  }, [fetchBackups, flash, t]);

  const handleDownload = useCallback(async (filename: string) => {
    try {
      const res = await controlApiClient.get(
        `/database/backups/${encodeURIComponent(filename)}/download`,
        { responseType: 'blob' },
      );
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Download failed');
    }
  }, []);

  const handleDelete = useCallback(async (filename: string) => {
    if (!window.confirm(`${t('db.confirmDelete') || 'Delete backup'} ${filename}?`)) return;
    setDeleteLoading(filename);
    try {
      await controlApiClient.delete(`/database/backups/${encodeURIComponent(filename)}`);
      flash(t('db.backupDeleted') || 'Backup deleted');
      await fetchBackups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleteLoading(null);
    }
  }, [fetchBackups, flash, t]);

  const handleRestore = useCallback(async (filename: string, instanceName: string) => {
    if (!window.confirm(`${t('db.confirmRestore') || 'Restore backup to'} ${instanceName}?`)) return;
    setRestoreLoading(filename);
    setError(null);
    try {
      const res = await controlApiClient.post<RestoreResult>(
        `/database/backups/${encodeURIComponent(filename)}/restore?instance_name=${encodeURIComponent(instanceName)}`,
      );
      if (res.data.success) {
        flash(t('db.restoreSuccess') || 'Restore completed');
      } else {
        setError(res.data.error || 'Restore failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setRestoreLoading(null);
    }
  }, [flash, t]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchInstances();
    await fetchBackups();
    setLoading(false);
  }, [fetchInstances, fetchBackups]);

  const toggleExpand = useCallback((name: string) => {
    setExpandedInstance((prev) => {
      if (prev === name) return null;
      // fetch stats on first expand
      if (!stats[name]) fetchStats(name);
      return name;
    });
  }, [stats, fetchStats]);

  /* ---- render ---- */
  if (loading && instances.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <RefreshCw className="animate-spin mr-2" size={20} />
        {t('db.loading') || 'Loading database instances…'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg p-6 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">
          {t('db.label') || 'Database'}
        </p>
        <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
          <Database size={20} />
          {t('db.title') || 'Database Management'}
        </h2>
        <p className="text-sm text-slate-600 max-w-3xl">
          {t('db.subtitle') || 'Monitor PostgreSQL instances, create backups, and restore data.'}
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          <XCircle size={18} /> {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">×</button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-4 text-green-700 text-sm">
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      {/* Instances Section */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Server size={18} />
            {t('db.instances') || 'Database Instances'}
          </h3>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {t('db.refresh') || 'Refresh'}
          </button>
        </div>

        {instances.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500 text-sm">
            {t('db.noInstances') || 'No database instances configured.'}
          </div>
        ) : (
          <div className="divide-y">
            {instances.map((inst) => (
              <div key={inst.name}>
                {/* Instance row */}
                <div
                  className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpand(inst.name)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(inst.name); } }}
                >
                  {/* Status dot */}
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    inst.status === 'healthy' ? 'bg-green-500' :
                    inst.status === 'unreachable' ? 'bg-red-500' :
                    'bg-yellow-500'
                  }`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{inst.label || inst.name}</span>
                      {inst.is_primary && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                          {t('db.primary') || 'Primary'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {inst.host}:{inst.port} / {inst.dbname}
                    </p>
                  </div>

                  {/* Status badge */}
                  <div className="flex items-center gap-2 text-sm">
                    {inst.status === 'healthy' ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle size={14} /> {t('db.healthy') || 'Healthy'}
                      </span>
                    ) : inst.status === 'unreachable' ? (
                      <span className="flex items-center gap-1 text-red-600">
                        <XCircle size={14} /> {t('db.unreachable') || 'Unreachable'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-yellow-600">
                        <AlertTriangle size={14} /> {inst.status}
                      </span>
                    )}
                  </div>

                  {/* Size */}
                  {inst.size_human && (
                    <span className="text-xs text-gray-400 hidden sm:block">
                      <Cpu size={12} className="inline mr-1" />{inst.size_human}
                    </span>
                  )}

                  {/* Backup button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCreateBackup(inst.name); }}
                    disabled={inst.status !== 'healthy' || backupLoading === inst.name}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {backupLoading === inst.name ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <FileText size={14} />
                    )}
                    {t('db.backup') || 'Backup'}
                  </button>
                </div>

                {/* Expanded stats */}
                {expandedInstance === inst.name && (
                  <div className="px-6 pb-4 bg-gray-50 border-t">
                    {inst.error && (
                      <p className="text-sm text-red-600 py-2">{inst.error}</p>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4">
                      {inst.version && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase">{t('db.version') || 'Version'}</p>
                          <p className="font-mono text-sm">{inst.version}</p>
                        </div>
                      )}
                      {inst.size_human && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase">{t('db.dbSize') || 'DB Size'}</p>
                          <p className="font-mono text-sm">{inst.size_human}</p>
                        </div>
                      )}
                      {inst.started_at && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase">{t('db.startedAt') || 'Started At'}</p>
                          <p className="font-mono text-sm">{inst.started_at ? new Date(inst.started_at).toLocaleString() : 'N/A'}</p>
                        </div>
                      )}
                      {stats[inst.name]?.active_connections != null && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase">{t('db.connections') || 'Connections'}</p>
                          <p className="font-mono text-sm flex items-center gap-1">
                            <Activity size={12} /> {stats[inst.name].active_connections}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Table stats */}
                    {stats[inst.name]?.tables && stats[inst.name].tables!.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                          <Server size={12} /> {t('db.tables') || 'Tables'} ({stats[inst.name].table_count})
                        </p>
                        <div className="max-h-48 overflow-y-auto rounded border bg-white">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-100 sticky top-0">
                              <tr>
                                <th className="text-left px-3 py-1.5 font-medium text-gray-600">{t('db.tableName') || 'Table'}</th>
                                <th className="text-right px-3 py-1.5 font-medium text-gray-600">{t('db.rows') || 'Rows'}</th>
                                <th className="text-right px-3 py-1.5 font-medium text-gray-600">{t('db.size') || 'Size'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {stats[inst.name].tables!.map((tbl) => (
                                <tr key={tbl.table} className="hover:bg-gray-50">
                                  <td className="px-3 py-1.5 font-mono">{tbl.table}</td>
                                  <td className="px-3 py-1.5 text-right">{(tbl.row_count ?? 0).toLocaleString()}</td>
                                  <td className="px-3 py-1.5 text-right text-gray-500">{tbl.size}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Loading stats spinner */}
                    {expandedInstance === inst.name && !stats[inst.name] && inst.status === 'healthy' && (
                      <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                        <RefreshCw size={14} className="animate-spin" /> {t('db.loadingStats') || 'Loading statistics…'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Backups Section */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <FileText size={18} />
            {t('db.backups') || 'Backups'}
          </h3>
          <span className="text-xs text-gray-400">{backups.length} {t('db.files') || 'files'}</span>
        </div>

        {backups.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500 text-sm">
            {t('db.noBackups') || 'No backups available. Create one from an instance above.'}
          </div>
        ) : (
          <div className="divide-y">
            {backups.map((bk) => (
              <div key={bk.filename} className="flex items-center gap-4 px-6 py-3">
                <FileText size={16} className="text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{bk.filename}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-2">
                    <Clock size={10} /> {bk.created_at ? new Date(bk.created_at).toLocaleString() : 'N/A'}
                    <span className="text-gray-300">•</span>
                    {bk.size_human}
                    <span className="text-gray-300">•</span>
                    {bk.instance}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDownload(bk.filename)}
                    title={t('db.download') || 'Download'}
                    className="p-1.5 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    <Download size={14} />
                  </button>

                  <button
                    onClick={() => handleRestore(bk.filename, bk.instance)}
                    disabled={restoreLoading === bk.filename}
                    title={t('db.restore') || 'Restore'}
                    className="p-1.5 rounded-md text-gray-500 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-50 transition-colors"
                  >
                    {restoreLoading === bk.filename ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                  </button>

                  <button
                    onClick={() => handleDelete(bk.filename)}
                    disabled={deleteLoading === bk.filename}
                    title={t('db.delete') || 'Delete'}
                    className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    {deleteLoading === bk.filename ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabasePanel;
