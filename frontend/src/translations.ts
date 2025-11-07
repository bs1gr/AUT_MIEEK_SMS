/**
 * Complete translations.ts file v3.7.1 (Optimized) - TypeScript Migration
 * For GR and EN languages
 * Changes: Removed duplicates (e.g., startTime, weight, save/cancel),
 * better classification (e.g., Common, Schedule, GradingScale).
 * UPDATED: All missing translations added, full multi-scale grading support.
 */

import controlPanelEn from './locales/en/controlPanel';
import controlPanelEl from './locales/el/controlPanel';
import utilsEn from './locales/en/utils';
import utilsEl from './locales/el/utils';
import dashboardEn from './locales/en/dashboard';
import dashboardEl from './locales/el/dashboard';
import commonEn from './locales/en/common';
import commonEl from './locales/el/common';
import studentsEn from './locales/en/students';
import studentsEl from './locales/el/students';
import coursesEn from './locales/en/courses';
import coursesEl from './locales/el/courses';
import attendanceEn from './locales/en/attendance';
import attendanceEl from './locales/el/attendance';
import gradesEn from './locales/en/grades';
import gradesEl from './locales/el/grades';
import calendarEn from './locales/en/calendar';
import calendarEl from './locales/el/calendar';
import exportEn from './locales/en/export';
import exportEl from './locales/el/export';
import helpEn from './locales/en/help';
import helpEl from './locales/el/help';

export interface Translations {
  en: Record<string, unknown>;
  el: Record<string, unknown>;
}

export const translations: Translations = {
  en: {
    // Control Panel
    controlPanel: controlPanelEn,
    // Common (modular)
    ...commonEn,
    // Dashboard & Student Profile (modular)
    ...dashboardEn,
    // Students (modular)
    ...studentsEn,
    // Courses (modular)
    ...coursesEn,
    // Attendance (modular)
    ...attendanceEn,
    // Grades (modular)
    ...gradesEn,
    // Calendar (modular)
    ...calendarEn,
    // Export (modular)
    ...exportEn,
    // Help (modular)
    ...helpEn,
    // Utils/Operations translations
    utils: utilsEn
  },

  el: {
    // Control Panel
    controlPanel: controlPanelEl,
    // Κοινά (modular)
    ...commonEl,
    // Πίνακας Ελέγχου & Προφίλ Σπουδαστή (modular)
    ...dashboardEl,
    // Σπουδαστές (modular)
    ...studentsEl,
    // Μαθήματα (modular)
    ...coursesEl,
    // Παρουσίες (modular)
    ...attendanceEl,
    // Βαθμοί (modular)
    ...gradesEl,
    // Ημερολόγιο (modular)
    ...calendarEl,
    // Εξαγωγή (modular)
    ...exportEl,
    // Βοήθεια (modular)
    ...helpEl,
    // Μεταφράσεις Εργαλείων/Λειτουργιών
    utils: utilsEl
  }
};
