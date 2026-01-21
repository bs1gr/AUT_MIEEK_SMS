/**
 * AdvancedFilters - Component for advanced search filtering.
 *
 * Features:
 * - Dynamic filter controls based on search type
 * - Filter presets (e.g., "High grades", "Active students")
 * - Apply/reset controls
/**
 * AdvancedFilters - Component for advanced search filtering.
 *
 * Features:
 * - Dynamic filter controls based on search type
 * - Filter presets (e.g., "High grades", "Active students")
 * - Apply/reset controls
 * - Responsive filter layout
 *
 * Author: AI Agent
 * Date: January 17, 2026
 * Version: 1.0.0
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FunnelIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { SearchFilters } from '../hooks/useSearch';
import './AdvancedFilters.css';

interface AdvancedFiltersProps {
  searchType: 'students' | 'courses' | 'grades';
  onApply: (filters: SearchFilters) => void;
  onReset?: () => void;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  className?: string;
}

interface FilterPreset {
  name: string;
  label: string;
  filters: SearchFilters;
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  searchType,
  onApply,
  onReset,
  isOpen = false,
  onToggle,
  className = ''
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(isOpen);
  const [filters, setFilters] = useState<SearchFilters>({});

  const getFilterPresets = (): FilterPreset[] => {
    switch (searchType) {
      case 'students':
        return [
          { name: 'active', label: t('search.presets.activeStudents'), filters: { status: 'active' } },
          { name: 'recent_enrollments', label: t('search.presets.recentEnrollments'), filters: { recent: true } }
        ];
      case 'courses':
        return [
          { name: 'high_credit', label: t('search.presets.highCredit'), filters: { credits_min: 5 } },
          { name: 'core_courses', label: t('search.presets.coreCourses'), filters: { category: 'core' } }
        ];
      case 'grades':
        return [
          { name: 'high_grades', label: t('search.presets.highGrades'), filters: { grade_min: 80 } },
          { name: 'passing_only', label: t('search.presets.passingOnly'), filters: { passed: true } },
          { name: 'failing', label: t('search.presets.failing'), filters: { passed: false } }
        ];
      default:
        return [];
    }
  };

  const handleFilterChange = (key: string, value: string | number | boolean | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }));
  };

  const handlePresetSelect = (preset: FilterPreset) => {
    setFilters(preset.filters);
    onApply(preset.filters);
    handleToggle();
  };

  const handleApply = () => {
    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== undefined && v !== '')
    );
    onApply(activeFilters);
    handleToggle();
  };

  const handleReset = () => {
    setFilters({});
    onReset?.();
    handleToggle();
  };

  const handleToggle = () => {
    const newState = !open;
    setOpen(newState);
    onToggle?.(newState);
  };

  const presets = getFilterPresets();
  const idFor = (name: string) => `advanced-filter-${searchType}-${name}`;

  return (
    <div className={`advanced-filters ${className}`}>
      <button
        className={`filter-toggle ${open ? 'open' : ''}`}
        onClick={handleToggle}
        aria-expanded={open}
        aria-label={t('search.advanced.title')}
      >
        <FunnelIcon className="toggle-icon" role="img" />
        {t('search.advanced.title')}
      </button>

      {open && (
        <div className="filter-panel" role="region" aria-label={t('search.advanced.title')} data-open={open ? 'true' : 'false'}>
          <div className="filter-header">
            <h3>{t('search.filters.title')}</h3>
            <button className="close-button" onClick={handleToggle} aria-label={t('common.close')}>
              <XMarkIcon className="close-icon" role="img" />
            </button>
          </div>

          {presets.length > 0 && (
            <div className="filter-section">
              <h4>{t('search.presets.title')}</h4>
              <div className="presets-list" data-presets>
                {presets.map(preset => (
                  <button
                    key={preset.name}
                    className="preset-button"
                    onClick={() => handlePresetSelect(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="filter-section">
            <h4>{t('search.filters.custom')}
            </h4>
            <div className="filters-grid">
              {searchType === 'students' && (
                <>
                  <div className="filter-group">
                    <label htmlFor={idFor('first_name')}>{t('search.fields.firstName')}</label>
                    <input
                      id={idFor('first_name')}
                      type="text"
                      value={typeof filters.first_name === 'boolean' ? String(filters.first_name) : (filters.first_name || '')}
                      onChange={(e) => handleFilterChange('first_name', e.target.value)}
                      placeholder={t('search.fields.firstName')}
                      autoFocus
                    />
                  </div>
                  <div className="filter-group">
                    <label htmlFor={idFor('last_name')}>{t('search.fields.lastName')}</label>
                    <input
                      id={idFor('last_name')}
                      type="text"
                      value={typeof filters.last_name === 'boolean' ? String(filters.last_name) : (filters.last_name || '')}
                      onChange={(e) => handleFilterChange('last_name', e.target.value)}
                      placeholder={t('search.fields.lastName')}
                    />
                  </div>
                  <div className="filter-group">
                    <label htmlFor={idFor('email')}>{t('search.fields.email')}</label>
                    <input
                      id={idFor('email')}
                      type="email"
                      value={typeof filters.email === 'boolean' ? String(filters.email) : (filters.email || '')}
                      onChange={(e) => handleFilterChange('email', e.target.value)}
                      placeholder={t('search.fields.email')}
                    />
                  </div>
                  <div className="filter-group">
                    <label htmlFor={idFor('academic_year')}>{t('search.fields.academicYear')}</label>
                    <input
                      id={idFor('academic_year')}
                      type="number"
                      value={filters.academic_year || ''}
                      onChange={(e) => handleFilterChange('academic_year', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder={new Date().getFullYear().toString()}
                    />
                  </div>
                </>
              )}

              {searchType === 'courses' && (
                <>
                  <div className="filter-group">
                    <label htmlFor={idFor('course_name')}>{t('search.fields.courseName')}</label>
                    <input
                      id={idFor('course_name')}
                      type="text"
                      value={typeof filters.course_name === 'boolean' ? String(filters.course_name) : (filters.course_name || '')}
                      onChange={(e) => handleFilterChange('course_name', e.target.value)}
                      placeholder={t('search.fields.courseName')}
                    />
                  </div>
                  <div className="filter-group">
                    <label htmlFor={idFor('course_code')}>{t('search.fields.courseCode')}</label>
                    <input
                      id={idFor('course_code')}
                      type="text"
                      value={typeof filters.course_code === 'boolean' ? String(filters.course_code) : (filters.course_code || '')}
                      onChange={(e) => handleFilterChange('course_code', e.target.value)}
                      placeholder={t('search.fields.courseCode')}
                    />
                  </div>
                  <div className="filter-group">
                    <label htmlFor={idFor('credits')}>{t('search.fields.credits')}</label>
                    <input
                      id={idFor('credits')}
                      type="number"
                      value={filters.credits || ''}
                      onChange={(e) => handleFilterChange('credits', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="0-10"
                      min="0"
                      max="10"
                    />
                  </div>
                  <div className="filter-group">
                    <label htmlFor={idFor('academic_year_course')}>{t('search.fields.academicYear')}</label>
                    <input
                      id={idFor('academic_year_course')}
                      type="number"
                      value={filters.academic_year || ''}
                      onChange={(e) => handleFilterChange('academic_year', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder={new Date().getFullYear().toString()}
                    />
                  </div>
                </>
              )}

              {searchType === 'grades' && (
                <>
                  <div className="filter-group">
                    <label htmlFor={idFor('grade_min')}>{t('search.fields.gradeMin')}</label>
                    <input
                      id={idFor('grade_min')}
                      type="number"
                      value={filters.grade_min || ''}
                      onChange={(e) => handleFilterChange('grade_min', e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder={t('search.fields.gradeMin')}
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="filter-group">
                    <label htmlFor={idFor('grade_max')}>{t('search.fields.gradeMax')}</label>
                    <input
                      id={idFor('grade_max')}
                      type="number"
                      value={filters.grade_max || ''}
                      onChange={(e) => handleFilterChange('grade_max', e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder={t('search.fields.gradeMax')}
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="filter-group">
                    <label htmlFor={idFor('student_id')}>{t('search.fields.studentId')}</label>
                    <input
                      id={idFor('student_id')}
                      type="number"
                      value={filters.student_id || ''}
                      onChange={(e) => handleFilterChange('student_id', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder={t('search.fields.studentId')}
                    />
                  </div>
                  <div className="filter-group">
                    <label htmlFor={idFor('course_id')}>{t('search.fields.courseId')}</label>
                    <input
                      id={idFor('course_id')}
                      type="number"
                      value={filters.course_id || ''}
                      onChange={(e) => handleFilterChange('course_id', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder={t('search.fields.courseId')}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="filter-actions">
            <button className="apply-button" onClick={handleApply} disabled={Object.keys(filters).length === 0}>
              <ArrowPathIcon className="button-icon" role="img" />
              {t('search.advanced.apply', 'Apply Filters')}
            </button>

            <button className="reset-button" onClick={handleReset}>
              <XMarkIcon className="button-icon" role="img" />
              {t('search.advanced.reset', 'Reset Filters')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilters;
