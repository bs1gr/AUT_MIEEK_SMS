import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users, BookOpen, Calendar, Star, TrendingUp, CheckCircle, Award, Target, ArrowRight, XCircle
} from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import {
  gpaToPercentage,
  gpaToGreekScale,
  getGreekGradeColor,
  getGreekGradeBgColor,
  getGreekGradeDescription,
  formatAllGrades,
  getLetterGrade,
} from '../../utils/gradeUtils';
import { getLocalizedCategory } from '../../utils/categoryLabels';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api/v1';

type StatCardProps = { title: string; value: any; icon: any; color: 'indigo'|'purple'|'green'|'yellow'; subtitle?: string };
const StatCard = ({ title, value, icon: Icon, color, subtitle }: StatCardProps) => {
  const colorClasses = {
    indigo: 'from-indigo-500 to-indigo-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`bg-gradient-to-br ${colorClasses[color]} p-4 rounded-xl shadow-lg`}>
          <Icon className="text-white" size={24} />
        </div>
      </div>
    </div>
  );
};

type EnhancedDashboardProps = { students: any[]; courses: any[]; stats: { totalStudents: number; activeStudents: number; totalCourses: number }, onOpenAnalytics?: () => void };
const EnhancedDashboardView = ({ students, courses, stats, onOpenAnalytics }: EnhancedDashboardProps) => {
  const { t } = useLanguage() as any;
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMore, setShowMore] = useState(false);
  const [avgClassSize, setAvgClassSize] = useState<number>(0);
  const [activeCourseCount, setActiveCourseCount] = useState<number>(0);
  const [dataLoaded, setDataLoaded] = useState(false);
  const analyticsRef = React.useRef<HTMLDivElement>(null);

  // Memoize students length to prevent unnecessary re-renders
  const studentsCount = useMemo(() => students.length, [students.length]);
  const coursesCount = useMemo(() => courses.length, [courses.length]);

  // Load data only once when component mounts or when student/course COUNT changes
  useEffect(() => {
    if (!dataLoaded && studentsCount > 0) {
      loadDashboardData();
      setDataLoaded(true);
    }
  }, [studentsCount, dataLoaded]);

  useEffect(() => {
    if (coursesCount > 0) {
      loadEnrollmentStats();
    }
  }, [coursesCount]);

  const loadEnrollmentStats = useCallback(async () => {
    if (courses.length === 0) {
      setAvgClassSize(0);
      setActiveCourseCount(0);
      return;
    }
    try {
      // Fetch limited enrollments with count optimization
      const response = await fetch(`${API_BASE_URL}/enrollments/?limit=500`);
      const enrollments = await response.json();

      if (Array.isArray(enrollments) && enrollments.length > 0) {
        // Count enrollments per course using reduce (more efficient)
        const enrollmentCounts = enrollments.reduce((acc: { [key: number]: number }, enrollment: any) => {
          if (enrollment.course_id) {
            acc[enrollment.course_id] = (acc[enrollment.course_id] || 0) + 1;
          }
          return acc;
        }, {});

        // Calculate average and active course count
        const coursesWithEnrollments = Object.keys(enrollmentCounts).length;
        setActiveCourseCount(coursesWithEnrollments);
        
        if (coursesWithEnrollments > 0) {
          const totalEnrolled = Object.values(enrollmentCounts).reduce((sum, count) => sum + count, 0);
          const avg = totalEnrolled / coursesWithEnrollments;
          setAvgClassSize(Math.round(avg));
        } else {
          setAvgClassSize(0);
        }
      } else {
        setAvgClassSize(0);
        setActiveCourseCount(0);
      }
    } catch (e) {
      console.error('Error loading enrollment stats:', e);
      setAvgClassSize(0);
      setActiveCourseCount(0);
    }
  }, [courses.length]);

  const loadDashboardData = useCallback(async () => {
    if (students.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Limit to first 5 students for better performance
      const studentPromises = students.slice(0, 5).map(async (student) => {
        try {
          // Add timeout to prevent hanging requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(
            `${API_BASE_URL}/analytics/student/${student.id}/all-courses-summary`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);

          const data = await response.json();
          return {
            ...student,
            overallGPA: data.overall_gpa || 0,
            totalCourses: data.courses?.length || 0,
            totalCredits: data.total_credits || 0
          };
        } catch (error) {
          // Silent fail for aborted requests
          return { ...student, overallGPA: 0, totalCourses: 0, totalCredits: 0 };
        }
      });

      const studentsWithGPA = await Promise.all(studentPromises);
      const sorted = studentsWithGPA
        .filter((s) => s.overallGPA > 0)
        .sort((a, b) => b.overallGPA - a.overallGPA)
        .slice(0, 5);

      setTopPerformers(sorted);
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoading(false);
    }
  }, [students.length]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800">{t('dashboardTitle')}</h2>
        <button
          type="button"
          onClick={() => {
            if (!showMore) {
              setShowMore(true);
              // Scroll to analytics section after state update
              setTimeout(() => {
                analyticsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 100);
            } else {
              setShowMore(false);
              // Scroll back to top
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center space-x-2 transition-all hover:scale-105"
        >
          <span>{showMore ? t('hideDetailedAnalytics') : t('viewDetailedAnalytics')}</span>
          <ArrowRight size={20} className={`transition-transform ${showMore ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* Main Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title={t('totalStudents')} value={stats.totalStudents || 0} icon={Users} color="indigo" subtitle={`${stats.activeStudents || 0} ${t('active').toLowerCase()}`} />
        <StatCard title={t('activeCourses')} value={activeCourseCount} icon={BookOpen} color="purple" subtitle={t('withEnrollments')} />
        <StatCard title={t('avgClassSize')} value={avgClassSize} icon={TrendingUp} color="green" subtitle={t('studentsPerCourse')} />
        <StatCard title={t('enrollmentRate')} value={stats.totalStudents ? `${Math.round((stats.activeStudents / stats.totalStudents) * 100)}%` : '0%'} icon={CheckCircle} color="yellow" subtitle={t('activeEnrollment')} />
      </div>

      {/* Analytics Section */}
      {showMore && (
        <div ref={analyticsRef}>
          {/* Loading */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-gray-500 mt-2 text-sm">{t('loadingStudentData')}</p>
            </div>
          )}

          {/* Top Performers (grid) */}
          {!loading && topPerformers.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-2"><Star className="text-yellow-500" size={20} /><span>{t('topPerformers')}</span></h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topPerformers.map((s: any, idx: number) => {
                  const gpa = Number(s.overallGPA || 0);
                  const formatted: any = formatAllGrades(gpa);
                  const pct = gpaToPercentage(gpa);
                  const letter = getLetterGrade(pct);
                  const arithmeticValue = (pct / 100 * 100).toFixed(0); // Keep one decimal for precision
                  return (
                    <div key={idx} className="border rounded-xl p-4 hover:shadow transition">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-800">{s.first_name} {s.last_name}</div>
                          <div className="text-sm text-gray-500">{s.student_id}</div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <div className="text-3xl font-bold text-indigo-600">{formatted.percentage}%</div>
                            <div className="text-xs text-gray-500">{t('percentage')}</div>
                          </div>
                          <div className="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg px-4 py-2 border-2 border-indigo-300">
                            <div className="text-2xl font-bold text-indigo-700">{arithmeticValue}</div>
                            <div className="text-xs text-indigo-600 font-semibold">/ 100</div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-gray-600">GPA: {formatted.gpa} • {formatted.greekGrade}/20 • {letter}</div>
                      <div className={`mt-1 text-xs ${formatted.color}`}>{formatted.description}</div>
                      <div className="mt-2 text-sm text-gray-600 flex items-center space-x-2"><Award size={16} className="text-indigo-500" /><span>{s.totalCourses || 0} {t('courses') || 'courses'}</span></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Two-Column: Compact Top Performers + Active Courses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6"><h3 className="text-xl font-bold text-gray-800 flex items-center space-x-2"><Award size={24} className="text-yellow-500" /><span>{t('topPerformingStudents')}</span></h3><span className="text-sm text-gray-500">{t('byGPA')}</span></div>
              {topPerformers.length === 0 ? (
                <div className="text-center py-8 text-gray-500"><Target size={48} className="mx-auto mb-2 opacity-30" /><p>{t('noPerformanceData')}</p><p className="text-sm mt-1">{t('studentsNeedGrades')}</p></div>
              ) : (
                <div className="space-y-3">
                  {topPerformers.map((s: any, index: number) => {
                    const gpa = Number(s.overallGPA || 0);
                    const formatted: any = formatAllGrades(gpa);
                    const pct = gpaToPercentage(gpa);
                    const letter = getLetterGrade(pct);
                    const arithmeticValue = (pct / 100 * 100).toFixed(0); // No decimals for compact view
                    return (
                      <div key={s.id || index} className={`p-4 rounded-lg border-l-4 ${index === 0 ? 'bg-yellow-50 border-yellow-500' : index === 1 ? 'bg-gray-50 border-gray-400' : index === 2 ? 'bg-orange-50 border-orange-400' : 'bg-blue-50 border-blue-400'} hover:shadow-md transition-shadow`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800">{s.first_name} {s.last_name}</p>
                            <p className="text-sm text-gray-500">{s.totalCourses || 0} {t('courses') || 'courses'} • {s.totalCredits || 0} {t('credits') || 'credits'}</p>
                            <p className={`text-xs ${formatted.color}`}>{formatted.description} • {formatted.greekGrade}/20 • {letter}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-right">
                              <p className="text-3xl font-bold text-indigo-600">{formatted.percentage}%</p>
                              <p className="text-xs text-gray-500">GPA: {formatted.gpa}</p>
                            </div>
                            <div className="bg-white rounded-lg px-8 py-3 border-2 border-indigo-300 shadow-sm">
                              <p className="text-xl font-bold text-indigo-700">{arithmeticValue}</p>
                              <p className="text-xs text-indigo-700 font-semibold">/ 100</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center space-x-2"><BookOpen size={24} className="text-purple-600" /><span>{t('activeCourses') || 'Active Courses'}</span></h3>
              <div className="space-y-3">
                {courses && courses.length > 0 ? (
                  courses.slice(0, 6).map((course: any) => (
                    <div key={course.id} className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-800">{course.course_code}</p>
                          <p className="text-sm text-gray-600 mt-1">{course.course_name}</p>
                          {course.semester && (<p className="text-xs text-gray-500 mt-1">{course.semester}</p>)}
                        </div>
                        <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium">{course.credits || 0} {t('creditsAbbr') || 'cr'}</span>
                      </div>
                      {Array.isArray(course.evaluation_rules) && course.evaluation_rules.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-purple-200">
                          <p className="text-xs text-gray-600 flex items-center space-x-1">
                            <CheckCircle size={12} className="text-green-600" />
                            <span>{t('evaluationRules') || 'Evaluation rules'}:</span>
                          </p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {(course.evaluation_rules || []).slice(0, 6).map((r: any, idx: number) => {
                              const w = parseFloat(String(r?.weight ?? ''));
                              const weightStr = Number.isFinite(w) ? `${Math.round(w)}%` : '';
                              const localizedCategory = getLocalizedCategory(String(r?.category || ''), t);
                              return (
                                <span key={`${course.id}-rule-${idx}`} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-white/70 border border-purple-200 text-purple-800">
                                  <span className="font-medium">{localizedCategory || '-'}</span>
                                  {weightStr && <span className="ml-1 text-purple-600">{weightStr}</span>}
                                </span>
                              );
                            })}
                          </div>
                          {course.evaluation_rules.length > 6 && (
                            <p className="text-[11px] text-gray-500 mt-1">+{course.evaluation_rules.length - 6} more</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">{t('noCoursesAvailable') || 'No courses available'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white"><div className="flex items-center space-x-3 mb-4"><Calendar size={24} /><h4 className="font-bold text-lg">{t('thisWeek')}</h4></div><p className="text-3xl font-bold mb-2">{(students || []).filter((s: any) => s.is_active !== false).length}</p><p className="text-sm opacity-90">{t('activeStudents')}</p></div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white"><div className="flex items-center space-x-3 mb-4"><Star size={24} /><h4 className="font-bold text-lg">{t('assessments')}</h4></div><p className="text-3xl font-bold mb-2">{topPerformers.reduce((sum: number, s: any) => sum + (s.totalCourses || 0), 0)}</p><p className="text-sm opacity-90">{t('totalEnrollments')}</p></div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white"><div className="flex items-center space-x-3 mb-4"><TrendingUp size={24} /><h4 className="font-bold text-lg">{t('performance')}</h4></div>{topPerformers.length > 0 ? (() => { const avgGPA = topPerformers.reduce((sum: number, s: any) => sum + (s.overallGPA || 0), 0) / topPerformers.length; const avgPct = (avgGPA / 4) * 100; return (<><div className="flex items-baseline space-x-2 mb-1"><p className="text-3xl font-bold">{avgPct.toFixed(1)}%</p><p className="text-sm opacity-75">• GPA {avgGPA.toFixed(2)}</p></div><p className="text-sm opacity-90">{t('averageGPATop')}</p></>); })() : (<><p className="text-3xl font-bold mb-2">0.0%</p><p className="text-sm opacity-90">{t('averageGPATop')}</p></>)}
            </div>
          </div>

          {/* Recent Students */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center space-x-2"><Users size={24} className="text-indigo-600" /><span>{t('recentStudents')}</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(students || []).slice(0, 6).map((student: any) => (
                <div key={student.id} className="p-4 bg-gray-50 rounded-lg hover:bg-indigo-50 transition-colors border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">{String(student.first_name || '').charAt(0)}{String(student.last_name || '').charAt(0)}</div>
                    <div className="flex-1"><p className="font-semibold text-gray-800">{student.first_name} {student.last_name}</p><p className="text-sm text-gray-500">{student.student_id}</p>{student.enrollment_date && (<p className="text-xs text-gray-400 mt-1">{t('enrolled') || 'Enrolled'} {new Date(student.enrollment_date).toLocaleDateString()}</p>)}</div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200"><span className={`inline-flex items-center space-x-1 text-xs font-medium ${student.is_active !== false ? 'text-green-600' : 'text-red-600'}`}><CheckCircle size={14} /><span>{student.is_active !== false ? (t('active') || 'Active') : (t('inactive') || 'Inactive')}</span></span></div>
                </div>
              ))}
            </div>
          </div>

          {/* Year of Study Analytics */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center space-x-2"><Users size={24} className="text-green-600" /><span>{t('yearAnalytics')}</span></h3>
            {(() => {
              // Calculate year distribution
              const yearGroups: Record<string, number> = {};
              (students || []).forEach((student: any) => {
                const year = student.study_year || 0;
                const yearLabel = year === 0 ? t('unknownYear') : `${t('year')} ${year}`;
                yearGroups[yearLabel] = (yearGroups[yearLabel] || 0) + 1;
              });

              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(yearGroups).sort().map(([yearLabel, count], idx) => (
                    <div key={yearLabel} className={`p-4 rounded-xl border-2 ${idx === 0 ? 'bg-blue-50 border-blue-300' : idx === 1 ? 'bg-green-50 border-green-300' : idx === 2 ? 'bg-yellow-50 border-yellow-300' : 'bg-purple-50 border-purple-300'}`}>
                      <p className="text-sm font-medium text-gray-600">{yearLabel}</p>
                      <p className="text-3xl font-bold mt-2 text-gray-800">{count}</p>
                      <p className="text-xs text-gray-500 mt-1">{((count / (students || []).length) * 100).toFixed(1)}% {t('totalStudents').toLowerCase()}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* System Information */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
            <h3 className="text-xl font-bold mb-4">{t('systemInformation') || 'System Information'}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white bg-opacity-20 rounded-lg p-4"><p className="text-2xl font-bold">{(students || []).length}</p><p className="text-sm opacity-90">{t('totalStudents')}</p></div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4"><p className="text-2xl font-bold">{(courses || []).length}</p><p className="text-sm opacity-90">{t('totalCourses') || 'Total courses'}</p></div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4"><p className="text-2xl font-bold">{(courses || []).filter((c: any) => Array.isArray(c.evaluation_rules) && c.evaluation_rules.length > 0).length}</p><p className="text-sm opacity-90">{t('configuredCourses') || 'Configured courses'}</p></div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4"><p className="text-2xl font-bold">{stats.activeStudents || 0}</p><p className="text-sm opacity-90">{t('activeEnrollment') || 'Active enrollment'}</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedDashboardView;
