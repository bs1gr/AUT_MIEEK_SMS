/**
 * Grade Conversion Utilities
 * Location: frontend/src/utils/gradeUtils.js
 *
 * Handles conversion between different grading systems:
 * - GPA (0-4.0) - American system
 * - Percentage (0-100)
 * - Greek Scale (0-20)
 */

/**
 * Convert GPA (0-4.0) to Percentage (0-100)
 * @param {number} gpa - GPA value (0-4.0)
 * @returns {number} - Percentage value (0-100)
 */
export const gpaToPercentage = (gpa) => {
  if (gpa <= 0) return 0;
  if (gpa >= 4.0) return 100;
  return (gpa / 4.0) * 100;
};

/**
 * Convert GPA (0-4.0) to Greek Scale (0-20)
 * @param {number} gpa - GPA value (0-4.0)
 * @returns {number} - Greek scale value (0-20)
 */
export const gpaToGreekScale = (gpa) => {
  if (gpa <= 0) return 0;
  if (gpa >= 4.0) return 20;
  return (gpa / 4.0) * 20;
};

/**
 * Convert Percentage (0-100) to Greek Scale (0-20)
 * @param {number} percentage - Percentage value (0-100)
 * @returns {number} - Greek scale value (0-20)
 */
export const percentageToGreekScale = (percentage) => {
  if (percentage <= 0) return 0;
  if (percentage >= 100) return 20;
  return (percentage / 100) * 20;
};

/**
 * Convert Greek Scale (0-20) to GPA (0-4.0)
 * @param {number} greekGrade - Greek scale value (0-20)
 * @returns {number} - GPA value (0-4.0)
 */
export const greekScaleToGPA = (greekGrade) => {
  if (greekGrade <= 0) return 0;
  if (greekGrade >= 20) return 4.0;
  return (greekGrade / 20) * 4.0;
};

/**
 * Get Greek grade description based on grade (0-20)
 * @param {number} greekGrade - Greek scale value (0-20)
 * @param {string} language - 'en' or 'el'
 * @returns {string} - Grade description
 */
export const getGreekGradeDescription = (greekGrade, language = 'el') => {
  const descriptions = {
    el: {
      excellent: 'Άριστα',
      veryGood: 'Λίαν Καλώς',
      good: 'Καλώς',
      pass: 'Μέτρια',
      fail: 'Ανεπιτυχώς'
    },
    en: {
      excellent: 'Excellent',
      veryGood: 'Very Good',
      good: 'Good',
      pass: 'Pass',
      fail: 'Fail'
    }
  };

  const desc = descriptions[language] || descriptions.el;

  if (greekGrade >= 18) return desc.excellent;
  if (greekGrade >= 16) return desc.veryGood;
  if (greekGrade >= 13) return desc.good;
  if (greekGrade >= 10) return desc.pass;
  return desc.fail;
};

/**
 * Get color based on Greek grade (0-20)
 * @param {number} greekGrade - Greek scale value (0-20)
 * @returns {string} - Tailwind color class
 */
export const getGreekGradeColor = (greekGrade) => {
  if (greekGrade >= 18) return 'text-green-600';
  if (greekGrade >= 16) return 'text-blue-600';
  if (greekGrade >= 13) return 'text-yellow-600';
  if (greekGrade >= 10) return 'text-orange-600';
  return 'text-red-600';
};

/**
 * Get background gradient based on Greek grade (0-20)
 * @param {number} greekGrade - Greek scale value (0-20)
 * @returns {string} - Tailwind gradient class
 */
export const getGreekGradeBgColor = (greekGrade) => {
  if (greekGrade >= 18) return 'from-green-500 to-green-600';
  if (greekGrade >= 16) return 'from-blue-500 to-blue-600';
  if (greekGrade >= 13) return 'from-yellow-500 to-yellow-600';
  if (greekGrade >= 10) return 'from-orange-500 to-orange-600';
  return 'from-red-500 to-red-600';
};

/**
 * Format grade display with all systems
 * @param {number} gpa - GPA value (0-4.0)
 * @returns {object} - Object with all grade formats
 */
export const formatAllGrades = (gpa) => {
  const percentage = gpaToPercentage(gpa);
  const greekGrade = gpaToGreekScale(gpa);

  return {
    gpa: gpa.toFixed(2),
    percentage: percentage.toFixed(1),
    greekGrade: greekGrade.toFixed(1),
    description: getGreekGradeDescription(greekGrade),
    color: getGreekGradeColor(greekGrade),
    bgColor: getGreekGradeBgColor(greekGrade)
  };
};

/**
 * Get letter grade (A-F) from percentage
 * @param {number} percentage - Percentage value (0-100)
 * @returns {string} - Letter grade
 */
export const getLetterGrade = (percentage) => {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
};
