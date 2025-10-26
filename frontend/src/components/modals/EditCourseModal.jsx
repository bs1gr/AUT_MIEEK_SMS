import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../LanguageContext';

const EditCourseModal = ({ course, onClose, onUpdate }) => {
  const { t } = useLanguage();
  const [courseData, setCourseData] = useState({ ...course });

  useEffect(() => {
    if (course) {
      setCourseData({ ...course });
    }
  }, [course]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Only send fields that exist in the form to avoid overwriting other fields
    const updatePayload = {
      course_code: courseData.course_code,
      course_name: courseData.course_name,
      semester: courseData.semester,
      credits: courseData.credits,
      description: courseData.description,
      hours_per_week: courseData.hours_per_week,
      absence_penalty: courseData.absence_penalty,
      // Preserve evaluation_rules and teaching_schedule if they exist
      ...(courseData.evaluation_rules && { evaluation_rules: courseData.evaluation_rules }),
      ...(courseData.teaching_schedule && { teaching_schedule: courseData.teaching_schedule }),
    };
    onUpdate(updatePayload);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full my-8">
        <h2 className="text-xl font-bold mb-4">{t('editCourse')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('courseCode')} *
              </label>
              <input
                type="text"
                placeholder={t('courseCodePlaceholder')}
                value={courseData.course_code || ''}
                onChange={(e) => setCourseData({ ...courseData, course_code: e.target.value })}
                className="w-full border border-gray-300 px-4 py-2 rounded focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('credits')} *
              </label>
              <input
                type="number"
                placeholder={t('creditsPlaceholder')}
                value={courseData.credits || 3}
                onChange={(e) => setCourseData({ ...courseData, credits: parseInt(e.target.value) || 3 })}
                className="w-full border border-gray-300 px-4 py-2 rounded focus:ring-2 focus:ring-indigo-500"
                min="1"
                max="12"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('courseName')} *
            </label>
            <input
              type="text"
              placeholder={t('courseNamePlaceholder')}
              value={courseData.course_name || ''}
              onChange={(e) => setCourseData({ ...courseData, course_name: e.target.value })}
              className="w-full border border-gray-300 px-4 py-2 rounded focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('semester')} *
            </label>
            <input
              type="text"
              placeholder={t('semesterPlaceholder')}
              value={courseData.semester || ''}
              onChange={(e) => setCourseData({ ...courseData, semester: e.target.value })}
              className="w-full border border-gray-300 px-4 py-2 rounded focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('description')}
            </label>
            <textarea
              placeholder={t('descriptionPlaceholder') || 'Course description'}
              value={courseData.description || ''}
              onChange={(e) => setCourseData({ ...courseData, description: e.target.value })}
              className="w-full border border-gray-300 px-4 py-2 rounded focus:ring-2 focus:ring-indigo-500"
              rows="3"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('hoursPerWeek') || 'Hours per Week'}
              </label>
              <input
                type="number"
                placeholder="3.0"
                value={courseData.hours_per_week || 3.0}
                onChange={(e) => setCourseData({ ...courseData, hours_per_week: parseFloat(e.target.value) || 3.0 })}
                className="w-full border border-gray-300 px-4 py-2 rounded focus:ring-2 focus:ring-indigo-500"
                min="0.5"
                max="40"
                step="0.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('absencePenalty') || 'Absence Penalty (%)'}
              </label>
              <input
                type="number"
                placeholder="0.0"
                value={courseData.absence_penalty || 0.0}
                onChange={(e) => setCourseData({ ...courseData, absence_penalty: parseFloat(e.target.value) || 0.0 })}
                className="w-full border border-gray-300 px-4 py-2 rounded focus:ring-2 focus:ring-indigo-500"
                min="0"
                max="100"
                step="0.5"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              {t('cancel')}
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              {t('updateCourse')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCourseModal;
