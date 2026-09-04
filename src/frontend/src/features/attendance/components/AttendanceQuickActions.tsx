import { Users, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

export interface AttendanceQuickActionsProps {
  t: (key: string, options?: Record<string, unknown>) => string;
  selectAllAttendance: (status: string) => void;
  clearAllAttendance: () => void;
}

const AttendanceQuickActions = ({ t, selectAllAttendance, clearAllAttendance }: AttendanceQuickActionsProps) => {
  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl shadow p-6 border border-indigo-200">
      <div className="flex items-center gap-2 mb-3">
        <Users size={20} className="text-indigo-600" />
        <h4 className="font-semibold">{t('quickActions') || 'Quick Actions'}</h4>
      </div>
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        <button onClick={() => selectAllAttendance('Present')} className="w-full sm:w-auto px-2 py-1.5 text-xs sm:text-sm rounded bg-green-500 text-white flex items-center justify-center sm:justify-start gap-1 sm:gap-2"><CheckCircle size={14} className="flex-shrink-0" /> {t('present') || 'Present'}</button>
        <button onClick={() => selectAllAttendance('Absent')} className="w-full sm:w-auto px-2 py-1.5 text-xs sm:text-sm rounded bg-red-500 text-white flex items-center justify-center sm:justify-start gap-1 sm:gap-2"><XCircle size={14} className="flex-shrink-0" /> {t('absent') || 'Absent'}</button>
        <button onClick={() => selectAllAttendance('Late')} className="w-full sm:w-auto px-2 py-1.5 text-xs sm:text-sm rounded bg-yellow-500 text-white flex items-center justify-center sm:justify-start gap-1 sm:gap-2"><Clock size={14} className="flex-shrink-0" /> {t('late') || 'Late'}</button>
        <button onClick={() => selectAllAttendance('Excused')} className="w-full sm:w-auto px-2 py-1.5 text-xs sm:text-sm rounded bg-blue-500 text-white flex items-center justify-center sm:justify-start gap-1 sm:gap-2"><AlertCircle size={14} className="flex-shrink-0" /> {t('excused') || 'Excused'}</button>
        <button onClick={clearAllAttendance} className="w-full sm:w-auto col-span-2 sm:col-span-1 px-2 py-1.5 text-xs sm:text-sm rounded bg-gray-700 text-white flex items-center justify-center sm:justify-start gap-1 sm:gap-2 hover:bg-gray-800">{t('clear') || 'Clear'}</button>
      </div>
    </div>
  );
};

export default AttendanceQuickActions;
