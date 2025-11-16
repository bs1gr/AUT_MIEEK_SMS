/**
 * Unit tests for grade conversion utilities
 */

import { describe, it, expect } from 'vitest';
import {
  gpaToPercentage,
  gpaToGreekScale,
  percentageToGreekScale,
  greekScaleToGPA,
  getLetterGrade,
} from './gradeUtils';

describe('gradeUtils - Core Conversions', () => {
  describe('gpaToPercentage', () => {
    it('converts GPA 4.0 to 100%', () => {
      expect(gpaToPercentage(4.0)).toBe(100);
    });

    it('converts GPA 3.0 to 75%', () => {
      expect(gpaToPercentage(3.0)).toBe(75);
    });

    it('converts GPA 2.0 to 50%', () => {
      expect(gpaToPercentage(2.0)).toBe(50);
    });

    it('converts GPA 0.0 to 0%', () => {
      expect(gpaToPercentage(0.0)).toBe(0);
    });

    it('handles negative GPA as 0%', () => {
      expect(gpaToPercentage(-1)).toBe(0);
    });

    it('caps GPA > 4.0 at 100%', () => {
      expect(gpaToPercentage(5.0)).toBe(100);
    });
  });

  describe('gpaToGreekScale', () => {
    it('converts GPA 4.0 to 20 (Greek)', () => {
      expect(gpaToGreekScale(4.0)).toBe(20);
    });

    it('converts GPA 3.0 to 15 (Greek)', () => {
      expect(gpaToGreekScale(3.0)).toBe(15);
    });

    it('converts GPA 2.0 to 10 (Greek)', () => {
      expect(gpaToGreekScale(2.0)).toBe(10);
    });

    it('handles negative GPA as 0 (Greek)', () => {
      expect(gpaToGreekScale(-1)).toBe(0);
    });
  });

  describe('percentageToGreekScale', () => {
    it('converts 100% to 20 (Greek)', () => {
      expect(percentageToGreekScale(100)).toBe(20);
    });

    it('converts 75% to 15 (Greek)', () => {
      expect(percentageToGreekScale(75)).toBe(15);
    });

    it('converts 50% to 10 (Greek)', () => {
      expect(percentageToGreekScale(50)).toBe(10);
    });

    it('handles negative percentage as 0', () => {
      expect(percentageToGreekScale(-10)).toBe(0);
    });
  });

  describe('greekScaleToGPA', () => {
    it('converts 20 (Greek) to GPA 4.0', () => {
      expect(greekScaleToGPA(20)).toBe(4.0);
    });

    it('converts 15 (Greek) to GPA 3.0', () => {
      expect(greekScaleToGPA(15)).toBe(3.0);
    });

    it('converts 10 (Greek) to GPA 2.0', () => {
      expect(greekScaleToGPA(10)).toBe(2.0);
    });
  });

  describe('getLetterGrade', () => {
    it('returns A for percentage >= 90', () => {
      expect(getLetterGrade(90)).toBe('A');
      expect(getLetterGrade(95)).toBe('A');
      expect(getLetterGrade(100)).toBe('A');
    });

    it('returns B for percentage 80-89', () => {
      expect(getLetterGrade(80)).toBe('B');
      expect(getLetterGrade(85)).toBe('B');
      expect(getLetterGrade(89)).toBe('B');
    });

    it('returns C for percentage 70-79', () => {
      expect(getLetterGrade(70)).toBe('C');
      expect(getLetterGrade(75)).toBe('C');
      expect(getLetterGrade(79)).toBe('C');
    });

    it('returns D for percentage 60-69', () => {
      expect(getLetterGrade(60)).toBe('D');
      expect(getLetterGrade(65)).toBe('D');
      expect(getLetterGrade(69)).toBe('D');
    });

    it('returns F for percentage < 60', () => {
      expect(getLetterGrade(0)).toBe('F');
      expect(getLetterGrade(30)).toBe('F');
      expect(getLetterGrade(59)).toBe('F');
    });
  });

  describe('Round-trip conversions', () => {
    it('maintains consistency in GPA -> Percentage -> Greek conversions', () => {
      const gpa = 3.5;
      const percentage = gpaToPercentage(gpa);
      const greek = percentageToGreekScale(percentage);
      
      expect(percentage).toBe(87.5);
      expect(greek).toBe(17.5);
    });

    it('maintains consistency in Greek -> GPA -> Percentage conversions', () => {
      const greek = 16;
      const gpa = greekScaleToGPA(greek);
      const percentage = gpaToPercentage(gpa);
      
      expect(gpa).toBe(3.2);
      expect(percentage).toBe(80);
    });
  });

  describe('Boundary conditions', () => {
    it('handles zero values correctly', () => {
      expect(gpaToPercentage(0)).toBe(0);
      expect(gpaToGreekScale(0)).toBe(0);
      expect(percentageToGreekScale(0)).toBe(0);
      expect(greekScaleToGPA(0)).toBe(0);
    });

    it('handles maximum values correctly', () => {
      expect(gpaToPercentage(4.0)).toBe(100);
      expect(gpaToGreekScale(4.0)).toBe(20);
      expect(percentageToGreekScale(100)).toBe(20);
      expect(greekScaleToGPA(20)).toBe(4.0);
    });

    it('handles negative values', () => {
      expect(gpaToPercentage(-1)).toBe(0);
      expect(gpaToGreekScale(-1)).toBe(0);
      expect(percentageToGreekScale(-50)).toBe(0);
      expect(greekScaleToGPA(-10)).toBe(0);
    });
  });
});
