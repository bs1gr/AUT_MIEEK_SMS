/**
 * Analytics Dashboard
 * Main dashboard component displaying student performance, trends, attendance, and grades
 */

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAnalytics } from "../hooks/useAnalytics";
import { PerformanceCard, type PerformanceData } from "./PerformanceCard";
import { TrendsChart, type TrendsData } from "./TrendsChart";
import { AttendanceCard, type AttendanceData } from "./AttendanceCard";
import { GradeDistributionChart, type GradeDistributionData } from "./GradeDistributionChart";
import "../styles/analytics-dashboard.css";

interface AnalyticsDashboardProps {
  studentId?: number;
  courseId?: number;
}

/**
 * Main analytics dashboard
 * Displays comprehensive student analytics with multiple widgets
 */
export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  studentId,
  courseId,
}) => {
  const { t } = useTranslation(["analytics", "common"]);
  const {
    performance,
    trends,
    attendance,
    gradeDistribution,
    isLoading,
    error,
    refetch,
  } = useAnalytics(studentId, courseId);
  const [refreshKey, setRefreshKey] = useState(0);

  const performanceData = performance as PerformanceData | null;
  const trendsData = trends as TrendsData | null;
  const attendanceData = attendance as AttendanceData | null;
  const gradeDistributionData = gradeDistribution as GradeDistributionData | null;

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshKey((prev) => prev + 1);
    await refetch?.();
  };

  if (error) {
    return (
      <div className="analytics-error">
        <h3>{t("error_title", { ns: "analytics" })}</h3>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard" key={refreshKey}>
      <div className="dashboard-header">
        <h1>{t("dashboardTitle", { ns: "analytics" })}</h1>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="refresh-button"
        >
          {isLoading
            ? t("loading", { ns: "common" })
            : t("refresh", { ns: "analytics" })}
        </button>
      </div>

      {isLoading && (
        <div className="loading-spinner">
          {t("loading", { ns: "common" })}
        </div>
      )}

      {!isLoading && (
        <div className="dashboard-grid">
          {/* Performance Card */}
          {performanceData && (
            <div className="dashboard-widget">
              <PerformanceCard data={performanceData} />
            </div>
          )}

          {/* Trends Chart */}
          {trendsData && (
            <div className="dashboard-widget full-width">
              <TrendsChart data={trendsData} />
            </div>
          )}

          {/* Attendance Card */}
          {attendanceData && (
            <div className="dashboard-widget">
              <AttendanceCard data={attendanceData} />
            </div>
          )}

          {/* Grade Distribution */}
          {gradeDistributionData && (
            <div className="dashboard-widget">
              <GradeDistributionChart data={gradeDistributionData} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
