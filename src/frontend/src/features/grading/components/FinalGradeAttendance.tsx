import type { FinalGrade } from '@/types';

interface FinalGradeAttendanceProps {
  attendance: FinalGrade['attendance'];
  t: (key: string, options?: Record<string, unknown>) => string;
  className?: string;
  testId: string;
}

/**
 * The periods a final grade's student has recorded in the course, by status (plan todo 77): a
 * Late counts as attended, not as an absence, and its number is shown for the teacher's own
 * evaluation. Shown on the Grading page's summary and in the Profile's breakdown. Nothing without
 * a period recorded, or from a server older than the counts.
 */
const FinalGradeAttendance = ({ attendance, t, className, testId }: FinalGradeAttendanceProps) => {
  if (!attendance || !(attendance.recorded > 0)) return null;
  return (
    <div className={className} data-testid={testId}>
      <div>
        {t('grades.breakdownAttendance', {
          present: attendance.present,
          late: attendance.late,
          absent: attendance.absent,
          excused: attendance.excused,
        })}
      </div>
      {attendance.late > 0 && <div className="mt-1 text-xs text-gray-600">{t('grades.breakdownLateNote')}</div>}
    </div>
  );
};

export default FinalGradeAttendance;
