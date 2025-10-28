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
  
  // Semester selection state
  const [semesterType, setSemesterType] = useState('spring'); // spring, winter, academic_year, school_year, custom
  const [semesterYear, setSemesterYear] = useState(new Date().getFullYear().toString());
  const [customSemester, setCustomSemester] = useState('');

  // Generate semester string based on type and year
  const generateSemester = (type, year, custom) => {
    switch (type) {
      case 'spring':
        return `${t('springSemester')} ${year}`;
      case 'winter':
        return `${t('winterSemester')} ${year}`;
      case 'academic_year':
        return `${t('academicYear')} ${year}`;
      case 'school_year':
        return `${t('schoolYear')} ${year}`;
      case 'custom':
        return custom || '';
      default:
        return '';
    }
  };

  // Update semester whenever type or year changes
  const handleSemesterTypeChange = (type) => {
    setSemesterType(type);
    const newSemester = generateSemester(type, semesterYear, customSemester);
    setCourseData({ ...courseData, semester: newSemester });
  };

  const handleSemesterYearChange = (year) => {
    setSemesterYear(year);
    const newSemester = generateSemester(semesterType, year, customSemester);
    setCourseData({ ...courseData, semester: newSemester });
  };

  const handleCustomSemesterChange = (custom) => {
    setCustomSemester(custom);
    const newSemester = generateSemester(semesterType, semesterYear, custom);
    setCourseData({ ...courseData, semester: newSemester });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(courseData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
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
          
          {/* Semester Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {t('semester')} *
            </label>
            <select
              value={semesterType}
              onChange={(e) => handleSemesterTypeChange(e.target.value)}
              className="w-full border px-4 py-2 rounded focus:ring-2 focus:ring-indigo-500"
            >
              <option value="spring">{t('springSemester')}</option>
              <option value="winter">{t('winterSemester')}</option>
              <option value="academic_year">{t('academicYear')}</option>
              <option value="school_year">{t('schoolYear')}</option>
              <option value="custom">{t('customSemester')}</option>
            </select>
            
            {semesterType === 'custom' ? (
              <input
                type="text"
                placeholder={t('customSemesterPlaceholder')}
                value={customSemester}
                onChange={(e) => handleCustomSemesterChange(e.target.value)}
                className="w-full border px-4 py-2 rounded focus:ring-2 focus:ring-indigo-500"
                required
              />
            ) : (
              <input
                type="text"
                placeholder={t('yearPlaceholder')}
                value={semesterYear}
                onChange={(e) => handleSemesterYearChange(e.target.value)}
                className="w-full border px-4 py-2 rounded focus:ring-2 focus:ring-indigo-500"
                required
              />
            )}
            
            {/* Preview of generated semester */}
            <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded">
              <strong>{t('semester')}:</strong> {courseData.semester || t('selectSemester')}
            </div>
          </div>
          
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
