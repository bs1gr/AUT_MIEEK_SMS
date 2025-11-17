import { describe, it, expect } from 'vitest';
import { formatLocalDate, inferWeekStartsOnMonday } from './date';

describe('date utils', () => {
  describe('formatLocalDate', () => {
    it('formats Date object to YYYY-MM-DD', () => {
      const date = new Date(2024, 0, 15); // Month is 0-indexed
      const result = formatLocalDate(date);
      expect(result).toBe('2024-01-15');
    });

    it('extracts YYYY-MM-DD from ISO string', () => {
      const isoString = '2024-03-20T10:30:00.000Z';
      const result = formatLocalDate(isoString);
      expect(result).toBe('2024-03-20');
    });

    it('returns YYYY-MM-DD string as-is', () => {
      const dateString = '2024-05-10';
      const result = formatLocalDate(dateString);
      expect(result).toBe('2024-05-10');
    });

    it('handles date strings with time and timezone', () => {
      const dateString = '2024-07-04T00:00:00+03:00';
      const result = formatLocalDate(dateString);
      expect(result).toBe('2024-07-04');
    });

    it('returns empty string for empty input', () => {
      const result = formatLocalDate('');
      expect(result).toBe('');
    });

    it('returns empty string for whitespace input', () => {
      const result = formatLocalDate('   ');
      expect(result).toBe('');
    });

    it('pads month and day with zeros', () => {
      const date = new Date(2024, 0, 5); // Jan 5
      const result = formatLocalDate(date);
      expect(result).toBe('2024-01-05');
    });

    it('handles December correctly', () => {
      const date = new Date(2024, 11, 31); // Dec 31
      const result = formatLocalDate(date);
      expect(result).toBe('2024-12-31');
    });

    it('handles leap year February', () => {
      const date = new Date(2024, 1, 29); // Feb 29, 2024 (leap year)
      const result = formatLocalDate(date);
      expect(result).toBe('2024-02-29');
    });

    it('handles invalid date string by extracting date portion', () => {
      const invalidString = 'not-a-valid-date';
      const result = formatLocalDate(invalidString);
      expect(result).toBeTruthy(); // Should return something, not crash
    });

    it('handles date string without time component', () => {
      const dateString = '2024-08-15';
      const result = formatLocalDate(dateString);
      expect(result).toBe('2024-08-15');
    });
  });

  describe('inferWeekStartsOnMonday', () => {
    it('returns true when first label is Monday in English', () => {
      const labels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const result = inferWeekStartsOnMonday(labels);
      expect(result).toBe(true);
    });

    it('returns false when first label is Sunday in English', () => {
      const labels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const result = inferWeekStartsOnMonday(labels);
      expect(result).toBe(false);
    });

    it('recognizes Monday abbreviations', () => {
      expect(inferWeekStartsOnMonday(['Mon', 'Tue', 'Wed'])).toBe(true);
      expect(inferWeekStartsOnMonday(['Mo', 'Tu', 'We'])).toBe(true);
    });

    it('recognizes Sunday abbreviations', () => {
      expect(inferWeekStartsOnMonday(['Sun', 'Mon', 'Tue'])).toBe(false);
      expect(inferWeekStartsOnMonday(['Su', 'Mo', 'Tu'])).toBe(false);
    });

    it('recognizes Greek day names for Monday', () => {
      const greekLabels = ['Δε', 'Τρ', 'Τε', 'Πε', 'Πα', 'Σα', 'Κυ'];
      const result = inferWeekStartsOnMonday(greekLabels);
      expect(result).toBe(true);
    });

    it('recognizes Greek day names for Sunday', () => {
      const greekLabels = ['Κυ', 'Δε', 'Τρ', 'Τε', 'Πε', 'Πα', 'Σα'];
      const result = inferWeekStartsOnMonday(greekLabels);
      expect(result).toBe(false);
    });

    it('recognizes Spanish day names', () => {
      expect(inferWeekStartsOnMonday(['Lunes', 'Martes', 'Miércoles'])).toBe(true);
      expect(inferWeekStartsOnMonday(['Lun', 'Mar', 'Mié'])).toBe(true);
    });

    it('handles case insensitive matching', () => {
      expect(inferWeekStartsOnMonday(['MONDAY', 'TUESDAY'])).toBe(true);
      expect(inferWeekStartsOnMonday(['monday', 'tuesday'])).toBe(true);
      expect(inferWeekStartsOnMonday(['MoNdAy', 'TuEsDaY'])).toBe(true);
    });

    it('ignores whitespace in labels', () => {
      expect(inferWeekStartsOnMonday([' Monday ', ' Tuesday '])).toBe(true);
      expect(inferWeekStartsOnMonday(['  Sunday  ', '  Monday  '])).toBe(false);
    });

    it('returns fallback when labels array is empty', () => {
      expect(inferWeekStartsOnMonday([], false)).toBe(false);
      expect(inferWeekStartsOnMonday([], true)).toBe(true);
    });

    it('returns fallback when all labels are empty strings', () => {
      expect(inferWeekStartsOnMonday(['', '', ''], false)).toBe(false);
      expect(inferWeekStartsOnMonday(['', '', ''], true)).toBe(true);
    });

    it('returns fallback when first label is unrecognized', () => {
      expect(inferWeekStartsOnMonday(['Unknown', 'Day', 'Names'], false)).toBe(false);
      expect(inferWeekStartsOnMonday(['Unknown', 'Day', 'Names'], true)).toBe(true);
    });

    it('uses Monday/Sunday order when first label is unrecognized but later labels match', () => {
      // If Monday appears before Sunday in the array, infer Monday start
      expect(inferWeekStartsOnMonday(['X', 'Monday', 'Y', 'Sunday'])).toBe(true);
      // If Sunday appears before Monday, infer Sunday start
      expect(inferWeekStartsOnMonday(['X', 'Sunday', 'Y', 'Monday'])).toBe(false);
    });

    it('handles mixed case Greek labels', () => {
      expect(inferWeekStartsOnMonday(['δε', 'τρ', 'τε'])).toBe(true);
      expect(inferWeekStartsOnMonday(['ΔΕ', 'ΤΡ', 'ΤΕ'])).toBe(true);
      expect(inferWeekStartsOnMonday(['κυ', 'δε', 'τρ'])).toBe(false);
    });

    it('recognizes full Greek day names', () => {
      expect(inferWeekStartsOnMonday(['Δευτέρα', 'Τρίτη'])).toBe(true);
      expect(inferWeekStartsOnMonday(['Κυριακή', 'Δευτέρα'])).toBe(false);
    });

    it('defaults to false when no fallback specified and labels unrecognized', () => {
      const result = inferWeekStartsOnMonday(['Foo', 'Bar']);
      expect(result).toBe(false);
    });
  });
});
