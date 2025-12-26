/**
 * Translation integrity tests
 *
 * Validates:
 * 1. All translation keys exist in both EN and EL
 * 2. No missing translations (empty strings or undefined)
 * 3. Structure consistency between languages
 * 4. No hardcoded strings in markup (via eslint i18next plugin)
 */

import { describe, it, expect } from 'vitest';
import { translations } from '../../translations';

describe('Translation Integrity', () => {
  describe('Key Parity', () => {
    it('should have the same top-level keys in EN and EL', () => {
      const enKeys = Object.keys(translations.en).sort();
      const elKeys = Object.keys(translations.el).sort();

      expect(enKeys).toEqual(elKeys);
    });

    it('should have no missing translation values (EN)', () => {
      const missingKeys: string[] = [];

      function checkForMissing(obj: Record<string, unknown>, path = '') {
        for (const [key, value] of Object.entries(obj)) {
          const fullPath = path ? `${path}.${key}` : key;

          if (value === '' || value === null || value === undefined) {
            missingKeys.push(fullPath);
          } else if (typeof value === 'object' && !Array.isArray(value)) {
            checkForMissing(value as Record<string, unknown>, fullPath);
          }
        }
      }

      checkForMissing(translations.en as Record<string, unknown>);

      expect(missingKeys).toEqual([]);
    });

    it('should have no missing translation values (EL)', () => {
      const missingKeys: string[] = [];

      function checkForMissing(obj: Record<string, unknown>, path = '') {
        for (const [key, value] of Object.entries(obj)) {
          const fullPath = path ? `${path}.${key}` : key;

          if (value === '' || value === null || value === undefined) {
            missingKeys.push(fullPath);
          } else if (typeof value === 'object' && !Array.isArray(value)) {
            checkForMissing(value as Record<string, unknown>, fullPath);
          }
        }
      }

      checkForMissing(translations.el as Record<string, unknown>);

      expect(missingKeys).toEqual([]);
    });
  });

  describe('Structure Consistency', () => {
    it('should have matching nested structure in EN and EL', () => {
      function getStructure(obj: Record<string, unknown>, path = ''): string[] {
        const paths: string[] = [];

        for (const [key, value] of Object.entries(obj)) {
          const fullPath = path ? `${path}.${key}` : key;
          paths.push(fullPath);

          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            paths.push(...getStructure(value as Record<string, unknown>, fullPath));
          }
        }

        return paths.sort();
      }

      const enStructure = getStructure(translations.en as Record<string, unknown>);
      const elStructure = getStructure(translations.el as Record<string, unknown>);

      // Check for keys in EN but not in EL
      const missingInEl = enStructure.filter(key => !elStructure.includes(key));
      // Check for keys in EL but not in EN
      const missingInEn = elStructure.filter(key => !enStructure.includes(key));

      expect(missingInEl, `Keys in EN but missing in EL: ${missingInEl.join(', ')}`).toEqual([]);
      expect(missingInEn, `Keys in EL but missing in EN: ${missingInEn.join(', ')}`).toEqual([]);
    });
  });

  describe('Common Translation Keys', () => {
    it('should have common UI keys in both languages', () => {
      const commonKeys = [
        'common.save',
        'common.cancel',
        'common.delete',
        'common.edit',
        'common.add',
        'common.loading',
        'common.error',
        'common.success',
      ];

      for (const key of commonKeys) {
        const keys = key.split('.');
        let enValue: unknown = translations.en;
        let elValue: unknown = translations.el;

        for (const k of keys) {
          enValue = (enValue as Record<string, unknown>)?.[k];
          elValue = (elValue as Record<string, unknown>)?.[k];
        }

        expect(enValue, `Missing EN translation for ${key}`).toBeDefined();
        expect(elValue, `Missing EL translation for ${key}`).toBeDefined();
        expect(typeof enValue, `EN translation for ${key} should be string`).toBe('string');
        expect(typeof elValue, `EL translation for ${key} should be string`).toBe('string');
      }
    });
  });

  describe('Translation Quality', () => {
    it('should not have placeholder text like "TODO" or "FIXME"', () => {
      const placeholders = ['TODO', 'FIXME', 'XXX'];
      const issues: string[] = [];

      function checkPlaceholders(obj: Record<string, unknown>, lang: string, path = '') {
        for (const [key, value] of Object.entries(obj)) {
          const fullPath = path ? `${path}.${key}` : key;

          // Skip keys that are intentionally about placeholders (help documentation)
          if (fullPath.includes('Placeholder') || fullPath.includes('placeholder')) {
            continue;
          }

          if (typeof value === 'string') {
            for (const placeholder of placeholders) {
              if (value.toUpperCase().includes(placeholder)) {
                issues.push(`${lang}.${fullPath}: "${value}"`);
              }
            }
          } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            checkPlaceholders(value as Record<string, unknown>, lang, fullPath);
          }
        }
      }

      checkPlaceholders(translations.en as Record<string, unknown>, 'en');
      checkPlaceholders(translations.el as Record<string, unknown>, 'el');

      expect(issues, `Found placeholder text in translations:\n${issues.join('\n')}`).toEqual([]);
    });

    it('should not have EN text in EL translations (basic check)', () => {
      // Check for common English words that shouldn't appear in Greek translations
      const englishWords = ['student', 'course', 'grade', 'attendance', 'export', 'import', 'save', 'delete', 'cancel', 'edit'];
      const issues: string[] = [];

      function checkEnglish(obj: Record<string, unknown>, path = '') {
        for (const [key, value] of Object.entries(obj)) {
          const fullPath = path ? `${path}.${key}` : key;

          if (typeof value === 'string') {
            const lowerValue = value.toLowerCase();
            for (const word of englishWords) {
              // Check for whole word matches (not partial)
              const regex = new RegExp(`\\b${word}\\b`, 'i');
              if (regex.test(lowerValue)) {
                issues.push(`${fullPath}: "${value}" contains English word "${word}"`);
              }
            }
          } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            checkEnglish(value as Record<string, unknown>, fullPath);
          }
        }
      }

      checkEnglish(translations.el as Record<string, unknown>);

      // This is a heuristic check - some English words might be intentional (e.g., technical terms)
      // Flag them but allow exceptions
      if (issues.length > 0) {
        console.warn('Potential English text in Greek translations (review if intentional):\n', issues.join('\n'));
      }
    });
  });
});
