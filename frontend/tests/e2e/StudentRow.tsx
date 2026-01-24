import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Student } from '@/types';

interface StudentRowProps {
  student: Student;
  onEdit: (student: Student) => void;
  onDelete: (id: number) => void;
  onView: (id: number) => void;
}

const StudentRow = memo(({ student, onEdit, onDelete, onView }: StudentRowProps) => {
  const { t } = useTranslation();

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {student.first_name} {student.last_name}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {student.email}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div className="flex space-x-3">
          <button
            onClick={() => onView(student.id)}
            className="text-blue-600 hover:text-blue-900 font-medium"
            aria-label={t('common.view')}
          >
            {t('common.view')}
          </button>
          <button
            onClick={() => onEdit(student)}
            className="text-indigo-600 hover:text-indigo-900 font-medium"
            aria-label={t('common.edit')}
          >
            {t('common.edit')}
          </button>
          <button
            onClick={() => onDelete(student.id)}
            className="text-red-600 hover:text-red-900 font-medium"
            aria-label={t('common.delete')}
          >
            {t('common.delete')}
          </button>
        </div>
      </td>
    </tr>
  );
});

StudentRow.displayName = 'StudentRow';

export default StudentRow;
