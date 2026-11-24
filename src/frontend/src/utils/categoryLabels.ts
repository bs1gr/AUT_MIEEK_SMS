// Utility to localize backend canonical evaluation category names for display
// Usage: getLocalizedCategory('Final Exam', t) -> localized label based on current language

export function getLocalizedCategory(category: unknown, t: (key: string) => string): string {
  if (!category || typeof category !== 'string') return '';
  const key = category.trim().toLowerCase();

  // Map of known backend canonical categories -> translation keys
  const map: Record<string, string> = {
    'class participation': 'classParticipation',
    'participation': 'classParticipation',
    'continuous assessment': 'continuousAssessment',
    'midterm exam': 'midtermExam',
    'midterm': 'midtermExam',
    'final exam': 'finalExam',
    'final': 'finalExam',
    'lab work': 'labWork',
    'lab': 'labWork',
    'quizzes': 'quizzes',
    'quiz': 'quizzes',
    'project': 'project',
    'presentation': 'presentation',
    // The rule that counts the periods attended (plan todo 77): «Παρουσία» in Greek.
    'attendance': 'attendanceCategory',
    'no participation': 'noParticipationOption',
    'minor participation': 'minorParticipationOption',
    'minor participation (mobile usage)': 'minorParticipationMobileOption',
    // Consolidate similar categories to Homework/Assignments
    'homework/assignments': 'homework',
    'homework assignments': 'homework',
    'homework & assignments': 'homework',
    'homework': 'homework',
    'assignments': 'homework',
    'assignment': 'homework',
    'exercises': 'homework',
    'exercise': 'homework',
    // Generic exam/report fallbacks
    'exam': 'finalExam',
  };

  const tKey = map[key];
  if (tKey) return t(tKey) || category;

  // If not found, return the original category (already localized or unknown)
  return category;
}

/**
 * A name as the final grade compares it (`_fold_rule_name` in
 * src/backend/services/analytics_service.py): no case, no accents, a final sigma as a sigma,
 * ":;,.-_()/" as spaces, single spaces. «Τελική-Εξέταση» -> "τελικη εξεταση".
 */
