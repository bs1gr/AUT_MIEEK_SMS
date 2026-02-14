import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Edit, Trash2, Eye } from 'lucide-react';
import { Student } from '@/types/student';

interface StudentRowProps {
  student: Student;
  onEdit: (student: Student) => void;
  onDelete: (id: number) => void;
  onView: (id: number) => void;
  enrollmentCount?: number;
}

const StudentRow = memo(({ student, onEdit, onDelete, onView, enrollmentCount = 0 }: StudentRowProps) => {
  const { t } = useTranslation();

  const fullName = `${student.first_name} ${student.last_name}`.trim();

  // Determine inactive status reason
  const getInactiveReason = () => {
    if (!student.is_active) {
      if (enrollmentCount === 0) {
        return t('noCoursesEnrolled', { ns: 'students' });
      }
      return t('abandonedEnrollment', { ns: 'students' });
    }
    return null;
  };

  const inactiveReason = getInactiveReason();

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {student.student_id}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-900">{fullName}</span>
          {inactiveReason && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <span>{inactiveReason}</span>
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {student.email}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {enrollmentCount} {t('enrolled', { ns: 'students' })}
          </span>
          <div className="flex space-x-3">
            <button
              onClick={() => onView(student.id)}
              className="text-blue-600 hover:text-blue-900"
              aria-label={t('view', { ns: 'common' })}
            >
              <Eye size={18} />
            </button>
            <button
              onClick={() => onEdit(student)}
              className="text-indigo-600 hover:text-indigo-900"
              aria-label={t('edit', { ns: 'common' })}
            >
              <Edit size={18} />
            </button>
            <button
              onClick={() => onDelete(student.id)}
              className="text-red-600 hover:text-red-900"
              aria-label={t('delete', { ns: 'common' })}
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}, (prev, next) => {
  // Re-render only when key display fields change
  return prev.student.id === next.student.id &&
         prev.student.student_id === next.student.student_id &&
         prev.student.first_name === next.student.first_name &&
         prev.student.last_name === next.student.last_name &&
         prev.student.email === next.student.email &&
         prev.student.is_active === next.student.is_active &&
         prev.enrollmentCount === next.enrollmentCount;
});

StudentRow.displayName = 'StudentRow';

export default StudentRow;
