# Bulk Import/Export - User Guide

**Version**: 1.0
**Date**: January 14, 2026
**Feature**: #127

## Overview

The Bulk Import/Export feature allows you to easily manage large sets of data in the Student Management System. You can import students, courses, and grades from CSV or Excel files, and export data for reporting.

## 📥 Importing Data

### 1. Navigate to Import/Export
1. Log in to the application.
2. Click on **Admin** in the sidebar (if you have admin permissions).
3. Select **Import/Export**.

### 2. Start an Import
1. Click the **Import** tab.
2. Select the type of data you want to import:
   - **Students**
   - **Courses**
   - **Grades**
3. Click the **Upload** area or drag and drop your file.
   - Supported formats: `.csv`, `.xlsx`

### 3. Validation & Preview
Once uploaded, the system will validate your file:
- **Valid Rows**: Ready to be imported.
- **Warnings**: Issues found (e.g., formatting), but can still be imported.
- **Errors**: Critical issues; these rows will be skipped.

Review the preview table to ensure your data looks correct.

### 4. Commit Import
1. If the validation looks good, click **Commit Import**.
2. The system will process the data in the background.
3. You will be notified when the import is complete.

---

## 📤 Exporting Data

1. Navigate to the **Export** tab.
2. Select the entity you wish to export (Students, Courses, Grades).
3. (Optional) Apply filters to narrow down the data.
4. Click **Generate Export**.
5. The file will be generated and downloaded automatically.

---

## 🕒 History

The **History** tab shows a log of all past import and export operations, including:
- Date and time
- User who performed the action
- Type of operation
- Status (Success, Failed, Partial)
- Details (number of rows processed)

## 📝 File Templates

To ensure your imports are successful, please use the standard templates provided in the application interface.

*Note: Ensure your CSV files use UTF-8 encoding.*