export const foldRuleName = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/ς/g, 'σ')
    .replace(/[:;,.\-_()/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// The standard categories, by the translation key of their label.
const CANONICAL_BY_LABEL_KEY: Record<string, string> = {
  classParticipation: 'Class Participation',
  continuousAssessment: 'Continuous Assessment',
  midtermExam: 'Midterm Exam',
  finalExam: 'Final Exam',
  labWork: 'Lab Work',
  quizzes: 'Quizzes',
  project: 'Project',
  presentation: 'Presentation',
  attendanceCategory: 'Attendance',
  homework: 'Homework/Assignments',
  noParticipationOption: 'No participation',
  minorParticipationOption: 'Minor participation',
  minorParticipationMobileOption: 'Minor participation (mobile usage)',
};

// The names that ARE a standard category, in either language, singular or plural, whatever the
// page's language (folded like the names compared with them).
const STANDARD_SPELLINGS: ReadonlyMap<string, string> = new Map(
  (
    [
      ['Midterm Exam', ['Midterm Exam', 'Midterm', 'Mid-term Exam', 'Mid-term', 'Intermediate', 'Ενδιάμεση Εξέταση', 'Ενδιάμεση']],
      ['Final Exam', ['Final Exam', 'Final', 'Τελική Εξέταση', 'Τελική']],
      [
        'Homework/Assignments',
        [
          'Homework/Assignments',
          'Homework',
          'Assignment',
          'Assignments',
          'Εργασία',
          'Εργασίες',
          'Άσκηση',
          'Ασκήσεις',
          'Εκπόνηση Εργασιών',
        ],
      ],
      ['Lab Work', ['Lab Work', 'Lab', 'Labs', 'Laboratory', 'Εργαστήριο', 'Εργαστήρια', 'Εργαστηριακή Εργασία']],
      ['Quizzes', ['Quizzes', 'Quiz', 'Κουίζ']],
      ['Project', ['Project', 'Projects', 'Πρότζεκτ']],
      ['Presentation', ['Presentation', 'Presentations', 'Παρουσίαση', 'Παρουσιάσεις']],
      ['Class Participation', ['Class Participation', 'Participation', 'Συμμετοχή στο Μάθημα', 'Συμμετοχή']],
      ['Continuous Assessment', ['Continuous Assessment', 'Συνεχής Αξιολόγηση']],
      // The rule that counts the periods attended (the owner, 2026-11-23, plan todo 77): until
      // then the editor saved «Παρουσία» as Class Participation, which never counts them.
      ['Attendance', ['Attendance', 'Παρουσία', 'Παρουσίες']],
      ['No participation', ['No participation', 'Καμία συμμετοχή']],
      ['Minor participation', ['Minor participation', 'Μικρή συμμετοχή']],
      [
        'Minor participation (mobile usage)',
        ['Minor participation (mobile usage)', 'Minor participation with mobile usage', 'Μικρή συμμετοχή (χρήση κινητού)'],
      ],
    ] as const
  ).flatMap(([canonical, spellings]) => spellings.map((s) => [foldRuleName(s), canonical] as const)),
);

/**
 * The standard category a name IS ("Εργαστήρια" is Lab Work, «Παρουσίες» Attendance), or null for
 * any other name. Compared as the final grade folds names, against the names above and the page's
 * own labels.
 */
export function getStandardCategory(category: unknown, t: (key: string) => string): string | null {
  if (!category || typeof category !== 'string') return null;
  const folded = foldRuleName(category);
  if (!folded) return null;
  const known = STANDARD_SPELLINGS.get(folded);
  if (known) return known;
  for (const [tKey, canonical] of Object.entries(CANONICAL_BY_LABEL_KEY)) {
    const translated = String(t(tKey) || '');
    if (translated && foldRuleName(translated) === folded) return canonical;
  }
  return null;
}

/**
 * The name a rule is saved under: the standard category when the name is one, else the name as
 * typed (the owner, 2026-11-23: "Rename only standard names"). The final grade reads a typed name
 * by its words, so saving a course never changes what a rule counts. Until then the editor saved
 * descriptive names as the category they mentioned: «1η» and «2η Ενδιάμεση Εξέταση» both became
 * "Midterm Exam", and the templates' «Συνεχής Αξιολόγηση (… και Ενδιάμεση Εξέταση)» a Midterm.
 */
export function getCanonicalCategory(category: unknown, t: (key: string) => string): string {
  if (!category || typeof category !== 'string') return '';
  return getStandardCategory(category, t) ?? category;
}

/**
 * The kind of a rule, as a standard category name: the standard category a name is, else the
 * first keyword that starts one of its words, in the order the final grade checks them
 * (`_RULE_STEMS` in src/backend/services/analytics_service.py; both are tested on one table of
 * names, utils/__tests__/ruleNameCases.json); else the name itself. The pages use it to tell which
 * rule is Class Participation, Attendance or an observation; it never renames a rule.
 * - the observations first, then continuous assessment (the templates' «Συνεχής Αξιολόγηση
 *   (Εκπόνηση εργασιών στο σπίτι)»), then coursework, a quiz, participation and a presentation
 *   before the exams («Τελική Εργασία» is homework, "Final Project" a project, "Final Quiz" a
 *   quiz: the owner, 2026-11-23; plan todo 86);
 * - a project before a lab and homework, a lab before homework («Εργαστήρια» holds "εργασ");
 * - participation before presentation and attendance («Παρουσία και Συμμετοχή» is participation);
 * - a presentation before attendance by stems past the "σ" («Παρουσίαση»), so «Ποσοστό Παρουσίας»
 *   stays Attendance.
 * Only at the start of a word: "Collaboration" is no lab, «Επεξεργασία» no homework.
 */
const RULE_KEYWORDS: ReadonlyArray<readonly [string, readonly string[]]> = [
  [
    'Minor participation (mobile usage)',
    [
      'minor participation mobile usage',
      'minor participation with mobile usage',
      'mobile usage participation',
      'mobile use participation',
      'μικρη συμμετοχη χρηση κινητου',
    ],
  ],
  ['No participation', ['no participation', 'καμια συμμετοχη']],
  ['Minor participation', ['minor participation', 'μικρη συμμετοχη']],
  ['Continuous Assessment', ['continuous', 'συνεχ']],
  ['Project', ['project', 'προτζεκ']],
  ['Lab Work', ['lab', 'εργαστ']],
  ['Homework/Assignments', ['homework', 'assignment', 'εργασ', 'ασκη', 'εξασκη']],
  ['Quizzes', ['quiz', 'κουιζ', 'τεστ']],
  ['Class Participation', ['participation', 'συμμετο']],
  ['Presentation', ['presentation', 'παρουσιαση', 'παρουσιασε']],
  ['Midterm Exam', ['midterm', 'mid term', 'ενδιαμεσ']],
  ['Final Exam', ['final', 'τελικ']],
  ['Attendance', ['attendance', 'παρουσ']],
];

export function getRuleKind(category: unknown, t: (key: string) => string): string {
  if (!category || typeof category !== 'string') return '';
  const standard = getStandardCategory(category, t);
  if (standard) return standard;
  const folded = foldRuleName(category);
  const startsAWord = (stem: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${stem}`, 'u').test(folded);
  const found = RULE_KEYWORDS.find(([, stems]) => stems.some(startsAWord));
  return found ? found[0] : category;
}

/**
 * A rule or category name to show: translated when it IS a standard category, else as it was
 * typed. Never by a keyword: a course's "Exam" is no Final Exam and "Exercises" no Homework, though
 * `getLocalizedCategory` names them so (todo 77 point 2's review: the Grading page offered «Τελική
 * Εξέταση» twice, and a grade filed under the wrong one took the final's place).
 */
export function localizeStandardName(category: unknown, t: (key: string) => string): string {
  if (!category || typeof category !== 'string') return '';
  const standard = getStandardCategory(category, t);
  return standard ? getLocalizedCategory(standard, t) : category;
}
