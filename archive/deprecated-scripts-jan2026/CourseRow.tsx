import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Edit, Trash2, Eye } from 'lucide-react';

interface Course {
  id: number;
  course_name: string;
  course_code: string;
  credits: number;
  description?: string;
}

interface CourseRowProps {
  course: Course;
  onEdit: (course: Course) => void;
  onDelete: (id: number) => void;
  onView: (id: number) => void;
}

const CourseRow = memo(({ course, onEdit, onDelete, onView }: CourseRowProps) => {
  const { t } = useTranslation();

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {course.course_code}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {course.course_name}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {course.credits}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div className="flex space-x-3">
          <button
            onClick={() => onView(course.id)}
            className="text-blue-600 hover:text-blue-900"
            aria-label={t('common.view')}
          >
            <Eye size={18} />
          </button>
          <button
            onClick={() => onEdit(course)}
            className="text-indigo-600 hover:text-indigo-900"
            aria-label={t('common.edit')}
          >
            <Edit size={18} />
          </button>
          <button
            onClick={() => onDelete(course.id)}
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
  return prev.course.id === next.course.id &&
         prev.course.course_code === next.course.course_code &&
         prev.course.course_name === next.course.course_name;
});

CourseRow.displayName = 'CourseRow';

export default CourseRow;
