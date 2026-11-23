import { describe, it, expect } from 'vitest';
import {
  foldRuleName,
  getCanonicalCategory,
  getLocalizedCategory,
  getRuleKind,
  getStandardCategory,
  localizeStandardName,
} from './categoryLabels';
import ruleNameCases from './__tests__/ruleNameCases.json';
import elGrades from '@/locales/el/grades';
import elCommon from '@/locales/el/common';
import enGrades from '@/locales/en/grades';
import enCommon from '@/locales/en/common';

// Each page's own texts, as useLanguage finds a bare key: grades before common.
const pageT = (grades: unknown, common: unknown) => (key: string): string =>
  String((grades as Record<string, unknown>)[key] ?? (common as Record<string, unknown>)[key] ?? key);
const pageGreekT = pageT(elGrades, elCommon);
const pageEnglishT = pageT(enGrades, enCommon);

// The final grade's key of each standard category (analytics_service.normalize_rule_category).
const KEY_OF: Record<string, string> = {
  'Midterm Exam': 'midterm',
  'Final Exam': 'final',
  'Homework/Assignments': 'homework',
  'Lab Work': 'lab',
  Quizzes: 'quiz',
  Project: 'project',
  Presentation: 'presentation',
  'Class Participation': 'participation',
  'Continuous Assessment': 'continuous',
  Attendance: 'attendance',
  'No participation': 'no participation',
  'Minor participation': 'minor participation',
  'Minor participation (mobile usage)': 'minor participation (mobile usage)',
};

