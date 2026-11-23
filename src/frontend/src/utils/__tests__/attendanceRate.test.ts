import { describe, expect, it } from 'vitest';
import { attendedRate, isAttended } from '../attendanceRate';

describe('attendance rate (plan todo 77: Present and Late are attended)', () => {
  it('counts Present and Late, whatever the case, and never Absent or Excused', () => {
    expect(['Present', 'late', ' LATE ', 'Absent', 'Excused', '', null, undefined].map(isAttended)).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it('is the attended share of every period recorded', () => {
    // Present, Late, Late, Excused: 3 of 4. Present and Excused (the Students page until then)
    // gave 50, Present alone (the Student Profile) 25.
    expect(attendedRate([{ status: 'Present' }, { status: 'Late' }, { status: 'Late' }, { status: 'Excused' }])).toBe(75);
    expect(attendedRate([])).toBe(0);
  });
});
