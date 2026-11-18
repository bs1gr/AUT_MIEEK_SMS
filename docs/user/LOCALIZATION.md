# Localization (English and Greek)

**Checked against the application:** 18 November 2026, `main` after v1.18.73.

This note is for developers. The earlier text described a layout and a way of registering
texts that the code no longer has (a `translations` object that held every namespace,
`.ts` text files, a `StudentManagementApp.tsx`, a console object `window.i18n`). It is in the
repository's history.

Everything below is read from the code and from the tests; nothing was run for it. The one
thing the user guide checked in a running copy is the language switch: **EN** / **ΕΛ** at the
top right, remembered on the device ([USER_GUIDE_COMPLETE.md](USER_GUIDE_COMPLETE.md),
section 2). Paths are under `src/frontend/src/` unless they start with `src/backend/`.

## What is used

- Two languages: English (`en`) and Greek (`el`).
- i18next `^26.7.2`, react-i18next `^17.1.13` and i18next-browser-languagedetector
  `^8.3.0` (`src/frontend/package.json`, lines 51, 52, 58).

## Where the files are

- `i18n/config.ts` starts i18next: the texts (`resources`), the list of namespaces (`ns`), the
  default namespace (`translation`), the fallback language (`en`) and the detection of the
  language. `main.tsx` imports it before anything is drawn (line 8). `i18n.ts` only
  re-exports the instance.
- `translations.ts` gathers the text files. It exports `translations` (only the root texts)
  and `translationNamespaces` (one entry per namespace, for `en` and for `el`).
- `locales/en.js` and `locales/el.js` hold the root texts: the default namespace
  `translation`.
- `locales/en/<name>.js` and `locales/el/<name>.js` hold one namespace each: 25 files per
  language, each `export default { ... }`.
- The namespace `exportAdmin` has no file in `locales/`: both languages are in
  `features/export-admin/locales/translations.ts` (`exportAdminEN`, `exportAdminEL`).
- `LanguageContext.tsx` is the application's own `t`, the current language and
  `setLanguage`. `App.tsx` wraps the pages in it (line 253).
- `components/LanguageSwitcher.tsx` is the **EN** / **ΕΛ** button; `App.tsx` places it in the
  header (line 206).
- `i18n/__tests__/` holds the tests that guard the texts (see the last part but one).

There are 26 namespaces: analytics, attendance, auth, calendar, common, controlPanel,
courses, customReports, dashboard, errors, export, exportAdmin, feedback, grades, help,
messages, notifications, offline, privacy, rbac, reports, search, semesterArchive, students,
system and utils (`translations.ts`, lines 83-141).

## How a text is found

Two hooks are in use, and they do not search alike.

**`useLanguage().t`** (`LanguageContext.tsx`, lines 87-119) looks in this order and answers
the first text it finds:

1. If the key has a dot, the part before the first dot is taken as a namespace and the rest
   as the key in it: `t('export.exportTabLabel')` looks for `exportTabLabel` in `export`. The
   rest may itself be a path: `t('controlPanel.rateLimits.read')`.
2. The key as written, in the default namespace (the root texts, `en.js` / `el.js`).
3. The key as written, in each namespace of `namespaceFallbacks`, in this order: dashboard,
   attendance, search, grades, students, courses, calendar, utils, controlPanel, rbac, auth,
   common, export, help, reports, feedback, analytics, notifications, errors, customReports,
   messages, system (lines 59-85). The namespaces privacy, offline, semesterArchive and
   exportAdmin are not in the list: their keys must be asked for with the namespace in
   front or with `{ ns }`.
4. The key itself. A page then shows the key as its text. That is a bug, not a fallback.

i18next answers a missing key with the key. So when an answer equals the key, the hook asks
i18next whether the text exists: a text that reads the same as its key ("created" in English)
counts as found (lines 92-96).

**`useTranslation()`** of react-i18next, without a namespace, reads only the root texts, so
`t('common.save')` never resolves there. Say the namespace: `useTranslation('controlPanel')`
(`components/ControlPanel/RateLimitAdjuster.tsx`, line 27) or
`t('exportTabLabel', { ns: 'export' })` (`features/operations/components/OperationsView.tsx`,
line 141). This is stated in the header of `i18n/__tests__/useTranslationKeys.test.ts`.

If a Greek text is missing, i18next falls back to the English one (`fallbackLng: 'en'`,
`i18n/config.ts`, line 80).

## How the language is chosen and remembered

- At the start, the detector looks at the local storage of the browser under the name
  `i18nextLng`, then at the language of the browser, and stores the result in local storage
  (`i18n/config.ts`, lines 85-88). In a test run there is no detector and the language is
  English (lines 7-11, 79).
- `LanguageContext.tsx` reduces what it got to the two supported codes: a language that
  starts with `el` is Greek, any other is English, and with nothing at all the answer is
  Greek (lines 15-18).
