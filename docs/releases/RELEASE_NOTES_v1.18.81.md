# Release Notes - Version 1.18.81

**Release Date**: 2026-11-24
**Previous Version**: v1.18.80

## ✨ Features

- **students**: a course shows its final grade once its Final Exam is graded, its average before (todo 83, first part) (#500) [89ebb41]
- **grades**: a teacher marks a Midterm or Final Exam grade as the retake, which replaces the earlier sitting (todo 80) (#497) [dc015e8]
- **analytics**: strengths and difficulties by category across courses (todo 75 stage 3) (#486) [c4d44e0]
- **reports**: the grade sheets page, one click from Reports, Grading and Analytics (todo 75 stage 2) (#485) [d6d5230]
- **reports**: grade sheets of a course as JSON, PDF and Excel (todo 75 stage 1) (#484) [7672ecb]

## 🐛 Bug Fixes

- **reports**: the student report and Analytics' exam ranking read a course as the final grade does (todo 83, second part) (#501) [ce7173b]
- **archive**: a student failed on the absence limit or a final retake under 50 is kept out of the semester archive (todo 85) (#499) [8e4b2bf]
- **attendance**: an Excused day closes Rate as an Absent one does, and its saved ratings are cleared (todo 78 point 2) (#498) [b1071e6]
- **attendance**: a semester file's statuses are stored as the pages write them, every file names them alike (todo 78 points 1 and 3) (#496) [b77b10a]
- **i18n**: the page says which language it is in, so Greek capitals lose their accents (todo 76) (#495) [d9ca226]
- **grades**: a final quiz or a final presentation is coursework, not the final exam (todo 86) (#494) [cb8bc2b]
- **analytics**: an inactive student's view shows their courses instead of failing (todo 84) (#493) [114b525]
- **imports**: a course import keeps the rule names and every rule (todo 81) (#492) [54ed9dd]
- **grades**: an edit moves a grade to another category or renames it (todo 82) (#491) [c47b305]
- **grades**: a final grade no rule makes counts the Weight, an exam's latest sitting and the absence penalty, on every page (todo 77 point 3) (#490) [b75249f]
- **grades**: rule names match their grades whatever the spelling, an exam counts one grade, continuous assessment takes the course's tasks (todo 77 point 2) (#489) [bac28cb]
- **gate**: the checkpoint reads a Greek file name in any console (todo 79) (#488) [346256a]
- **attendance**: a Late counts as attended everywhere, its number shown for the evaluation (todo 77 point 1) (#487) [e0ab346]
- **gate**: run the markdownlint version the lockfile pins, without a prompt (#474) [526112f]
- **ci**: the load test sends real requests, and its failure shows (#473) [44865b2]
- **dev**: the startup display shows every stage, also on a busy PC (#472) [5edb405]

## 📝 Documentation

- **plan**: todo 50 settled (old copies removed, no Privacy settings at home); the Docker test install on v1.18.80 [8b29ffa]
- **plan**: the done todos 66, 67 and 69 to 74 moved to the archive [5cc5bd4]
- **plan**: older releases archived, v1.18.80 kept as reference; PRs 474 and 475 merged [959049d]
- **plan**: the cloud VM runs v1.18.80; todo 74 (a startup stage skipped on a busy PC) [45efe38]
- **plan**: v1.18.80 released and verified; todo 73 (CI load tests) found [aa9aa6c]

## ⬆️ Dependencies

- bump the npm-minor-patch group across 1 directory with 66 updates (#479) [fdb8c79]
- update pypdf requirement from >=7.0.1 to >=7.1.1 in /src/backend (#478) [48ff246]
- bump the pip-minor-patch group in /src/backend with 8 updates (#477) [90e72f6]
- bump @babel/runtime from 7.29.10 to 7.29.15 in /src/frontend (#482) [73e0dcb]
- bump @babel/plugin-transform-modules-amd in /src/frontend (#481) [b14c5bc]
- bump @babel/plugin-transform-modules-umd in /src/frontend (#480) [801bc18]

## 🤖 CI/CD

- bump actions/create-github-app-token from 3.3.0 to 3.4.0 (#476) [538638e]

## 🧹 Chores

- **lint**: the gate and CI lint scripts/ as well (#475) [c0e494a]

---

### 📊 Statistics

- **Total Commits**: 34
- **Contributors**: 3


