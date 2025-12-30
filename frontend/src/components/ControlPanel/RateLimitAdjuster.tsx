import { useState, useEffect } from 'react';
import { AlertTriangle, RotateCcw, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Toast from '@/components/ui/Toast';
import { CONTROL_API_BASE } from '@/api/api';

interface RateLimitSettings {
  read: number;
  write: number;
  heavy: number;
  auth: number;
  teacher_import: number;
}

interface ToastState {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface RateLimitAdjusterProps {
  onToast?: (state: ToastState) => void;
}

export default function RateLimitAdjuster({ onToast }: RateLimitAdjusterProps) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<RateLimitSettings | null>(null);
  const [defaults, setDefaults] = useState<RateLimitSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState<Partial<RateLimitSettings>>({});
  const [localToast, setLocalToast] = useState<ToastState>({ visible: false, message: '', type: 'info' });

  useEffect(() => {
    loadSettings();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const state = { visible: true, message, type };
    setLocalToast(state);
    onToast?.(state);
    setTimeout(() => {
      setLocalToast({ ...state, visible: false });
    }, 4000);
  };

  const loadSettings = async () => {
    try {
      const response = await fetch(`${CONTROL_API_BASE}/rate-limits`, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to load settings: ${response.status}`);
      }

      const data = await response.json();
      setSettings(data.current);
      setDefaults(data.defaults);
      setChanges({});
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to load rate limit settings',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: keyof RateLimitSettings, value: number) => {
    setChanges((prev) => ({ ...prev, [key]: Math.max(1, value) }));
  };

  const hasChanges = Object.keys(changes).length > 0;

  const saveChanges = async () => {
    if (!hasChanges) return;

    setSaving(true);
    try {
      const response = await fetch(`${CONTROL_API_BASE}/rate-limits/bulk-update`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limits: changes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `Failed to save: ${response.status}`);
      }

      await loadSettings();
      showToast('Rate limits updated successfully', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to save changes',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!window.confirm('Reset all rate limits to defaults?')) return;

    setSaving(true);
    try {
      const response = await fetch(`${CONTROL_API_BASE}/rate-limits/reset`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to reset: ${response.status}`);
      }

      await loadSettings();
      showToast('Rate limits reset to defaults', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to reset limits',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded border border-gray-300">
        <p className="text-gray-600">{t('loading') || 'Loading...'}</p>
      </div>
    );
  }

  if (!settings || !defaults) {
    return (
      <div className="p-4 bg-red-50 rounded border border-red-300">
        <p className="text-red-700">{t('error') || 'Error loading rate limit settings'}</p>
      </div>
    );
  }

  const limitTypes = [
    { key: 'read' as const, label: t('rateLimits.read') || 'Read (queries/min)', desc: 'GET requests' },
    { key: 'write' as const, label: t('rateLimits.write') || 'Write (updates/min)', desc: 'POST/PUT requests' },
    { key: 'heavy' as const, label: t('rateLimits.heavy') || 'Heavy (reports/min)', desc: 'Heavy operations' },
    { key: 'auth' as const, label: t('rateLimits.auth') || 'Auth (logins/min)', desc: 'Login attempts' },
    { key: 'teacher_import' as const, label: t('rateLimits.teacherImport') || 'Import (bulk/min)', desc: 'Bulk imports' },
  ];

  return (
    <div className="space-y-4">
      {localToast.visible && (
        <Toast
          message={localToast.message}
          type={localToast.type}
          onClose={() => setLocalToast({ ...localToast, visible: false })}
        />
      )}

      <div className="bg-blue-50 border border-blue-200 rounded p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-semibold">{t('rateLimits.info') || 'Rate Limit Configuration'}</p>
          <p className="text-xs mt-1">Adjust these limits if users experience 429 (Too Many Requests) errors.</p>
        </div>
      </div>

      <div className="space-y-3">
        {limitTypes.map(({ key, label, desc }) => {
          const current = changes[key] !== undefined ? changes[key] : settings[key];
          const isChanged = changes[key] !== undefined && changes[key] !== settings[key];
          const isAboveDefault = (changes[key] ?? settings[key]) > (defaults[key] ?? 100);

          return (
            <div key={key} className="border border-gray-300 rounded p-3 bg-white">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                {isChanged && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    {t('modified') || 'Modified'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  value={current}
                  onChange={(e) => handleChange(key, parseInt(e.target.value) || 1)}
                  className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                  disabled={saving}
                />
                <span className="text-xs text-gray-600">{t('rateLimits.requestsPerMin') || 'req/min'}</span>
                <span className="text-xs text-gray-500 ml-auto">
                  {t('rateLimits.default') || 'Default'}: {defaults[key]}
                </span>
                {isAboveDefault && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded ml-2">
                    +{((current / (defaults[key] ?? 1)) - 1) * 100 | 0}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <button
          onClick={saveChanges}
          disabled={!hasChanges || saving}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {saving ? (t('saving') || 'Saving...') : (t('save') || 'Save Changes')}
        </button>

        <button
          onClick={resetToDefaults}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-4 h-4" />
          {t('reset') || 'Reset Defaults'}
        </button>
      </div>
    </div>
  );
}
