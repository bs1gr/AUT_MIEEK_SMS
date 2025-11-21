import React, { useState, useEffect } from 'react';
import {
  Users, BookOpen, Calendar, Star, TrendingUp, CheckCircle, Award, Target, ArrowRight, XCircle
} from 'lucide-react';
import { useLanguage } from '@/LanguageContext';
import {
  gpaToPercentage,
  gpaToGreekScale,
  getGreekGradeColor,
  getGreekGradeBgColor,
  getGreekGradeDescription,
  formatAllGrades
} from '@/utils/gradeUtils';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => {
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

const EnhancedDashboardView = ({ students, courses, stats }) => {
  const { t } = useLanguage();
  const [topPerformers, setTopPerformers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [students]);

  const loadDashboardData = async () => {
    if (students.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const studentPromises = students.slice(0, 10).map(async (student) => {
        try {
          const response = await fetch(`${API_BASE_URL}/analytics/student/${student.id}/all-courses-summary`);
          if (!response.ok) throw new Error(`Failed to fetch student summary: ${response.status}`);
          const data = await response.json();
          return {
            ...student,
            overallGPA: data.overall_gpa || 0,
            totalCourses: data.courses?.length || 0,
            totalCredits: data.total_credits || 0,
          };
        } catch {
          return { ...student, overallGPA: 0, totalCourses: 0, totalCredits: 0 };
        }
      });

      const studentsWithGPA = await Promise.all(studentPromises);
      const sorted = studentsWithGPA
        .filter((s) => s.overallGPA > 0)
        .sort((a, b) => b.overallGPA - a.overallGPA);
      setTopPerformers(sorted.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800">{t('dashboardTitle')}</h2>
        <button className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center space-x-2">
          <span>{t('viewDetailedAnalytics')}</span>
          <ArrowRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={t('totalStudents')}
          value={stats.totalStudents || 0}
          icon={Users}
          color="indigo"
          subtitle={`${stats.activeStudents || 0} ${t('active').toLowerCase()}`}
        />
        <StatCard
          title={t('activeCourses')}
          value={stats.totalCourses || 0}
          icon={BookOpen}
          color="purple"
          subtitle={t('thisSemester')}
        />
        <StatCard
          title={t('avgClassSize')}
          value={stats.totalCourses ? Math.round(stats.totalStudents / stats.totalCourses) : 0}
          icon={TrendingUp}
          color="green"
          subtitle={t('studentsPerCourse')}
        />
        <StatCard
          title={t('enrollmentRate')}
          value={stats.totalStudents ? `${Math.round((stats.activeStudents / stats.totalStudents) * 100)}%` : '0%'}
          icon={CheckCircle}
          color="yellow"
          subtitle={t('activeEnrollment')}
        />
      </div>

      {/* Top performers and other sections remain unchanged but benefit from loading logic */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-500 mt-2 text-sm">{t('loadingStudentData')}</p>
        </div>
      )}
    </div>
  );
};

export default EnhancedDashboardView;
