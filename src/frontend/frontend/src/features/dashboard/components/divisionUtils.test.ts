import { describe, expect, it } from 'vitest';
import { matchesSelectedDivisionValue, normalizeDivisionLabelValue } from './divisionUtils';

describe('divisionUtils', () => {
  const unknownLabel = 'Unknown Division';

  describe('normalizeDivisionLabelValue', () => {
    it('returns unknown label for empty-ish values', () => {
      expect(normalizeDivisionLabelValue(undefined, unknownLabel)).toBe(unknownLabel);
      expect(normalizeDivisionLabelValue(null, unknownLabel)).toBe(unknownLabel);
      expect(normalizeDivisionLabelValue('', unknownLabel)).toBe(unknownLabel);
      expect(normalizeDivisionLabelValue('   ', unknownLabel)).toBe(unknownLabel);
    });

    it('maps unassigned aliases to unknown label case-insensitively', () => {
      expect(normalizeDivisionLabelValue('unassigned division', unknownLabel)).toBe(unknownLabel);
      expect(normalizeDivisionLabelValue('Unassigned', unknownLabel)).toBe(unknownLabel);
      expect(normalizeDivisionLabelValue('NO DIVISION', unknownLabel)).toBe(unknownLabel);
    });

    it('returns trimmed label for valid division names', () => {
      expect(normalizeDivisionLabelValue('  Α1  ', unknownLabel)).toBe('Α1');
      expect(normalizeDivisionLabelValue('B2', unknownLabel)).toBe('B2');
    });
  });

  describe('matchesSelectedDivisionValue', () => {
    it('matches everything when no division is selected', () => {
      expect(matchesSelectedDivisionValue('A1', '', unknownLabel)).toBe(true);
      expect(matchesSelectedDivisionValue(undefined, '', unknownLabel)).toBe(true);
    });

    it('matches exact normalized division labels', () => {
      expect(matchesSelectedDivisionValue('  A1  ', 'A1', unknownLabel)).toBe(true);
      expect(matchesSelectedDivisionValue('A2', 'A1', unknownLabel)).toBe(false);
    });

    it('matches unassigned variants to selected unknown label', () => {
      expect(matchesSelectedDivisionValue('unassigned', unknownLabel, unknownLabel)).toBe(true);
      expect(matchesSelectedDivisionValue('No Division', unknownLabel, unknownLabel)).toBe(true);
    });
  });
});
