import { describe, it, expect } from 'vitest';
import { getLocalizedCategory, getCanonicalCategory } from './categoryLabels';

describe('categoryLabels', () => {
  // Mock translation function
  const mockT = (key: string): string => {
    const translations: Record<string, string> = {
      'classParticipation': 'Class Participation',
      'continuousAssessment': 'Continuous Assessment',
      'midtermExam': 'Midterm Exam',
      'finalExam': 'Final Exam',
      'labWork': 'Lab Work',
      'quizzes': 'Quizzes',
      'project': 'Project',
      'presentation': 'Presentation',
      'homework': 'Homework/Assignments',
    };
    return translations[key] || key;
  };

  const mockGreekT = (key: string): string => {
    const greekTranslations: Record<string, string> = {
      'classParticipation': 'Συμμετοχή στο Μάθημα',
      'continuousAssessment': 'Συνεχής Αξιολόγηση',
      'midtermExam': 'Ενδιάμεση Εξέταση',
      'finalExam': 'Τελική Εξέταση',
      'labWork': 'Εργαστηριακή Εργασία',
      'quizzes': 'Κουίζ',
      'project': 'Έργο',
      'presentation': 'Παρουσίαση',
      'homework': 'Εργασίες',
    };
    return greekTranslations[key] || key;
  };

  describe('getLocalizedCategory', () => {
    it('localizes known canonical categories', () => {
      expect(getLocalizedCategory('Final Exam', mockT)).toBe('Final Exam');
      expect(getLocalizedCategory('Midterm Exam', mockT)).toBe('Midterm Exam');
      expect(getLocalizedCategory('Class Participation', mockT)).toBe('Class Participation');
    });

    it('handles case-insensitive matching', () => {
      expect(getLocalizedCategory('final exam', mockT)).toBe('Final Exam');
      expect(getLocalizedCategory('FINAL EXAM', mockT)).toBe('Final Exam');
      expect(getLocalizedCategory('Final Exam', mockT)).toBe('Final Exam');
    });

    it('maps variations to canonical categories', () => {
      expect(getLocalizedCategory('final', mockT)).toBe('Final Exam');
      expect(getLocalizedCategory('midterm', mockT)).toBe('Midterm Exam');
      expect(getLocalizedCategory('lab', mockT)).toBe('Lab Work');
      expect(getLocalizedCategory('quiz', mockT)).toBe('Quizzes');
    });

    it('consolidates similar categories to homework', () => {
      expect(getLocalizedCategory('homework', mockT)).toBe('Homework/Assignments');
      expect(getLocalizedCategory('assignments', mockT)).toBe('Homework/Assignments');
      expect(getLocalizedCategory('assignment', mockT)).toBe('Homework/Assignments');
      expect(getLocalizedCategory('exercises', mockT)).toBe('Homework/Assignments');
      expect(getLocalizedCategory('exercise', mockT)).toBe('Homework/Assignments');
    });

    it('handles participation variants', () => {
      expect(getLocalizedCategory('participation', mockT)).toBe('Class Participation');
      expect(getLocalizedCategory('class participation', mockT)).toBe('Class Participation');
    });

    it('falls back to exam category for generic "exam"', () => {
      expect(getLocalizedCategory('exam', mockT)).toBe('Final Exam');
    });

    it('returns original category if not found in map', () => {
      expect(getLocalizedCategory('Custom Category', mockT)).toBe('Custom Category');
      expect(getLocalizedCategory('Unknown Type', mockT)).toBe('Unknown Type');
    });

    it('returns empty string for empty input', () => {
      expect(getLocalizedCategory('', mockT)).toBe('');
    });

    it('returns empty string for null/undefined input', () => {
      expect(getLocalizedCategory(null as any, mockT)).toBe('');
      expect(getLocalizedCategory(undefined as any, mockT)).toBe('');
    });

    it('returns empty string for non-string input', () => {
      expect(getLocalizedCategory(123 as any, mockT)).toBe('');
      expect(getLocalizedCategory({} as any, mockT)).toBe('');
    });

    it('trims whitespace from input', () => {
      expect(getLocalizedCategory('  Final Exam  ', mockT)).toBe('Final Exam');
      expect(getLocalizedCategory('  midterm  ', mockT)).toBe('Midterm Exam');
    });

    it('works with Greek translation function', () => {
      expect(getLocalizedCategory('Final Exam', mockGreekT)).toBe('Τελική Εξέταση');
      expect(getLocalizedCategory('final', mockGreekT)).toBe('Τελική Εξέταση');
      expect(getLocalizedCategory('Midterm Exam', mockGreekT)).toBe('Ενδιάμεση Εξέταση');
    });
  });

  describe('getCanonicalCategory', () => {
    it('returns canonical English for known categories', () => {
      expect(getCanonicalCategory('Class Participation', mockT)).toBe('Class Participation');
      expect(getCanonicalCategory('Final Exam', mockT)).toBe('Final Exam');
      expect(getCanonicalCategory('Midterm Exam', mockT)).toBe('Midterm Exam');
    });

    it('handles case-insensitive English input', () => {
      expect(getCanonicalCategory('final exam', mockT)).toBe('Final Exam');
      expect(getCanonicalCategory('FINAL EXAM', mockT)).toBe('Final Exam');
      expect(getCanonicalCategory('midterm exam', mockT)).toBe('Midterm Exam');
    });

    it('converts Greek labels to canonical English', () => {
      expect(getCanonicalCategory('Τελική Εξέταση', mockGreekT)).toBe('Final Exam');
      expect(getCanonicalCategory('Ενδιάμεση Εξέταση', mockGreekT)).toBe('Midterm Exam');
      expect(getCanonicalCategory('Συμμετοχή στο Μάθημα', mockGreekT)).toBe('Class Participation');
    });

    it('uses heuristics for Greek keywords', () => {
      // Heuristics work on normalized input (diacritics removed)
      // Use partial keyword matches that actually exist in the heuristic checks
      expect(getCanonicalCategory('Τελική', mockT)).toBe('Final Exam'); // 'τελική' check in heuristic
      expect(getCanonicalCategory('τελικ', mockT)).toBe('Final Exam'); // 'τελικ' prefix match
      expect(getCanonicalCategory('τελικη εξεταση', mockT)).toBe('Final Exam'); // contains 'τελικ'
      expect(getCanonicalCategory('εργαστηριο', mockT)).toBe('Lab Work'); // contains 'εργαστηρ'
      expect(getCanonicalCategory('παρουσιαση', mockT)).toBe('Class Participation'); // contains 'παρουσι'
      expect(getCanonicalCategory('εργασια μαθηματος', mockT)).toBe('Homework/Assignments'); // contains 'εργασ'
    });

    it('uses heuristics for English keywords', () => {
      expect(getCanonicalCategory('final test', mockT)).toBe('Final Exam');
      expect(getCanonicalCategory('midterm test', mockT)).toBe('Midterm Exam');
      expect(getCanonicalCategory('lab experiment', mockT)).toBe('Lab Work');
      expect(getCanonicalCategory('participation grade', mockT)).toBe('Class Participation');
      expect(getCanonicalCategory('homework set', mockT)).toBe('Homework/Assignments');
      expect(getCanonicalCategory('assignment 1', mockT)).toBe('Homework/Assignments');
    });

    it('normalizes diacritics and whitespace', () => {
      expect(getCanonicalCategory('Τελική   Εξέταση', mockGreekT)).toBe('Final Exam');
      expect(getCanonicalCategory('  Final  Exam  ', mockT)).toBe('Final Exam');
    });

    it('returns original input for unknown categories', () => {
      expect(getCanonicalCategory('Unknown Category', mockT)).toBe('Unknown Category');
      expect(getCanonicalCategory('Custom Type', mockT)).toBe('Custom Type');
    });

    it('returns empty string for empty input', () => {
      expect(getCanonicalCategory('', mockT)).toBe('');
    });

    it('returns empty string for null/undefined input', () => {
      expect(getCanonicalCategory(null as any, mockT)).toBe('');
      expect(getCanonicalCategory(undefined as any, mockT)).toBe('');
    });

    it('returns empty string for non-string input', () => {
      expect(getCanonicalCategory(123 as any, mockT)).toBe('');
      expect(getCanonicalCategory({} as any, mockT)).toBe('');
    });

    it('handles already canonical English input', () => {
      const canonical = 'Final Exam';
      expect(getCanonicalCategory(canonical, mockT)).toBe('Final Exam');
    });

    it('matches translated labels via translation function', () => {
      // If input matches a translated label, return canonical
      expect(getCanonicalCategory('Homework/Assignments', mockT)).toBe('Homework/Assignments');
      expect(getCanonicalCategory('Lab Work', mockT)).toBe('Lab Work');
    });

    it('handles edge case with multiple spaces', () => {
      expect(getCanonicalCategory('Final    Exam', mockT)).toBe('Final Exam');
    });

    it('preserves unknown custom categories without modification', () => {
      const custom = 'My Custom Grade Type';
      expect(getCanonicalCategory(custom, mockT)).toBe(custom);
    });
  });

  describe('roundtrip conversions', () => {
    it('localizes then canonicalizes back to original', () => {
      const original = 'Final Exam';
      const localized = getLocalizedCategory(original, mockT);
      const canonical = getCanonicalCategory(localized, mockT);
      expect(canonical).toBe(original);
    });

    it('canonicalizes Greek then localizes back', () => {
      const greek = 'Τελική Εξέταση';
      const canonical = getCanonicalCategory(greek, mockGreekT);
      expect(canonical).toBe('Final Exam');
      const localized = getLocalizedCategory(canonical, mockGreekT);
      expect(localized).toBe(greek);
    });

    it('handles variations consistently', () => {
      const inputs = ['final', 'Final', 'FINAL', 'final exam', 'Final Exam'];
      const results = inputs.map(input => getLocalizedCategory(input, mockT));
      expect(results.every(r => r === 'Final Exam')).toBe(true);
    });
  });
});
