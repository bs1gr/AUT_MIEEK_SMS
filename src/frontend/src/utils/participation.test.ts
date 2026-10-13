import { describe, expect, it } from 'vitest';
import { DEFAULT_DEDUCTION_PERCENTS, splitParticipationRules } from './participation';

const same = (category: string) => category;

describe('splitParticipationRules', () => {
  it('keeps the weighted rules and reads each observation percentage', () => {
    const { rules, deductions } = splitParticipationRules(
      [
        { category: 'Class Participation', weight: 10 },
        { category: 'No participation', weight: 0, deduction_percent: 70 },
        { category: 'Minor participation (mobile usage)', weight: 0, deduction_percent: '0' },
        { category: 'Final Exam', weight: 90 },
      ],
      same,
    );
    expect(rules).toEqual([
      { category: 'Class Participation', weight: 10 },
      { category: 'Final Exam', weight: 90 },
    ]);
    expect(deductions).toEqual({
      'No participation': 70,
      'Minor participation (mobile usage)': 0,
      'Minor participation': 20, // not saved: default
    });
  });

  it('gives defaults by severity and returns old-layout sub-weights to Class Participation', () => {
    const { rules, deductions } = splitParticipationRules(
      [
        { category: 'Class Participation', weight: 1 },
        { category: 'No participation', weight: 3 },
        { category: 'Minor participation', weight: 3 },
        { category: 'Minor participation (mobile usage)', weight: 3 },
        { category: 'Final Exam', weight: 90 },
      ],
      same,
    );
    expect(rules[0]).toEqual({ category: 'Class Participation', weight: 10 });
    expect(deductions).toEqual(DEFAULT_DEDUCTION_PERCENTS);
    expect(DEFAULT_DEDUCTION_PERCENTS['No participation']).toBeGreaterThan(DEFAULT_DEDUCTION_PERCENTS['Minor participation (mobile usage)']);
    expect(DEFAULT_DEDUCTION_PERCENTS['Minor participation (mobile usage)']).toBeGreaterThan(DEFAULT_DEDUCTION_PERCENTS['Minor participation']);
  });
});
