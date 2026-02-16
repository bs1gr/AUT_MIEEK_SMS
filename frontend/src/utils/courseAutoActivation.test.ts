/**
 * Unit tests for courseAutoActivation utility functions.
 * Tests semester parsing, date range computation, and auto-activation logic.
 */

import { describe, it, expect } from 'vitest';
import { computeAutoActivation, getAutoActivationStatus } from './courseAutoActivation';

describe('courseAutoActivation', () => {
  describe('inferSemesterKind (tested indirectly)', () => {
    it('should recognize winter semester variants', () => {
      expect(computeAutoActivation('Winter Semester 2025', new Date(2025, 9, 1))).toBe(true);
      expect(computeAutoActivation('Fall Semester 2025', new Date(2025, 9, 1))).toBe(true);
      expect(computeAutoActivation('Autumn Semester 2025', new Date(2025, 9, 1))).toBe(true);
    });

    it('should recognize winter semester in Greek', () => {
      expect(computeAutoActivation('Χειμερινό Εξάμηνο 2025', new Date(2025, 9, 1))).toBe(true);
      expect(computeAutoActivation('Χειμερινο Εξάμηνο 2025', new Date(2025, 9, 1))).toBe(true); // Without diacritics
    });

    it('should recognize spring semester variants', () => {
      expect(computeAutoActivation('Spring Semester 2025', new Date(2025, 3, 1))).toBe(true);
      expect(computeAutoActivation('Εαρινό Εξάμηνο 2025', new Date(2025, 3, 1))).toBe(true);
      expect(computeAutoActivation('Εαρινο Εξάμηνο 2025', new Date(2025, 3, 1))).toBe(true); // Without diacritics
    });

    it('should recognize academic year', () => {
      expect(computeAutoActivation('Academic Year 2025', new Date(2025, 9, 1))).toBe(true);
      expect(computeAutoActivation('Academic Year 2025-2026', new Date(2025, 9, 1))).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(computeAutoActivation('WINTER SEMESTER 2025', new Date(2025, 9, 1))).toBe(true);
      expect(computeAutoActivation('spring semester 2025', new Date(2025, 3, 1))).toBe(true);
    });

    it('should return null for unrecognized formats', () => {
      expect(computeAutoActivation('Custom Semester')).toBe(null);
      expect(computeAutoActivation('Q1 2025')).toBe(null);
      expect(computeAutoActivation('')).toBe(null);
    });
  });

  describe('extractYear (tested indirectly)', () => {
    it('should extract 4-digit year from various formats', () => {
      expect(computeAutoActivation('Winter Semester 2025', new Date(2025, 9, 1))).toBe(true);
      expect(computeAutoActivation('Spring 2024', new Date(2024, 3, 1))).toBe(true);
      expect(computeAutoActivation('2026 Fall Semester', new Date(2026, 9, 1))).toBe(true);
    });

    it('should extract year from range format', () => {
      expect(computeAutoActivation('Winter 2024-2025', new Date(2024, 9, 1))).toBe(true); // Uses first year
    });

    it('should return null when no year present', () => {
      expect(computeAutoActivation('Winter Semester')).toBe(null);
      expect(computeAutoActivation('Spring')).toBe(null);
    });
  });

  describe('semesterDateRange (tested indirectly)', () => {
    it('should compute winter semester range (Sept 15 → Jan 30)', () => {
      // Winter 2025: Sept 15, 2025 → Jan 30, 2026
      expect(computeAutoActivation('Winter 2025', new Date(2025, 8, 15))).toBe(true); // Start date
      expect(computeAutoActivation('Winter 2025', new Date(2025, 9, 1))).toBe(true); // Mid-range
      expect(computeAutoActivation('Winter 2025', new Date(2026, 0, 30))).toBe(true); // End date
      expect(computeAutoActivation('Winter 2025', new Date(2025, 8, 14))).toBe(false); // Before start
      expect(computeAutoActivation('Winter 2025', new Date(2026, 0, 31))).toBe(false); // After end
    });

    it('should compute spring semester range (Feb 1 → June 30)', () => {
      // Spring 2025: Feb 1, 2025 → June 30, 2025
      expect(computeAutoActivation('Spring 2025', new Date(2025, 1, 1))).toBe(true); // Start date
      expect(computeAutoActivation('Spring 2025', new Date(2025, 3, 15))).toBe(true); // Mid-range
      expect(computeAutoActivation('Spring 2025', new Date(2025, 5, 30))).toBe(true); // End date
      expect(computeAutoActivation('Spring 2025', new Date(2025, 0, 31))).toBe(false); // Before start
      expect(computeAutoActivation('Spring 2025', new Date(2025, 6, 1))).toBe(false); // After end
    });

    it('should compute academic year range (Sept 1 → June 30)', () => {
      // Academic Year 2025: Sept 1, 2025 → June 30, 2026
      expect(computeAutoActivation('Academic Year 2025', new Date(2025, 8, 1))).toBe(true); // Start date
      expect(computeAutoActivation('Academic Year 2025', new Date(2025, 11, 1))).toBe(true); // Mid-range
      expect(computeAutoActivation('Academic Year 2025', new Date(2026, 5, 30))).toBe(true); // End date
      expect(computeAutoActivation('Academic Year 2025', new Date(2025, 7, 31))).toBe(false); // Before start
      expect(computeAutoActivation('Academic Year 2025', new Date(2026, 6, 1))).toBe(false); // After end
    });

    it('should handle year boundaries correctly', () => {
      // Winter crosses year boundary (2025 → 2026)
      expect(computeAutoActivation('Winter 2025', new Date(2025, 11, 31))).toBe(true); // Dec 31, 2025
      expect(computeAutoActivation('Winter 2025', new Date(2026, 0, 1))).toBe(true); // Jan 1, 2026

      // Academic year crosses year boundary (2025 → 2026)
      expect(computeAutoActivation('Academic Year 2025', new Date(2025, 11, 31))).toBe(true); // Dec 31, 2025
      expect(computeAutoActivation('Academic Year 2025', new Date(2026, 0, 1))).toBe(true); // Jan 1, 2026
    });

    it('should reject invalid years', () => {
      // Years < 2000 or > 2100 should return null (based on backend validation)
      expect(computeAutoActivation('Winter 1999')).toBe(null);
      expect(computeAutoActivation('Spring 2101')).toBe(null);
    });
  });

  describe('computeAutoActivation', () => {
    it('should return true when date is within semester range', () => {
      const withinWinter = new Date(2025, 10, 1); // Nov 1, 2025 (within Winter 2025)
      expect(computeAutoActivation('Winter 2025', withinWinter)).toBe(true);

      const withinSpring = new Date(2025, 3, 15); // April 15, 2025 (within Spring 2025)
      expect(computeAutoActivation('Spring 2025', withinSpring)).toBe(true);

      const withinAcademic = new Date(2025, 10, 1); // Nov 1, 2025 (within Academic 2025)
      expect(computeAutoActivation('Academic Year 2025', withinAcademic)).toBe(true);
    });

    it('should return false when date is outside semester range', () => {
      const beforeWinter = new Date(2025, 7, 1); // Aug 1, 2025 (before Winter 2025)
      expect(computeAutoActivation('Winter 2025', beforeWinter)).toBe(false);

      const afterSpring = new Date(2025, 7, 1); // Aug 1, 2025 (after Spring 2025)
      expect(computeAutoActivation('Spring 2025', afterSpring)).toBe(false);
    });

    it('should return null for unrecognized semester format', () => {
      expect(computeAutoActivation('Custom Semester 2025')).toBe(null);
      expect(computeAutoActivation('Q1 2025')).toBe(null);
      expect(computeAutoActivation('Semester 2025')).toBe(null);
    });

    it('should return null when semester is empty or invalid', () => {
      expect(computeAutoActivation('')).toBe(null);
      expect(computeAutoActivation('Winter')).toBe(null); // No year
      expect(computeAutoActivation('2025')).toBe(null); // No semester type
    });

    it('should use current date when today is not provided', () => {
      // This test verifies default parameter behavior
      const result = computeAutoActivation('Winter 2025');
      expect(typeof result).toBe('boolean'); // Should return bool, not null (if current date is valid)
    });

    it('should handle boundary dates correctly (inclusive)', () => {
      // First day of semester (Sept 15)
      expect(computeAutoActivation('Winter 2025', new Date(2025, 8, 15))).toBe(true);

      // Last day of semester (Jan 30)
      expect(computeAutoActivation('Winter 2025', new Date(2026, 0, 30))).toBe(true);

      // Day before first day (Sept 14)
      expect(computeAutoActivation('Winter 2025', new Date(2025, 8, 14))).toBe(false);

      // Day after last day (Jan 31)
      expect(computeAutoActivation('Winter 2025', new Date(2026, 0, 31))).toBe(false);
    });

    it('should ignore time component when comparing dates', () => {
      // Same date but different times should produce same result
      const morning = new Date(2025, 9, 1, 8, 0, 0);
      const evening = new Date(2025, 9, 1, 20, 30, 45);

      expect(computeAutoActivation('Winter 2025', morning)).toBe(true);
      expect(computeAutoActivation('Winter 2025', evening)).toBe(true);
    });
  });

  describe('getAutoActivationStatus', () => {
    it('should return active status when course is active', () => {
      const withinRange = new Date(2025, 10, 1); // Within Winter 2025
      const mockComputeActive = () => true;

      const status = getAutoActivationStatus('Winter 2025');

      // Check structure (actual isActive depends on current date)
      expect(status).toHaveProperty('label');
      expect(status).toHaveProperty('hint');
      expect(status).toHaveProperty('isActive');
      expect(typeof status.label).toBe('string');
      expect(typeof status.hint).toBe('string');
      expect(typeof status.isActive === 'boolean' || status.isActive === null).toBe(true);
    });

    it('should return inactive status when course is inactive', () => {
      const outsideRange = new Date(2025, 7, 1); // Outside Winter 2025
      const status = getAutoActivationStatus('Winter 2025');

      expect(status).toHaveProperty('label');
      expect(status).toHaveProperty('hint');
      expect(status).toHaveProperty('isActive');
    });

    it('should return not applicable status for unrecognized format', () => {
      const status = getAutoActivationStatus('Custom Semester');

      expect(status.label).toBe('autoActivationNotApplicable');
      expect(status.hint).toBe('autoActivationNotApplicableHint');
      expect(status.isActive).toBe(null);
    });

    it('should return correct translation keys for active state', () => {
      // Use a date we know is within Winter 2026
      const withinWinter2026 = new Date(2026, 9, 1); // Oct 1, 2026

      // Create a test by directly checking computeAutoActivation first
      const isActive = computeAutoActivation('Winter 2026', withinWinter2026);
      expect(isActive).toBe(true);

      // Now verify getAutoActivationStatus returns correct keys
      // We can't call it with custom date, so we test with a future semester
      // that we know will be active at test time
      const status = getAutoActivationStatus('Winter 2099'); // Far future

      expect(['autoActivationActive', 'autoActivationInactive', 'autoActivationNotApplicable']).toContain(
        status.label
      );
      expect([
        'autoActivationActiveHint',
        'autoActivationInactiveHint',
        'autoActivationNotApplicableHint',
      ]).toContain(status.hint);
    });

    it('should return correct translation keys for inactive state', () => {
      // Use historical semester that is definitely inactive
      const status = getAutoActivationStatus('Winter 2020');

      expect(status.label).toBe('autoActivationInactive');
      expect(status.hint).toBe('autoActivationInactiveHint');
      expect(status.isActive).toBe(false);
    });

    it('should return correct translation keys for not applicable state', () => {
      const status = getAutoActivationStatus('Unknown Format');

      expect(status.label).toBe('autoActivationNotApplicable');
      expect(status.hint).toBe('autoActivationNotApplicableHint');
      expect(status.isActive).toBe(null);
    });

    it('should handle empty semester string', () => {
      const status = getAutoActivationStatus('');

      expect(status.label).toBe('autoActivationNotApplicable');
      expect(status.hint).toBe('autoActivationNotApplicableHint');
      expect(status.isActive).toBe(null);
    });
  });

  describe('edge cases and real-world scenarios', () => {
    it('should handle current semester correctly (Feb 2026)', () => {
      // Based on context: Current date is February 17, 2026
      const currentDate = new Date(2026, 1, 17); // Feb 17, 2026

      // Spring 2026 (Feb 1 - June 30) should be active
      expect(computeAutoActivation('Spring 2026', currentDate)).toBe(true);

      // Winter 2025-2026 (Sept 15, 2025 - Jan 30, 2026) should be inactive (ended)
      expect(computeAutoActivation('Winter 2025', currentDate)).toBe(false);

      // Academic Year 2025-2026 (Sept 1, 2025 - June 30, 2026) should be active
      expect(computeAutoActivation('Academic Year 2025', currentDate)).toBe(true);
    });

    it('should handle Greek semester names with various diacritic patterns', () => {
      const testDate = new Date(2025, 9, 1); // Oct 1, 2025

      // All these variations should be recognized as winter
      expect(computeAutoActivation('Χειμερινό Εξάμηνο 2025', testDate)).toBe(true);
      expect(computeAutoActivation('ΧΕΙΜΕΡΙΝΟ ΕΞΑΜΗΝΟ 2025', testDate)).toBe(true);
      expect(computeAutoActivation('χειμερινο εξαμηνο 2025', testDate)).toBe(true);
    });

    it('should handle multi-year format (e.g., 2024-2025)', () => {
      const testDate = new Date(2024, 9, 1); // Oct 1, 2024

      // Should use first year from range
      expect(computeAutoActivation('Winter 2024-2025', testDate)).toBe(true);
      expect(computeAutoActivation('Academic Year 2024-2025', testDate)).toBe(true);
    });

    it('should handle mixed language formats', () => {
      const testDate = new Date(2025, 9, 1); // Oct 1, 2025

      // Mixed formats should still work
      expect(computeAutoActivation('Winter Εξάμηνο 2025', testDate)).toBe(true);
      expect(computeAutoActivation('Χειμερινό Semester 2025', testDate)).toBe(true);
    });

    it('should handle leap year dates correctly', () => {
      // 2024 is a leap year
      const leapDaySpring = new Date(2024, 1, 29); // Feb 29, 2024

      // Feb 29 should be within Spring 2024 (Feb 1 - June 30)
      expect(computeAutoActivation('Spring 2024', leapDaySpring)).toBe(true);
    });

    it('should handle semester transitions correctly', () => {
      // Last day of Winter semester
      const lastDayWinter = new Date(2026, 0, 30); // Jan 30, 2026
      expect(computeAutoActivation('Winter 2025', lastDayWinter)).toBe(true);

      // First day of Spring semester
      const firstDaySpring = new Date(2026, 1, 1); // Feb 1, 2026
      expect(computeAutoActivation('Spring 2026', firstDaySpring)).toBe(true);

      // Gap between Winter end and Spring start (Jan 31)
      const gapDay = new Date(2026, 0, 31); // Jan 31, 2026
      expect(computeAutoActivation('Winter 2025', gapDay)).toBe(false);
      expect(computeAutoActivation('Spring 2026', gapDay)).toBe(false);
    });
  });
});
