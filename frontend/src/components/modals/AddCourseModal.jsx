import React, { useState } from 'react';
import { useLanguage } from '../../LanguageContext';

const AddCourseModal = ({ onClose, onAdd }) => {
  const { t } = useLanguage();
  const [courseData, setCourseData] = useState({
    course_code: '',
    course_name: '',
    semester: '',
    credits: 3,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(courseData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">{t('addNewCourse')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder={t('courseCodePlaceholder')}
            value={courseData.course_code}
            onChange={(e) => setCourseData({ ...courseData, course_code: e.target.value })}
            className="w-full border px-4 py-2 rounded"
            required
          />
          <input
            type="text"
            placeholder={t('courseNamePlaceholder')}
            value={courseData.course_name}
            onChange={(e) => setCourseData({ ...courseData, course_name: e.target.value })}
            className="w-full border px-4 py-2 rounded"
            required
          />
          <input
            type="text"
            placeholder={t('semesterPlaceholder')}
            value={courseData.semester}
            onChange={(e) => setCourseData({ ...courseData, semester: e.target.value })}
            className="w-full border px-4 py-2 rounded"
            required
          />
          <input
            type="number"
            placeholder={t('creditsPlaceholder')}
            value={courseData.credits}
            onChange={(e) => setCourseData({ ...courseData, credits: parseInt(e.target.value) })}
            className="w-full border px-4 py-2 rounded"
            required
          />
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
              {t('cancel')}
            </button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">
              {t('addCourse')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCourseModal;
