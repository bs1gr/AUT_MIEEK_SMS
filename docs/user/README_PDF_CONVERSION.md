# User Guides as PDF

**Checked against the application:** 18 November 2026, `main` after v1.18.73.

The earlier text of this note was a recipe for turning the user guides into PDF with pandoc,
and a GitHub workflow that would publish the files under `frontend/public/docs`. None of that
exists in the repository (see below). The earlier text is in the repository's history.

## What the application offers

Utils > **Help & Documentation**, under the groups of questions, has a card **Quick Guide**
(**Σύντομος Οδηγός**), "A one-page summary, as a PDF", with the links **Download English
PDF** and **Download Greek PDF**. It is a one-page summary, not the user guide
([USER_GUIDE_COMPLETE.md](USER_GUIDE_COMPLETE.md), section 11).

Read from the code:

- The links go to `/api/v1/help/user-guide/en` and `/el`. The files are named
  `SMS_Quick_Guide_EN.pdf` and `SMS_Quick_Guide_EL.pdf`.
- The server composes each PDF when it is asked, with ReportLab, from two texts in
  `src/backend/routers/routers_help.py` (`QUICK_GUIDE_EN`, `QUICK_GUIDE_EL`), in the DejaVu
  Sans fonts of `src/backend/fonts/`, which have Greek letters.
- Every button, tab or page the text names in quotation marks must be a text of the
  application in the same language, or `quickGuide.test.ts` in
  `src/frontend/src/i18n/__tests__/` fails.

## What does not exist

- a workflow `.github/workflows/generate-docs.yml`;
- a folder `frontend/public/docs` (the frontend is `src/frontend`, which has no `public/docs`);
- files `SMS_User_Guide_EN.pdf` and `SMS_User_Guide_EL.pdf`, so nothing stands behind the
  addresses like `http://localhost:8080/docs/SMS_User_Guide_EN.pdf` of the earlier text;
- a stylesheet `pdf-style.css`.

The earlier text named `SMS_USER_GUIDE_EN.md` and `SMS_USER_GUIDE_EL.md`. They are still in
this folder, as short notes: each says that it was the guide of version 1.9.7 (December 2025)
and points to the current one. The guide read against the running application is
`USER_GUIDE_COMPLETE.md`.

## A PDF of a guide, by hand (not tried here)

`USER_GUIDE_COMPLETE.md` (English) and `ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md` (its Greek version) are Markdown
files. A tool such as pandoc can turn a
Markdown file into PDF; for the Greek one it needs a font that has Greek letters, for example
DejaVu Sans. No command is given because none was tried.
