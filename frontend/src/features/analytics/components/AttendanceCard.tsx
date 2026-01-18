/**
 * Attendance Card Component
 * Displays student attendance rate and breakdown by course
 */

import React from "react";
import { useTranslation } from "react-i18next";

interface CourseAttendance {
  course_name: string;
  total_classes: number;
  present: number;
  absent: number;
  attendance_rate: number;
}

interface AttendanceData {
  student?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  overall_attendance_rate: number;
  total_classes: number;
  courses?: Record<string, CourseAttendance>;
}

interface AttendanceCardProps {
  data: AttendanceData;
}

/**
 * Attendance Card
 * Shows overall attendance rate and course breakdown
 */
export const AttendanceCard: React.FC<AttendanceCardProps> = ({ data }) => {
  const { t } = useTranslation();

  // Determine attendance status color
  const getAttendanceColor = (rate: number): string => {
    if (rate >= 90) return "#4CAF50"; // Green - Excellent
    if (rate >= 75) return "#8BC34A"; // Light Green - Good
    if (rate >= 60) return "#FFC107"; // Yellow - Fair
    return "#F44336"; // Red - Poor
  };

  const color = getAttendanceColor(data.overall_attendance_rate);

  return (
    <div className="attendance-card widget-card">
      <h3>{t("analytics.attendance_title")}</h3>

      <div className="attendance-main">
        <div
          className="attendance-circle"
          style={{
            background: `conic-gradient(${color} 0% ${data.overall_attendance_rate}%, #e0e0e0 ${data.overall_attendance_rate}% 100%)`,
          }}
        >
          <div className="attendance-circle-inner">
            <div className="attendance-percentage">{data.overall_attendance_rate.toFixed(1)}%</div>
            <div className="attendance-label">{t("analytics.attendance")}</div>
          </div>
        </div>

        <div className="attendance-stats">
          <div className="stat-item">
            <span className="stat-label">{t("analytics.total_classes")}</span>
            <span className="stat-value">{data.total_classes}</span>
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
        <div className="course-attendance">
          <h4>{t("analytics.by_course")}</h4>
          <div className="course-list">
            {Object.entries(data.courses).map(([courseId, course]) => (
              <div
                key={courseId}
                className="course-item"
                style={{
                  borderLeft: `4px solid ${getAttendanceColor(course.attendance_rate)}`,
                }}
              >
                <div className="course-name">{course.course_name}</div>
                <div className="course-attendance-details">
                  <span className="attendance-rate">
                    {course.attendance_rate.toFixed(1)}%
                  </span>
                  <span className="attendance-breakdown">
                    {course.present} / {course.total_classes}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status indicator */}
      <div className="attendance-status">
        {data.overall_attendance_rate >= 75 ? (
          <span className="status-good">{t("analytics.attendance_good")}</span>
        ) : (
          <span className="status-warning">{t("analytics.attendance_warning")}</span>
        )}
      </div>
    </div>
  );
};

export default AttendanceCard;
