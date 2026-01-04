import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RotateCw, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
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
  type: 'success' | 'error' | 'info';
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

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const state = { visible: true, message, type };
    setLocalToast(state);
    onToast?.(state);
    setTimeout(() => {
      setLocalToast({ ...state, visible: false });
    }, 4000);
  }, [onToast]);

  const loadSettings = useCallback(async () => {
    try {
      const response = await axios.get(`${CONTROL_API_BASE}/rate-limits`);

      const data = response.data;
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
  }, [showToast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleChange = (key: keyof RateLimitSettings, value: number) => {
    setChanges((prev) => ({ ...prev, [key]: Math.max(1, value) }));
  };

  const hasChanges = Object.keys(changes).length > 0;

  const saveChanges = async () => {
    if (!hasChanges) return;

    setSaving(true);
    try {
      await axios.post(`${CONTROL_API_BASE}/rate-limits/bulk-update`, {
        limits: changes,
      });

      await loadSettings();
      showToast('Rate limits updated successfully', 'success');
    } catch (err: unknown) {
      const errorMsg = axios.isAxiosError(err)
        ? err.response?.data?.detail || `Failed to save: ${err.response?.status}`
        : err instanceof Error
        ? err.message
        : 'Failed to save changes';
      showToast(errorMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!window.confirm('Reset all rate limits to defaults?')) return;

    setSaving(true);
    try {
      await axios.post(`${CONTROL_API_BASE}/rate-limits/reset`);

      await loadSettings();
      showToast('Rate limits reset to defaults', 'success');
    } catch (err: unknown) {
      const errorMsg = axios.isAxiosError(err)
        ? err.response?.data?.detail || `Failed to reset: ${err.response?.status}`
        : err instanceof Error
        ? err.message
        : 'Failed to reset limits';
      showToast(errorMsg, 'error');
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
    { key: 'read' as const, label: t('controlPanel.rateLimits.read') || 'Read (queries/min)', desc: 'GET requests' },
    { key: 'write' as const, label: t('controlPanel.rateLimits.write') || 'Write (updates/min)', desc: 'POST/PUT requests' },
    { key: 'heavy' as const, label: t('controlPanel.rateLimits.heavy') || 'Heavy (reports/min)', desc: 'Heavy operations' },
    { key: 'auth' as const, label: t('controlPanel.rateLimits.auth') || 'Auth (logins/min)', desc: 'Login attempts' },
    { key: 'teacher_import' as const, label: t('controlPanel.rateLimits.teacherImport') || 'Import (bulk/min)', desc: 'Bulk imports' },
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
          <p className="font-semibold">{t('controlPanel.rateLimits.info') || 'Rate Limit Configuration'}</p>
          <p className="text-xs mt-1">{t('controlPanel.rateLimits.adjustInfo') || 'Adjust these limits if users experience 429 (Too Many Requests) errors.'}</p>
        </div>
      </div>

      <div className="space-y-3">
        {limitTypes.map(({ key, label, desc }) => {
          const current = changes[key] !== undefined ? changes[key] : settings[key];
          const isChanged = changes[key] !== undefined && changes[key] !== settings[key];
          const isAboveDefault = (changes[key] ?? settings[key]) > (defaults[key] ?? 100);

          return (
            <div key={key} className="border border-gray-300 rounded p-4 bg-white">
              <div className="flex justify-between items-start mb-3">
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

              <div className="space-y-2">
                {/* Slider Input */}
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max={defaults[key] ? defaults[key] * 3 : 300}
                    step="5"
                    value={current}
                    onChange={(e) => handleChange(key, parseInt(e.target.value) || 1)}
                    disabled={saving}
                    className="flex-grow h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="w-16 flex items-center justify-end">
                    <input
                      type="number"
                      min="1"
                      value={current}
                      onChange={(e) => handleChange(key, parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"
                      disabled={saving}
                    />
                  </div>
                </div>

                {/* Info row */}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">{t('controlPanel.rateLimits.requestsPerMin') || 'req/min'}</span>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-gray-500">
                      {t('controlPanel.rateLimits.default') || 'Default'}: <span className="font-semibold">{defaults[key]}</span>
                    </span>
                    {isAboveDefault && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        +{((current / (defaults[key] ?? 1)) - 1) * 100 | 0}%
                      </span>
                    )}
                  </div>
                </div>
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
          <RotateCw className="w-4 h-4" />
          {t('reset') || 'Reset Defaults'}
        </button>
      </div>
    </div>
  );
}
