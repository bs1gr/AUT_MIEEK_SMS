import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../LanguageContext';

const EditStudentModal = ({ student, onClose, onUpdate }) => {
  const { t } = useLanguage();
  const [studentData, setStudentData] = useState({ ...student });

  useEffect(() => {
    if (student) {
      setStudentData({ ...student });
    }
  }, [student]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(studentData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">{t('editStudent')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder={t('studentIdPlaceholder')}
            value={studentData.student_id || ''}
            onChange={(e) => setStudentData({ ...studentData, student_id: e.target.value })}
            className="w-full border px-4 py-2 rounded"
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder={t('lastNamePlaceholder')}
              value={studentData.last_name || ''}
              onChange={(e) => setStudentData({ ...studentData, last_name: e.target.value })}
              className="w-full border px-4 py-2 rounded"
              required
            />
            <input
              type="text"
              placeholder={t('firstNamePlaceholder')}
              value={studentData.first_name || ''}
              onChange={(e) => setStudentData({ ...studentData, first_name: e.target.value })}
              className="w-full border px-4 py-2 rounded"
              required
            />
          </div>
          <input
            type="text"
            placeholder={t('fatherNamePlaceholder')}
            value={studentData.father_name || ''}
            onChange={(e) => setStudentData({ ...studentData, father_name: e.target.value })}
            className="w-full border px-4 py-2 rounded"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="tel"
              placeholder={t('mobilePhonePlaceholder')}
              value={studentData.mobile_phone || ''}
              onChange={(e) => setStudentData({ ...studentData, mobile_phone: e.target.value })}
              className="w-full border px-4 py-2 rounded"
            />
            <input
              type="tel"
              placeholder={t('phonePlaceholder')}
              value={studentData.phone || ''}
              onChange={(e) => setStudentData({ ...studentData, phone: e.target.value })}
              className="w-full border px-4 py-2 rounded"
            />
          </div>
          <input
            type="email"
            placeholder={t('emailPlaceholder')}
            value={studentData.email || ''}
            onChange={(e) => setStudentData({ ...studentData, email: e.target.value })}
            className="w-full border px-4 py-2 rounded"
            required
          />
          <textarea
            placeholder={t('healthIssuesPlaceholder')}
            value={studentData.health_issue || ''}
            onChange={(e) => setStudentData({ ...studentData, health_issue: e.target.value })}
            className="w-full border px-4 py-2 rounded min-h-[90px]"
          />
          <textarea
            placeholder={t('notePlaceholder')}
            value={studentData.note || ''}
            onChange={(e) => setStudentData({ ...studentData, note: e.target.value })}
            className="w-full border px-4 py-2 rounded min-h-[90px]"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="number"
              placeholder={t('studyYearPlaceholder')}
              value={studentData.study_year ?? ''}
              onChange={(e) => setStudentData({ ...studentData, study_year: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full border px-4 py-2 rounded"
            />
            <input
              type="date"
              value={studentData.enrollment_date || ''}
              onChange={(e) => setStudentData({ ...studentData, enrollment_date: e.target.value })}
              className="w-full border px-4 py-2 rounded"
              required
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
              {t('cancel')}
            </button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditStudentModal;
