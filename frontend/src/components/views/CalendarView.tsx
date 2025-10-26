import React from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';

type DaySchedule = { periods: number; start_time: string; duration: number };

type Course = {
  id: number;
  course_code: string;
  course_name: string;
  teaching_schedule?: Record<string, DaySchedule>;
};

type Props = {
  courses: Course[];
};

const CalendarView: React.FC<Props> = ({ courses }) => {
  const { t } = useLanguage() as any;

  // Days with keys for data lookup and translated display names
  const days: { key: string; displayName: string }[] = [
    { key: 'Monday', displayName: t('monday') },
    { key: 'Tuesday', displayName: t('tuesday') },
    { key: 'Wednesday', displayName: t('wednesday') },
    { key: 'Thursday', displayName: t('thursday') },
    { key: 'Friday', displayName: t('friday') },
  ];

  const byDay: Record<string, { course: Course; sched: DaySchedule }[]> = {};
  for (const d of days) byDay[d.key] = [];

  courses.forEach((c) => {
    const sched: any = (c as any).teaching_schedule || {};
    if (Array.isArray(sched)) {
      // List of entries with .day and config
      sched.forEach((entry: any) => {
        const day = entry?.day;
        if (!day || !byDay[day]) return;
        const cfg: DaySchedule = { periods: entry.periods, start_time: entry.start_time, duration: entry.duration };
        byDay[day].push({ course: c, sched: cfg });
      });
    } else if (typeof sched === 'object') {
      Object.keys(sched).forEach((day) => {
        if (!byDay[day]) return;
        byDay[day].push({ course: c, sched: (sched as Record<string, DaySchedule>)[day] });
      });
    }
  });

  Object.keys(byDay).forEach((day) => {
    byDay[day].sort((a, b) => (a.sched.start_time > b.sched.start_time ? 1 : -1));
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
          <CalendarIcon size={22} className="text-indigo-600" />
          <span>{t('teachingSchedule')}</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {days.map((d) => (
          <div key={d.key} className="bg-white rounded-xl shadow border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-gray-800">{d.displayName}</div>
              <div className="text-sm text-gray-500">
                {byDay[d.key].length} {t('classes')}
              </div>
            </div>
            {byDay[d.key].length === 0 ? (
              <div className="text-sm text-gray-500">{t('noClasses')}</div>
            ) : (
              <div className="space-y-2">
                {byDay[d.key].map(({ course, sched }, idx) => (
                  <div key={course.id + '-' + idx} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-800">
                        {course.course_code} - {course.course_name}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center space-x-1">
                        <Clock size={14} />
                        <span>
                          {sched.start_time} · {sched.periods} × {sched.duration}m
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarView;