- The switch calls `setLanguage`, which changes the language of i18next and writes
  `i18nextLng` (lines 46-51). The language belongs to the device, not to the account.

## Adding a text

1. Pick the namespace by the feature. The two folders have the same file names.
2. Add the key to **both** `locales/en/<name>.js` and `locales/el/<name>.js`, under the same
   name and in the same place in the structure.
3. Use it with `t('key')` of `useLanguage()`, or with the namespace as above. Do not write
   text in the markup: the rule `i18next/no-literal-string` warns about it
   (`eslint.config.js`, line 47; it looks at markup only and is off in tests, line 132).

## Adding a namespace

All of these:

1. Create `locales/en/<name>.js` and `locales/el/<name>.js`.
2. In `translations.ts`: import both files, and add `<name>` to `translationNamespaces.en`
   and to `translationNamespaces.el`.
3. In `i18n/config.ts`: add `<name>` to `resources.en`, to `resources.el` and to the `ns`
   array (lines 17-77).
4. Only if pages will ask for its keys without the namespace in front: add the name to
   `namespaceFallbacks` in `LanguageContext.tsx` and to `FALLBACKS` in
   `i18n/__tests__/useLanguageKeys.test.ts`. That test fails unless the two lists are equal.

## The key style in use

- Flat keys in camelCase, with a shared start for a feature: `exportTabLabel`
  (`locales/en/export.js`, line 2), `helpHowToChangeTheme` (`locales/en/help.js`, line 176).
- Nested objects for groups: `themeOptions.default.name` and `rateLimits.read` in
  `locales/en/controlPanel.js`.
- A suffix for plurals: `permission_one` and `permission_other` (`locales/en/rbac.js`, lines
  22-23), asked for with `{ count }`.
- Values with a name in double braces: `Job ID: {{id}}` (`locales/en/export.js`, line 194).
- A few flat keys with a dot inside the quotes: `'importExport.history'`
  (`locales/en/common.js`, line 253).

## The tests that guard the texts

All are in `i18n/__tests__/`.

- `translations.test.ts`: for the root texts only, English and Greek have the same keys and
  the same structure, no text is empty, none contains TODO, FIXME or XXX, and eight
  `common.*` keys exist as texts in both languages. It also warns, without failing, about
  English words in Greek texts.
- `helpContent.test.ts`: the help answers of Utils > Help & Documentation. The page shows only
  texts that exist in both languages and the two languages hold the same texts; no text is
  left that the page does not show; every button, tab or page an answer names in quotation
  marks exists under that name among the application's texts of the same language.
- `quickGuide.test.ts`: the same check for the one-page Quick Guide, whose English and Greek
  text are in `src/backend/routers/routers_help.py`: each quoted name (in `"..."` in English,
  `«...»` in Greek) must be a text of the application, and the two languages must name the
  same places in the same order.
- `permissionNames.test.ts`: the names that RBAC Configuration shows for permissions
  (`permissionNames` in `locales/en/rbac.js` and `el/rbac.js`) must be exactly the permissions
  the server lists in `PERMISSION_DEFS` (`src/backend/routers/routers_rbac.py`). A permission
  added there fails the test until it has a name in both languages.
- `useLanguageKeys.test.ts` and `useTranslationKeys.test.ts`: every literal key a page passes
  to the `t` of `useLanguage()` or of `useTranslation()` must resolve in English and in
  Greek. The first also keeps `namespaceFallbacks` equal to its own list.

Only the root texts are compared key by key between English and Greek. For the other
namespaces, parity is held only for the help, the permission names, the Quick Guide and the
keys that pages use.

## Texts made by the server

Read from `src/backend/routers/routers_exports.py`:

- `TRANSLATIONS` (line 38) holds English and Greek texts for the files of the exports:
  headings, sheet names, status words and fixed lines.
- `get_lang(request)` (line 254) takes the query parameter `lang` if it is `en` or `el`;
  otherwise Greek if the header `Accept-Language` contains `el`; otherwise English. The
  Export Center sends the language of the page in that header (`components/tools/ExportCenter.tsx`,
  line 145).
- `t(key, lang)` (line 265) answers the key itself if a text is missing.
- `HEADER_DEFINITIONS` (line 269) lists the heading texts of each table, and the helpers
  `get_header_row`, `translate_status_value`, `not_available`, `yes_no` and
  `grade_report_heading` (lines 408-428) turn them into text. To add a text, put the key into
  `TRANSLATIONS["en"]` and `TRANSLATIONS["el"]`, add it to the list in `HEADER_DEFINITIONS` if
  it is a heading, and use `t(key, lang)`.
- The PDFs use the font DejaVu Sans from `src/backend/fonts/`, which has Greek letters.

The Quick Guide PDF has its own English and Greek text in `routers_help.py`
(`QUICK_GUIDE_EN`, `QUICK_GUIDE_EL`).
