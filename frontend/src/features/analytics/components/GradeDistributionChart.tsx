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

export interface GradeDistributionData {
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
  const { t } = useTranslation(["analytics", "common"]);

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

  return (
    <div className="grade-distribution-chart widget-card">
      <h3>{t("grade_distribution_title", { ns: "analytics" })}</h3>

      {chartData.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="range"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                label={{
                  value: t("count", { ns: "common" }),
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip
                formatter={(value: number | undefined) => value ?? 0}
                labelFormatter={(label) =>
                  `${t("rangeLabel", { ns: "common" })}${label}`
                }
              />
              <Legend />
              <Bar
                dataKey="count"
                fill="#2196F3"
                name={t("grade_count", { ns: "analytics" })}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>

          <div className="distribution-stats">
            <div className="stat-item">
              <span className="stat-label">
                {t("total_grades", { ns: "analytics" })}
              </span>
              <span className="stat-value">{data.total_grades}</span>
            </div>
            {data.average_percentage !== undefined && (
              <div className="stat-item">
                <span className="stat-label">
                  {t("class_average", { ns: "analytics" })}
                </span>
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
              <span>{t("gradeA", { ns: "analytics" })}</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: "#8BC34A" }}></span>
              <span>{t("gradeB", { ns: "analytics" })}</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: "#FFC107" }}></span>
              <span>{t("gradeC", { ns: "analytics" })}</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: "#FF9800" }}></span>
              <span>{t("gradeD", { ns: "analytics" })}</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: "#F44336" }}></span>
              <span>{t("gradeF", { ns: "analytics" })}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="no-data-message">
          {t("no_distribution_data", { ns: "analytics" })}
        </div>
      )}
    </div>
  );
};

export default GradeDistributionChart;
