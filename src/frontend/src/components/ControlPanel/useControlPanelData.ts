import { useCallback, useEffect, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { controlApiClient } from '@/api/api';

export interface SystemStatus {
  backend: string;
  frontend: string;
  docker: string;
  database: string;
  process_start_time?: string; // ISO string from backend
}

export interface DiagnosticItem {
  name: string;
  category?: string;
  status: string;
  message: string;
  details?: {
    [key: string]: unknown;
    sms_schema_version?: string;
  };
}

export interface PortInfo {
  port: number;
  status: string;
  in_use?: boolean;
  process_name?: string;
  process_id?: number;
}

export interface EnvironmentInfo {
  python_version?: string;
  node_version?: string;
  docker_version?: string;
  platform?: string;
  cwd?: string;
  environment_mode?: string;
  python_packages?: string[];
  sms_schema_version?: string;
  app_version?: string;
  api_version?: string;
  frontend_version?: string;
  git_revision?: string;
  python_path?: string;
  node_path?: string;
  npm_version?: string;
  venv_active?: boolean;
}

export interface OperationStatus {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

/** Formats an elapsed-seconds count as "1d 2h 3m 4s", omitting leading zero units. */
export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  let str = '';
  if (d > 0) str += `${d}d `;
  if (h > 0 || d > 0) str += `${h}h `;
  if (m > 0 || h > 0 || d > 0) str += `${m}m `;
  str += `${s}s`;
  return str.trim();
}

// Per-endpoint TTLs (ms) for the in-memory control-API cache. Status is polled
// every 5s by the auto-refresh below, so its TTL matches that; the rest are
// only fetched when their tab is opened, so they can hold longer.
const CACHE_TTL = {
  status: 5000,
  diagnostics: 30000,
  ports: 10000,
  logs: 10000,
  environment: 20000,
  environmentWithPackages: 60000,
} as const;

interface UseControlPanelDataParams {
  t: (key: string, options?: Record<string, unknown>) => string;
}

/**
 * The Control Panel's control-API data layer: a short-TTL response cache, the
 * per-tab fetchers, the status auto-refresh plus derived uptime ticker, and
 * the two operation runners.
 *
 * Extracted from ControlPanel.tsx, which was ~1190 lines of this logic plus
 * the render for seven tabs and had no test coverage. Tab selection and the
 * collapse/expand UI state deliberately stay in the component — this hook is
 * only about talking to the control API.
 */
export function useControlPanelData({ t }: UseControlPanelDataParams) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [environment, setEnvironment] = useState<EnvironmentInfo | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [tabLoading, setTabLoading] = useState<Record<string, boolean>>({});
  const [tabUpdatedAt, setTabUpdatedAt] = useState<Record<string, string>>({});
  const [operationStatus, setOperationStatus] = useState<OperationStatus | null>(null);
  const [uptime, setUptime] = useState<string>('');
  const uptimeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const controlCacheRef = useRef(new Map<string, { ts: number; data: unknown }>());
  const getCachedControl = useCallback((key: string, ttlMs: number) => {
    const entry = controlCacheRef.current.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > ttlMs) return null;
    return entry.data;
  }, []);

  const setCachedControl = useCallback((key: string, data: unknown) => {
    controlCacheRef.current.set(key, { ts: Date.now(), data });
  }, []);

  const setTabLoadingState = useCallback((key: string, value: boolean) => {
    setTabLoading((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setTabUpdated = useCallback((key: string) => {
    setTabUpdatedAt((prev) => ({ ...prev, [key]: new Date().toISOString() }));
  }, []);

  // Update uptime based on process_start_time
  const updateUptime = useCallback((startIso: string | undefined) => {
    if (!startIso) {
      setUptime('');
      return;
    }
    const start = new Date(startIso).getTime();
    const now = Date.now();
    const diff = Math.floor((now - start) / 1000);
    setUptime(formatUptime(diff));
  }, []);

  // Fetch status
  const fetchStatus = useCallback(async () => {
    try {
      const cached = getCachedControl('status', CACHE_TTL.status) as SystemStatus | null;
      if (cached) {
        setStatus(cached);
        if (cached.process_start_time) {
          updateUptime(cached.process_start_time);
        }
        return;
      }
      const response = await controlApiClient.get('/status');
      setStatus(response.data);
      setCachedControl('status', response.data);
      if (response.data.process_start_time) {
        updateUptime(response.data.process_start_time);
        // Clear previous timer
        if (uptimeTimerRef.current) clearInterval(uptimeTimerRef.current);
        // Start new timer
        const timer = setInterval(() => {
          updateUptime(response.data.process_start_time);
        }, 1000);
        uptimeTimerRef.current = timer;
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  }, [getCachedControl, setCachedControl, updateUptime]);

  // Fetch diagnostics
  const fetchDiagnostics = useCallback(async () => {
    try {
      const cached = getCachedControl('diagnostics', CACHE_TTL.diagnostics) as DiagnosticItem[] | null;
      if (cached) {
        setDiagnostics(cached);
        setTabUpdated('diagnostics');
        return;
      }
      setTabLoadingState('diagnostics', true);
      const response = await controlApiClient.get('/diagnostics');
      // Ensure response.data is an array before setting
      if (Array.isArray(response.data)) {
        setDiagnostics(response.data);
        setCachedControl('diagnostics', response.data);
      } else {
        console.error('Diagnostics response is not an array:', response.data);
        setDiagnostics([]);
      }
      setTabUpdated('diagnostics');
    } catch (error) {
      console.error('Failed to fetch diagnostics:', error);
      setDiagnostics([]);
    } finally {
      setTabLoadingState('diagnostics', false);
    }
  }, [getCachedControl, setCachedControl, setTabLoadingState, setTabUpdated]);

  // Fetch ports
  const fetchPorts = useCallback(async () => {
    try {
      const cached = getCachedControl('ports', CACHE_TTL.ports) as PortInfo[] | null;
      if (cached) {
        setPorts(cached);
        setTabUpdated('ports');
        return;
      }
      setTabLoadingState('ports', true);
      const response = await controlApiClient.get('/ports');
      // Ensure response.data is an array before setting
      if (Array.isArray(response.data)) {
        setPorts(response.data);
        setCachedControl('ports', response.data);
      } else {
        console.error('Ports response is not an array:', response.data);
        setPorts([]);
      }
      setTabUpdated('ports');
    } catch (error) {
      console.error('Failed to fetch ports:', error);
      setPorts([]);
    } finally {
      setTabLoadingState('ports', false);
    }
  }, [getCachedControl, setCachedControl, setTabLoadingState, setTabUpdated]);

  // Fetch environment
  const fetchEnvironment = useCallback(async (includePackages = false): Promise<void> => {
    try {
      const cacheKey = includePackages ? 'environment:packages' : 'environment';
      const ttl = includePackages ? CACHE_TTL.environmentWithPackages : CACHE_TTL.environment;
      const cached = getCachedControl(cacheKey, ttl) as EnvironmentInfo | null;
      if (cached) {
        setEnvironment(cached);
        setTabUpdated('environment');
        return;
      }
      setTabLoadingState('environment', true);
      const url = includePackages ? '/environment?include_packages=true' : '/environment';
      const response = await controlApiClient.get(url);
      setEnvironment(response.data);
      setCachedControl(cacheKey, response.data);
      setTabUpdated('environment');
    } catch (error) {
      console.error('Failed to fetch environment:', error);
    } finally {
      setTabLoadingState('environment', false);
    }
  }, [getCachedControl, setCachedControl, setTabLoadingState, setTabUpdated]);

  // Fetch logs
  const fetchLogs = useCallback(async (): Promise<void> => {
    try {
      const cached = getCachedControl('logs', CACHE_TTL.logs) as string[] | null;
      if (cached) {
        setLogs(cached);
        setTabUpdated('logs');
        return;
      }
      setTabLoadingState('logs', true);
      const response = await controlApiClient.get('/logs/backend?lines=50');
      setLogs(response.data.logs || []);
      setCachedControl('logs', response.data.logs || []);
      setTabUpdated('logs');
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setTabLoadingState('logs', false);
    }
  }, [getCachedControl, setCachedControl, setTabLoadingState, setTabUpdated]);

  // Shared by runOperation (endpoint name) and runOperationPath (full path with
  // query params) — identical apart from how the URL is built.
  const postOperation = useCallback(async (path: string, successMessage: string): Promise<void> => {
    try {
      setLoading(true);
      setOperationStatus({ type: 'info', message: t('executing') });
      const response = await controlApiClient.post(path);

      if (response.data.success) {
        setOperationStatus({ type: 'success', message: successMessage });
      } else {
        setOperationStatus({ type: 'error', message: response.data.message || t('operationFailed') });
      }

      // Refresh data after operation
      await fetchStatus();
      await fetchDiagnostics();
    } catch (error) {
      const err = error as AxiosError<{ detail?: string }>;
      setOperationStatus({
        type: 'error',
        message: err.response?.data?.detail || err.message || t('operationFailed')
      });
    } finally {
      setLoading(false);
      setTimeout(() => setOperationStatus(null), 5000);
    }
  }, [t, fetchStatus, fetchDiagnostics]);

  // Generic operation handler
  const runOperation = useCallback(
    (endpoint: string, successMessage: string) => postOperation(`/operations/${endpoint}`, successMessage),
    [postOperation]
  );

  // Operation with full path (allows query params)
  const runOperationPath = useCallback(
    (path: string, successMessage: string) => postOperation(path, successMessage),
    [postOperation]
  );

  // Initial load
  useEffect(() => {
    fetchStatus();

    // Auto-refresh status
    const interval = setInterval(fetchStatus, 5000);
    return () => {
      clearInterval(interval);
      if (uptimeTimerRef.current) clearInterval(uptimeTimerRef.current);
    };
  }, [fetchStatus]);

  return {
    status,
    diagnostics,
    ports,
    environment,
    logs,
    loading,
    tabLoading,
    tabUpdatedAt,
    operationStatus,
    uptime,
    fetchStatus,
    fetchDiagnostics,
    fetchPorts,
    fetchEnvironment,
    fetchLogs,
    runOperation,
    runOperationPath,
  };
}

export default useControlPanelData;
