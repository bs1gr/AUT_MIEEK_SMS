/**
 * Performance Card Component
 * Displays student overall performance metrics
 */

import React from "react";
import { useTranslation } from "react-i18next";

export interface PerformanceData {
  student?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  overall_average: number;
  period_days: number;
  courses?: Record<
    number,
    {
      course_name: string;
      average: number;
      grade_count: number;
    }
  >;
}

interface PerformanceCardProps {
  data: PerformanceData;
}

/**
 * Performance Card
 * Shows overall average and breakdown by course
 */
export const PerformanceCard: React.FC<PerformanceCardProps> = ({ data }) => {
  const { t } = useTranslation();

  // Grade scale: A (90-100), B (80-89), C (70-79), D (60-69), F (<60)
  const getGradeLevel = (percentage: number): string => {
    if (percentage >= 90) return "A";
    if (percentage >= 80) return "B";
    if (percentage >= 70) return "C";
    if (percentage >= 60) return "D";
    return "F";
  };

  // Color based on grade
  const getGradeColor = (percentage: number): string => {
    const level = getGradeLevel(percentage);
    switch (level) {
      case "A":
        return "#4CAF50"; // Green
      case "B":
        return "#8BC34A"; // Light Green
      case "C":
        return "#FFC107"; // Yellow
      case "D":
        return "#FF9800"; // Orange
      case "F":
        return "#F44336"; // Red
      default:
        return "#999";
    }
  };

  const percentage = Math.round(data.overall_average * 100) / 100;
  const grade = getGradeLevel(percentage);
  const color = getGradeColor(percentage);

  return (
    <div className="performance-card widget-card">
      <h3>{t("analytics.performance_title")}</h3>

      <div className="performance-main">
        <div
          className="grade-circle"
          style={{
            background: `conic-gradient(${color} 0% ${percentage}%, #e0e0e0 ${percentage}% 100%)`,
          }}
        >
          <div className="grade-circle-inner">
            <div className="grade-letter">{grade}</div>
            <div className="grade-percentage">{percentage.toFixed(1)}%</div>
          </div>
        </div>

        <div className="performance-stats">
          <div className="stat-item">
            <span className="stat-label">{t("analytics.overall_average")}</span>
            <span className="stat-value">{percentage.toFixed(1)}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{t("analytics.period")}</span>
            <span className="stat-value">{data.period_days} {t('days')}</span>
          </div>
          {data.courses && Object.keys(data.courses).length > 0 && (
            <div className="stat-item">
              <span className="stat-label">{t("analytics.courses")}</span>
              <span className="stat-value">{Object.keys(data.courses).length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Course breakdown */}
      {data.courses && Object.keys(data.courses).length > 0 && (
        <div className="course-breakdown">
          <h4>{t("analytics.by_course")}</h4>
          <div className="course-list">
            {Object.entries(data.courses).map(([courseId, course]) => (
              <div key={courseId} className="course-item">
                <span className="course-name">{course.course_name}</span>
                <span className="course-average">{course.average.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceCard;
