# User documentation

Documentation for the people who use the Student Management System.

## Checked against the application

These were read against a running copy, page by page, and say what the application does.

- **[USER_GUIDE_COMPLETE.md](USER_GUIDE_COMPLETE.md)** - the user guide: signing in, every
  page, the absence rules and the final grade, what each kind of account may do, and what
  the application does not have (checked 17 November 2026).
- **[NOTIFICATIONS_USER_GUIDE.md](NOTIFICATIONS_USER_GUIDE.md)** - the bell, the list of
  notifications, messages to all users (checked 16 November 2026).

For administrators, under [../admin/](../admin/):

- **[RBAC_ADMIN_GUIDE.md](../admin/RBAC_ADMIN_GUIDE.md)** - accounts, roles and permissions,
  step by step.
- **[PERMISSION_MATRIX.md](../admin/PERMISSION_MATRIX.md)** and
  **[PERMISSION_REFERENCE.md](../admin/PERMISSION_REFERENCE.md)** - who can do what.
- **[BACKUP_AND_RESTORE.md](../admin/BACKUP_AND_RESTORE.md)** - the automatic backup and
  restoring.
- **[NOTIFICATIONS_ADMIN_GUIDE.md](../admin/NOTIFICATIONS_ADMIN_GUIDE.md)** and
  **[PRIVACY_AND_GDPR.md](../admin/PRIVACY_AND_GDPR.md)**.

## Corrected on 18 November 2026

The older documents of this folder described the application as it was planned, or as it
was in an earlier version. Each was read against the code and the checked guides, and
corrected or written anew; what it held before is in the repository's history. Each says
at its head how it was checked, and marks what was read from the code and not tried. Where
one of them disagrees with the user guide, the user guide is right.

- **[ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md](ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md)** - the user guide in Greek: the text of
  USER_GUIDE_COMPLETE.md, with the names the Greek pages show.
- [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md), [ΓΡΗΓΟΡΗ_ΕΚΚΙΝΗΣΗ.md](ΓΡΗΓΟΡΗ_ΕΚΚΙΝΗΣΗ.md) -
  starting the application from the project files (read against the scripts, not run).
- [IMPORT_EXPORT_USER_GUIDE.md](IMPORT_EXPORT_USER_GUIDE.md) - Utils > Imports and Utils >
  Export. [SESSION_EXPORT_IMPORT_GUIDE.md](SESSION_EXPORT_IMPORT_GUIDE.md) - one whole
  semester in a file, for administrators.
- [RATE_LIMITING_GUIDE.md](RATE_LIMITING_GUIDE.md),
  [RATE_LIMITING_QUICK_REFERENCE.md](RATE_LIMITING_QUICK_REFERENCE.md) - the five request
  limits; a saved limit takes effect when the server next starts.
- [THEME_GUIDE.md](THEME_GUIDE.md), [THEMES_SUMMARY.md](THEMES_SUMMARY.md) - the eight themes
  of Utils > Settings.
- [RBAC_GUIDE.md](RBAC_GUIDE.md), [RBAC_GUIDE_EL.md](RBAC_GUIDE_EL.md) - roles and
  permissions on one page, in English and in Greek. The steps are in
  [../admin/RBAC_ADMIN_GUIDE.md](../admin/RBAC_ADMIN_GUIDE.md).
- [LOCALIZATION.md](LOCALIZATION.md) - for developers: where the English and Greek texts are
  and how a text is found.
- [README_PDF_CONVERSION.md](README_PDF_CONVERSION.md) - the Quick Guide PDF of the help.
- [SMS_USER_GUIDE_EN.md](SMS_USER_GUIDE_EN.md), [SMS_USER_GUIDE_EL.md](SMS_USER_GUIDE_EL.md) -
  short notes: they were the guide of version 1.9.7 and point to the current one.

The pages themselves are in English and Greek.

## Need help?

- **Send Feedback**, at the right edge of every page of the application.
- The administrator of your installation.
- For installing and running the application: [../deployment/](../deployment/) and
  [../operations/INSTALLATION_GUIDE.md](../operations/INSTALLATION_GUIDE.md).
