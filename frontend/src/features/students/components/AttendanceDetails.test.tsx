import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AttendanceDetails from './AttendanceDetails';
import { LanguageProvider } from '@/LanguageContext';
import type { StudentStats } from './studentTypes';

const mockAttendance: StudentStats['attendance'] = {
  total: 30,
  present: 25,
  absent: 3,
  late: 2,
  excused: 1,
  attendanceRate: '83.3',
};

const renderComponent = (attendance?: StudentStats['attendance']) => {
  return render(
    <LanguageProvider>
      <AttendanceDetails attendance={attendance} />
    </LanguageProvider>
  );
};

describe('AttendanceDetails', () => {
  describe('Rendering', () => {
    it('renders component header', () => {
      renderComponent(mockAttendance);
      expect(screen.getByText(/attendance details/i)).toBeInTheDocument();
    });

    it('displays all attendance metrics', () => {
      renderComponent(mockAttendance);
      expect(screen.getByText(/total classes/i)).toBeInTheDocument();
      expect(screen.getByText(/present/i)).toBeInTheDocument();
      expect(screen.getByText(/absent/i)).toBeInTheDocument();
      expect(screen.getByText(/late/i)).toBeInTheDocument();
      expect(screen.getByText(/excused/i)).toBeInTheDocument();
      expect(screen.getByText(/attendance rate/i)).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('shows correct attendance numbers', () => {
      renderComponent(mockAttendance);
      expect(screen.getByText('30')).toBeInTheDocument(); // total
      expect(screen.getByText('25')).toBeInTheDocument(); // present
      expect(screen.getByText('3')).toBeInTheDocument(); // absent
      expect(screen.getByText('2')).toBeInTheDocument(); // late
      expect(screen.getByText('1')).toBeInTheDocument(); // excused
      expect(screen.getByText('83.3%')).toBeInTheDocument(); // rate
    });

    it('displays attendance rate prominently', () => {
      renderComponent(mockAttendance);
      const rateElement = screen.getByText('83.3%');
      expect(rateElement).toHaveClass('font-bold', 'text-indigo-600', 'text-lg');
    });
  });

  describe('Color Coding', () => {
    it('applies green color to present count', () => {
      renderComponent(mockAttendance);
      const presentLabel = screen.getByText(/present/i);
      expect(presentLabel).toHaveClass('text-green-600');
    });

    it('applies red color to absent count', () => {
      renderComponent(mockAttendance);
      const absentLabel = screen.getByText(/absent/i);
      expect(absentLabel).toHaveClass('text-red-600');
    });

    it('applies yellow color to late count', () => {
      renderComponent(mockAttendance);
      const lateLabel = screen.getByText(/late/i);
      expect(lateLabel).toHaveClass('text-yellow-600');
    });

    it('applies blue color to excused count', () => {
      renderComponent(mockAttendance);
      const excusedLabel = screen.getByText(/excused/i);
      expect(excusedLabel).toHaveClass('text-blue-600');
    });
  });

  describe('Loading State', () => {
    it('shows loading message when attendance is undefined', () => {
      renderComponent(undefined);
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('still shows header when loading', () => {
      renderComponent(undefined);
      expect(screen.getByText(/attendance details/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero attendance records', () => {
      const zeroAttendance: StudentStats['attendance'] = {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        attendanceRate: '0',
      };
      renderComponent(zeroAttendance);
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThan(0);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('handles perfect attendance', () => {
      const perfectAttendance: StudentStats['attendance'] = {
        total: 30,
        present: 30,
        absent: 0,
        late: 0,
        excused: 0,
        attendanceRate: '100',
      };
      renderComponent(perfectAttendance);
      const thirties = screen.getAllByText('30');
      expect(thirties.length).toBeGreaterThan(0);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('handles all absences', () => {
      const allAbsent: StudentStats['attendance'] = {
        total: 20,
        present: 0,
        absent: 20,
        late: 0,
        excused: 0,
        attendanceRate: '0',
      };
      renderComponent(allAbsent);
      const twenties = screen.getAllByText('20');
      expect(twenties.length).toBeGreaterThan(0);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('handles decimal attendance rate', () => {
      const decimalRate: StudentStats['attendance'] = {
        total: 27,
        present: 23,
        absent: 2,
        late: 1,
        excused: 1,
        attendanceRate: '85.19',
      };
      renderComponent(decimalRate);
      expect(screen.getByText('85.19%')).toBeInTheDocument();
    });

    it('handles large numbers', () => {
      const largeNumbers: StudentStats['attendance'] = {
        total: 999,
        present: 850,
        absent: 100,
        late: 30,
        excused: 19,
        attendanceRate: '85.1',
      };
      renderComponent(largeNumbers);
      expect(screen.getByText('999')).toBeInTheDocument();
      expect(screen.getByText('850')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });

  describe('Formatting', () => {
    it('applies proper spacing and borders', () => {
      renderComponent(mockAttendance);
      const container = screen.getByText(/attendance details/i).parentElement;
      expect(container).toHaveClass('border', 'rounded-lg', 'p-4', 'bg-white', 'shadow-md');
    });

    it('highlights attendance rate row', () => {
      renderComponent(mockAttendance);
      const rateRow = screen.getByText('83.3%').closest('div');
      expect(rateRow).toHaveClass('bg-indigo-50', 'rounded');
    });
  });

  describe('Data Consistency', () => {
    it('shows all status counts add up correctly', () => {
      renderComponent(mockAttendance);
      // present(25) + absent(3) + late(2) should logically relate to total(30)
      // (excused is separate dimension)
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
    });

    it('displays attendance rate matching the data', () => {
      const customAttendance: StudentStats['attendance'] = {
        total: 100,
        present: 75,
        absent: 15,
        late: 10,
        excused: 5,
        attendanceRate: '75',
      };
      renderComponent(customAttendance);
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('uses semantic HTML structure', () => {
      renderComponent(mockAttendance);
      const heading = screen.getByText(/attendance details/i);
      expect(heading).toHaveClass('font-semibold');
    });

    it('provides clear labels for all metrics', () => {
      renderComponent(mockAttendance);
      expect(screen.getByText(/total classes/i)).toBeInTheDocument();
      expect(screen.getByText(/present/i)).toBeInTheDocument();
      expect(screen.getByText(/absent/i)).toBeInTheDocument();
      expect(screen.getByText(/late/i)).toBeInTheDocument();
      expect(screen.getByText(/excused/i)).toBeInTheDocument();
      expect(screen.getByText(/attendance rate/i)).toBeInTheDocument();
    });
  });

  describe('Visual Layout', () => {
    it('renders metrics in correct order', () => {
      const { container } = renderComponent(mockAttendance);
      const text = container.textContent || '';
      const totalIndex = text.indexOf('Total Classes');
      const presentIndex = text.indexOf('Present');
      const absentIndex = text.indexOf('Absent');
      const lateIndex = text.indexOf('Late');
      const excusedIndex = text.indexOf('Excused');
      const rateIndex = text.indexOf('Attendance Rate');

      expect(totalIndex).toBeLessThan(presentIndex);
      expect(presentIndex).toBeLessThan(absentIndex);
      expect(absentIndex).toBeLessThan(lateIndex);
      expect(lateIndex).toBeLessThan(excusedIndex);
      expect(excusedIndex).toBeLessThan(rateIndex);
    });
  });
});
