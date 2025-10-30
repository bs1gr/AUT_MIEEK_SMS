"""
MIEEK PDF Data to SMS Import Converter
=======================================
Specialized converter for MIEEK course catalog PDF extractions.

This handles the specific format extracted from MIEEK PDFs where:
- 'course_name' field contains the course code (aut0101, aut0102, etc.)
- 'ECTS' field contains credit information
- 'Αξιολόγηση' field contains evaluation rules in Greek
- Course titles are embedded in other fields

Usage:
    python tools/convert_mieek_to_import.py --input D:/SMS/AUT/data/courses.json --output templates/courses/

Author: SMS Development Team
Date: October 26, 2025
"""

import json
import re
import sys
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import unicodedata


class MIEEKToSMSConverter:
    """Converts MIEEK PDF-extracted data to SMS import format"""

    # Map of Greek semester names to standard format
    SEMESTER_MAP = {
        "1": "Α' Εξάμηνο",
        "2": "Β' Εξάμηνο",
        "3": "Γ' Εξάμηνο",
        "4": "Δ' Εξάμηνο",
        "α": "Α' Εξάμηνο",
        "β": "Β' Εξάμηνο",
        "γ": "Γ' Εξάμηνο",
        "δ": "Δ' Εξάμηνο",
    }

    def __init__(self, input_file: str, output_dir: str):
        self.input_file = Path(input_file)
        self.output_dir = Path(output_dir)
        self.errors: List[str] = []
        self.warnings: List[str] = []

        # Ensure output directory exists
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def load_input_data(self) -> List[Dict]:
        """Load MIEEK data from input file"""
        try:
            with open(self.input_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            print(f"✓ Loaded data from {self.input_file}")

            if not isinstance(data, list):
                data = [data]

            return data
        except Exception as e:
            print(f"✗ Failed to load {self.input_file}: {e}")
            sys.exit(1)

    def extract_credits(self, ects_field: Any) -> Optional[int]:
        """Extract credits from ECTS field"""
        if not ects_field:
            return None

        # ECTS field is usually a list: ["3", "Διαλέξεις /", "2", "Εργαστήρια /", "0", ...]
        if isinstance(ects_field, list) and len(ects_field) > 0:
            try:
                return int(ects_field[0])
            except (ValueError, IndexError):
                return None

        if isinstance(ects_field, (int, float)):
            return int(ects_field)

        if isinstance(ects_field, str):
            try:
                return int(ects_field)
            except ValueError:
                return None

        return None

    def extract_hours_per_week(self, ects_field: Any) -> Optional[float]:
        """Extract hours per week from ECTS field (sum of Διαλέξεις + Εργαστήρια)"""
        if not ects_field or not isinstance(ects_field, list):
            return None

        # Format: [ECTS, "Διαλέξεις /", lecture_hours, "Εργαστήρια /", lab_hours, "Εβδομάδα", "Εβδομάδα"]
        # We need to sum lecture_hours + lab_hours
        try:
            lectures = 0.0
            labs = 0.0

            for i, item in enumerate(ects_field):
                if isinstance(item, str):
                    # Find "Διαλέξεις /" and get the NEXT value
                    if "Διαλέξεις" in item and i + 1 < len(ects_field):
                        try:
                            lectures = float(ects_field[i + 1])
                        except (ValueError, TypeError):
                            pass

                    # Find "Εργαστήρια /" and get the NEXT value
                    elif "Εργαστήρια" in item and i + 1 < len(ects_field):
                        try:
                            labs = float(ects_field[i + 1])
                        except (ValueError, TypeError):
                            pass

            total_hours = lectures + labs
            return total_hours if total_hours > 0 else None

        except (ValueError, IndexError, TypeError):
            pass

        return None

    def extract_semester(self, course_code: str) -> str:
        """Extract semester from course code (aut0101 -> 1st year, 1st semester)"""
        # Course code format: autXYZZ where X=year, Y=semester
        if len(course_code) >= 6:
            year_code = course_code[3]
            semester_code = course_code[4]

            # Year 0 maps to 1, year 1 maps to 2, etc.
            year = int(year_code) + 1 if year_code.isdigit() else 1
            semester = int(semester_code) if semester_code.isdigit() else 1

            # Calculate absolute semester
            abs_semester = (year - 1) * 2 + semester

            # Map to Greek format
            semester_names = ["Α'", "Β'", "Γ'", "Δ'", "Ε'", "ΣΤ'", "Ζ'", "Η'"]
            if abs_semester <= len(semester_names):
                return f"{semester_names[abs_semester - 1]} Εξάμηνο"

        return "Α' Εξάμηνο"  # Default

    def extract_evaluation_rules(self, evaluation_field: Any) -> List[Dict[str, Any]]:
        """Extract evaluation rules from 'Αξιολόγηση' field"""
        if not evaluation_field:
            return []

        def _strip_accents(s: str) -> str:
            try:
                return "".join(ch for ch in unicodedata.normalize("NFD", s) if unicodedata.category(ch) != "Mn")
            except Exception:
                return s

        def _clean_cat(s: str) -> str:
            s = s.strip()
            # Remove stray trailing punctuation/parentheses
            s = re.sub(r"[\)\s]+$", "", s)
            # Collapse multiple spaces and separators
            s = re.sub(r"\s*[·•:\-–—]\s*", " ", s)
            s = re.sub(r"\s+", " ", s)
            return s.strip()

        def _map_category(raw: str) -> str:
            base = raw.strip()
            base_noacc = _strip_accents(base).lower()

            # Common Greek -> English mappings (keywords, not exact match)
            mapping = [
                (["συμμετοχ"], "Class Participation"),
                (["συνεχη", "διαρκ"], "Continuous Assessment"),
                (["εργαστηρι"], "Lab Work"),
                (["ασκησ"], "Exercises"),
                (["εργασι"], "Assignments"),
                (["εργασιων στο σπιτι", "στο σπιτι"], "Homework"),
                (["ενδιαμεση", "προοδος"], "Midterm Exam"),
                (["τελικ", "τελικη εξεταση"], "Final Exam"),
                (["εξεταση"], "Exam"),
                (["παρουσιασ"], "Presentation"),
                (["project", "εργο"], "Project"),
                (["quiz", "τεστ"], "Quiz"),
                (["report", "εκθεση"], "Report"),
            ]

            for keys, label in mapping:
                for k in keys:
                    if k in base_noacc:
                        return label

            # English passthrough (normalize capitalization)
            english_known = {
                "class participation": "Class Participation",
                "continuous assessment": "Continuous Assessment",
                "lab assessment": "Lab Work",
                "lab work": "Lab Work",
                "assignments": "Assignments",
                "homework": "Homework",
                "midterm exam": "Midterm Exam",
                "final exam": "Final Exam",
                "exam": "Exam",
                "presentation": "Presentation",
                "project": "Project",
                "quiz": "Quiz",
                "report": "Report",
            }
            low = base.lower()
            if low in english_known:
                return english_known[low]

            # Fallback: Title-case cleaned original (Greek left as-is)
            return base

        rules: List[Dict[str, Any]] = []

        # Convert to list if needed
        items = evaluation_field if isinstance(evaluation_field, list) else [evaluation_field]

        # Join multi-line entries that likely belong together (colon without percent on first line)
        joined: List[str] = []
        buf = ""
        for it in items:
            if not isinstance(it, str):
                continue
            s = it.strip()
            if not s:
                continue
            if s in ["Γλώσσα", "Ελληνική", "Αγγλική", "Αξιολόγηση"]:
                continue
            # If buffer exists and current line ends with percent, append and flush
            if buf:
                if re.search(r"\d+(?:[\.,]\d+)?%?$", s):
                    buf = f"{buf} {s}".strip()
                    joined.append(buf)
                    buf = ""
                    continue
                # If new header with colon appears, push previous and start new
                if ":" in s:
                    joined.append(buf)
                    buf = s
                    continue
                # Otherwise continue accumulating
                buf = f"{buf} {s}".strip()
            else:
                # Start buffer when we see a colon without percent number
                if ":" in s and not re.search(r"\d+(?:[\.,]\d+)?%?$", s):
                    buf = s
                else:
                    joined.append(s)
        if buf:
            joined.append(buf)

        # Parsing patterns: "Name: 40%" or "Name - 40" or "Name 40%"
        pat = re.compile(r"^(?P<cat>.+?)\s*[\:\-–—]?\s*(?P<w>\d+(?:[\.,]\d+)?)%?$")

        # First pass: direct pattern matches
        for line in joined:
            m = pat.match(line.strip())
            if not m:
                continue
            raw_cat = _clean_cat(m.group("cat"))
            w_str = m.group("w").replace(",", ".")
            try:
                weight = float(w_str)
            except Exception:
                weight = 0.0
            cat = _map_category(raw_cat)
            rules.append({"category": cat, "weight": weight})

        # If still empty, try pairing primitives from original items (cat, weight)
        if not rules:
            prims: List[Any] = [x for x in items if isinstance(x, (str, int, float))]
            buf2: List[Any] = []
            for x in prims:
                buf2.append(x)
                if len(buf2) == 2:
                    c_raw = _clean_cat(str(buf2[0]))
                    try:
                        w_num = float(str(buf2[1]).replace("%", "").replace(",", "."))
                    except Exception:
                        w_num = 0.0
                    rules.append({"category": _map_category(c_raw), "weight": w_num})
                    buf2 = []

        # Deduplicate categories by keeping last occurrence and normalize totals later if needed
        dedup: Dict[str, float] = {}
        for r in rules:
            dedup[r["category"]] = float(r.get("weight", 0.0))
        out = [{"category": k, "weight": v} for k, v in dedup.items()]
        return out

    def extract_description(self, course_data: Dict) -> str:
        """Construct course description from various fields"""
        parts = []

        # Add course objectives
        if "Στόχος Μαθήματος" in course_data:
            objective = course_data["Στόχος Μαθήματος"]
            if isinstance(objective, list):
                objective = " ".join(str(x) for x in objective if str(x).strip())
            if objective:
                parts.append(f"**Στόχος:** {objective}")

        # Add learning outcomes
        if "Μαθησιακά\nΑποτελέσματα" in course_data or "Μαθησιακά Αποτελέσματα" in course_data:
            outcomes = course_data.get("Μαθησιακά\nΑποτελέσματα") or course_data.get("Μαθησιακά Αποτελέσματα")
            if isinstance(outcomes, list):
                outcomes = " ".join(str(x) for x in outcomes if str(x).strip())
            if outcomes:
                parts.append(f"\n**Μαθησιακά Αποτελέσματα:** {outcomes}")

        # Add course content
        if "Περιεχόμενο\nΜαθήματος" in course_data or "Περιεχόμενο Μαθήματος" in course_data:
            content = course_data.get("Περιεχόμενο\nΜαθήματος") or course_data.get("Περιεχόμενο Μαθήματος")
            if isinstance(content, list):
                # Filter out metadata
                content = " ".join(
                    str(x)
                    for x in content
                    if str(x).strip() and x not in ["Μεθοδολογία", "Διδασκαλίας", "Βιβλιογραφία", "Βασική:"]
                )
            if content:
                parts.append(f"\n**Περιεχόμενο:** {content}")

        return "\n".join(parts) if parts else "Course description not available"

    def generate_course_name(self, course_code: str, description: str) -> str:
        """Generate a course name from code and description"""
        # Map common MIEEK course codes to descriptive names (Greek / English)
        # These are standard automotive technology courses
        code_upper = course_code.upper()

        # Common course name patterns based on MIEEK automotive curriculum
        # Format: Greek name / English name
        course_names = {
            "AUT0101": "Τεχνικά Αγγλικά Ι / Technical English I",
            "AUT0102": "Εφαρμοσμένα Μαθηματικά / Applied Mathematics",
            "AUT0103": "Οργάνωση Συνεργείου και Ασφάλεια / Workshop Organization and Safety",
            "AUT0104": "Βασικά Στοιχεία Μηχανολογίας / Basic Mechanical Engineering",
            "AUT0105": "Ηλεκτρικά Συστήματα Αυτοκινήτου / Automotive Electrical Systems",
            "AUT0106": "Τεχνικό Σχέδιο / Technical Drawing",
            "AUT0107": "Μηχανές Εσωτερικής Καύσης Ι / Internal Combustion Engines I",
            "AUT0201": "Τεχνικά Αγγλικά ΙΙ / Technical English II",
            "AUT0202": "Μηχανές Εσωτερικής Καύσης ΙΙ / Internal Combustion Engines II",
            "AUT0203": "Συστήματα Μετάδοσης Κίνησης / Power Transmission Systems",
            "AUT0204": "Πλαίσιο και Ανάρτηση / Chassis and Suspension Systems",
            "AUT0205": "Συστήματα Πέδησης / Brake Systems",
            "AUT0206": "Συστήματα Διεύθυνσης / Steering Systems",
            "AUT0207": "Συστήματα Διαχείρισης Κινητήρα / Engine Management Systems",
            "AUT0301": "Αυτοκινητικά Ηλεκτρονικά / Automotive Electronics",
            "AUT0302": "Συστήματα Κλιματισμού / Air Conditioning Systems",
            "AUT0303": "Διαγνωστικά Οχημάτων / Vehicle Diagnostics",
            "AUT0304": "Συστήματα Ασφαλείας Αυτοκινήτου / Automotive Safety Systems",
            "AUT0305": "Υβριδικά και Ηλεκτρικά Οχήματα / Hybrid and Electric Vehicles",
            "AUT0401": "Προχωρημένα Διαγνωστικά / Advanced Diagnostics",
            "AUT0402": "Διαχείριση Επιχείρησης Αυτοκινήτων / Automotive Business Management",
            "AUT0403": "Εξυπηρέτηση Πελατών / Customer Service",
            "AUT0404": "Πρακτική Άσκηση / Internship/Practicum",
            "AUT0405": "Τελική Εργασία / Final Project",
        }

        # Check if we have a predefined name
        if code_upper in course_names:
            return course_names[code_upper]

        # Try to extract meaningful name from description objective
        # Look for specific subject matter keywords
        subject_keywords = {
            "αγγλικ": ("Τεχνικά Αγγλικά", "Technical English"),
            "μαθηματικ": ("Μαθηματικά", "Mathematics"),
            "οργάνωση": ("Οργάνωση Συνεργείου", "Workshop Organization"),
            "ασφάλει": ("Ασφάλεια και Υγεία", "Safety and Health"),
            "μηχανολογί": ("Μηχανολογία", "Mechanical Engineering"),
            "ηλεκτρ": ("Ηλεκτρικά Συστήματα", "Electrical Systems"),
            "σχέδι": ("Τεχνικό Σχέδιο", "Technical Drawing"),
            "μηχαν": ("Μηχανές", "Engines"),
            "μετάδοση": ("Συστήματα Μετάδοσης", "Transmission Systems"),
            "πέδη": ("Συστήματα Πέδησης", "Brake Systems"),
            "ανάρτηση": ("Ανάρτηση", "Suspension Systems"),
            "διεύθυνση": ("Διεύθυνση", "Steering Systems"),
            "διαγνωστ": ("Διαγνωστικά", "Vehicle Diagnostics"),
            "ηλεκτρονικ": ("Ηλεκτρονικά", "Electronics"),
            "κλιματισμ": ("Κλιματισμός", "Air Conditioning"),
            "υβριδικ": ("Υβριδικά Οχήματα", "Hybrid Vehicles"),
        }

        description_lower = description.lower()
        for keyword, (greek_name, english_name) in subject_keywords.items():
            if keyword in description_lower:
                return f"{greek_name} / {english_name}"

        # Last resort: Use formatted course code
        return f"Μάθημα {code_upper} / Course {code_upper}"

    def convert_course(self, course_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Convert a single MIEEK course record to SMS format"""
        try:
            # Extract course code from 'course_name' field
            course_code = course_data.get("course_name", "").strip()
            if not course_code:
                self.errors.append("Missing course code in 'course_name' field")
                return None

            # Convert to uppercase and normalize
            course_code = course_code.upper()

            # Extract description first (needed for course name)
            description = self.extract_description(course_data)

            # Generate course name
            course_name = self.generate_course_name(course_code, description)

            # Build SMS course object
            course = {
                "course_code": course_code,
                "course_name": course_name,
                "semester": self.extract_semester(course_code),
                "description": description,
            }

            # Extract credits
            credits = self.extract_credits(course_data.get("ECTS"))
            if credits:
                course["credits"] = credits

            # Extract hours per week
            hours = self.extract_hours_per_week(course_data.get("ECTS"))
            if hours:
                course["hours_per_week"] = hours

            # Extract evaluation rules
            rules = self.extract_evaluation_rules(course_data.get("Αξιολόγηση"))
            if rules:
                course["evaluation_rules"] = rules

            return course

        except Exception as e:
            self.errors.append(f"Failed to convert course {course_data.get('course_name', 'unknown')}: {e}")
            return None

    def convert_and_save(self):
        """Main conversion process"""
        print(f"\n{'=' * 60}")
        print("MIEEK to SMS Import Converter")
        print(f"{'=' * 60}")
        print(f"Input file: {self.input_file}")
        print(f"Output dir: {self.output_dir}")
        print(f"{'=' * 60}\n")

        # Load input data
        input_data = self.load_input_data()
        print(f"Found {len(input_data)} records to convert\n")

        # Convert courses
        converted = []
        for item in input_data:
            course = self.convert_course(item)
            if course:
                converted.append(course)

        # Save converted data
        output_file: Optional[Path] = None
        if converted:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = self.output_dir / f"mieek_courses_{timestamp}.json"

            try:
                with open(output_file, "w", encoding="utf-8") as f:
                    json.dump(converted, f, ensure_ascii=False, indent=2)
                print(f"✓ Successfully converted {len(converted)} courses")
                print(f"✓ Saved to: {output_file}\n")
            except Exception as e:
                print(f"✗ Failed to save output: {e}")
                sys.exit(1)
        else:
            print("✗ No courses were successfully converted\n")

        # Report warnings and errors
        if self.warnings:
            print(f"\n⚠ Warnings ({len(self.warnings)}):")
            for warn in self.warnings[:10]:
                print(f"  • {warn}")
            if len(self.warnings) > 10:
                print(f"  ... and {len(self.warnings) - 10} more")

        if self.errors:
            print(f"\n✗ Errors ({len(self.errors)}):")
            for err in self.errors[:10]:
                print(f"  • {err}")
            if len(self.errors) > 10:
                print(f"  ... and {len(self.errors) - 10} more")

        # Summary
        print(f"\n{'=' * 60}")
        print("Conversion Summary:")
        print(f"  Total input records:    {len(input_data)}")
        print(f"  Successfully converted: {len(converted)}")
        print(f"  Warnings:               {len(self.warnings)}")
        print(f"  Errors:                 {len(self.errors)}")
        print(f"{'=' * 60}\n")

        if converted and output_file is not None:
            print("Next steps:")
            print(f"1. Review the generated file: {output_file}")
            print("2. Use the SMS Operations panel to import the data")
            print("3. Or use the API: POST /api/v1/imports/courses\n")

        return len(converted) > 0


def main():
    """Command-line interface"""
    parser = argparse.ArgumentParser(
        description="Convert MIEEK PDF-extracted data to SMS import format",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Example:
  python tools/convert_mieek_to_import.py \\
    --input D:\\SMS\\AUT\\data\\courses.json \\
    --output templates\\courses\\

The MIEEK format has these characteristics:
  - 'course_name' field contains the course code (e.g., "aut0101")
  - 'ECTS' field is a list with credits and hours information
  - 'Αξιολόγηση' field contains Greek evaluation rules
  - Course descriptions are in 'Στόχος Μαθήματος', 'Μαθησιακά Αποτελέσματα', etc.
        """,
    )

    parser.add_argument("--input", "-i", required=True, help="Input JSON file with MIEEK PDF-extracted data")

    parser.add_argument("--output", "-o", required=True, help="Output directory for converted JSON files")

    args = parser.parse_args()

    # Create converter and run
    converter = MIEEKToSMSConverter(input_file=args.input, output_dir=args.output)

    success = converter.convert_and_save()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
