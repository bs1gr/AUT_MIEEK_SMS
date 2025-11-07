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
}

export default function Navigation({ activeView, tabs, className }: NavigationProps) {
  const location = useLocation();

  return (
    <nav className={cn('flex space-x-3', className)}>
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path || activeView === tab.key;

        return (
          <Link
            key={tab.key}
            to={tab.path}
            className={cn(
              'px-4 py-2 rounded-lg border transition-colors',
              isActive
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
