import React from 'react';
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
  enrollmentCounts?: Record<number, number>;
}

const ITEM_HEIGHT = 65; // Approximate height of a row including padding

const VirtualStudentList: React.FC<VirtualStudentListProps> = ({
  students,
  onEdit,
  onDelete,
  onView,
  height = 600,
  enrollmentCounts = {}
}) => {
  const { t } = useTranslation();
  const { virtualizer, parentRef } = useVirtualScroll({
    itemCount: students.length,
    itemHeight: ITEM_HEIGHT,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalHeight = virtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0
    ? totalHeight - virtualItems[virtualItems.length - 1].end
    : 0;

  return (
    <div
      ref={parentRef}
      className="overflow-auto border rounded-lg shadow-sm bg-white"
      style={{ height }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <table className="min-w-full divide-y divide-gray-200" style={{
          position: 'absolute',
          top: 0,
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
            {paddingTop > 0 && (
              <tr aria-hidden="true">
                <td colSpan={4} style={{ height: paddingTop }} />
              </tr>
            )}
            {virtualItems.map((item) => {
              const student = students[item.index];
              if (!student) return null;
              return (
                <StudentRow
                  key={student.id}
                  student={student}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onView={onView}
                  enrollmentCount={enrollmentCounts[student.id] || 0}
                />
              );
            })}
            {paddingBottom > 0 && (
              <tr aria-hidden="true">
                <td colSpan={4} style={{ height: paddingBottom }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VirtualStudentList;
