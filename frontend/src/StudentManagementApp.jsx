import React, { useState, useEffect } from 'react';
import StudentsView from './components/views/StudentsView';
import CoursesView from './components/views/CoursesView';
import EnhancedDashboardView from './components/views/EnhancedDashboardView';
import CalendarView from './components/views/CalendarView';
import AttendanceView from './components/views/AttendanceView';
import GradingView from './components/views/GradingView';
import OperationsView from './components/views/OperationsView';
import StudentProfile from './components/features/StudentProfile';
import AddStudentModal from './components/modals/AddStudentModal';
import EditStudentModal from './components/modals/EditStudentModal';
import AddCourseModal from './components/modals/AddCourseModal';
import EditCourseModal from './components/modals/EditCourseModal';
import Toast from './components/ui/Toast';
import Spinner from './components/ui/Spinner';
import LanguageSwitcher from './components/LanguageSwitcher';
import ServerControl from './components/common/ServerControl';
import ControlPanel from './components/ControlPanel';
import { useLanguage } from './LanguageContext';
import { useTranslation } from 'react-i18next';

import {
  studentsAPI,
  coursesAPI,
  analyticsAPI,
} from './api/api';

const StudentManagementApp = () => {
  useEffect(() => {
    console.log('[StudentManagementApp] students state changed:', students);
  }, [students]);
  const { t } = useLanguage();
  const { t: ti18n } = useTranslation(); // i18n translation function
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [viewingStudentId, setViewingStudentId] = useState(null);

  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [showEditCourseModal, setShowEditCourseModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (messageKey, type = 'info', options = {}) => {
    // messageKey: string (i18n key) or { key, values }
    let message = '';
    if (typeof messageKey === 'string') {
      message = t(messageKey);
    } else if (messageKey && typeof messageKey === 'object' && messageKey.key) {
      message = t(messageKey.key, messageKey.values || {});
    } else {
      message = String(messageKey);
    }
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsData, coursesData] = await Promise.all([
        studentsAPI.getAll(),
        coursesAPI.getAll(),
      ]);
      const arr = Array.isArray(studentsData) ? studentsData : [];
      setStudents(arr);
      console.log('[StudentManagementApp] setStudents: studentsData =', studentsData, '| arr =', arr);
      setCourses(Array.isArray(coursesData) ? coursesData : []);

      if (!Array.isArray(studentsData) || !Array.isArray(coursesData)) {
        showToast('failedToLoadSomeData', 'error');
      }
    } catch (error) {
      showToast('failedToLoadDataServer', 'error');
      // Ensure state is an empty array on error to prevent crashes
      setStudents([]);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Determine initial view from URL (hash or ?view=)
  const getInitialView = () => {
    try {
      const hash = (window.location.hash || '').replace('#', '').trim().toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const queryView = (params.get('view') || '').trim().toLowerCase();
      const v = hash || queryView || 'dashboard';
      const allowed = new Set(['dashboard','students','courses','attendance','grading','calendar','operations','power']);
      return allowed.has(v) ? v : 'dashboard';
    } catch {
      return 'dashboard';
    }
  };

  const [activeView, setActiveView] = useState(getInitialView()); // 'dashboard' | 'students' | 'courses' | 'attendance' | 'grading' | 'calendar' | 'operations' | 'power'

  // Keep URL hash in sync and respond to external hash changes (deep-linking)
  useEffect(() => {
    const onHashChange = () => {
      const hashView = (window.location.hash || '').replace('#','').trim().toLowerCase();
      if (!hashView) return;
      const allowed = new Set(['dashboard','students','courses','attendance','grading','calendar','operations','power']);
      if (allowed.has(hashView)) {
        setActiveView(hashView);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header with Title and Language Toggle */}
      <div className="flex items-center justify-between pb-4">
        <h1 className="text-3xl font-bold text-gray-800">{t('systemTitle')}</h1>
        <div className="flex items-center space-x-4">
          <LanguageSwitcher />
        </div>
      </div>

      {/* Top Navigation */}
      <div className="flex space-x-3">
        {[
          { key: 'dashboard', label: t('dashboard') },
          { key: 'attendance', label: t('attendance') },
          { key: 'grading', label: t('grades') },
          { key: 'students', label: t('students') },
          { key: 'courses', label: t('courses') },
          { key: 'calendar', label: t('calendar') },
          { key: 'operations', label: t('utilsTab') },
          { key: 'power', label: t('powerTab') || 'Power' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveView(tab.key);
              try { window.location.hash = `#${tab.key}`; } catch {}
            }}
            className={`px-4 py-2 rounded-lg border ${
              activeView === tab.key
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>


      {/* Views */}
      {activeView === 'dashboard' && (
        <EnhancedDashboardView
          students={students}
          courses={courses}
          stats={{
            totalStudents: students.length,
            activeStudents: students.filter((s) => s.is_active !== false).length,
            totalCourses: courses.length,
          }}
        />
      )}

      {activeView === 'students' && (loading ? (
        <Spinner />
      ) : viewingStudentId ? (
        <StudentProfile
          studentId={viewingStudentId}
          onBack={() => setViewingStudentId(null)}
        />
      ) : (
        <>
          <StudentsView
            students={students}
            loading={loading}
            setShowAddModal={setShowAddStudentModal}
            onEdit={(student) => {
              setSelectedStudent(student);
              setShowEditStudentModal(true);
            }}
            onDelete={async (id) => {
              try {
                if (!window.confirm(t('confirmDeleteStudent'))) return;
                await studentsAPI.delete(id);
                setStudents((prev) => (Array.isArray(prev) ? prev.filter((s) => s.id !== id) : []));
                showToast('studentDeleted', 'success');
              } catch (error) {
                showToast('failedToDeleteStudent', 'error');
              }
            }}
            onViewProfile={(studentId) => {
              setViewingStudentId(studentId);
            }}
          />
        </>
      ))}

      {activeView === 'students' && showAddStudentModal && (
        <AddStudentModal
          onClose={() => setShowAddStudentModal(false)}
          onAdd={async (newStudent) => {
            try {
              const created = await studentsAPI.create(newStudent);
              setStudents((prev) => Array.isArray(prev) ? [created, ...prev] : [created]);
              showToast('studentAdded', 'success');
            } catch (error) {
              showToast('failedToAddStudent', 'error');
            } finally {
              setShowAddStudentModal(false);
            }
          }}
        />
      )}

      {activeView === 'students' && showEditStudentModal && selectedStudent && (
        <EditStudentModal
          student={selectedStudent}
          onClose={() => setShowEditStudentModal(false)}
          onUpdate={async (updatedStudent) => {
            try {
              const saved = await studentsAPI.update(updatedStudent.id, updatedStudent);
              setStudents((prev) => (Array.isArray(prev) ? prev.map((s) => (s.id === saved.id ? saved : s)) : [saved]));
              showToast('studentUpdated', 'success');
            } catch (error) {
              showToast('failedToUpdateStudent', 'error');
            } finally {
              setShowEditStudentModal(false);
            }
          }}
        />
      )}

      {activeView === 'courses' && showAddCourseModal && (
        <AddCourseModal
          onClose={() => setShowAddCourseModal(false)}
          onAdd={async (newCourse) => {
            try {
              const created = await coursesAPI.create(newCourse);
              setCourses((prev) => Array.isArray(prev) ? [...prev, created] : [created]);
              showToast('courseAdded', 'success');
            } catch (error) {
              showToast('failedToAddCourse', 'error');
            } finally {
              setShowAddCourseModal(false);
            }
          }}
        />
      )}

      {activeView === 'courses' && showEditCourseModal && selectedCourse && (
        <EditCourseModal
          course={selectedCourse}
          onClose={() => setShowEditCourseModal(false)}
          onUpdate={async (updatedCourse) => {
            try {
              const saved = await coursesAPI.update(updatedCourse.id, updatedCourse);
              setCourses((prev) => (Array.isArray(prev) ? prev.map((c) => (c.id === saved.id ? saved : c)) : [saved]));
              showToast('courseUpdated', 'success');
            } catch (error) {
              showToast('failedToUpdateCourse', 'error');
            } finally {
              setShowEditCourseModal(false);
            }
          }}
        />
      )}

      {activeView === 'courses' && (
        <CoursesView
          courses={courses}
          loading={loading}
          onAddCourse={() => setShowAddCourseModal(true)}
          onEdit={(course) => {
            setSelectedCourse(course);
            setShowEditCourseModal(true);
          }}
          onDelete={async (courseId) => {
            try {
              if (!window.confirm(t('confirmDeleteCourse'))) return;
              await coursesAPI.delete(courseId);
              setCourses((prev) => (Array.isArray(prev) ? prev.filter((c) => c.id !== courseId) : []));
              showToast('courseDeleted', 'success');
            } catch (error) {
              showToast('failedToDeleteCourse', 'error');
            }
          }}
        />
      )}

      {activeView === 'attendance' && (
        <AttendanceView courses={courses} students={students} />
      )}

      {activeView === 'grading' && (
        <GradingView key={window.location.hash} students={students} courses={courses} />
      )}

      {activeView === 'calendar' && (
        <CalendarView courses={courses} />
      )}

      {activeView === 'operations' && (
        <OperationsView students={students} />
      )}

      {activeView === 'power' && (
        <div className="space-y-6">
          <div className="bg-white border rounded-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('controlPanel.title')}</h2>
            <ServerControl />
          </div>
          <ControlPanel />
        </div>
      )}
    </div>
  );
};

export default StudentManagementApp;
