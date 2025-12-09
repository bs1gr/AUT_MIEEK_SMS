"""
PDF Data to SMS Import Converter
==================================
Converts generic PDF-extracted data into the JSON format required by the
Student Management System's import endpoints.

Use this script for already-structured JSON (or other tools' output) where
fields like course_code, course_name, semester, etc., are present. It will
normalize types, parse evaluation_rules, and teaching_schedule.

For the raw MIEEK extraction format (code in course_name, ECTS as a list,
Greek Αξιολόγηση entries), prefer the specialized converter:
    scripts/utils/converters/convert_mieek_to_import.py

Usage:
    python scripts/utils/converters/convert_pdf_to_import.py --input data.json --type courses --output templates/courses/
    python scripts/utils/converters/convert_pdf_to_import.py --input students.json --type students --output templates/students/

Author: SMS Development Team
Date: October 26, 2025
"""

import json
import re
import sys
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime, date


class PDFToSMSConverter:
    """Converts PDF-extracted data to SMS import format"""

    def __init__(self, input_file: str, output_dir: str, data_type: str = "courses"):
        self.input_file = Path(input_file)
        self.output_dir = Path(output_dir)
        self.data_type = data_type.lower()
        self.errors: List[str] = []
        self.warnings: List[str] = []

        # Ensure output directory exists
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def load_input_data(self) -> Any:
        """Load data from input file"""
        try:
            with open(self.input_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            print(f"✓ Loaded data from {self.input_file}")
            return data
        except Exception as e:
            print(f"✗ Failed to load {self.input_file}: {e}")
            sys.exit(1)

    def normalize_course_code(self, code: Any) -> str:
        """Normalize course code to string format"""
        if isinstance(code, list):
            # Join list elements with space
            return " ".join([str(x).strip() for x in code if str(x).strip()])
        return str(code).strip()

    def normalize_course_name(self, name: Any) -> str:
        """Normalize course name to string format"""
        if isinstance(name, list):
            return " ".join([str(x).strip() for x in name if str(x).strip()])
        return str(name).strip()

    def normalize_semester(self, semester: Any) -> str:
        """Normalize semester field, provide default if missing"""
        if not semester:
            return "Α' Εξάμηνο"  # Default to 1st semester
        if isinstance(semester, list):
            semester = " ".join([str(x).strip() for x in semester if str(x).strip()])

        semester = str(semester).strip()
        if not semester:
            return "Α' Εξάμηνο"

        return semester

    def normalize_description(self, description: Any) -> str:
        """Normalize description field"""
        if isinstance(description, list):
            try:
                return "\n".join([str(x) for x in description if str(x).strip()])
            except Exception:
                return str(description)
        return str(description) if description else ""

    def parse_evaluation_rules(self, rules: Any) -> List[Dict[str, Any]]:
        """
        Parse evaluation rules from various formats into standardized list of dicts.

        Supports formats:
        - List of dicts: [{"category": "Midterm", "weight": 30}]
        - List of strings: ["Midterm: 30%", "Final: 40%"]
        - List of alternating values: ["Midterm", 30, "Final", 40]
        - String patterns: "Midterm: 30%, Final: 40%"
        """
        if not rules:
            return []

        # Already in correct format
        if isinstance(rules, list) and all(isinstance(x, dict) for x in rules):
            return rules

        # String format - parse with regex
        if isinstance(rules, str):
            try:
                # First try to parse as JSON
                parsed = json.loads(rules)
                if isinstance(parsed, list):
                    return self.parse_evaluation_rules(parsed)
            except:
                pass

            # Pattern matching for "Category: Weight%" format
            pattern = re.compile(r"(?P<cat>[^:,;]+?)[\s:,-]+(?P<w>\d+(?:[\.,]\d+)?)%?")
            result = []
            for match in pattern.finditer(rules):
                cat = match.group("cat").strip()
                weight_str = match.group("w").replace(",", ".")
                try:
                    weight = float(weight_str)
                    # Skip metadata entries
                    if cat not in ["Γλώσσα", "Ελληνική", "Αγγλική", "Κωδικός", "Μαθήματος"]:
                        result.append({"category": cat, "weight": weight})
                except ValueError:
                    pass
            return result

        # List format - handle various structures
        if isinstance(rules, list):
            # Skip metadata entries
            metadata_terms = [
                "Γλώσσα",
                "Ελληνική",
                "Αγγλική",
                "Κωδικός",
                "Μαθήματος",
                "Τίτλος Μαθήματος",
                "Κωδικός Μαθήματος",
                "Τύπος Μαθήματος",
                "Υποχρεωτικό",
                "Επίπεδο",
                "Έτος/Εξάμηνο",
                "Φοίτησης",
                "Όνομα Διδάσκοντα",
                "Επίπεδο 5 του Εθνικού Πλαισίου Προσόντων",
            ]

            # Filter out metadata
            filtered = [x for x in rules if str(x).strip() not in metadata_terms]

            # Try parsing as alternating category/weight pairs
            result = []
            buffer = []

            for item in filtered:
                if isinstance(item, dict):
                    # Already a dict, add directly
                    result.append(item)
                elif isinstance(item, str):
                    # Check if it's a complete entry like "Midterm: 30%"
                    pattern = re.compile(r"^(?P<cat>.+?)[\s:,-]+(?P<w>\d+(?:[\.,]\d+)?)%?$")
                    match = pattern.match(item.strip())
                    if match:
                        cat = match.group("cat").strip()
                        w_str = match.group("w").replace(",", ".")
                        try:
                            weight = float(w_str)
                            result.append({"category": cat, "weight": weight})
                        except ValueError:
                            pass
                    else:
                        # Might be part of alternating pairs
                        buffer.append(item)
                        if len(buffer) == 2:
                            cat = str(buffer[0]).strip()
                            w_raw = buffer[1]
                            if isinstance(w_raw, str):
                                w_str = w_raw.replace("%", "").strip().replace(",", ".")
                            else:
                                w_str = str(w_raw)
                            try:
                                weight = float(w_str)
                                result.append({"category": cat, "weight": weight})
                            except ValueError:
                                pass
                            buffer = []
                else:
                    # Numeric or other type - add to buffer
                    buffer.append(item)
                    if len(buffer) == 2:
                        cat = str(buffer[0]).strip()
                        try:
                            weight = float(buffer[1])
                            result.append({"category": cat, "weight": weight})
                        except ValueError:
                            pass
                        buffer = []

            return result

        # Single dict
        if isinstance(rules, dict):
            return [rules]

        return []

    def parse_teaching_schedule(self, schedule: Any) -> Dict[str, Any]:
        """
        Parse teaching schedule into structured format.

        Expected format:
        {
            "Monday": {"periods": 2, "start_time": "08:00", "duration": 50},
            "Tuesday": {"periods": 1, "start_time": "10:00", "duration": 45}
        }
        """
        if not schedule:
            return {}

        # String - try to parse as JSON
        if isinstance(schedule, str):
            try:
                return json.loads(schedule)
            except:
                return {}

        # Already a dict
        if isinstance(schedule, dict):
            return schedule

        # Empty list is acceptable
        if isinstance(schedule, list) and len(schedule) == 0:
            return {}

        return {}

    def convert_course(self, course_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Convert a single course record to SMS format"""
        try:
            # Required fields
            course_code = course_data.get("course_code")
            if not course_code:
                self.errors.append(f"Missing course_code in record: {course_data}")
                return None

            course_code = self.normalize_course_code(course_code)

            # Build normalized course object
            course = {
                "course_code": course_code,
                "course_name": self.normalize_course_name(course_data.get("course_name", "Unnamed Course")),
                "semester": self.normalize_semester(course_data.get("semester")),
            }

            # Optional numeric fields
            if "credits" in course_data:
                try:
                    course["credits"] = int(course_data["credits"])
                except (ValueError, TypeError):
                    self.warnings.append(f"Invalid credits for {course_code}, using default")

            if "hours_per_week" in course_data:
                try:
                    course["hours_per_week"] = float(course_data["hours_per_week"])
                except (ValueError, TypeError):
                    self.warnings.append(f"Invalid hours_per_week for {course_code}, using default")

            if "absence_penalty" in course_data:
                try:
                    course["absence_penalty"] = float(course_data["absence_penalty"])
                except (ValueError, TypeError):
                    self.warnings.append(f"Invalid absence_penalty for {course_code}, using default")

            # Optional text fields
            if "description" in course_data:
                course["description"] = self.normalize_description(course_data["description"])

            # Complex fields
            if "evaluation_rules" in course_data:
                rules = self.parse_evaluation_rules(course_data["evaluation_rules"])
                if rules:
                    course["evaluation_rules"] = rules

            if "teaching_schedule" in course_data:
                schedule = self.parse_teaching_schedule(course_data["teaching_schedule"])
                if schedule:
                    course["teaching_schedule"] = schedule

            return course

        except Exception as e:
            self.errors.append(f"Failed to convert course {course_data.get('course_code', 'unknown')}: {e}")
            return None

    def convert_student(self, student_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Convert a single student record to SMS format"""
        try:
            # Required fields
            student_id = student_data.get("student_id")
            email = student_data.get("email")

            if not student_id or not email:
                self.errors.append(f"Missing student_id or email in record: {student_data}")
                return None

            # Build normalized student object
            student = {
                "student_id": str(student_id).strip(),
                "email": str(email).strip(),
                "first_name": str(student_data.get("first_name", "")).strip(),
                "last_name": str(student_data.get("last_name", "")).strip(),
            }

            # Optional fields
            if "enrollment_date" in student_data:
                # Normalize date format to ISO
                date_val = student_data["enrollment_date"]
                if isinstance(date_val, str):
                    try:
                        # Try parsing various date formats
                        parsed = datetime.strptime(date_val, "%Y-%m-%d")
                        student["enrollment_date"] = parsed.date().isoformat()
                    except ValueError:
                        try:
                            parsed = datetime.strptime(date_val, "%d/%m/%Y")
                            student["enrollment_date"] = parsed.date().isoformat()
                        except ValueError:
                            self.warnings.append(f"Invalid date format for {student_id}, skipping enrollment_date")
                elif isinstance(date_val, date):
                    student["enrollment_date"] = date_val.isoformat()

            if "is_active" in student_data:
                student["is_active"] = bool(student_data["is_active"])

            # Extended profile fields
            for field in ["father_name", "mobile_phone", "phone", "health_issue", "note", "study_year"]:
                if field in student_data:
                    student[field] = student_data[field]

            return student

        except Exception as e:
            self.errors.append(f"Failed to convert student {student_data.get('student_id', 'unknown')}: {e}")
            return None

    def convert_and_save(self):
        """Main conversion process"""
        print(f"\n{'=' * 60}")
        print("PDF to SMS Import Converter")
        print(f"{'=' * 60}")
        print(f"Input file: {self.input_file}")
        print(f"Output dir: {self.output_dir}")
        print(f"Data type:  {self.data_type}")
        print(f"{'=' * 60}\n")

        # Load input data
        input_data = self.load_input_data()

        # Ensure data is a list
        if isinstance(input_data, dict):
            items = [input_data]
        elif isinstance(input_data, list):
            items = input_data
        else:
            print(f"✗ Invalid input format. Expected dict or list, got {type(input_data)}")
            sys.exit(1)

        print(f"Found {len(items)} records to convert\n")

        # Convert based on type
        converted = []
        if self.data_type == "courses":
            for item in items:
                course = self.convert_course(item)
                if course:
                    converted.append(course)
        elif self.data_type == "students":
            for item in items:
                student = self.convert_student(item)
                if student:
                    converted.append(student)
        else:
            print(f"✗ Invalid data type: {self.data_type}. Must be 'courses' or 'students'")
            sys.exit(1)

        # Save converted data
        if converted:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = self.output_dir / f"{self.data_type}_{timestamp}.json"

            try:
                with open(output_file, "w", encoding="utf-8") as f:
                    json.dump(converted, f, ensure_ascii=False, indent=2)
                print(f"✓ Successfully converted {len(converted)} records")
                print(f"✓ Saved to: {output_file}\n")
            except Exception as e:
                print(f"✗ Failed to save output: {e}")
                sys.exit(1)
        else:
            print("✗ No records were successfully converted\n")

        # Report warnings and errors
        if self.warnings:
            print(f"\n⚠ Warnings ({len(self.warnings)}):")
            for warn in self.warnings[:10]:  # Show first 10
                print(f"  • {warn}")
            if len(self.warnings) > 10:
                print(f"  ... and {len(self.warnings) - 10} more")

        if self.errors:
            print(f"\n✗ Errors ({len(self.errors)}):")
            for err in self.errors[:10]:  # Show first 10
                print(f"  • {err}")
            if len(self.errors) > 10:
                print(f"  ... and {len(self.errors) - 10} more")

        # Summary
        print(f"\n{'=' * 60}")
        print("Conversion Summary:")
        print(f"  Total input records:  {len(items)}")
        print(f"  Successfully converted: {len(converted)}")
        print(f"  Warnings:              {len(self.warnings)}")
        print(f"  Errors:                {len(self.errors)}")
        print(f"{'=' * 60}\n")

        if converted:
            print("Next steps:")
            print(f"1. Review the generated file: {output_file}")
            print("2. Use the SMS Operations panel to import the data")
            print(f"3. Or use the API: POST /api/v1/imports/{self.data_type}\n")

        return len(converted) > 0


def main():
    """Command-line interface"""
    parser = argparse.ArgumentParser(
        description="Convert PDF-extracted data to SMS import format",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Convert courses from MIEEK PDF extraction
    python scripts/utils/converters/convert_pdf_to_import.py \
        --input D:/SMS/AUT/extract_mieek_pdfs.json \
        --type courses \
        --output templates/courses/

    # Convert student data
    python scripts/utils/converters/convert_pdf_to_import.py \
        --input students_raw.json \
        --type students \
        --output templates/students/

Required JSON Format:

Courses:
  {
    "course_code": "CS101",
    "course_name": "Introduction to Computer Science",
    "semester": "Fall 2025",
    "credits": 3,
    "description": "Course description...",
    "hours_per_week": 3.0,
    "evaluation_rules": [
      {"category": "Midterm Exam", "weight": 30},
      {"category": "Final Exam", "weight": 40},
      {"category": "Homework", "weight": 30}
    ],
    "teaching_schedule": {
      "Monday": {"periods": 2, "start_time": "08:00", "duration": 50}
    }
  }

Students:
  {
    "student_id": "S12345",
    "email": "student@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "enrollment_date": "2025-09-01",
    "is_active": true
  }
        """,
    )

    parser.add_argument("--input", "-i", required=True, help="Input JSON file with PDF-extracted data")

    parser.add_argument("--output", "-o", required=True, help="Output directory for converted JSON files")

    parser.add_argument(
        "--type",
        "-t",
        choices=["courses", "students"],
        default="courses",
        help="Type of data to convert (default: courses)",
    )

    args = parser.parse_args()

    # Create converter and run
    converter = PDFToSMSConverter(input_file=args.input, output_dir=args.output, data_type=args.type)

    success = converter.convert_and_save()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
