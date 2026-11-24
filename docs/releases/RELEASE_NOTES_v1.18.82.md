# Release Notes - Version 1.18.82

**Release Date**: 2026-11-25
**Previous Version**: v1.18.81

## ✨ Features

- **reports**: Utils → Reports shows each report page once (todo 75 stage 6, the tidy) (#507) [db02e16]
- **reports**: the report builder keeps every filter and its sort, picks courses and categories, saves and downloads in one click (todo 75 stage 5) (#506) [4b7ffe0]
- **analytics**: the export follows the filters on screen, with the students and their categories (todo 75 stage 4) (#504) [a22fbd3]
- **archive**: a student who fails a course is recorded as failed at the archive run and takes it again fresh (todo 87) (#503) [d88c8d4]

## 🐛 Bug Fixes

- **grading**: the form keeps what is typed for the next grade while the list is read again (#508) [01ce793]
- **reports**: a custom report's saved sort applies, several filters on one field work, its CSV keeps Greek in Excel, the GPA templates use the percent scale (todo 75 stage 5) (#505) [81d5781]
- **archive**: the Semester Archive preview answers for a student failed on the absence limit or a final retake (#502) [fc42a94]

## 📝 Documentation

- **plan**: the cloud VM runs v1.18.81; the shared database migrated from the dev PC first [73d5a3a]
- **plan**: v1.18.81 released and verified; the cloud VM still on v1.18.80 [baef20b]

## 🧹 Chores

- **reports**: remove the analytics and reports code nothing calls (todo 75 stage 6) (#509) [e7ce48f]

---

### 📊 Statistics

- **Total Commits**: 10
- **Contributors**: 2


