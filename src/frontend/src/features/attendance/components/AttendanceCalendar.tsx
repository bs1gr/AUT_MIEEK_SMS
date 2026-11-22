import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatLocalDate } from '@/utils/date';

export interface AttendanceCalendarProps {
  t: (key: string, options?: Record<string, unknown>) => string;
  previousMonth: () => void;
  nextMonth: () => void;
  monthYear: string;
  dayNamesShort: string[];
  days: (Date | null)[];
  isTeachingDay: (date?: Date | null) => boolean;
  isToday: (date?: Date | null) => boolean;
  isSelected: (date?: Date | null) => boolean | undefined;
  datesWithAttendance: Set<string>;
  setSelectedDate: (date: Date) => void;
}

const AttendanceCalendar = ({
  t,
  previousMonth,
  nextMonth,
  monthYear,
  dayNamesShort,
  days,
  isTeachingDay,
  isToday,
  isSelected,
  datesWithAttendance,
  setSelectedDate,
}: AttendanceCalendarProps) => {
  return (
    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={previousMonth} aria-label={t('previousMonth') || 'Previous month'} title={t('previousMonth') || 'Previous month'} className="p-2 hover:bg-gray-100 rounded"><ChevronLeft size={20} /></button>
        <h3 className="text-lg font-semibold">{monthYear}</h3>
        <button onClick={nextMonth} aria-label={t('nextMonth') || 'Next month'} title={t('nextMonth') || 'Next month'} className="p-2 hover:bg-gray-100 rounded"><ChevronRight size={20} /></button>
      </div>
      <div className="grid grid-cols-7 gap-2 mb-2">
        {dayNamesShort.map((dayName: string, idx: number) => (
          <div key={idx} className="text-center text-xs font-semibold py-1 text-gray-600">
            {dayName}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, idx) => {
          if (!day) {
            return <div key={idx} className="aspect-square" />;
          }

          const teaching = isTeachingDay(day);
          const today = isToday(day);
          const selected = isSelected(day);
          const hasAttendance = datesWithAttendance.has(formatLocalDate(day));
          // Plan todo 72: a date with records opens even when the schedule no longer has its
          // weekday; those records still count in the absence limits.
          const outside = !teaching && hasAttendance;
          const open = teaching || outside;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => open && setSelectedDate(day)}
              disabled={!open}
              title={outside ? t('attendanceOutsideScheduleDayTitle') || 'Attendance recorded on a day outside the schedule' : undefined}
              data-testid={outside ? `calendar-day-outside-${formatLocalDate(day)}` : undefined}
              className={`aspect-square p-2 rounded text-center transition relative ${
                !open ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50' : ''
              } ${
                open && today ? 'ring-2 ring-indigo-500' : ''
              } ${
                open && selected ? 'bg-linear-to-br/srgb from-indigo-600 to-purple-600 text-white font-bold shadow-sm' : ''
              } ${
                teaching && !selected && hasAttendance ? 'bg-green-100 hover:bg-green-200 text-gray-700 font-semibold' : ''
              } ${
                teaching && !selected && !hasAttendance ? 'bg-gray-50 hover:bg-indigo-100 text-gray-700' : ''
              } ${
                outside && !selected ? 'bg-amber-100 hover:bg-amber-200 text-gray-700 font-semibold border border-amber-300' : ''
              }`}
            >
              {day.getDate()}
              {hasAttendance && !selected && (
                <span
                  className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full ${outside ? 'bg-amber-600' : 'bg-green-600'}`}
                ></span>
              )}
            </button>
          );
        })}
      </div>
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
          <span>{t('attendanceRecorded') || 'Attendance recorded'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-gray-50 border border-gray-300"></div>
          <span>{t('noAttendanceYet') || 'No attendance yet'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-amber-100 border border-amber-300"></div>
          <span>{t('attendanceOutsideScheduleLegend') || 'Recorded on a day the schedule no longer has'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-linear-to-br/srgb from-indigo-600 to-purple-600"></div>
          <span>{t('selectedDate') || 'Selected date'}</span>
        </div>
      </div>
    </div>
  );
};

export default AttendanceCalendar;
