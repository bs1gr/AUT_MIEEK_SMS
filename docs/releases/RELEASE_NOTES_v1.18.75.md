# Release Notes - Version 1.18.75

**Release Date**: 2026-11-19
**Previous Version**: v1.18.74

## 🐛 Bug Fixes

- **control-panel**: the Updates tab sends the login token, so the update check no longer answers 403 in the Docker edition (#441) [48617cf]
- **notifications,search**: a message says who sent it, recipients by name, in-app preference honoured, deleted notifications removed; search folds separate accent marks (#440) [e3f988f]
- **installer,docker**: after Docker's cleanup SMS comes back; every text of the wizard in both languages; older installer notes, unused pages, CI step (#438) [27adbfc]
- **installer**: the wizard's information pages are right for both editions and both languages; the Docker guide and the installer's README written anew (#437) [1edcb82]

## 📝 Documentation

- **plan**: order of work for the pending tasks; PR 441 merged; todo 40's Android half done; todo 55 (b) and (c) done [3cfaa08]
- **plan**: PRs 439 and 440 merged; the VM's backup hour set back; what of the older entries waits for the owner [0b3058f]
- **plan**: PR 438 merged; the owner checked the Greek wizard [a99a452]
- **plan**: PR 437 merged [99a8c77]
- **plan**: v1.18.74 released (tag on fdaa0233a), the published files verified, the cloud VM updated [14f92b2]

## 🧹 Chores

- **search,docs**: remove the two search endpoints that could not answer and the unused search/list code; correct CLAUDE.md's i18n example (#439) [caba53f]

---

### 📊 Statistics

- **Total Commits**: 10
- **Contributors**: 2


