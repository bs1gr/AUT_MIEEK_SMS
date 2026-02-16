"""
Extract MIEEK course data from PDFs and generate SMS import JSON.

This script reads PDF files from a folder (default: pdfs-courses/),
extracts table-based key/value data, and then converts it into the
SMS course import format using the existing MIEEK converter.

Usage:
    python scripts/utils/converters/extract_courses_from_pdfs.py \
        --input-dir pdfs-courses \
        --raw-output data/courses_raw.json \
        --output-dir templates/courses
"""

from __future__ import annotations

import argparse
import json
import logging
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import pdfplumber

try:
    from scripts.utils.converters.convert_mieek_to_import import MIEEKToSMSConverter
except ModuleNotFoundError:
    import importlib.util

    module_path = Path(__file__).resolve().parent / "convert_mieek_to_import.py"
    spec = importlib.util.spec_from_file_location("convert_mieek_to_import", module_path)
    if spec is None or spec.loader is None:
        raise
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    MIEEKToSMSConverter = module.MIEEKToSMSConverter


logger = logging.getLogger(__name__)


KEY_CANDIDATES = [
    "Κωδικός Μαθήματος",
    "Κωδικός\nΜαθήματος",
    "Κωδικός",
    "Course Code",
    "Course\nCode",
]

TITLE_KEYS = [
    "Τίτλος Μαθήματος",
    "Τίτλος\nΜαθήματος",
]


def _clean_cell(cell: Any) -> str:
    if cell is None:
        return ""
    text = str(cell).replace("\u00a0", " ")
    text = re.sub(r"\s+", " ", text)
    text = text.strip().strip(":")
    return text


def _append_value(target: Dict[str, Any], key: str, values: List[str]) -> None:
    if not values:
        return
    existing = target.get(key)
    if existing is None:
        target[key] = values if len(values) > 1 else values[0]
        return
    if not isinstance(existing, list):
        existing = [existing]
    existing.extend(values)
    target[key] = existing


def _normalize_title_value(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, list):
        for item in value:
            text = _clean_cell(item)
            if not text:
                continue
            if text == "Τίτλος" or text == "Μαθήματος":
                continue
            if "Τίτλος" in text and "Μαθήματος" in text:
                continue
            if "Κωδικός" in text:
                break
            return text
        return None
    text = _clean_cell(value)
    if not text:
        return None
    text = re.sub(r"^.*Τίτλος\s+Μαθήματος\s*[:\-]?\s*", "", text).strip()
    if "Κωδικός" in text:
        text = text.split("Κωδικός", 1)[0].strip()
    return text or None


def _infer_course_code(raw: Dict[str, Any], pdf_path: Path) -> Optional[str]:
    for key in KEY_CANDIDATES:
        if key not in raw:
            continue
        value = raw[key]
        if isinstance(value, list):
            value = value[0] if value else ""
        text = _clean_cell(value)
        match = re.search(r"[A-Za-z]{2,5}\s?\d{3,4}", text)
        if match:
            return match.group(0).replace(" ", "").upper()

    match = re.search(r"[A-Za-z]{2,5}\d{3,4}", pdf_path.stem)
    if match:
        return match.group(0).upper()

    return None


def _extract_title_from_text(pdf_path: Path) -> Optional[str]:
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            if not text.strip():
                continue
            lines = [_clean_cell(line) for line in text.splitlines()]
            for idx, line in enumerate(lines):
                if line.startswith("Τίτλος "):
                    candidate = line.replace("Τίτλος", "", 1).strip()
                    candidate = re.sub(r"^Μαθήματος\s+", "", candidate).strip()
                    if candidate and "Κωδικός" not in candidate:
                        return candidate
                if line == "Τίτλος" and idx + 1 < len(lines) and "Μαθήματος" in lines[idx + 1]:
                    for next_line in lines[idx + 2:]:
                        if not next_line:
                            continue
                        if "Κωδικός" in next_line:
                            break
                        return next_line
                if "Τίτλος" in line and "Μαθήματος" in line:
                    candidate = re.sub(r"^.*Τίτλος\s+Μαθήματος\s*[:\-]?\s*", "", line).strip()
                    if candidate and "Κωδικός" not in candidate:
                        return candidate
                    for next_line in lines[idx + 1:]:
                        if not next_line:
                            continue
                        if "Κωδικός" in next_line:
                            break
                        return next_line
    return None


def extract_pdf_tables(pdf_path: Path) -> Dict[str, Any]:
    data: Dict[str, Any] = {}
    last_key: Optional[str] = None  # Persist across tables and pages
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables() or []
            for table in tables:
                for row in table:
                    if not row:
                        continue
                    key = _clean_cell(row[0]) if row else ""
                    if not key:
                        values = [_clean_cell(c) for c in row[1:] if _clean_cell(c)]
                        if last_key and values:
                            _append_value(data, last_key, values)
                        continue
                    values = [_clean_cell(c) for c in row[1:] if _clean_cell(c)]

                    if not values and len(row) == 1 and ":" in key:
                        left, right = key.split(":", 1)
                        left = _clean_cell(left)
                        right = _clean_cell(right)
                        if left and right:
                            _append_value(data, left, [right])
                            last_key = left
                        continue

                    _append_value(data, key, values)
                    last_key = key

    return data


def extract_courses(input_dir: Path) -> List[Dict[str, Any]]:
    pdf_files = sorted(input_dir.glob("*.pdf"))
    if not pdf_files:
        logger.error("No PDF files found in %s", input_dir)
        return []

    extracted: List[Dict[str, Any]] = []
    for pdf_path in pdf_files:
        logger.info("Processing %s", pdf_path.name)
        raw = extract_pdf_tables(pdf_path)
        existing_title = None
        for key in TITLE_KEYS:
            if key in raw:
                existing_title = _normalize_title_value(raw.get(key))
                if existing_title:
                    break
        if not existing_title:
            extracted_title = _extract_title_from_text(pdf_path)
            if extracted_title:
                raw["Τίτλος Μαθήματος"] = extracted_title
        course_code = _infer_course_code(raw, pdf_path)
        if course_code:
            raw["course_name"] = course_code
        else:
            logger.warning("No course code found for %s", pdf_path.name)
        extracted.append(raw)

    return extracted


def save_json(data: List[Dict[str, Any]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extract MIEEK course data from PDFs and create SMS import JSON."
    )
    parser.add_argument(
        "--input-dir",
        default="pdfs-courses",
        help="Folder containing PDF files (default: pdfs-courses)",
    )
    parser.add_argument(
        "--raw-output",
        default="data/courses_raw.json",
        help="Path for raw extracted JSON (default: data/courses_raw.json)",
    )
    parser.add_argument(
        "--output-dir",
        default="templates/courses",
        help="Output directory for SMS import JSON (default: templates/courses)",
    )
    parser.add_argument(
        "--skip-convert",
        action="store_true",
        help="Only write raw extraction JSON, skip SMS import conversion",
    )

    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    raw_output = Path(args.raw_output)
    output_dir = Path(args.output_dir)

    if not input_dir.exists():
        logger.error("Input directory not found: %s", input_dir)
        sys.exit(1)

    extracted = extract_courses(input_dir)
    if not extracted:
        logger.error("No course data extracted.")
        sys.exit(1)

    save_json(extracted, raw_output)
    print(f"✓ Raw extraction saved: {raw_output}")

    if args.skip_convert:
        print("Skipping SMS import conversion (per --skip-convert).")
        return

    converter = MIEEKToSMSConverter(input_file=str(raw_output), output_dir=str(output_dir))
    success = converter.convert_and_save()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
    main()
