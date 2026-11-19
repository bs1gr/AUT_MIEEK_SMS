# Release Notes - Version 1.18.74

**Release Date**: 2026-11-19
**Previous Version**: v1.18.73

## ✨ Features

- **sessions**: a semester's session file is the teacher's too, and an import knows a grade by its category as well (#432) [b470d8f]
- **audit**: the audit log names who made a change, has a line for every change of an account, a role or a permission, and a page shows it (#428) [f0f07e0]
- **accounts**: every account changes its own password, an account without a role is told so, and the Quick Guide says what the pages do (#427) [3d465ab]
- **grades**: the Weight of a grade counts in the average of its category (#426) [56b7e87]
- **rbac**: two roles and "No role", a closed list of permissions, teachers import; the built-in permission list is gone (#425) [8b91caa]

## 🐛 Bug Fixes

- **import-export**: the Import/Export panel of the Control Panel does what it offers (#436) [e40e0a2]
- **installer**: the database chosen in the wizard reaches a new installation, and the uninstaller says what it deletes (#435) [9fd729c]
- **attendance**: Clear takes saved marks off for good (#433) [aceaf1d]
- **installer**: an installer built by hand takes tracked files only; the installation guide read against the installer (#431) [9616411]
- **attendance**: a mark is no longer lost when the server answers late or the sheet is left before the autosave (#430) [30fc8cd]
- **rbac**: an account whose last role is revoked is left with nothing (#423) [dfd11a5]
- **admin**: Save no longer turns an administrator into a teacher, the Permissions Catalog works for roles, and the small page repairs of todo 63 (#422) [bf6535b]
- **accounts**: an account changed to Student no longer keeps its old access, and a deleted account leaves nothing for the next one (#419) [31dd259]

## 📝 Documentation

- **plan**: #431 merged - an installer built by hand takes tracked files only [70d4e29]
- **plan**: #429 merged - the older documents read and corrected; the seven points of 18 November are done [f2b8453]
- **guides**: the 23 older admin and user documents read against the code and corrected, with the repairs the reading led to (#429) [aeceec6]
- **plan**: #422, #423 and #424 merged - the page repairs of todo 63, an account without a role left with nothing, the in-app help read against the pages [93c7f5e]
- **help**: the answers of Utils > Help & Documentation say what the pages do (#424) [38f8052]
- **plan**: #419, #420 and #421 merged - two access leaks repaired, the permission documents and the user guide checked against the application; todo 63 [99e2738]
- **user**: the user guide says what the application does (todo 59) (#421) [8eb82f9]
- **permissions**: the three permission documents say what the application does, and a test keeps them to it (todo 59) (#420) [a192ace]
- **plan**: v1.18.73 released - assets verified, the Docker build check used for the first time; the cloud VM is not updated [b88b25f]

## 🧹 Chores

- **cleanup**: permission keys are unique in every database, the tools nothing ran and the unused page parts are gone, CLAUDE.md's release text no longer ends with an upload by hand (#434) [2f2f65a]
- **agents**: the release-manager agent and the plan-review skill run on Sonnet [17c4d73]

---

### 📊 Statistics

- **Total Commits**: 24
- **Contributors**: 2


