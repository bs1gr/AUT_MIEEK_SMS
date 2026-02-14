import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Student } from '@/types';
import { enrollmentsAPI } from '@/api/api';
import VirtualStudentList from '@/components/VirtualStudentList';

interface StudentListSectionProps {
  title: string;
  students: Student[];
  studentEnrollments: Record<number, number>;
  onEdit: (student: Student) => void;
  onDelete: (id: number) => void;
  onView: (id: number) => void;
  isExpanded?: boolean;
  onToggle?: () => void;
  height?: number;
}

const StudentListSection: React.FC<StudentListSectionProps> = ({
  title,
  students,
  studentEnrollments,
  onEdit,
  onDelete,
  onView,
  isExpanded = true,
  onToggle,
  height = 400,
}) => {
  if (students.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
      <button
        type="button"
        className="bg-gray-100 px-6 py-4 cursor-pointer hover:bg-gray-200 transition-colors flex items-center justify-between border-b-2 border-gray-300"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown size={20} className="text-gray-600" />
          ) : (
            <ChevronRight size={20} className="text-gray-600" />
          )}
          <h2 className="text-lg font-semibold text-gray-900">
            {title}
            <span className="ml-3 text-sm font-normal text-gray-600">
              ({students.length})
            </span>
          </h2>
        </div>
      </button>

      {isExpanded && (
        <div>
          <VirtualStudentList
            students={students}
            onEdit={onEdit}
            onDelete={onDelete}
            onView={onView}
            height={height}
            enrollmentCounts={studentEnrollments}
          />
        </div>
      )}
    </div>
  );
};

interface CascadedStudentViewProps {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (id: number) => void;
  onView: (id: number) => void;
  loading?: boolean;
}

const CascadedStudentView: React.FC<CascadedStudentViewProps> = ({
  students,
  onEdit,
  onDelete,
  onView,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [expandedSections, setExpandedSections] = useState({
    active: true,
    inactive: true,
  });
  const [studentEnrollments, setStudentEnrollments] = useState<Record<number, number>>({});
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);

  // Fetch enrollment counts for all students
  useEffect(() => {
    if (!students || students.length === 0) return;

    const fetchEnrollments = async () => {
      setEnrollmentsLoading(true);
      try {
        const enrollmentCounts: Record<number, number> = {};

        // Fetch enrollments for each student
        for (const student of students) {
          const enrollments = await enrollmentsAPI.listStudentEnrollments(student.id);
          const resp = enrollments as unknown;
          const list = Array.isArray(resp)
            ? (resp as { id: number }[])
            : (Array.isArray((resp as { items?: unknown })?.items)
                ? (resp as { items?: { id: number }[] }).items!
                : []);
          enrollmentCounts[student.id] = list.length;
        }

        setStudentEnrollments(enrollmentCounts);
      } catch (error) {
        console.error('Failed to fetch enrollment counts:', error);
      } finally {
        setEnrollmentsLoading(false);
      }
    };

    fetchEnrollments();
  }, [students]);

  // Separate students into active and inactive
  const { activeStudents, inactiveStudents } = useMemo(() => {
    const active: Student[] = [];
    const inactive: Student[] = [];

    (students || []).forEach((student) => {
      if (student.is_active) {
        active.push(student);
      } else {
        inactive.push(student);
      }
    });

    return {
      activeStudents: active.sort((a, b) =>
        `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
      ),
      inactiveStudents: inactive.sort((a, b) =>
        `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
      ),
    };
  }, [students]);

  const toggleSection = (section: 'active' | 'inactive') => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Students Section */}
      <StudentListSection
        title={t('activeStudents', { ns: 'students' })}
        students={activeStudents}
        studentEnrollments={studentEnrollments}
        onEdit={onEdit}
        onDelete={onDelete}
        onView={onView}
        isExpanded={expandedSections.active}
        onToggle={() => toggleSection('active')}
        height={Math.max(400, activeStudents.length * 50)}
      />

      {/* Inactive Students Section */}
      {inactiveStudents.length > 0 && (
        <StudentListSection
          title={t('inactiveStudents', { ns: 'students' })}
          students={inactiveStudents}
          studentEnrollments={studentEnrollments}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
          isExpanded={expandedSections.inactive}
          onToggle={() => toggleSection('inactive')}
          height={Math.max(400, inactiveStudents.length * 50)}
        />
      )}

      {!loading && enrollmentsLoading && (
        <div className="text-center py-4 text-sm text-gray-500">
          {t('loadingEnrollments', { ns: 'students' })}
        </div>
      )}
    </div>
  );
};

export default CascadedStudentView;
