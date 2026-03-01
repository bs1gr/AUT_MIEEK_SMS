"""
Predictive Analytics Service
Provides machine learning-based predictions for student performance and attendance.
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Tuple
from statistics import mean, stdev

logger = logging.getLogger(__name__)


class PredictiveAnalyticsService:
    """Service for generating predictive insights on student data."""

    def __init__(self):
        """Initialize the predictive analytics service."""
        self.min_data_points = 3  # Minimum points for trend analysis

    def predict_grade_trend(
        self, historical_grades: List[Tuple[datetime, float]], weeks_ahead: int = 4
    ) -> Dict[str, Any]:
        """
        Predict future grade trends using linear regression.

        Args:
            historical_grades: List of (date, grade) tuples sorted by date
            weeks_ahead: Number of weeks to predict into the future

        Returns:
            Dictionary with predictions and trend information
        """
        if len(historical_grades) < self.min_data_points:
            return {
                "error": "Insufficient data for prediction",
                "current_trend": "insufficient_data",
                "predictions": [],
            }

        try:
            # Simple linear regression calculation
            n = len(historical_grades)
            dates = [dt.timestamp() for dt, _ in historical_grades]
            grades = [grade for _, grade in historical_grades]

            # Calculate means
            x_mean = mean(dates)
            y_mean = mean(grades)

            # Calculate slope and intercept
            numerator = sum((dates[i] - x_mean) * (grades[i] - y_mean) for i in range(n))
            denominator = sum((dates[i] - x_mean) ** 2 for i in range(n))

            if denominator == 0:
                return {"error": "Cannot predict: no variance in dates", "predictions": []}

            slope = numerator / denominator
            intercept = y_mean - slope * x_mean

            # Generate predictions
            last_date = historical_grades[-1][0]
            predictions = []

            for week in range(1, weeks_ahead + 1):
                future_date = last_date + timedelta(weeks=week)
                predicted_grade = slope * future_date.timestamp() + intercept

                # Clamp to valid grade range (0-100)
                predicted_grade = max(0, min(100, predicted_grade))

                predictions.append({
                    "date": future_date.isoformat(),
                    "predicted_grade": round(predicted_grade, 2),
                    "confidence": self._calculate_confidence(grades),
                })

            # Determine trend direction
            current_avg = mean(grades[-3:]) if len(grades) >= 3 else mean(grades)
            recent_trend = slope * (dates[-1] - dates[-2]) if n >= 2 else 0

            if recent_trend > 1:
                trend = "improving"
            elif recent_trend < -1:
                trend = "declining"
            else:
                trend = "stable"

            return {
                "current_trend": trend,
                "current_average": round(current_avg, 2),
                "predictions": predictions,
                "slope": round(slope, 4),
                "r_squared": self._calculate_r_squared(dates, grades, slope, intercept),
            }
        except Exception as exc:
            logger.error("Error in grade trend prediction: %s", exc, exc_info=True)
            return {"error": str(exc), "predictions": []}

    def predict_attendance_pattern(
        self, attendance_records: List[Tuple[datetime, bool]]
    ) -> Dict[str, Any]:
        """
        Predict attendance patterns based on historical data.

        Args:
            attendance_records: List of (date, is_present) tuples

        Returns:
            Dictionary with attendance predictions and patterns
        """
        if len(attendance_records) < self.min_data_points:
            return {
                "error": "Insufficient data for prediction",
                "current_pattern": "insufficient_data",
            }

        try:
            # Calculate attendance rate by day of week
            attendance_by_weekday: Dict[int, List[bool]] = {i: [] for i in range(7)}

            for date, is_present in attendance_records:
                weekday = date.weekday()
                attendance_by_weekday[weekday].append(is_present)

            # Calculate percentages
            day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            predictions = []

            for day_idx, day_name in enumerate(day_names):
                if not attendance_by_weekday[day_idx]:
                    continue

                attendance_rate = sum(attendance_by_weekday[day_idx]) / len(attendance_by_weekday[day_idx])
                risk_level = self._assess_risk_level(attendance_rate)

                predictions.append({
                    "day": day_name,
                    "predicted_attendance_rate": round(attendance_rate * 100, 2),
                    "risk_level": risk_level,
                    "sample_size": len(attendance_by_weekday[day_idx]),
                })

            # Overall attendance rate
            total_present = sum(is_present for _, is_present in attendance_records)
            overall_rate = total_present / len(attendance_records)

            return {
                "overall_attendance_rate": round(overall_rate * 100, 2),
                "attendance_by_day": sorted(predictions, key=lambda x: day_names.index(x["day"])),
                "risk_level": self._assess_risk_level(overall_rate),
                "recommendation": self._generate_attendance_recommendation(overall_rate),
            }
        except Exception as exc:
            logger.error("Error in attendance prediction: %s", exc, exc_info=True)
            return {"error": str(exc)}

    def assess_student_risk(
        self,
        grades: List[float],
        attendance_rate: float,
        recent_trend: str,
    ) -> Dict[str, Any]:
        """
        Assess overall risk level for a student.

        Args:
            grades: Recent grades (0-100)
            attendance_rate: Percentage of classes attended (0-100)
            recent_trend: 'improving', 'stable', or 'declining'

        Returns:
            Risk assessment with recommendations
        """
        if not grades or attendance_rate is None:
            return {"risk_level": "unknown", "code": "insufficient_data"}

        try:
            # Calculate grade average
            grade_avg = mean(grades) if grades else 0

            # Risk scoring (0-100, higher = more risk)
            risk_score = 0

            # Grade-based risk
            if grade_avg < 50:
                risk_score += 40
            elif grade_avg < 65:
                risk_score += 25
            elif grade_avg < 75:
                risk_score += 10
            else:
                risk_score += 0

            # Attendance-based risk
            if attendance_rate < 70:
                risk_score += 35
            elif attendance_rate < 80:
                risk_score += 15
            else:
                risk_score += 0

            # Trend-based risk
            if recent_trend == "declining":
                risk_score += 15
            elif recent_trend == "stable":
                risk_score += 0
            elif recent_trend == "improving":
                risk_score -= 5

            # Clamp to 0-100
            risk_score = max(0, min(100, risk_score))

            # Determine risk level
            if risk_score < 30:
                risk_level = "low"
                color = "green"
            elif risk_score < 60:
                risk_level = "medium"
                color = "yellow"
            else:
                risk_level = "high"
                color = "red"

            return {
                "risk_level": risk_level,
                "risk_score": round(risk_score, 2),
                "color": color,
                "grade_average": round(grade_avg, 2),
                "attendance_rate": round(attendance_rate, 2),
                "factors": {
                    "grades": self._risk_factor_description(grade_avg),
                    "attendance": self._risk_factor_description(attendance_rate),
                    "trend": recent_trend,
                },
                "recommendations": self._generate_risk_recommendations(grade_avg, attendance_rate, recent_trend),
            }
        except Exception as exc:
            logger.error("Error in risk assessment: %s", exc, exc_info=True)
            return {"error": str(exc)}

    def predict_final_grade(
        self,
        current_grades: List[float],
        assignment_weights: Dict[str, float],
        missing_assessments: int = 0,
    ) -> Dict[str, Any]:
        """
        Predict final course grade based on current performance.

        Args:
            current_grades: List of current grades
            assignment_weights: Dictionary of assessment type weights
            missing_assessments: Number of missing grades

        Returns:
            Predicted final grade with confidence interval
        """
        if not current_grades:
            return {"error": "No grades available"}

        try:
            current_avg = mean(current_grades)

            # Simple prediction: assume future grades match current average
            # (More sophisticated: could use trend analysis)
            predicted_final = current_avg

            # Confidence decreases with missing assessments
            confidence = max(50, 100 - (missing_assessments * 10))

            # Project scenarios
            best_case = min(100, (current_avg + 10))
            worst_case = max(0, (current_avg - 10))

            return {
                "predicted_final_grade": round(predicted_final, 2),
                "confidence_percentage": round(confidence, 2),
                "scenarios": {
                    "optimistic": round(best_case, 2),
                    "realistic": round(predicted_final, 2),
                    "pessimistic": round(worst_case, 2),
                },
                "current_average": round(current_avg, 2),
                "missing_assessments": missing_assessments,
                "recommendation": self._generate_final_grade_recommendation(predicted_final),
            }
        except Exception as exc:
            logger.error("Error in final grade prediction: %s", exc, exc_info=True)
            return {"error": str(exc)}

    def _calculate_confidence(self, values: List[float]) -> float:
        """Calculate confidence level (0-100) based on data variance."""
        if len(values) < 2:
            return 50.0

        try:
            std_dev = stdev(values)
            avg = mean(values)

            # Coefficient of variation (lower = more consistent = higher confidence)
            if avg == 0:
                return 50.0

            cv = (std_dev / avg) * 100
            confidence = max(0, 100 - cv)
            return min(100, confidence)
        except (ValueError, ZeroDivisionError):
            return 50.0

    def _calculate_r_squared(
        self, x: List[float], y: List[float], slope: float, intercept: float
    ) -> float:
        """Calculate R-squared value for regression model."""
        if not y:
            return 0.0

        y_mean = mean(y)
        ss_tot = sum((y[i] - y_mean) ** 2 for i in range(len(y)))
        ss_res = sum((y[i] - (slope * x[i] + intercept)) ** 2 for i in range(len(y)))

        if ss_tot == 0:
            return 0.0

        return 1 - (ss_res / ss_tot)

    def _assess_risk_level(self, rate: float) -> str:
        """Assess risk level based on percentage."""
        if rate >= 0.80:
            return "low"
        elif rate >= 0.60:
            return "medium"
        else:
            return "high"

    def _risk_factor_description(self, value: float) -> str:
        """Generate description for a risk factor."""
        if value >= 75:
            return "Good"
        elif value >= 50:
            return "Concerning"
        else:
            return "Critical"

    def _generate_risk_recommendations(
        self, grade_avg: float, attendance_rate: float, trend: str
    ) -> List[str]:
        """Generate recommendations based on risk factors."""
        recommendations = []

        if grade_avg < 60:
            recommendations.append("Schedule tutoring sessions for struggling subjects")
        if grade_avg < 50:
            recommendations.append("Consider meeting with academic advisor")

        if attendance_rate < 70:
            recommendations.append("Improve class attendance to catch up on missed material")

        if trend == "declining":
            recommendations.append("Seek additional academic support immediately")

        if not recommendations:
            recommendations.append("Continue current effort - performance is on track")

        return recommendations

    def _generate_attendance_recommendation(self, rate: float) -> str:
        """Generate attendance recommendation."""
        if rate >= 0.85:
            return "Excellent attendance - maintain current pace"
        elif rate >= 0.75:
            return "Good attendance - aim for higher consistency"
        elif rate >= 0.60:
            return "Attendance needs improvement - target 80%+ attendance"
        else:
            return "Poor attendance - increase attendance significantly to pass"

    def _generate_final_grade_recommendation(self, predicted_grade: float) -> str:
        """Generate recommendation for final grade."""
        if predicted_grade >= 85:
            return "Excellent progress - maintain current effort"
        elif predicted_grade >= 75:
            return "Good progress - could benefit from additional practice"
        elif predicted_grade >= 65:
            return "Passing - consider additional support"
        else:
            return "At risk - urgent intervention recommended"
