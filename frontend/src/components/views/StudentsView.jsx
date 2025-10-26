import React, { useEffect, useMemo, useState } from 'react';
import Spinner from '../ui/Spinner';
import { attendanceAPI, gradesAPI } from '../../api/api';
import { useLanguage } from '../../LanguageContext';

const StudentsView = ({
  students,
  searchTerm,
  setSearchTerm,
  onEdit,
  onDelete,
  onViewProfile,
  loading,
  setShowAddModal,
}) => {
  const { t } = useLanguage();
  const [internalSearch, setInternalSearch] = useState('');
  const resolvedSearch = typeof searchTerm === 'string' ? searchTerm : internalSearch;
  const setResolvedSearch = typeof setSearchTerm === 'function' ? setSearchTerm : setInternalSearch;

  const [expandedId, setExpandedId] = useState(null);
  const [statsById, setStatsById] = useState({});
  const [notesById, setNotesById] = useState({});

  useEffect(() => {
    const loaded = {};
    (students || []).forEach((s) => {
      const k = `student_notes_${s.id}`;
      const v = localStorage.getItem(k) || '';
      loaded[s.id] = v;
    });
    setNotesById(loaded);
  }, [students]);

  const filtered = useMemo(() => {
    const q = (resolvedSearch || '').toLowerCase();
    if (!q) return students || [];
    return (students || []).filter((s) =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
      String(s.student_id || '').toLowerCase().includes(q) ||
      String(s.email || '').toLowerCase().includes(q)
    );
  }, [students, resolvedSearch]);

  const loadStats = async (studentId) => {
    try {
      const [attendance, grades] = await Promise.all([
        attendanceAPI.getByStudent(studentId),
        gradesAPI.getByStudent(studentId),
      ]);
      const total = attendance.length;
      const present = attendance.filter((a) => a.status === 'Present').length;
      const absent = attendance.filter((a) => a.status === 'Absent').length;
      const late = attendance.filter((a) => a.status === 'Late').length;
      const excused = attendance.filter((a) => a.status === 'Excused').length;
      const attendanceRate = total > 0 ? (((present + excused) / total) * 100).toFixed(1) : '0.0';

      let avg = 0;
      if (grades.length > 0) {
        const percentages = grades.map((g) => (g.grade / g.max_grade) * 100);
        avg = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
      }

      setStatsById((prev) => ({
        ...prev,
        [studentId]: {
          attendance: { total, present, absent, late, excused, attendanceRate },
          grades: { count: grades.length, average: Number.isFinite(avg) ? avg.toFixed(1) : '0.0' },
        },
      }));
    } catch (e) {
      setStatsById((prev) => ({ ...prev, [studentId]: { error: true } }));
    }
  };

  const toggleExpand = (id) => {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    if (next && !statsById[next]) loadStats(next);
  };

  const updateNote = (id, value) => {
    setNotesById((prev) => ({ ...prev, [id]: value }));
    try { localStorage.setItem(`student_notes_${id}`, value); } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          value={resolvedSearch}
          onChange={(e) => setResolvedSearch(e.target.value)}
          placeholder={t('searchStudents')}
          className="border px-4 py-2 rounded w-full max-w-md"
        />
        <button
          onClick={() => setShowAddModal(true)}
          className="ml-4 bg-indigo-600 text-white px-4 py-2 rounded"
        >
          {t('addStudent')}
        </button>
      </div>

      {/* Loading Spinner */}
      {loading && <Spinner />}

      {/* Skeleton Loader */}
      {loading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 h-20 rounded shadow" />
          ))}
        </div>
      )}

      {/* Student List */}
      {!loading && (filtered.length === 0) && (
        <p className="text-gray-500 text-center py-8">{t('noStudentsFound')}</p>
      )}

      {!loading && filtered.length > 0 && (
        <ul className="space-y-2">
          {filtered.map((student) => (
            <li key={student.id} className="border p-4 rounded shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <strong>{student.first_name} {student.last_name}</strong><br />
                  <span>{t('studentId')}: {student.student_id}</span>
                  {student.study_year && (
                    <span className="ml-3 text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                      {t('year')} {student.study_year}
                    </span>
                  )}
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => toggleExpand(student.id)}
                    className="text-gray-700 hover:underline"
                  >
                    {expandedId === student.id ? t('close') : t('view')}
                  </button>
                  <button
                    onClick={() => onViewProfile(student.id)}
                    className="text-blue-600 hover:underline"
                  >
                    {t('view')}
                  </button>
                  <button
                    onClick={() => onEdit(student)}
                    className="text-green-600 hover:underline"
                  >
                    {t('edit')}
                  </button>
                  <button
                    onClick={() => onDelete(student.id)}
                    className="text-red-600 hover:underline"
                  >
                    {t('delete')}
                  </button>
                </div>
              </div>
              {expandedId === student.id && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded p-3">
                    <div className="font-semibold mb-2">{t('notes')}</div>
                    <textarea
                      value={notesById[student.id] || ''}
                      onChange={(e) => updateNote(student.id, e.target.value)}
                      className="w-full min-h-[120px] border rounded px-3 py-2"
                      placeholder={t('notePlaceholder')}
                    />
                  </div>
                  <div className="border rounded p-3">
                    <div className="font-semibold mb-2">{t('performance')}</div>
                    {statsById[student.id]?.error ? (
                      <div className="text-sm text-red-600">{t('failedToLoadData')}</div>
                    ) : !statsById[student.id] ? (
                      <div className="text-sm text-gray-500">{t('loading')}</div>
                    ) : (
                      <div className="text-sm space-y-1">
                        <div><span className="font-medium">{t('attendance')}:</span> {statsById[student.id].attendance.present}/{statsById[student.id].attendance.total} {t('present')} • {statsById[student.id].attendance.attendanceRate}%</div>
                        <div><span className="font-medium">{t('grades')}:</span> {statsById[student.id].grades.count} {t('assignments')} • {statsById[student.id].grades.average}%</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default StudentsView;
