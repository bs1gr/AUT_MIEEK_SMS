import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

type PanelValue = number | null;

interface PanelData {
  label: string;
  help?: string;
  unit?: 'ms' | 's' | '%' | 'rps' | 'count';
  value: PanelValue;
  fmt?: (v: number) => string;
}

interface Props {
  controlApiBase: string; // e.g., http://localhost:8080/control/api
  isPrometheusRunning: boolean;
  t: (key: string) => string;
}

const fmtNum = (v: number, digits = 2) => {
  if (Number.isNaN(v)) return '--';
  if (!Number.isFinite(v)) return `${v}`;
  if (Math.abs(v) >= 1000) return v.toFixed(0);
  return v.toFixed(digits);
};

const toMs = (s: number) => s * 1000;

export default function PrometheusPanels({ controlApiBase, isPrometheusRunning, t }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [window, setWindow] = useState<'5m' | '15m' | '1h'>('5m');
  const [data, setData] = useState<Record<string, PanelValue>>({});

  const endpointQuery = `${controlApiBase}/monitoring/prometheus/query`;

  const queries = useMemo(() => {
    const w = window;
    return {
      rps: `sum(rate(sms_http_requests_total[${w}]))`,
      errPct: `100 * sum(rate(sms_http_requests_total{status=~"5.."}[${w}])) / clamp_min(sum(rate(sms_http_requests_total[${w}])), 1)`,
      p95: `histogram_quantile(0.95, sum(rate(sms_http_request_duration_seconds_bucket[${w}])) by (le))`,
      dbP95: `histogram_quantile(0.95, sum(rate(sms_db_query_duration_seconds_bucket[${w}])) by (le))`,
      studentsActive: `sum(sms_students_total{status="active"})`,
      enrollments: `sms_enrollments_total`,
      slowReq: `increase(sms_api_slow_requests_total[${w}])`,
      authFail: `increase(sms_auth_attempts_total{status="failed"}[${w}])`,
      cacheHitPct: `100 * sum(increase(sms_cache_hits_total[${w}])) / clamp_min(sum(increase(sms_cache_hits_total[${w}])) + sum(increase(sms_cache_misses_total[${w}])), 1)`
    } as const;
  }, [window]);

  const fetchInstant = async (q: string): Promise<PanelValue> => {
    try {
      const res = await axios.get(endpointQuery, { params: { query: q } });
      const payload = res.data;
      if (payload?.status !== 'success') return null;
      const result = payload.data?.result || [];
      if (!Array.isArray(result) || result.length === 0) return null;
      // Vector or scalar
      if (payload.data.resultType === 'scalar' && Array.isArray(payload.data.result)) {
        const val = parseFloat(payload.data.result[1]);
        return Number.isFinite(val) ? val : null;
      }
      const first = result[0];
      const val = parseFloat(first?.value?.[1] ?? '');
      return Number.isFinite(val) ? val : null;
    } catch (e: any) {
      // Bubble up error only once; panels will show --
      return null;
    }
  };

  const refresh = async () => {
    if (!isPrometheusRunning) return;
    setLoading(true);
    setError(null);
    try {
      const entries = Object.entries(queries);
      const values = await Promise.all(entries.map(([, q]) => fetchInstant(q)));
      const next: Record<string, PanelValue> = {};
      entries.forEach(([k], idx) => (next[k] = values[idx]));
      setData(next);
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window, isPrometheusRunning]);

  const panels: PanelData[] = [
    { label: t('controlPanel.promPanels.rps'), value: data.rps ?? null, unit: 'rps' },
    { label: t('controlPanel.promPanels.errorRate'), value: data.errPct ?? null, unit: '%', fmt: (v) => fmtNum(v, 1) },
    { label: t('controlPanel.promPanels.httpP95'), value: data.p95 != null ? toMs(data.p95) : null, unit: 'ms' },
    { label: t('controlPanel.promPanels.dbP95'), value: data.dbP95 != null ? toMs(data.dbP95) : null, unit: 'ms' },
    { label: t('controlPanel.promPanels.studentsActive'), value: data.studentsActive ?? null, unit: 'count', fmt: (v) => fmtNum(v, 0) },
    { label: t('controlPanel.promPanels.enrollments'), value: data.enrollments ?? null, unit: 'count', fmt: (v) => fmtNum(v, 0) },
    { label: t('controlPanel.promPanels.slowRequests'), value: data.slowReq ?? null, unit: 'count', fmt: (v) => fmtNum(v, 0) },
    { label: t('controlPanel.promPanels.authFailures'), value: data.authFail ?? null, unit: 'count', fmt: (v) => fmtNum(v, 0) },
    { label: t('controlPanel.promPanels.cacheHitRate'), value: data.cacheHitPct ?? null, unit: '%', fmt: (v) => fmtNum(v, 1) },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {t('controlPanel.promPanels.subtitle')}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="prom-window" className="text-sm text-gray-700">{t('controlPanel.promPanels.window')}</label>
          <select
            id="prom-window"
            className="px-2 py-1 border rounded-md text-sm"
            value={window}
            onChange={(e) => setWindow(e.target.value as typeof window)}
          >
            <option value="5m">5m</option>
            <option value="15m">15m</option>
            <option value="1h">1h</option>
          </select>
          <button
            className="px-3 py-1.5 rounded-md text-sm bg-gray-100 hover:bg-gray-200"
            onClick={refresh}
            disabled={loading}
          >
            {loading ? t('controlPanel.promPanels.loading') : t('controlPanel.promPanels.refresh')}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {panels.map((p, idx) => (
          <div key={idx} className="bg-white border rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">{p.label}</div>
            <div className="text-2xl font-semibold text-gray-900">
              {p.value == null ? '--' : (p.fmt ? p.fmt(p.value) : fmtNum(p.value))}
              {p.unit ? <span className="text-sm text-gray-500 ml-1">{p.unit}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
