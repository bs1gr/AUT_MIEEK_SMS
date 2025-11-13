import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

import { useLanguage } from '@/LanguageContext';
import ExportCenter from '@/components/tools/ExportCenter';
import HelpDocumentation from '@/components/tools/HelpDocumentation';
import ThemeSelector from '@/components/tools/ThemeSelector';
import {
  OPERATIONS_TAB_KEYS,
  type LegacyOperationsTabKey,
  type OperationsLocationState,
  type OperationsTabKey,
} from '@/features/operations/types';

type OperationsViewProps = {
  students?: unknown[];
};

const isValidTab = (value: unknown): value is OperationsTabKey =>
  OPERATIONS_TAB_KEYS.includes(value as OperationsTabKey);

const normalizeTab = (tab?: LegacyOperationsTabKey): OperationsTabKey | null => {
  if (!tab) return null;
  const mapped = tab === 'devtools' ? 'settings' : tab;
  return isValidTab(mapped) ? mapped : null;
};

const DEFAULT_TAB: OperationsTabKey = 'exports';

const OperationsView = (_props: OperationsViewProps) => {
  const { t } = useLanguage();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<OperationsTabKey>(() => {
    const state = (location.state ?? {}) as OperationsLocationState;
    return normalizeTab(state.tab) ?? DEFAULT_TAB;
  });

  useEffect(() => {
    const state = (location.state ?? {}) as OperationsLocationState;
    const desired = normalizeTab(state.tab);
    if (desired && desired !== activeTab) {
      setActiveTab(desired);
      return;
    }
    if (state.scrollTo && activeTab !== 'exports') {
      setActiveTab('exports');
    }
  }, [location, activeTab]);

  const tabItems: Array<{ key: OperationsTabKey; label: string }> = [
    { key: 'exports', label: t('export') },
    { key: 'settings', label: t('settings') },
    { key: 'help', label: t('help') },
  ];

  const headerTitle = t('utils.utilitiesTitle');
  const headerSubtitle = t('utils.utilitiesSubtitle');

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-50 via-white to-slate-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{headerTitle}</h1>
            <p className="text-sm text-slate-600">{headerSubtitle}</p>
          </div>
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">
            <ShieldCheck size={16} aria-hidden="true" />
            {t('utils.utilitiesBadge')}
          </span>
        </div>
      </header>

      <div role="tablist" aria-label={headerTitle} className="flex flex-wrap gap-2">
        {tabItems.map(({ key, label }) => {
          const isActive = key === activeTab;
          const accessibilityProps = isActive
            ? ({ 'aria-selected': 'true', tabIndex: 0 } as const)
            : ({ 'aria-selected': 'false', tabIndex: -1 } as const);

          return (
            <button
              key={key}
              id={`operations-tab-${key}`}
              type="button"
              role="tab"
              aria-controls={`operations-panel-${key}`}
              onClick={() => setActiveTab(key)}
              {...accessibilityProps}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isActive
                  ? 'border-indigo-500 bg-indigo-600 text-white shadow-md'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <section
        role="tabpanel"
        id={`operations-panel-${activeTab}`}
        aria-labelledby={`operations-tab-${activeTab}`}
        className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm"
      >
        {activeTab === 'exports' && <ExportCenter variant="embedded" />}
        {activeTab === 'help' && <HelpDocumentation />}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <ThemeSelector />
          </div>
        )}
      </section>
    </div>
  );
};

export default OperationsView;

