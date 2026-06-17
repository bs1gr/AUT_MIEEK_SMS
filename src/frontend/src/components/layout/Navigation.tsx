import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useLanguage } from '@/LanguageContext';

// 'system' replaces 'power' - module moved to features/operations in v1.17.5+
export type NavigationView =
  | 'dashboard'
  | 'students'
  | 'courses'
  | 'attendance'
  | 'grading'
  | 'calendar'
  | 'operations'
  | 'system'
  | 'search'
  | 'analytics';

export interface NavigationTab {
  key: NavigationView;
  label: string;
  path: string;
}

export interface NavigationProps {
  activeView: NavigationView;
  tabs: NavigationTab[];
  className?: string;
  onViewChange?: (view: NavigationView) => void;
}

export default function Navigation({ activeView, tabs, className, onViewChange }: NavigationProps) {
  const location = useLocation();
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close dropdown on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const activeTab = tabs.find((t) => t.path === location.pathname || t.key === activeView);

  return (
    <nav className={cn('relative z-40', className)} aria-label="Main navigation">

      {/* Desktop: horizontal tabs (md and above) */}
      <div className="hidden md:flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path || activeView === tab.key;
          return (
            <Link
              key={tab.key}
              to={tab.path}
              onClick={() => onViewChange?.(tab.key)}
              className={cn(
                'px-4 py-2 rounded-lg border transition-colors whitespace-nowrap',
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
              aria-current={isActive ? 'page' : undefined}
              aria-label={tab.label}
              data-testid={`nav-link-${tab.key}`}
              tabIndex={0}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Mobile: hamburger button + current page label */}
      <div className="md:hidden w-full">
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 min-h-[52px]"
          aria-label="Navigation menu"
          aria-expanded={mobileOpen}
          type="button"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          <span className="font-medium text-base">{activeTab?.label ?? t('menu')}</span>
        </button>

        {/* Full-width dropdown */}
        {mobileOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
            {tabs.map((tab) => {
              const isActive = location.pathname === tab.path || activeView === tab.key;
              return (
                <Link
                  key={tab.key}
                  to={tab.path}
                  onClick={() => {
                    onViewChange?.(tab.key);
                    setMobileOpen(false);
                  }}
                  className={cn(
                    'flex items-center px-5 py-4 text-base border-b border-gray-100 dark:border-gray-700 last:border-0 min-h-[56px] transition-colors',
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  data-testid={`nav-link-${tab.key}`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