describe('the course editor saves a rule as the final grade reads it (todo 77 point 2)', () => {
  // One table for both sides: test_rule_category_matching.py checks that the final grade makes
  // the same category (`key`) of each name and of what the editor saves it as.
  const cases = ruleNameCases.map((c) => [c.name, c.saved, c.kind, c.key] as const);

  it.each(cases)('saves %s as %s, on the Greek and the English page', (typed, saved) => {
    // A standard name as that category, any other as typed (the owner, 2026-11-23).
    expect(getCanonicalCategory(typed, pageGreekT)).toBe(saved);
    expect(getCanonicalCategory(typed, pageEnglishT)).toBe(saved);
  });

  it.each(cases)('finds the kind of %s as the final grade does', (typed, _saved, kind, key) => {
    expect(getRuleKind(typed, pageGreekT)).toBe(kind);
    expect(getRuleKind(typed, pageEnglishT)).toBe(kind);
    // A standard kind is the final grade's key; any other name is the name itself, folded alike.
    expect(KEY_OF[kind] ?? foldRuleName(typed)).toBe(key);
  });

  it('never renames what it already saved', () => {
    for (const { saved } of ruleNameCases) {
      expect(getCanonicalCategory(saved, pageGreekT)).toBe(saved);
    }
  });
});

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
      'noParticipationOption': 'No participation',
      'minorParticipationOption': 'Minor participation',
      'minorParticipationMobileOption': 'Minor participation (mobile usage)',
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
      'noParticipationOption': 'Καμία συμμετοχή',
      'minorParticipationOption': 'Μικρή συμμετοχή',
      'minorParticipationMobileOption': 'Μικρή συμμετοχή (χρήση κινητού)',
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

    it('localizes special participation options', () => {
      expect(getLocalizedCategory('no participation', mockT)).toBe('No participation');
      expect(getLocalizedCategory('minor participation', mockT)).toBe('Minor participation');
      expect(getLocalizedCategory('minor participation (mobile usage)', mockT)).toBe('Minor participation (mobile usage)');
      expect(getLocalizedCategory('minor participation (mobile usage)', mockGreekT)).toBe('Μικρή συμμετοχή (χρήση κινητού)');
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
      expect(getLocalizedCategory(null, mockT)).toBe('');
      expect(getLocalizedCategory(undefined, mockT)).toBe('');
    });

    it('returns empty string for non-string input', () => {
      expect(getLocalizedCategory(123, mockT)).toBe('');
      expect(getLocalizedCategory({}, mockT)).toBe('');
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
      // In the English page too: a standard name in either language (the owner, 2026-11-23).
      expect(getCanonicalCategory('Τελική Εξέταση', mockT)).toBe('Final Exam');
      expect(getCanonicalCategory('Εργαστήρια', mockT)).toBe('Lab Work');
    });

    // The owner, 2026-11-23 (plan todo 77 point 2): a rule typed «Παρουσία» or «Παρουσίες» is the
    // Attendance rule, which counts the periods attended; until then the editor saved it as Class
    // Participation, which never counts them. And, 2026-11-23: "Rename only standard names".
    it.each([
      ['Παρουσία', 'Attendance'],
      ['Παρουσίες', 'Attendance'],
      ['ΠΑΡΟΥΣΙΑ', 'Attendance'],
      ['attendance', 'Attendance'],
      ['Παρουσίαση', 'Presentation'],
      ['Παρουσιάσεις', 'Presentation'],
      ['Συμμετοχή', 'Class Participation'],
      ['Εργαστήρια', 'Lab Work'],
      ['Εργαστηριακή Εργασία', 'Lab Work'],
      ['Ενδιάμεση', 'Midterm Exam'],
      ['Τελική', 'Final Exam'],
      ['τελικη εξεταση', 'Final Exam'],
      ['εργαστηριο', 'Lab Work'],
      // Any other name as typed: the final grade reads it by its words.
      ['Ενδιάμεσες εξετάσεις', 'Ενδιάμεσες εξετάσεις'],
      ['1η Ενδιάμεση Εξέταση', '1η Ενδιάμεση Εξέταση'],
      ['Τελική Εργασία', 'Τελική Εργασία'],
      ['Συνεχής Αξιολόγηση (Εκπόνηση εργασιών στο σπίτι)', 'Συνεχής Αξιολόγηση (Εκπόνηση εργασιών στο σπίτι)'],
      ['Collaborative assignment', 'Collaborative assignment'],
      ['εργασια μαθηματος', 'εργασια μαθηματος'],
      ['τελικ', 'τελικ'],
      ['Επεξεργασία Δεδομένων', 'Επεξεργασία Δεδομένων'],
    ])('saves %s as %s', (typed, saved) => {
      expect(getCanonicalCategory(typed, mockGreekT)).toBe(saved);
    });

    it('names a stored Attendance rule in the page language', () => {
      const greekT = (key: string) => (key === 'attendanceCategory' ? 'Παρουσία' : mockGreekT(key));
      expect(getLocalizedCategory('Attendance', greekT)).toBe('Παρουσία');
      // And back: what the Greek editor shows saves as Attendance again.
      expect(getCanonicalCategory('Παρουσία', greekT)).toBe('Attendance');
    });

    it('keeps descriptive English names as typed', () => {
      for (const name of ['final test', 'midterm test', 'lab experiment', 'participation grade', 'homework set', 'assignment 1']) {
        expect(getCanonicalCategory(name, mockT)).toBe(name);
      }
    });

    it('canonicalizes special participation options', () => {
      expect(getCanonicalCategory('No participation', mockT)).toBe('No participation');
      expect(getCanonicalCategory('Minor participation', mockT)).toBe('Minor participation');
      expect(getCanonicalCategory('Minor participation (mobile usage)', mockT)).toBe('Minor participation (mobile usage)');
      expect(getCanonicalCategory('minor participation with mobile usage', mockT)).toBe('Minor participation (mobile usage)');
      // The Greek labels in either page (the English page saved them as typed).
      expect(getCanonicalCategory('Καμία συμμετοχή', mockT)).toBe('No participation');
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
      expect(getCanonicalCategory(null, mockT)).toBe('');
      expect(getCanonicalCategory(undefined, mockT)).toBe('');
    });

    it('returns empty string for non-string input', () => {
      expect(getCanonicalCategory(123, mockT)).toBe('');
      expect(getCanonicalCategory({}, mockT)).toBe('');
    });

    it('handles already canonical English input', () => {
      const canonical = 'Final Exam';
      expect(getCanonicalCategory(canonical, mockT)).toBe('Final Exam');
    });

    it('matches translated labels via translation function', () => {
      // If input matches a translated label, return canonical
      expect(getCanonicalCategory('Homework/Assignments', mockT)).toBe('Homework/Assignments');
      expect(getCanonicalCategory('Lab Work', mockT)).toBe('Lab Work');
      expect(getCanonicalCategory('Έργο', mockGreekT)).toBe('Project');
    });

    it('handles edge case with multiple spaces', () => {
      expect(getCanonicalCategory('Final    Exam', mockT)).toBe('Final Exam');
    });

    it('preserves unknown custom categories without modification', () => {
      const custom = 'My Custom Grade Type';
      expect(getCanonicalCategory(custom, mockT)).toBe(custom);
    });
  });

  describe('getRuleKind', () => {
    it('finds the kind of a descriptive name by its keywords, as the final grade does', () => {
      expect(getRuleKind('τελικ', mockT)).toBe('Final Exam');
      expect(getRuleKind('final test', mockT)).toBe('Final Exam');
      expect(getRuleKind('midterm test', mockT)).toBe('Midterm Exam');
      expect(getRuleKind('lab experiment', mockT)).toBe('Lab Work');
      expect(getRuleKind('participation grade', mockT)).toBe('Class Participation');
      expect(getRuleKind('homework set', mockT)).toBe('Homework/Assignments');
      expect(getRuleKind('εργασια μαθηματος', mockT)).toBe('Homework/Assignments');
      expect(getRuleKind('Συνεχής Αξιολόγηση (Εκπόνηση εργασιών στο σπίτι και Ενδιάμεση Εξέταση)', mockT)).toBe(
        'Continuous Assessment'
      );
    });

    it('finds the observations, whatever the page language', () => {
      expect(getRuleKind('Μικρή συμμετοχή (χρήση κινητού)', mockT)).toBe('Minor participation (mobile usage)');
      expect(getRuleKind('Mobile usage participation', mockT)).toBe('Minor participation (mobile usage)');
    });

    it('leaves a name without a keyword as it is', () => {
      expect(getRuleKind('Θεωρητική Εξέταση', mockT)).toBe('Θεωρητική Εξέταση');
      expect(getRuleKind('', mockT)).toBe('');
    });
  });

  describe('localizeStandardName', () => {
    it('translates a standard name only', () => {
      expect(localizeStandardName('Homework/Assignments', pageGreekT)).toBe('Εργασία');
      expect(localizeStandardName('Εργαστήρια', pageGreekT)).toBe('Εργαστήριο');
      expect(localizeStandardName('Attendance', pageGreekT)).toBe('Παρουσία');
    });

    it('shows a course own name as typed, never as the category a keyword suggests', () => {
      // getLocalizedCategory names "Exam" Final Exam and "Exercises" Homework; the final grade does
      // not (todo 77 point 2's review: the Grading page offered «Τελική Εξέταση» twice).
      expect(localizeStandardName('Exam', pageGreekT)).toBe('Exam');
      expect(localizeStandardName('Exercises', pageGreekT)).toBe('Exercises');
      expect(localizeStandardName('Θεωρητική Εξέταση', pageEnglishT)).toBe('Θεωρητική Εξέταση');
      expect(getStandardCategory('Exam', pageEnglishT)).toBeNull();
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

    it('a stored standard name, shown in the page language, saves as itself again', () => {
      for (const stored of Object.keys(KEY_OF)) {
        expect(getCanonicalCategory(localizeStandardName(stored, pageGreekT), pageGreekT)).toBe(stored);
        expect(getCanonicalCategory(localizeStandardName(stored, pageEnglishT), pageEnglishT)).toBe(stored);
      }
    });
  });
});
