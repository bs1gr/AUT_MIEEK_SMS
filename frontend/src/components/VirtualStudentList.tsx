import React, { useRef } from 'react';
import { useVirtualScroll } from '@/hooks/useVirtualScroll';
import StudentRow from '@/features/students/StudentRow';
import { Student } from '@/types/student';
import { useTranslation } from 'react-i18next';

interface VirtualStudentListProps {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (id: number) => void;
  onView: (id: number) => void;
  height?: number;
}

const ITEM_HEIGHT = 65; // Approximate height of a row including padding

const VirtualStudentList: React.FC<VirtualStudentListProps> = ({
  students,
  onEdit,
  onDelete,
  onView,
  height = 600
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  const { startIndex, endIndex, offsetY, totalHeight, onScroll } = useVirtualScroll({
    itemHeight: ITEM_HEIGHT,
    containerHeight: height,
    itemsCount: students.length,
  });

  const visibleStudents = students.slice(startIndex, endIndex);

  return (
    <div
      ref={containerRef}
      className="overflow-auto border rounded-lg shadow-sm bg-white"
      style={{ height }}
      onScroll={onScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <table className="min-w-full divide-y divide-gray-200" style={{
          position: 'absolute',
          top: offsetY,
          left: 0,
          width: '100%'
        }}>
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('studentId', { ns: 'students' })}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('name', { ns: 'students' })}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('email', { ns: 'students' })}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions', { ns: 'common' })}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {visibleStudents.map((student) => (
              <StudentRow
                key={student.id}
                student={student}
                onEdit={onEdit}
                onDelete={onDelete}
                onView={onView}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VirtualStudentList;
