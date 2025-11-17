import { describe, it, expect, beforeEach } from 'vitest';
import { useAttendanceStore } from './useAttendanceStore';
import type { Attendance } from '@/types';

const sampleAttendance1: Attendance = {
  id: 1,
  student_id: 1,
  course_id: 1,
  date: '2024-01-15',
  status: 'Present',
};

const sampleAttendance2: Attendance = {
  id: 2,
  student_id: 1,
  course_id: 1,
  date: '2024-01-16',
  status: 'Absent',
  notes: 'Excused for medical reasons',
};

const sampleAttendance3: Attendance = {
  id: 3,
  student_id: 2,
  course_id: 2,
  date: '2024-01-17',
  status: 'Late',
};

describe('useAttendanceStore', () => {
  beforeEach(() => {
    const { setAttendance, setLoading, setError } = useAttendanceStore.getState();
    setAttendance([]);
    setLoading(false);
    setError(null);
  });

  describe('Initial state', () => {
    it('starts with empty attendanceRecords array', () => {
      const { attendanceRecords } = useAttendanceStore.getState();
      expect(attendanceRecords).toEqual([]);
    });

    it('starts with loading false', () => {
      const { isLoading } = useAttendanceStore.getState();
      expect(isLoading).toBe(false);
    });

    it('starts with no error', () => {
      const { error } = useAttendanceStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('setAttendance', () => {
    it('sets attendance records array', () => {
      const { setAttendance } = useAttendanceStore.getState();
      setAttendance([sampleAttendance1, sampleAttendance2]);
      const { attendanceRecords } = useAttendanceStore.getState();
      expect(attendanceRecords).toHaveLength(2);
      expect(attendanceRecords[0].id).toBe(1);
      expect(attendanceRecords[1].id).toBe(2);
    });

    it('clears error when setting attendance', () => {
      const { setError, setAttendance } = useAttendanceStore.getState();
      setError('Previous error');
      setAttendance([sampleAttendance1]);
      const { error } = useAttendanceStore.getState();
      expect(error).toBeNull();
    });

    it('replaces existing attendance records', () => {
      const { setAttendance } = useAttendanceStore.getState();
      setAttendance([sampleAttendance1]);
      setAttendance([sampleAttendance2]);
      const { attendanceRecords } = useAttendanceStore.getState();
      expect(attendanceRecords).toHaveLength(1);
      expect(attendanceRecords[0].id).toBe(2);
    });
  });

  describe('addAttendance', () => {
    it('adds an attendance record to empty array', () => {
      const { addAttendance } = useAttendanceStore.getState();
      addAttendance(sampleAttendance1);
      const { attendanceRecords } = useAttendanceStore.getState();
      expect(attendanceRecords).toHaveLength(1);
      expect(attendanceRecords[0].id).toBe(1);
    });

    it('appends attendance to existing records', () => {
      const { setAttendance, addAttendance } = useAttendanceStore.getState();
      setAttendance([sampleAttendance1]);
      addAttendance(sampleAttendance2);
      const { attendanceRecords } = useAttendanceStore.getState();
      expect(attendanceRecords).toHaveLength(2);
      expect(attendanceRecords[1].id).toBe(2);
    });

    it('clears error when adding attendance', () => {
      const { setError, addAttendance } = useAttendanceStore.getState();
      setError('Add error');
      addAttendance(sampleAttendance1);
      const { error } = useAttendanceStore.getState();
      expect(error).toBeNull();
    });

    it('does not mutate original array', () => {
      const { setAttendance, addAttendance } = useAttendanceStore.getState();
      setAttendance([sampleAttendance1]);
      const { attendanceRecords: before } = useAttendanceStore.getState();
      addAttendance(sampleAttendance2);
      expect(before).toHaveLength(1);
    });
  });

  describe('updateAttendance', () => {
    beforeEach(() => {
      const { setAttendance } = useAttendanceStore.getState();
      setAttendance([sampleAttendance1, sampleAttendance2]);
    });

    it('updates attendance by id', () => {
      const { updateAttendance } = useAttendanceStore.getState();
      updateAttendance(1, { status: 'Late' });
      const { attendanceRecords } = useAttendanceStore.getState();
      expect(attendanceRecords[0].status).toBe('Late');
      expect(attendanceRecords[0].date).toBe('2024-01-15');
    });

    it('updates multiple fields', () => {
      const { updateAttendance } = useAttendanceStore.getState();
      updateAttendance(2, { status: 'Excused', notes: 'Doctor appointment' });
      const { attendanceRecords } = useAttendanceStore.getState();
      const updated = attendanceRecords.find(a => a.id === 2);
      expect(updated?.status).toBe('Excused');
      expect(updated?.notes).toBe('Doctor appointment');
    });

    it('does not affect other attendance records', () => {
      const { updateAttendance } = useAttendanceStore.getState();
      updateAttendance(1, { status: 'Absent' });
      const { attendanceRecords } = useAttendanceStore.getState();
      expect(attendanceRecords[1].status).toBe('Absent');
      expect(attendanceRecords[1].notes).toBe('Excused for medical reasons');
    });

    it('clears error on update', () => {
      const { setError, updateAttendance } = useAttendanceStore.getState();
      setError('Update error');
      updateAttendance(1, { notes: 'Updated note' });
      const { error } = useAttendanceStore.getState();
      expect(error).toBeNull();
    });

    it('handles update of non-existent attendance record gracefully', () => {
      const { updateAttendance } = useAttendanceStore.getState();
      updateAttendance(999, { status: 'Present' });
      const { attendanceRecords } = useAttendanceStore.getState();
      expect(attendanceRecords).toHaveLength(2);
    });
  });

  describe('deleteAttendance', () => {
    beforeEach(() => {
      const { setAttendance } = useAttendanceStore.getState();
      setAttendance([sampleAttendance1, sampleAttendance2]);
    });

    it('removes attendance by id', () => {
      const { deleteAttendance } = useAttendanceStore.getState();
      deleteAttendance(1);
      const { attendanceRecords } = useAttendanceStore.getState();
      expect(attendanceRecords).toHaveLength(1);
      expect(attendanceRecords[0].id).toBe(2);
    });

    it('clears error on delete', () => {
      const { setError, deleteAttendance } = useAttendanceStore.getState();
      setError('Delete error');
      deleteAttendance(1);
      const { error } = useAttendanceStore.getState();
      expect(error).toBeNull();
    });

    it('handles delete of non-existent attendance', () => {
      const { deleteAttendance } = useAttendanceStore.getState();
      deleteAttendance(999);
      const { attendanceRecords } = useAttendanceStore.getState();
      expect(attendanceRecords).toHaveLength(2);
    });
  });

  describe('bulkAddAttendance', () => {
    it('adds multiple attendance records to empty array', () => {
      const { bulkAddAttendance } = useAttendanceStore.getState();
      bulkAddAttendance([sampleAttendance1, sampleAttendance2]);
      const { attendanceRecords } = useAttendanceStore.getState();
      expect(attendanceRecords).toHaveLength(2);
    });

    it('appends multiple records to existing attendance', () => {
      const { setAttendance, bulkAddAttendance } = useAttendanceStore.getState();
      setAttendance([sampleAttendance1]);
      bulkAddAttendance([sampleAttendance2, sampleAttendance3]);
      const { attendanceRecords } = useAttendanceStore.getState();
      expect(attendanceRecords).toHaveLength(3);
      expect(attendanceRecords[1].id).toBe(2);
      expect(attendanceRecords[2].id).toBe(3);
    });

    it('clears error when bulk adding attendance', () => {
      const { setError, bulkAddAttendance } = useAttendanceStore.getState();
      setError('Bulk add error');
      bulkAddAttendance([sampleAttendance1]);
      const { error } = useAttendanceStore.getState();
      expect(error).toBeNull();
    });

    it('handles empty array', () => {
      const { setAttendance, bulkAddAttendance } = useAttendanceStore.getState();
      setAttendance([sampleAttendance1]);
      bulkAddAttendance([]);
      const { attendanceRecords } = useAttendanceStore.getState();
      expect(attendanceRecords).toHaveLength(1);
    });

    it('does not mutate original array', () => {
      const { setAttendance, bulkAddAttendance } = useAttendanceStore.getState();
      setAttendance([sampleAttendance1]);
      const { attendanceRecords: before } = useAttendanceStore.getState();
      bulkAddAttendance([sampleAttendance2]);
      expect(before).toHaveLength(1);
    });
  });

  describe('Loading state', () => {
    it('sets loading to true', () => {
      const { setLoading } = useAttendanceStore.getState();
      setLoading(true);
      const { isLoading } = useAttendanceStore.getState();
      expect(isLoading).toBe(true);
    });

    it('sets loading to false', () => {
      const { setLoading } = useAttendanceStore.getState();
      setLoading(true);
      setLoading(false);
      const { isLoading } = useAttendanceStore.getState();
      expect(isLoading).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('sets error message', () => {
      const { setError } = useAttendanceStore.getState();
      setError('Network failure');
      const { error } = useAttendanceStore.getState();
      expect(error).toBe('Network failure');
    });

    it('clears error with clearError', () => {
      const { setError, clearError } = useAttendanceStore.getState();
      setError('Some error');
      clearError();
      const { error } = useAttendanceStore.getState();
      expect(error).toBeNull();
    });

    it('allows setting error to null', () => {
      const { setError } = useAttendanceStore.getState();
      setError('Error');
      setError(null);
      const { error } = useAttendanceStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('Complex scenarios', () => {
    it('handles full CRUD lifecycle', () => {
      const { setAttendance, addAttendance, updateAttendance, deleteAttendance } = useAttendanceStore.getState();
      
      setAttendance([sampleAttendance1]);
      expect(useAttendanceStore.getState().attendanceRecords).toHaveLength(1);
      
      addAttendance(sampleAttendance2);
      expect(useAttendanceStore.getState().attendanceRecords).toHaveLength(2);
      
      updateAttendance(1, { status: 'Absent' });
      expect(useAttendanceStore.getState().attendanceRecords[0].status).toBe('Absent');
      
      deleteAttendance(2);
      expect(useAttendanceStore.getState().attendanceRecords).toHaveLength(1);
      expect(useAttendanceStore.getState().attendanceRecords[0].id).toBe(1);
    });

    it('combines individual and bulk operations', () => {
      const { addAttendance, bulkAddAttendance } = useAttendanceStore.getState();
      
      addAttendance(sampleAttendance1);
      expect(useAttendanceStore.getState().attendanceRecords).toHaveLength(1);
      
      bulkAddAttendance([sampleAttendance2, sampleAttendance3]);
      expect(useAttendanceStore.getState().attendanceRecords).toHaveLength(3);
    });

    it('maintains error state across operations when not explicitly cleared', () => {
      const { setError, setLoading } = useAttendanceStore.getState();
      setError('Persistent error');
      setLoading(true);
      const { error } = useAttendanceStore.getState();
      expect(error).toBe('Persistent error');
    });

    it('handles filtering attendance by student and course', () => {
      const { setAttendance } = useAttendanceStore.getState();
      setAttendance([sampleAttendance1, sampleAttendance2, sampleAttendance3]);
      
      const studentRecords = useAttendanceStore.getState().attendanceRecords
        .filter(a => a.student_id === 1);
      
      expect(studentRecords).toHaveLength(2);
      expect(studentRecords.every(a => a.student_id === 1)).toBe(true);
    });

    it('handles status transitions', () => {
      const { setAttendance, updateAttendance } = useAttendanceStore.getState();
      setAttendance([sampleAttendance1]);
      
      updateAttendance(1, { status: 'Late' });
      expect(useAttendanceStore.getState().attendanceRecords[0].status).toBe('Late');
      
      updateAttendance(1, { status: 'Excused', notes: 'Approved by admin' });
      const record = useAttendanceStore.getState().attendanceRecords[0];
      expect(record.status).toBe('Excused');
      expect(record.notes).toBe('Approved by admin');
    });
  });
});
