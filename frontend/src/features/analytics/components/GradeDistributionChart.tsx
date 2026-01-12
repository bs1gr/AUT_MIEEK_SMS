/**
 * Grade Distribution Chart Component
 * Displays histogram of grade distribution by grade ranges
 */

import React from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DistributionBucket {
  range: string;
  count: number;
}

interface GradeDistributionData {
  course?: {
    id: number;
    code: string;
    name: string;
  };
  distribution: Record<string, number> | DistributionBucket[];
  average_percentage?: number;
  total_grades: number;
}

interface GradeDistributionChartProps {
  data: GradeDistributionData;
}

/**
 * Grade Distribution Chart
 * Bar chart showing distribution of grades across ranges
 */
export const GradeDistributionChart: React.FC<GradeDistributionChartProps> = ({
  data,
}) => {
  const { t } = useTranslation();

  // Convert distribution to chart data
  const getChartData = (): DistributionBucket[] => {
    if (Array.isArray(data.distribution)) {
      return data.distribution;
    }

    // Convert object to array
    return Object.entries(data.distribution).map(([range, count]) => ({
      range,
      count: count as number,
    }));
  };

  const chartData = getChartData();

  // Get color for grade range
  const getGradeColor = (range: string): string => {
    if (range.includes("90") || range.includes("A")) return "#4CAF50";
    if (range.includes("80") || range.includes("B")) return "#8BC34A";
    if (range.includes("70") || range.includes("C")) return "#FFC107";
    if (range.includes("60") || range.includes("D")) return "#FF9800";
    return "#F44336"; // F or < 60
  };

  return (
    <div className="grade-distribution-chart widget-card">
      <h3>{t("analytics.grade_distribution_title")}</h3>

      {chartData.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="range"
                tick={{ fontSize: 12 }}
              />
              <YAxis label={{ value: "Count", angle: -90, position: "insideLeft" }} />
              <Tooltip
                formatter={(value: number) => value}
                labelFormatter={(label) => `Range: ${label}`}
              />
              <Legend />
              <Bar
                dataKey="count"
                fill="#2196F3"
                name={t("analytics.grade_count")}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>

          <div className="distribution-stats">
            <div className="stat-item">
              <span className="stat-label">{t("analytics.total_grades")}</span>
              <span className="stat-value">{data.total_grades}</span>
            </div>
            {data.average_percentage !== undefined && (
              <div className="stat-item">
                <span className="stat-label">{t("analytics.class_average")}</span>
                <span className="stat-value">
                  {data.average_percentage.toFixed(1)}%
                </span>
              </div>
            )}
          </div>

          {/* Grade range legend */}
          <div className="distribution-legend">
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: "#4CAF50" }}></span>
              <span>A (90-100%)</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: "#8BC34A" }}></span>
              <span>B (80-89%)</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: "#FFC107" }}></span>
              <span>C (70-79%)</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: "#FF9800" }}></span>
              <span>D (60-69%)</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: "#F44336" }}></span>
              <span>F (&lt;60%)</span>
            </div>
          </div>
        </>
      ) : (
        <div className="no-data-message">
          {t("analytics.no_distribution_data")}
        </div>
      )}
    </div>
  );
};

export default GradeDistributionChart;
