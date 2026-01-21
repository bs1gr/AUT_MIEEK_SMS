/**
 * Analytics Dashboard
 * Main dashboard component displaying student performance, trends, attendance, and grades
 */

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAnalytics } from "../hooks/useAnalytics";
import { PerformanceCard } from "./PerformanceCard";
import { TrendsChart } from "./TrendsChart";
import { AttendanceCard } from "./AttendanceCard";
import { GradeDistributionChart } from "./GradeDistributionChart";
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
  const { t } = useTranslation();
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

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshKey((prev) => prev + 1);
    await refetch?.();
  };

  if (error) {
    return (
      <div className="analytics-error">
        <h3>{t("analytics.error_title")}</h3>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard" key={refreshKey}>
      <div className="dashboard-header">
        <h1>{t("analytics.title")}</h1>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="refresh-button"
        >
          {isLoading ? t("common.loading") : t("common.refresh")}
        </button>
      </div>

      {isLoading && <div className="loading-spinner">{t("common.loading")}...</div>}

      {!isLoading && (
        <div className="dashboard-grid">
          {/* Performance Card */}
          {performance && (
            <div className="dashboard-widget">
              <PerformanceCard data={performance} />
            </div>
          )}

          {/* Trends Chart */}
          {trends && (
            <div className="dashboard-widget full-width">
              <TrendsChart data={trends} />
            </div>
          )}

          {/* Attendance Card */}
          {attendance && (
            <div className="dashboard-widget">
              <AttendanceCard data={attendance} />
            </div>
          )}

          {/* Grade Distribution */}
          {gradeDistribution && (
            <div className="dashboard-widget">
              <GradeDistributionChart data={gradeDistribution} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
