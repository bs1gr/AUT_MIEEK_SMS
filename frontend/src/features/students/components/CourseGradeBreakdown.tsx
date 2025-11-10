import React, { memo, useMemo } from 'react';
import type { Grade, Course } from '@/types';
import { percentageToGreekScale, getGreekGradeColor, getLetterGrade } from '@/utils/gradeUtils';
import { useLanguage } from '@/LanguageContext';

interface CourseGradeBreakdownProps {
  gradesList: Grade[];
  coursesMap: Map<number, Course>;
}

/**
 * Memoized CourseGradeBreakdown component
 * Displays grade breakdown by course with calculations memoized
 */
const CourseGradeBreakdown: React.FC<CourseGradeBreakdownProps> = memo(({
  gradesList,
  coursesMap,
}) => {
  const { t } = useLanguage();

  // Memoize course grouping and calculations
  const courseBreakdown = useMemo(() => {
    // Group grades by course_id
    const gradesByCourse: Record<number, Grade[]> = {};
    gradesList.forEach((grade) => {
      const courseId = grade.course_id;
      if (!gradesByCourse[courseId]) {
        gradesByCourse[courseId] = [];
      }
      gradesByCourse[courseId].push(grade);
    });

    // Calculate statistics for each course
    return Object.entries(gradesByCourse).map(([courseIdStr, courseGrades]) => {
      const courseId = parseInt(courseIdStr);
      const courseInfo = coursesMap.get(courseId);
      const courseName = courseInfo?.course_name || `${t('course') || 'Course'} #${courseId}`;
      const courseCode = courseInfo?.course_code || '';

      // Calculate course average
      const percentages = courseGrades.map(g => (g.grade / g.max_grade) * 100);
      const avgPercentage = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
      const avgGreek = percentageToGreekScale(avgPercentage);
      const letterGrade = getLetterGrade(avgGreek);
      const gradeColor = getGreekGradeColor(avgGreek);

      // Group by category
      const byCategory: Record<string, Grade[]> = {};
      courseGrades.forEach((g) => {
        const cat = g.category || t('other') || 'Other';
        if (!byCategory[cat]) {
          byCategory[cat] = [];
        }
        byCategory[cat].push(g);
      });

      return {
        courseId,
        courseName,
        courseCode,
        avgPercentage,
        avgGreek,
        letterGrade,
        gradeColor,
        byCategory,
      };
    });
  }, [gradesList, coursesMap, t]);

  // Translate category names
  const translateCategory = (category: string): string => {
    const categoryMap: Record<string, string> = {
      'Class Participation': t('classParticipation'),
      'Continuous Assessment': t('continuousAssessment'),
      'Midterm': t('midtermExam'),
      'Final Exam': t('finalExam'),
      'Final': t('finalExam'),
      'Homework': t('homework'),
      'Quiz': t('quiz'),
      'Project': t('project'),
      'Lab Work': t('labWork'),
      'Assignment': t('assignment'),
      // Greek category names
      'Συμμετοχή στο Μάθημα': t('classParticipation'),
      'Συνεχής Αξιολόγηση': t('continuousAssessment'),
      'Ενδιάμεση Εξέταση': t('midtermExam'),
      'Ενδιάμεση': t('midtermExam'),
      'Τελική Εξέταση': t('finalExam'),
      'Τελική': t('finalExam'),
      'Εργασία': t('homework'),
      'Κουίζ': t('quiz'),
      'Πρότζεκτ': t('project'),
      'Εργαστήριο': t('labWork'),
      'Ενδ': t('midtermExam'),
      'ΑΣΚΗΣΗ': t('homework'),
    };
    return categoryMap[category] || category;
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-md">
      <div className="font-semibold text-gray-800 mb-3">
        {t('gradeBreakdown') || 'Grade Breakdown'} - {t('byCourse') || 'By Course'}
      </div>

      {courseBreakdown.length === 0 ? (
        <p className="text-gray-500 text-sm">{t('noGradesAvailable') || 'No grades available'}</p>
      ) : (
        <div className="space-y-4">
          {courseBreakdown.map(({ courseId, courseName, courseCode, avgPercentage, avgGreek, letterGrade, gradeColor, byCategory }) => (
            <div key={courseId} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Course Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-gray-900">{courseName}</div>
                    {courseCode && <div className="text-xs text-gray-600">{courseCode}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-700">
                      {t('average')}: <span className={`font-bold ${gradeColor}`}>
                        {avgGreek.toFixed(1)}/20
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {avgPercentage.toFixed(1)}% ({letterGrade})
                    </div>
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div className="p-4 space-y-3">
                {Object.entries(byCategory).map(([category, catGrades]) => {
                  const catAvg = catGrades.reduce(
                    (sum, g) => sum + (g.grade / g.max_grade) * 100,
                    0
                  ) / catGrades.length;

                  return (
                    <div key={category} className="bg-gray-50 rounded-md p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-800">
                          {translateCategory(category)}
                        </span>
                        <span className="text-sm text-gray-700">
                          {t('average')}: <span className="font-semibold">{catAvg.toFixed(1)}%</span>
                        </span>
                      </div>
                      <div className="space-y-1">
                        {catGrades.map((grade, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-gray-600">
                            <span>{grade.assignment_name}</span>
                            <span>
                              {grade.grade}/{grade.max_grade} ({((grade.grade / grade.max_grade) * 100).toFixed(1)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if gradesList or coursesMap actually changed
  return (
    prevProps.gradesList === nextProps.gradesList &&
    prevProps.coursesMap === nextProps.coursesMap
  );
});

CourseGradeBreakdown.displayName = 'CourseGradeBreakdown';

export default CourseGradeBreakdown;