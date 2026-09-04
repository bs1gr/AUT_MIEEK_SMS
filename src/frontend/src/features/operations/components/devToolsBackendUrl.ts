// Backend/frontend origin resolution for the DevTools operations monitor.
//
// This differs by deployment mode: native dev forces the backend onto :8000
// while the frontend runs on Vite's :5173, Docker serves both from one
// origin (no port math needed), and production uses whatever VITE_API_URL
// was baked in at build time. Keep this logic together - it is NOT safe to
// split across files without carrying the whole resolution chain with it.

const metaEnv = import.meta.env as Partial<Record<string, string | undefined>>;
export const RAW_API_BASE = (metaEnv?.VITE_API_URL?.trim?.()) ?? '';
const FALLBACK_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080';
const sanitizedApiBase = RAW_API_BASE.replace(/\/api\/v1\/?$/, '');

let resolvedBackendUrl: URL;
try {
  resolvedBackendUrl = new URL(sanitizedApiBase || '/', FALLBACK_ORIGIN);
} catch (error) {
  console.warn('[DevToolsPanel] Falling back to window origin for backend URL resolution', error);
  resolvedBackendUrl = new URL(FALLBACK_ORIGIN);
}

export const BACKEND_PATH_PREFIX = resolvedBackendUrl.pathname.replace(/\/$/, '') || '';
const FALLBACK_PROTOCOL = typeof window !== 'undefined' ? window.location.protocol || 'http:' : 'http:';
const FALLBACK_PORT_RAW = typeof window !== 'undefined' ? window.location.port || '' : '';
export const BACKEND_PROTOCOL = resolvedBackendUrl.protocol || FALLBACK_PROTOCOL || 'http:';
export const FRONTEND_PROTOCOL = FALLBACK_PROTOCOL || 'http:';

const MODE = ((metaEnv?.MODE as string | undefined) ?? metaEnv?.MODE ?? 'production').toLowerCase();
const DEV_PORT_HINTS = new Set(['5173', '4173', '3000', '3001', '5174', '5175']);
const DEFAULT_DEV_BACKEND_PORT = (metaEnv?.VITE_DEV_BACKEND_PORT?.trim?.()) || '8000';

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
export const BACKEND_PORT_SEGMENT = BACKEND_PORT_DISPLAY ? `:${BACKEND_PORT_DISPLAY}` : '';
export const BACKEND_PORT_LABEL = BACKEND_PORT_DISPLAY ? ` (${BACKEND_PORT_DISPLAY})` : '';

const FRONTEND_PORT_DISPLAY = normalizeDisplayPort(fallbackPortRaw);
export const FRONTEND_PORT_SEGMENT = FRONTEND_PORT_DISPLAY ? `:${FRONTEND_PORT_DISPLAY}` : '';
export const FRONTEND_PORT_LABEL = FRONTEND_PORT_DISPLAY ? ` (${FRONTEND_PORT_DISPLAY})` : '';

const BACKEND_HOSTNAME = resolvedBackendUrl.hostname || (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
const BACKEND_HOST = BACKEND_PORT_DISPLAY ? `${BACKEND_HOSTNAME}${BACKEND_PORT_SEGMENT}` : BACKEND_HOSTNAME;
export const BACKEND_DISPLAY_ORIGIN = BACKEND_PATH_PREFIX
  ? `${BACKEND_PROTOCOL}//${BACKEND_HOST}${BACKEND_PATH_PREFIX}`
  : `${BACKEND_PROTOCOL}//${BACKEND_HOST}`;

type HealthStatusValue = 'healthy' | 'degraded' | 'error' | string;

export const statusTone = (status?: HealthStatusValue) => {
  if (status === 'healthy') return 'bg-emerald-600';
  if (status === 'degraded') return 'bg-amber-600';
  if (status === 'error') return 'bg-rose-600';
  return 'bg-slate-600';
};
