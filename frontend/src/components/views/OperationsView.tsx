import React, { useState } from 'react';
import { useLanguage } from '../../LanguageContext';
import ExportCenter from '../tools/ExportCenter';
import HelpDocumentation from '../tools/HelpDocumentation';
import ServerControl from '../common/ServerControl';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api/v1';

const DevToolsTab: React.FC = () => {
  const { t } = useLanguage() as any;
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [opLoading, setOpLoading] = useState<string | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearScope, setClearScope] = useState<'all' | 'data_only'>('all');
  const [result, setResult] = useState<any>(null);
  const [importType, setImportType] = useState<'courses' | 'students'>('courses');
  const [files, setFiles] = useState<FileList | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [intervalMs, setIntervalMs] = useState<number>(5000);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

  // Ensure health hits the root backend (not /api/v1)
  const HEALTH_URL = (() => {
    try {
      if (API_BASE_URL.endsWith('/api/v1')) {
        return API_BASE_URL.replace(/\/api\/v1$/, '') + '/health';
      }
      return API_BASE_URL + '/health';
    } catch {
      return 'http://localhost:8000/health';
    }
  })();

  const ping = async () => {
    setLoading(true);
    try {
      const res = await fetch(HEALTH_URL);
      const data = await res.json();
      setHealth(data);
      setLastCheckedAt(new Date().toLocaleTimeString());
    } catch {
      setHealth({ status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh handler
  React.useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      if (!loading) ping();
    }, Math.max(2000, intervalMs));
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, intervalMs, HEALTH_URL, loading]);

  // Removed diagnose operation (no longer needed)

  const backup = async () => {
    setOpLoading('backup');
    setResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/adminops/backup`, { method: 'POST' });
      const data = await res.json();
      setResult({ op: 'backup', data });
    } catch {
      setResult({ op: 'backup', error: true });
    } finally {
      setOpLoading(null);
    }
  };

  const restore = async () => {
    if (!restoreFile) {
      setResult({ op: 'restore', error: 'No file selected' });
      return;
    }
    setOpLoading('restore');
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', restoreFile);
      const res = await fetch(`${API_BASE_URL}/adminops/restore`, { method: 'POST', body: form });
      const data = await res.json();
      setResult({ op: 'restore', data });
    } catch {
      setResult({ op: 'restore', error: true });
    } finally {
      setOpLoading(null);
    }
  };

  const clearDb = async () => {
    if (!clearConfirm) {
      setResult({ op: 'clear', error: 'Confirm required' });
      return;
    }
    setOpLoading('clear');
    setResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/adminops/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true, scope: clearScope }),
      });
      const data = await res.json();
      setResult({ op: 'clear', data });
    } catch {
      setResult({ op: 'clear', error: true });
    } finally {
      setOpLoading(null);
    }
  };

  const uploadImport = async () => {
    if (!files || files.length === 0) {
      setResult({ op: 'upload', error: 'No files selected' });
      return;
    }
    setOpLoading('upload');
    setResult(null);
    try {
      const form = new FormData();
      form.append('import_type', importType);
      Array.from(files).forEach((f) => form.append('files', f));
      const res = await fetch(`${API_BASE_URL}/imports/upload`, { method: 'POST', body: form });
      const data = await res.json();
      setResult({ op: 'upload', data });
    } catch {
      setResult({ op: 'upload', error: true });
    } finally {
      setOpLoading(null);
    }
  };

  return (
    <div className="space-y-4">

      {health && (
        <div className="border rounded-xl overflow-hidden">
          <div
            className={
              'px-4 py-3 text-white ' +
              (health.status === 'healthy'
                ? 'bg-emerald-600'
                : health.status === 'degraded'
                ? 'bg-amber-600'
                : 'bg-rose-600')
            }
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold">System Health</div>
                <div className="text-xs opacity-90 space-x-2">
                  {health.version ? <span>v{health.version}</span> : null}
                  {health.timestamp ? <span>{new Date(health.timestamp).toLocaleString()}</span> : null}
                  {lastCheckedAt ? <span>(checked {lastCheckedAt})</span> : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {/* LEDs */}
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(16,185,129,0.9)]"></span>
                  <span className="text-white/90 text-xs">Frontend</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      'inline-block w-2.5 h-2.5 rounded-full ' +
                      (health?.status === 'healthy'
                        ? 'bg-emerald-300 shadow-[0_0_6px_rgba(16,185,129,0.9)]'
                        : health?.status === 'degraded'
                        ? 'bg-amber-300 shadow-[0_0_6px_rgba(245,158,11,0.9)]'
                        : 'bg-rose-300 shadow-[0_0_6px_rgba(244,63,94,0.9)]')
                    }
                  ></span>
                  <span className="text-white/90 text-xs">Backend</span>
                </div>
                {/* Controls */}
                <div className="ml-auto flex items-center gap-3">
                  <button onClick={ping} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded text-xs">
                    {loading ? t('loading') : t('utils.checkHealth')}
                  </button>
                  <label className="inline-flex items-center gap-1 text-xs text-white/90">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      aria-label="Toggle auto refresh"
                    />
                    Auto-refresh
                  </label>
                  <select
                    value={String(intervalMs)}
                    onChange={(e) => setIntervalMs(parseInt(e.target.value, 10))}
                    className="bg-white/20 text-white rounded px-2 py-1 text-xs"
                    aria-label="Auto refresh interval"
                    disabled={!autoRefresh}
                  >
                    <option className="text-black" value="3000">3s</option>
                    <option className="text-black" value="5000">5s</option>
                    <option className="text-black" value="10000">10s</option>
                    <option className="text-black" value="30000">30s</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-gray-500">Database</div>
              <div className="text-sm font-semibold">
                {health.database || health.db || 'unknown'}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-gray-500">Students</div>
              <div className="text-sm font-semibold">
                {health.statistics?.students ?? health.students_count ?? '—'}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-gray-500">Courses</div>
              <div className="text-sm font-semibold">
                {health.statistics?.courses ?? health.courses_count ?? '—'}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-gray-500">Frontend</div>
              <div className="text-sm font-semibold">running on {window.location.hostname}:{window.location.port || '5173'}</div>
            </div>
            {typeof health.uptime !== 'undefined' && (
              <div className="rounded-lg border p-3 md:col-span-3">
                <div className="text-xs text-gray-500">Uptime</div>
                <div className="text-sm font-semibold">{health.uptime}s</div>
              </div>
            )}
            {/* Available endpoints */}
            <div className="rounded-lg border p-3 md:col-span-3">
              <div className="text-sm font-semibold mb-2">Available Endpoints</div>
              {(() => {
                const frontendPort = String(window.location.port || '5173');
                const rawIps: string[] = Array.isArray(health?.network?.ips) ? health.network.ips : [];
                const extras = [window.location.hostname, 'localhost', '127.0.0.1'].filter(Boolean) as string[];
                const set = new Set<string>();
                [...rawIps, ...extras].forEach((ip) => {
                  if (ip && typeof ip === 'string') set.add(ip);
                });
                const ips = Array.from(set);
                if (!ips.length) return <div className="text-xs text-gray-600">No IPs available.</div>;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ips.map((ip) => (
                      <div key={ip} className="text-xs">
                        <div className="font-mono text-gray-700 mb-1">{ip}</div>
                        <div className="flex flex-wrap gap-2">
                          <a className="text-indigo-600 hover:underline" href={`http://${ip}:8000/`} target="_blank" rel="noopener noreferrer">Backend</a>
                          <span className="text-gray-400">|</span>
                          <a className="text-indigo-600 hover:underline" href={`http://${ip}:8000/docs`} target="_blank" rel="noopener noreferrer">Docs</a>
                          <a className="text-indigo-600 hover:underline" href={`http://${ip}:8000/redoc`} target="_blank" rel="noopener noreferrer">ReDoc</a>
                          <a className="text-indigo-600 hover:underline" href={`http://${ip}:8000/health`} target="_blank" rel="noopener noreferrer">Health</a>
                          <span className="text-gray-400">|</span>
                          <a className="text-emerald-700 hover:underline" href={`http://${ip}:${frontendPort}/`} target="_blank" rel="noopener noreferrer">Frontend</a>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold mb-2">{t('utils.backupDatabase')}</h4>
          <p className="text-xs text-gray-600 mb-3">{t('utils.backupDesc')}</p>
          <button
            onClick={backup}
            disabled={opLoading === 'backup'}
            className="px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
          >
            {opLoading === 'backup' ? `${t('loading')}...` : t('utils.backupDatabase')}
          </button>
        </div>
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold mb-2">{t('utils.resetDatabase')}</h4>
          <p className="text-xs text-gray-600 mb-3">{t('utils.uploadPreviouslySavedBackup')}</p>
          <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center">
            <input
              type="file"
              accept=".db"
              onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
              className="flex-1"
              aria-label="Select backup database file to restore"
            />
            <button
              onClick={restore}
              disabled={!restoreFile || opLoading === 'restore'}
              className="px-3 py-2 bg-emerald-600 text-white rounded disabled:opacity-50"
            >
              {opLoading === 'restore' ? `${t('loading')}...` : t('utils.restoreDb')}
            </button>
          </div>
          <p className="text-xs text-amber-600 mt-2">{t('utils.appMayNeedRefresh')}</p>
        </div>
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold mb-2">{t('utils.clear')}</h4>
          <p className="text-xs text-gray-600 mb-2">{t('utils.deleteDataChooseScope')}</p>
          <div className="flex items-center gap-2 mb-2">
            <input
              id="confirmClear"
              type="checkbox"
              checked={clearConfirm}
              onChange={(e) => setClearConfirm(e.target.checked)}
            />
            <label htmlFor="confirmClear" className="text-sm">
              {t('confirm')}
            </label>
          </div>
          <select
            value={clearScope}
            onChange={(e) => setClearScope(e.target.value as any)}
            className="w-full border rounded px-2 py-1 mb-2"
            aria-label="Select clear database scope"
          >
            <option value="all">{t('utils.allCoursesStudentsRecords')}</option>
            <option value="data_only">{t('utils.dataOnlyKeepCoursesStudents')}</option>
          </select>
          <button
            onClick={clearDb}
            disabled={!clearConfirm || opLoading === 'clear'}
            className="px-3 py-2 bg-red-600 text-white rounded disabled:opacity-50"
          >
            {opLoading === 'clear' ? `${t('loading')}...` : t('utils.clearDb')}
          </button>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h4 className="font-semibold mb-2">{t('utils.uploadJsonToImport')}</h4>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <select
            value={importType}
            onChange={(e) => setImportType(e.target.value as any)}
            className="border rounded px-2 py-1 w-full md:w-auto"
            aria-label="Select import type"
          >
            <option value="courses">{t('courses')}</option>
            <option value="students">{t('students')}</option>
          </select>
          <input
            type="file"
            accept=".json"
            multiple
            onChange={(e) => setFiles(e.target.files)}
            className="w-full md:flex-1"
            aria-label="Select JSON files to import"
          />
          <button
            onClick={uploadImport}
            disabled={opLoading === 'upload'}
            className="px-3 py-2 bg-purple-600 text-white rounded disabled:opacity-50"
          >
            {opLoading === 'upload' ? `${t('loading')}...` : t('utils.importUpload')}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2">{t('utils.selectJsonFiles')}</p>
      </div>

      {(result) && (
        <pre className="bg-gray-50 border rounded p-3 text-xs overflow-auto">
          {JSON.stringify({ result }, null, 2)}
        </pre>
      )}
    </div>
  );
};

const OperationsView: React.FC<{ students: any[] }> = ({ students }) => {
  const { t } = useLanguage() as any;
  const [tab, setTab] = useState<'exports' | 'help' | 'devtools'>('exports');

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setTab('exports')}
          className={`px-4 py-2 rounded border ${
            tab === 'exports'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-700 border-gray-300'
          }`}
        >
          {t('export')}
        </button>
        <button
          onClick={() => setTab('help')}
          className={`px-4 py-2 rounded border ${
            tab === 'help'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-700 border-gray-300'
          }`}
        >
          {t('help')}
        </button>
        <button
          onClick={() => setTab('devtools')}
          className={`px-4 py-2 rounded border ${
            tab === 'devtools'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-700 border-gray-300'
          }`}
        >
          {t('utils.title')}
        </button>
      </div>
      <div className="bg-white border rounded-xl p-4">
        {tab === 'exports' && <ExportCenter />}
        {tab === 'help' && <HelpDocumentation />}
        {tab === 'devtools' && <DevToolsTab />}
      </div>
    </div>
  );
};

export default OperationsView;
