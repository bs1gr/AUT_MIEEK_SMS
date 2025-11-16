import React from 'react';
import { useLanguage } from '@/LanguageContext';
import type { StudentStats } from './studentTypes';

interface AttendanceDetailsProps {
  attendance?: StudentStats['attendance'];
}

const AttendanceDetails: React.FC<AttendanceDetailsProps> = ({ attendance }) => {
  const { t } = useLanguage();

  if (!attendance) {
    return (
      <div className="border rounded-lg p-4 bg-white shadow-md">
        <div className="font-semibold text-gray-800 mb-3">{t('attendanceDetails') || 'Attendance Details'}</div>
        <p className="text-sm text-gray-500">{t('loading') || 'Loading...'}</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-white shadow-md">
      <div className="font-semibold text-gray-800 mb-3">{t('attendanceDetails') || 'Attendance Details'}</div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center py-2 border-b">
          <span className="text-gray-600">{t('totalClasses') || 'Total Classes'}:</span>
          <span className="font-semibold text-gray-800">{attendance.total}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b">
          <span className="font-semibold text-green-600">{t('present')}:</span>
          <span className="font-semibold text-green-600">{attendance.present}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b">
          <span className="font-semibold text-red-600">{t('absent')}:</span>
          <span className="font-semibold text-red-600">{attendance.absent}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b">
          <span className="font-semibold text-yellow-600">{t('late')}:</span>
          <span className="font-semibold text-yellow-600">{attendance.late}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b">
          <span className="font-semibold text-blue-600">{t('excused')}:</span>
          <span className="font-semibold text-blue-600">{attendance.excused}</span>
        </div>
        <div className="flex justify-between items-center py-2 bg-indigo-50 rounded mt-2">
          <span className="font-semibold text-gray-800">{t('attendanceRate') || 'Attendance Rate'}:</span>
          <span className="font-bold text-indigo-600 text-lg">{attendance.attendanceRate}%</span>
        </div>
      </div>
    </div>
  );
};

export default AttendanceDetails;
