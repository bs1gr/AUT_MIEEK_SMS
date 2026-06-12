/**
 * Trends Chart Component
 * Displays student grade trends over time with moving average
 */

import React from "react";
import { useTranslation } from "react-i18next";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TrendPoint {
  date: string;
  grade: number;
  moving_average?: number;
}

export interface TrendsData {
  student?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  trend_data: TrendPoint[];
  overall_trend: "improving" | "declining" | "stable";
  moving_average: number;
}

interface TrendsChartProps {
  data: TrendsData;
}

/**
 * Trends Chart
 * Line chart showing grade progression and moving average
 */
export const TrendsChart: React.FC<TrendsChartProps> = ({ data }) => {
  const { t } = useTranslation(["analytics", "common"]);

  // Get trend icon
  const getTrendIcon = (trend: string): string => {
    switch (trend) {
      case "improving":
        return "📈";
      case "declining":
        return "📉";
      case "stable":
        return "➡️";
      default:
        return "•";
    }
  };

  const trendColor = {
    improving: "#4CAF50",
    declining: "#F44336",
    stable: "#FFC107",
  }[data.overall_trend] || "#999";

  return (
    <div className="trends-chart widget-card">
      <div className="chart-header">
        <h3>{t("trends_title", { ns: "analytics" })}</h3>
        <div className="trend-badge" style={{ color: trendColor }}>
          {getTrendIcon(data.overall_trend)}{" "}
          {t(`trend_${data.overall_trend}`, { ns: "analytics" })}
        </div>
      </div>

      {data.trend_data && data.trend_data.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trend_data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                domain={[0, 100]}
                label={{
                  value: t("gradePercentage", { ns: "common" }),
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip
                formatter={(value) =>
                  `${Number(typeof value === "number" ? value : Number(value ?? 0)).toFixed(1)}%`
                }
                labelFormatter={(label) =>
                  `${t("dateLabel", { ns: "common" })}${label}`
                }
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="grade"
                stroke="#2196F3"
                dot={{ fill: "#2196F3", r: 4 }}
                name={t("grade", { ns: "analytics" })}
                isAnimationActive={false}
              />
              {data.trend_data.some((d) => d.moving_average !== undefined) && (
                <Line
                  type="monotone"
                  dataKey="moving_average"
                  stroke="#FF9800"
                  dot={false}
                  strokeDasharray="5 5"
                  name={t("moving_average", { ns: "analytics" })}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>

          <div className="chart-stats">
            <div className="stat-item">
              <span className="stat-label">
                {t("current_moving_average", { ns: "analytics" })}
              </span>
              <span className="stat-value">{data.moving_average.toFixed(1)}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">
                {t("data_points", { ns: "analytics" })}
              </span>
              <span className="stat-value">{data.trend_data.length}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="no-data-message">
          {t("no_trends_data", { ns: "analytics" })}
        </div>
      )}
    </div>
  );
};

export default TrendsChart;
