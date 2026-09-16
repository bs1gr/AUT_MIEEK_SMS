# Release Notes - Version 1.18.43

**Release Date**: 2026-09-16
**Previous Version**: v1.18.42

## ✨ Features

- **system**: add a Credits panel to the System tab [570935e]

## 🐛 Bug Fixes

- **release**: stop a blocked commit from becoming a published tag [83c26d1]
- **release**: splat installer-builder arguments as a hashtable [1c359d7]
- **release**: bump every version reference the verifier checks [ad12e30]
- **lite,android**: four bugs found by a full pre-release smoke test [05b286b]
- **gates**: make the commit gate actually gate [2400a41]
- **testing**: write the batch log where the docs say to read it [edeceaf]
- **testing**: record why a batch failed, not just that it did [936037c]
- **release**: repair release-notes generation - fences, dead links, commit parsing [1831288]
- **release**: rebuild SMS_Lite and the frontend instead of reusing whatever is on disk [47fd7e6]

## 📝 Documentation

- **plan**: record the Credits panel and the dead-code cleanup [a6e8c5e]
- **changelog**: explain in place why three versions keep duplicate headers [efb4364]
- **plan**: record the CHANGELOG duplicate-header cleanup [691a797]
- **changelog**: remove duplicate version headers left by the old release bug [2369e1a]
- **plan**: mark the release-pipeline traps fixed, record two more found [f03b99b]
- **plan**: record the v1.18.42 release and three release-pipeline traps [81b2923]

## 🧹 Chores

- remove three dead items found reviewing the workspace [6c6874b]

---

### 📊 Statistics

- **Total Commits**: 17
- **Contributors**: 1


