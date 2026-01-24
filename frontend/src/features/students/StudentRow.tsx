import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Edit, Trash2, Eye } from 'lucide-react';
import { Student } from '@/types/student';

interface StudentRowProps {
  student: Student;
  onEdit: (student: Student) => void;
  onDelete: (id: number) => void;
  onView: (id: number) => void;
}

const StudentRow = memo(({ student, onEdit, onDelete, onView }: StudentRowProps) => {
  const { t } = useTranslation();

  const fullName = `${student.first_name} ${student.last_name}`.trim();

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {student.student_id}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {fullName}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {student.email}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div className="flex space-x-3">
          <button
            onClick={() => onView(student.id)}
            className="text-blue-600 hover:text-blue-900"
            aria-label={t('common.view')}
          >
            <Eye size={18} />
          </button>
          <button
            onClick={() => onEdit(student)}
            className="text-indigo-600 hover:text-indigo-900"
            aria-label={t('common.edit')}
          >
            <Edit size={18} />
          </button>
          <button
            onClick={() => onDelete(student.id)}
            className="text-red-600 hover:text-red-900"
            aria-label={t('common.delete')}
          >
            <Trash2 size={18} />
          </button>
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
         prev.student.email === next.student.email;
});

StudentRow.displayName = 'StudentRow';

export default StudentRow;
