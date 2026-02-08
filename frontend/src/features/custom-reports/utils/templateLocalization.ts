/**
 * Shared localization helpers for report templates.
 */

import type { ReportTemplate } from '@/api/customReportsAPI';

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

export const SYSTEM_TEMPLATE_TRANSLATIONS: Record<string, { titleKey: string; descKey: string }> = {
  'Student Roster - Complete': {
    titleKey: 'template_student_roster_complete',
    descKey: 'template_student_roster_complete_desc',
  },
  'Active Students - Basic Info': {
    titleKey: 'template_active_students_basic',
    descKey: 'template_active_students_basic_desc',
  },
  'Students by Study Year': {
    titleKey: 'template_students_by_year',
    descKey: 'template_students_by_year_desc',
  },
  'New Enrollments - Current Semester': {
    titleKey: 'template_new_enrollments',
    descKey: 'template_new_enrollments_desc',
  },
  'Course Catalog - All Courses': {
    titleKey: 'template_course_catalog',
    descKey: 'template_course_catalog_desc',
  },
  'Active Courses by Semester': {
    titleKey: 'template_active_courses_by_semester',
    descKey: 'template_active_courses_by_semester_desc',
  },
  'Grade Distribution - All Courses': {
    titleKey: 'template_grade_distribution_all',
    descKey: 'template_grade_distribution_all_desc',
  },
  'Student Transcript - Complete': {
    titleKey: 'template_student_transcript_complete',
    descKey: 'template_student_transcript_complete_desc',
  },
  'Honor Roll - High Achievers': {
    titleKey: 'template_honor_roll_high_achievers',
    descKey: 'template_honor_roll_high_achievers_desc',
  },
  'At-Risk Students - Low Grades': {
    titleKey: 'template_at_risk_students_low_grades',
    descKey: 'template_at_risk_students_low_grades_desc',
  },
  'Attendance Summary - All Students': {
    titleKey: 'template_attendance_summary_all',
    descKey: 'template_attendance_summary_all_desc',
  },
  'Full Attendance': {
    titleKey: 'template_perfect_attendance',
    descKey: 'template_perfect_attendance_desc',
  },
  'Perfect Attendance': {
    // Fallback for existing database entries
    titleKey: 'template_perfect_attendance',
    descKey: 'template_perfect_attendance_desc',
  },
  'Partial Attendance': {
    titleKey: 'template_chronic_absenteeism',
    descKey: 'template_chronic_absenteeism_desc',
  },
  'Chronic Absenteeism': {
    // Fallback for existing database entries
    titleKey: 'template_chronic_absenteeism',
    descKey: 'template_chronic_absenteeism_desc',
  },
  // CSV Export Templates
  'Student Roster - CSV Export': {
    titleKey: 'template_student_roster_csv',
    descKey: 'template_student_roster_csv_desc',
  },
  'Course Grades - CSV Export': {
    titleKey: 'template_course_grades_csv',
    descKey: 'template_course_grades_csv_desc',
  },
  'Attendance Records - CSV Export': {
    titleKey: 'template_attendance_csv',
    descKey: 'template_attendance_csv_desc',
  },
  'Course Enrollment - CSV Export': {
    titleKey: 'template_enrollment_csv',
    descKey: 'template_enrollment_csv_desc',
  },
  // Detailed Analytics Templates
  'System Overview - Detailed Analytics': {
    titleKey: 'template_system_overview_analytics',
    descKey: 'template_system_overview_analytics_desc',
  },
  'Performance Analytics - By Study Year': {
    titleKey: 'template_performance_by_year',
    descKey: 'template_performance_by_year_desc',
  },
  'Top Performers - GPA Analytics': {
    titleKey: 'template_top_performers_gpa',
    descKey: 'template_top_performers_gpa_desc',
  },
  'Enrollment Analytics - By Semester': {
    titleKey: 'template_enrollment_analytics',
    descKey: 'template_enrollment_analytics_desc',
  },
  'Grade Distribution Analytics': {
    titleKey: 'template_grade_distribution_analytics',
    descKey: 'template_grade_distribution_analytics_desc',
  },
  'Student Performance - Detailed Analytics': {
    titleKey: 'template_student_performance_detailed',
    descKey: 'template_student_performance_detailed_desc',
  },
  'Course Performance - Analytics': {
    titleKey: 'template_course_performance_analytics',
    descKey: 'template_course_performance_analytics_desc',
  },
  'Attendance Analytics - By Course': {
    titleKey: 'template_attendance_analytics_by_course',
    descKey: 'template_attendance_analytics_by_course_desc',
  },
  'Grade Analytics - Weighted Overview': {
    titleKey: 'template_grade_analytics_weighted',
    descKey: 'template_grade_analytics_weighted_desc',
  },
  'Student Engagement - Attendance & Grades': {
    titleKey: 'template_student_engagement',
    descKey: 'template_student_engagement_desc',
  },
};

type TemplateLike = Pick<ReportTemplate, 'name' | 'description' | 'is_system'>;

export const getLocalizedTemplateText = (template: TemplateLike, t: TranslateFn) => {
  if (!template.is_system) {
    return {
      name: template.name,
      description: template.description || '',
    };
  }

  const mapping = SYSTEM_TEMPLATE_TRANSLATIONS[template.name];
  if (!mapping) {
    return {
      name: template.name,
      description: template.description || '',
    };
  }

  return {
    name: t(mapping.titleKey, { ns: 'customReports', defaultValue: template.name }),
    description: t(mapping.descKey, {
      ns: 'customReports',
      defaultValue: template.description || '',
    }),
  };
};
