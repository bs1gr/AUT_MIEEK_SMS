# Themes

**Checked against the application:** 18 November 2026, `main` after v1.18.73.

The earlier text of this guide described six themes in the Control Panel and a Theme button
there. That is not how the application works today: there are eight themes, and they are
chosen under Utils > **Settings**. The earlier text is in the repository's history.

The first part is for everybody who uses the pages. The second part is for developers and is
read from the code; nobody added a theme to try it.

## The eight themes

The names are the ones the pages show. The line under each name is the one the page shows
under it.

| English | Greek | What the page says about it |
|---|---|---|
| **Default** | **Προεπιλογή** | Balanced light/dark theme / Ισορροπημένο φωτεινό/σκούρο θέμα |
| **Glassmorphism** | **Glassmorphism** | Frosted glass with blur effects / Εφέ παγωμένου γυαλιού με θαμπώματα |
| **Neumorphism** | **Neumorphism** | Soft 3D depth with shadows / Απαλό 3D βάθος με σκιές |
| **Gradient** | **Gradient** | Vibrant gradients with glass accents / Ζωντανές διαβαθμίσεις με γυάλινες πινελιές |
| **Modern Dark** | **Σύγχρονο Σκοτεινό** | High-contrast night mode / Θέμα υψηλής αντίθεσης για νυχτερινή χρήση |
| **Light Professional** | **Φωτεινό Επαγγελματικό** | Clean minimal light mode / Καθαρό και μινιμαλιστικό φωτεινό θέμα |
| **ΜΙΕΕΚ** | **ΜΙΕΕΚ** | Professional admin interface with green accent / Επαγγελματική διεπαφή διαχείρισης με πράσινο τονισμό |
| **ΜΙΕΕΚ Dark** | **ΜΙΕΕΚ Σκοτεινό** | Dark professional interface with vivid white text / Σκοτεινή επαγγελματική διεπαφή με έντονα λευκή γραμματοσειρά |

Two of the eight are dark: **Modern Dark** and **ΜΙΕΕΚ Dark**. When nothing has been chosen
on a device, the pages use **Default** (read from the code).

## Choosing a theme

1. Open **Utils** and the tab **Settings** (**Ρυθμίσεις** in Greek).
2. The first box is headed **Appearance Themes** (**Θέματα Εμφάνισης**). Click the button
   **Theme** (**Θέμα**) in it.
3. Click the theme you want in the list that opens.

The pages change at once, and the box under the button shows the result. The choice is
remembered on the device, not in your account: the same account on another computer or phone
starts with **Default** until you choose there too.

Read from the code: the list shows each theme with its name and its line. The box under the
button is headed **Live preview** (**Ζωντανή προεπισκόπηση**) and shows sample figures,
buttons and a field in the chosen theme. A line **Current Theme** (**Τρέχον Θέμα**) names the
theme and says that it styles the whole interface: dashboards, navigation, data tables and
the maintenance tools. There is no **Save** button.

Below the themes, the same tab holds the **timezone** and the **date format**. They are also
remembered on the device. See [USER_GUIDE_COMPLETE.md](USER_GUIDE_COMPLETE.md), section 11.

## For developers

Everything in this part is read from the code.

**Where the choice is kept.** In the browser's local storage, under two names that always
hold the same value: `sms.appearance.theme` and `sms.operations.theme`. On start the first of
the two that has a value is used. The theme is set on the page as the attribute
`data-appearance` on `<html>` and `<body>`; **Default** sets no attribute
(`src/frontend/src/contexts/AppearanceThemeContext.tsx`, lines 20, 36-51, 56-72).

**The files.**

- `src/frontend/src/contexts/AppearanceThemeContext.tsx`: the type `AppearanceThemeVariant`,
  the list `SUPPORTED_THEMES`, the storage and the attribute.
- `src/frontend/src/features/operations/components/AppearanceThemeSelector.tsx`: the button
  and the list (`AppearanceThemeSelectorWidget`), the preview, `THEME_COPY` (which locale
  keys give each theme its name and line) and `themeStyles` (the classes for the preview and
  for the cards of System Operations in the Control Panel).
- `src/frontend/src/features/operations/components/OperationsSettingsTab.tsx`: puts the
  selector at the top of the **Settings** tab.
- `src/frontend/src/index.css`: one block `[data-appearance='<name>']` per theme that sets
  the custom properties `--appearance-bg`, `-surface`, `-surface-subtle`, `-text`,
  `-muted-text`, `-border`, `-accent`, `-accent-fill`, `-accent-strong`, `-accent-contrast`,
  `-shadow`, `-blur` and `-highlight` (lines 1486-1596). **ΜΙΕΕΚ Dark** has many more rules
  (for example lines 189 and 729) and its own file,
  `src/frontend/src/styles/mieek-dark-utilities.css`.
- `src/frontend/src/locales/en/controlPanel.js` and `el/controlPanel.js`: `appearanceThemes`,
  `themeButton`, `currentTheme`, `appearancePreview` and `themeOptions.<key>.name` and
  `.description` for each theme (lines 21-62).
- `src/frontend/src/utils/nativeSystemBars.ts`: the Android app only.

**Adding a theme takes all of this.**

1. Add the name to the type and to `SUPPORTED_THEMES` in `AppearanceThemeContext.tsx`.
2. Add an entry to `THEME_COPY` and one to `themeStyles` in `AppearanceThemeSelector.tsx`.
   Both are typed over the list of names, so the code does not compile until both exist.
3. Add `themeOptions.<key>` with `name` and `description` in the English and in the Greek
   `controlPanel.js`. The key is the one `THEME_COPY` names (`modernDark` for `modern-dark`).
4. Add the block `[data-appearance='<name>']` to `index.css`, and any further rules the
   theme needs.
5. For a dark theme, add its page colour to `DARK_APPEARANCE_BACKGROUNDS` in
   `nativeSystemBars.ts` (lines 35-38). Without it the Android status and navigation bars
   stay light, with dark icons, above a dark page.

There are tests next to the code: `AppearanceThemeContext.test.tsx` and
`AppearanceThemeSelector.test.tsx`.

**An older selector.** `ThemeContext.tsx` (stored under the name `theme`: light, dark,
relaxing, fancy or system) still wraps the application (`App.tsx`, line 254). The component
that offered its choice, `components/tools/ThemeSelector.tsx`, is not imported by any page, so
nothing on the pages sets it.
