# PDF Data Conversion Tool - Quick Start Guide

## What These Tools Do

Convert PDF-extracted data into the exact JSON format required by the Student Management System's import functionality.

- For generic, already-structured JSON: use `tools/convert_pdf_to_import.py`
- For raw MIEEK extraction format: use `tools/convert_mieek_to_import.py`

## Quick Start

### 1. Convert Your Data

```powershell
# For MIEEK courses (raw extraction where code is in course_name, ECTS is a list, and Αξιολόγηση is Greek)
python tools/convert_mieek_to_import.py `
  --input D:\SMS\AUT\data\courses.json `
  --output templates\courses\

# For generic courses JSON (non-MIEEK raw format)
python tools/convert_pdf_to_import.py `
  --input tools\example_input_courses.json `
  --type courses `
  --output templates\courses\

# For students
python tools/convert_pdf_to_import.py `
  --input your_student_data.json `
  --type students `
  --output templates\students\
```

### 2. Import into SMS

#### Option A: Web Interface

1. Start SMS: `.\RUN.bat`
2. Open browser: `http://localhost:5173`
3. Navigate to **Operations** view
4. Click **"Import Courses from Templates"** or **"Import Students from Templates"**
5. Review the import results

#### Option B: API

```powershell
# Import courses
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/imports/courses" -Method Post

# Import students
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/imports/students" -Method Post
```

## What Gets Fixed

The converter automatically handles:

✅ **Field Normalization**

- Lists → Strings: `["Intro", "to", "CS"]` → `"Intro to CS"`
- Missing semesters → Default: `"Α' Εξάμηνο"`
- Multi-line descriptions → Newline-separated text

✅ **Evaluation Rules Parsing**

- Filters Greek metadata (Γλώσσα, Ελληνική, etc.)
- Parses various formats (strings, lists, dicts)
- Converts to standard: `[{"category": "Midterm", "weight": 30}]`

✅ **Date Normalization**

- Accepts: `2025-09-01` or `01/09/2025`
- Outputs: ISO format `2025-09-01`

✅ **Type Conversion**

- Credits, hours_per_week → Numbers
- Boolean flags → true/false
- Validates required fields

## Required Fields

### Courses

- `course_code` (string, unique)
- `course_name` (string)

### Students

- `student_id` (string, unique)
- `email` (string, unique)
- `first_name` (string)
- `last_name` (string)

## Example Input → Output

### Before (PDF extraction)

```json
{
  "course_code": ["MIEEK", "101"],
  "course_name": ["Intro", "to", "CS"],
  "semester": "",
  "credits": "3",
  "evaluation_rules": [
    "Γλώσσα",
    "Ελληνική",
    "Midterm:",
    "30%",
    "Final: 40%"
  ]
}
```

### After (SMS format)

```json
{
  "course_code": "MIEEK 101",
  "course_name": "Intro to CS",
  "semester": "Α' Εξάμηνο",
  "credits": 3,
  "evaluation_rules": [
    {"category": "Midterm", "weight": 30.0},
    {"category": "Final", "weight": 40.0}
  ]
}
```

## Testing

Test with provided examples:

```powershell
# Test courses
python tools/convert_pdf_to_import.py `
  --input tools/example_input_courses.json `
  --type courses `
  --output templates/courses/

# Test students
python tools/convert_pdf_to_import.py `
  --input tools/example_input_students.json `
  --type students `
  --output templates/students/
```

## Troubleshooting

### Common Errors

**"Missing course_code in record"**
→ Your input JSON must include a `course_code` field for each course

**"Missing student_id or email"**
→ Your input JSON must include both `student_id` and `email` for each student

**"Invalid date format"**
→ Use ISO format `2025-09-01` or European `01/09/2025`

### Check Output Quality

```powershell
# Validate JSON
python -m json.tool templates\courses\courses_*.json

# Count records
$data = Get-Content templates\courses\courses_*.json | ConvertFrom-Json
Write-Host "Converted: $($data.Count) courses"
```

## Files Created

- **Tool**: `tools/convert_pdf_to_import.py` - Main converter script
- **Documentation**: `tools/README_CONVERT.md` - Detailed guide
- **Examples**:
  - `tools/example_input_courses.json` - Sample course input
  - `tools/example_input_students.json` - Sample student input

## Full Documentation

For complete details, see: `tools/README_CONVERT.md`

- All supported input formats
- Field-by-field schema reference
- Advanced parsing rules
- Error handling details
- API integration guide

---

**Need Help?** Check the console output for specific errors and warnings.
