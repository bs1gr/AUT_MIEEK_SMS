import { describe, expect, it } from 'vitest';
import { attendedRate, countStatuses, isAttended, statusForm } from '../attendanceRate';

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

  it('writes a status as the pages do, whatever the case and spacing (plan todo 78)', () => {
    expect(['present', ' LATE ', 'Late ', 'absent', 'EXCUSED', 'Present'].map(statusForm)).toEqual([
      'Present',
      'Late',
      'Late',
      'Absent',
      'Excused',
      'Present',
    ]);
    // Any other word stays as stored, so the page shows it unmarked, as before; a word that is
    // the name of an object's member is one too.
    expect(['Tardy', '', null, undefined, 'constructor', 'toString'].map(statusForm)).toEqual([
      'Tardy',
      '',
      '',
      '',
      'constructor',
      'toString',
    ]);
  });

  it('counts a status that is the name of an object member in no column', () => {
    expect(countStatuses([{ status: 'constructor' }, { status: 'toString' }, { status: 'late' }])).toEqual({
      present: 0,
      absent: 0,
      late: 1,
      excused: 0,
    });
  });
});
