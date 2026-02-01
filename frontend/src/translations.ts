/**
 * Complete translations.ts file v3.7.1 (Optimized) - TypeScript Migration
 * For GR and EN languages
 * Changes: Removed duplicates (e.g., startTime, weight, save/cancel),
 * better classification (e.g., Common, Schedule, GradingScale).
 * UPDATED: All missing translations added, full multi-scale grading support.
 */

// Root level translations (navigation labels, common UI)
import enRoot from './locales/en.js';
import elRoot from './locales/el.js';

// Namespaced translations (feature-specific)
import controlPanelEn from './locales/en/controlPanel.js';
import controlPanelEl from './locales/el/controlPanel.js';
import rbacEn from './locales/en/rbac.js';
import rbacEl from './locales/el/rbac.js';
import authEn from './locales/en/auth.js';
import authEl from './locales/el/auth.js';
import utilsEn from './locales/en/utils.js';
import utilsEl from './locales/el/utils.js';
import dashboardEn from './locales/en/dashboard.js';
import dashboardEl from './locales/el/dashboard.js';
import commonEn from './locales/en/common.js';
import commonEl from './locales/el/common.js';
import studentsEn from './locales/en/students.js';
import studentsEl from './locales/el/students.js';
import coursesEn from './locales/en/courses.js';
import coursesEl from './locales/el/courses.js';
import attendanceEn from './locales/en/attendance.js';
import attendanceEl from './locales/el/attendance.js';
import gradesEn from './locales/en/grades.js';
import gradesEl from './locales/el/grades.js';
import calendarEn from './locales/en/calendar.js';
import calendarEl from './locales/el/calendar.js';
import exportEn from './locales/en/export.js';
import exportEl from './locales/el/export.js';
import helpEn from './locales/en/help.js';
import helpEl from './locales/el/help.js';
import reportsEn from './locales/en/reports.js';
import reportsEl from './locales/el/reports.js';
import feedbackEn from './locales/en/feedback.js';
import feedbackEl from './locales/el/feedback.js';
import errorsEn from './locales/en/errors.js';
import errorsEl from './locales/el/errors.js';
import searchEn from './locales/en/search.js';
import searchEl from './locales/el/search.js';
import analyticsEn from './locales/en/analytics.js';
import analyticsEl from './locales/el/analytics.js';
import customReportsEn from './locales/en/customReports.js';
import customReportsEl from './locales/el/customReports.js';
import messagesEn from './locales/en/messages.js';
import messagesEl from './locales/el/messages.js';

export interface Translations {
  en: Record<string, unknown>;
  el: Record<string, unknown>;
}

export const translations: Translations = {
  en: {
    // Root keys (navigation labels, etc.)
    ...enRoot
  },

  el: {
    // Root keys (navigation labels, etc.)
    ...elRoot
  }
};

export const translationNamespaces = {
  en: {
    controlPanel: controlPanelEn,
    rbac: rbacEn,
    auth: authEn,
    utils: utilsEn,
    dashboard: dashboardEn,
    common: commonEn,
    courses: coursesEn,
    students: studentsEn,
    grades: gradesEn,
    attendance: attendanceEn,
    calendar: calendarEn,
    export: exportEn,
    help: helpEn,
    reports: reportsEn,
    feedback: feedbackEn,
    errors: errorsEn,
    search: searchEn,
    analytics: analyticsEn,
    customReports: customReportsEn,
    messages: messagesEn
  },

  el: {
    controlPanel: controlPanelEl,
    rbac: rbacEl,
    auth: authEl,
    utils: utilsEl,
    dashboard: dashboardEl,
    common: commonEl,
    courses: coursesEl,
    students: studentsEl,
    grades: gradesEl,
    attendance: attendanceEl,
    calendar: calendarEl,
    export: exportEl,
    help: helpEl,
    reports: reportsEl,
    feedback: feedbackEl,
    errors: errorsEl,
    search: searchEl,
    analytics: analyticsEl,
    customReports: customReportsEl,
    messages: messagesEl
  }
};

export default translations;
