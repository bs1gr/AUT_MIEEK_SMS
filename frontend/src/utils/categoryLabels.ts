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
    // Consolidate similar categories to Homework/Assignments
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

// Map localized (e.g., Greek) labels or variants back to canonical English category names
export function getCanonicalCategory(category: unknown, t: (key: string) => string): string {
  if (!category || typeof category !== 'string') return '';

  const normalize = (s: string) => s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  const normalizedInput = normalize(category);

  // Known canonical English labels (matching backend expectations)
  const canonicalMap: Record<string, string> = {
    classParticipation: 'Class Participation',
    continuousAssessment: 'Continuous Assessment',
    midtermExam: 'Midterm Exam',
    finalExam: 'Final Exam',
    labWork: 'Lab Work',
    quizzes: 'Quizzes',
    project: 'Project',
    presentation: 'Presentation',
    homework: 'Homework/Assignments',
  };

  // First, try matching against translations (EL/EN) via t(key)
  for (const [tKey, canonical] of Object.entries(canonicalMap)) {
    const translated = String(t(tKey) || '');
    if (translated && normalize(translated) === normalizedInput) {
      return canonical;
    }
  }

  // Try direct English matches (user may have already entered canonical English)
  for (const canonical of Object.values(canonicalMap)) {
    if (normalize(canonical) === normalizedInput) return canonical;
  }

  // Some simple heuristics: keywords
  if (normalizedInput.includes('τελικ') || normalizedInput.includes('τελική') || normalizedInput.includes('final')) return 'Final Exam';
  if (normalizedInput.includes('ενδιά') || normalizedInput.includes('midterm')) return 'Midterm Exam';
  if (normalizedInput.includes('εργαστηρ') || normalizedInput.includes('lab')) return 'Lab Work';
  if (normalizedInput.includes('παρουσι') || normalizedInput.includes('participation')) return 'Class Participation';
  if (normalizedInput.includes('εργασ') || normalizedInput.includes('homework') || normalizedInput.includes('assignment')) return 'Homework/Assignments';

  // Unknown: return original input (don't overwrite unintentionally)
  return category;
}
