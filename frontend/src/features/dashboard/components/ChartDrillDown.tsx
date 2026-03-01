/**
 * Chart Drill-Down Component
 * Enables interactive exploration of chart data with breadcrumb navigation
 */

import React, { useState, useCallback } from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface DrillDownLevel {
  id: string;
  label: string;
  data: any[];
  parentId?: string;
}

export interface DrillDownState {
  currentLevel: DrillDownLevel;
  history: DrillDownLevel[];
}

interface ChartDrillDownProps {
  title: string;
  levels: DrillDownLevel[];
  renderContent: (level: DrillDownLevel) => React.ReactNode;
  onBackToRoot?: () => void;
}

export const ChartDrillDown: React.FC<ChartDrillDownProps> = ({
  title,
  levels,
  renderContent,
  onBackToRoot,
}) => {
  const [history, setHistory] = useState<DrillDownLevel[]>([levels[0]]);
  const currentLevel = history[history.length - 1];

  const handleBackToPrevious = useCallback(() => {
    setHistory((prev) => {
      if (prev.length > 1) {
        return prev.slice(0, -1);
      }
      return prev;
    });
  }, []);

  const handleBackToRoot = useCallback(() => {
    setHistory([levels[0]]);
    onBackToRoot?.();
  }, [levels, onBackToRoot]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header with breadcrumbs */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">{title}</h3>

        {/* Breadcrumb Navigation */}
        {history.length > 1 && (
          <nav className="flex items-center gap-2 text-sm">
            <button
              onClick={handleBackToRoot}
              className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 transition"
            >
              <Home size={16} />
              Root
            </button>

            {history.slice(1).map((level, idx) => (
              <React.Fragment key={level.id}>
                <ChevronRight size={16} className="text-slate-400" />
                <button
                  onClick={() => {
                    // Navigate to specific level
                    setHistory((prev) => prev.slice(0, idx + 2));
                  }}
                  className="text-indigo-600 hover:text-indigo-700 transition truncate max-w-xs"
                  title={level.label}
                >
                  {level.label}
                </button>
              </React.Fragment>
            ))}
          </nav>
        )}
      </div>

      {/* Content Area */}
      <div className="min-h-64 rounded-lg bg-slate-50 p-4">
        {renderContent(currentLevel)}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-4 flex gap-3">
        {history.length > 1 && (
          <>
            <button
              onClick={handleBackToPrevious}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              ← Previous Level
            </button>
            <button
              onClick={handleBackToRoot}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              ↑ Back to Root
            </button>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Hook for managing drill-down state
 */
export function useDrillDown(initialLevel: DrillDownLevel) {
  const [history, setHistory] = useState<DrillDownLevel[]>([initialLevel]);

  const currentLevel = history[history.length - 1];

  const drillDown = useCallback((newLevel: DrillDownLevel) => {
    setHistory((prev) => [...prev, newLevel]);
  }, []);

  const goBack = useCallback(() => {
    setHistory((prev) => {
      if (prev.length > 1) {
        return prev.slice(0, -1);
      }
      return prev;
    });
  }, []);

  const reset = useCallback(() => {
    setHistory([initialLevel]);
  }, [initialLevel]);

  const canGoBack = history.length > 1;

  return {
    currentLevel,
    history,
    drillDown,
    goBack,
    reset,
    canGoBack,
  };
}

/**
 * Sample drill-down data structure for student performance
 */
export const createStudentPerformanceDrillDown = (
  classes: any[],
  courses: any[],
  students: any[],
  grades: any
) => {
  const rootLevel: DrillDownLevel = {
    id: 'root',
    label: 'All Classes',
    data: classes,
  };

  const courseLevels = classes.map((cls) => ({
    id: `courses-${cls.id}`,
    label: `Courses in ${cls.name}`,
    parentId: 'root',
    data: courses.filter((c) => c.class_id === cls.id),
  }));

  const studentLevels = courses.map((course) => ({
    id: `students-${course.id}`,
    label: `Students in ${course.name}`,
    parentId: `courses-${course.class_id}`,
    data: students.filter(
      (s) => grades.some((g: any) => g.course_id === course.id && g.student_id === s.id)
    ),
  }));

  return [rootLevel, ...courseLevels, ...studentLevels];
};

/**
 * Render function for class drill-down
 */
export const renderClassDrillDown = (level: DrillDownLevel) => {
  if (level.data.length === 0) {
    return <p className="text-center text-slate-500">No data available</p>;
  }

  return (
    <ul className="space-y-2">
      {level.data.map((item: any) => (
        <li
          key={item.id}
          className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition cursor-pointer"
        >
          <span className="font-medium text-slate-900">{item.name || item.label}</span>
          <span className="text-sm text-slate-500">{item.count || ''}</span>
        </li>
      ))}
    </ul>
  );
};

export default ChartDrillDown;
