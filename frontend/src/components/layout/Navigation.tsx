import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';

export type NavigationView = 'dashboard' | 'students' | 'courses' | 'attendance' | 'grading' | 'calendar' | 'operations' | 'power';

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

  return (
    <nav
      className={cn('flex space-x-3 relative z-40', className)}
      aria-label="Main navigation"
    >
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path || activeView === tab.key;

        return (
          <Link
            key={tab.key}
            to={tab.path}
            onClick={() => onViewChange && onViewChange(tab.key)}
            className={cn(
              'px-4 py-2 rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
              isActive
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
              'relative z-50'
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
    </nav>
  );
}
