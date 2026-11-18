/**
 * The one-page "Quick Guide" behind Utils > Help & Documentation, kept to the pages.
 *
 * The server composes the page from two texts in backend/routers/routers_help.py. Until
 * November 2026 they named a "Help" button, video tutorials and support links, none of which
 * the application has. Like the help's answers (helpContent.test.ts), the page now puts every
 * button, tab and page it names in quotation marks, under the name the application gives it
 * in that language, and this test finds each of them among the application's own texts:
 * rename a button and the test says that the page has to follow.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { translations, translationNamespaces } from '@/translations';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.resolve(here, '../../../../backend/routers/routers_help.py'), 'utf8');

function guide(name: 'QUICK_GUIDE_EN' | 'QUICK_GUIDE_EL'): string {
  const match = source.match(new RegExp(`${name} = """\\n([\\s\\S]*?)\\n"""`));
  if (!match) throw new Error(`${name} was not found in routers_help.py`);
  return match[1];
}
const text = { en: guide('QUICK_GUIDE_EN'), el: guide('QUICK_GUIDE_EL') };

// Every text of the application in one language, as the pages show them.
function textsOf(language: 'en' | 'el'): Set<string> {
  const found = new Set<string>();
  const walk = (value: unknown) => {
    if (typeof value === 'string') found.add(value.trim());
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(translations[language]);
  Object.values(translationNamespaces[language]).forEach(walk);
  return found;
}
const QUOTED = { en: /"([^"\n]+)"/g, el: /«([^»\n]+)»/g };
const named = (language: 'en' | 'el') => [...text[language].matchAll(QUOTED[language])].map((match) => match[1]);

describe('the Quick Guide', () => {
  it('is found in the server\'s module, in both languages', () => {
    expect(text.en).toContain('# Student Management System');
    expect(text.el).toContain('# Σύστημα Διαχείρισης Σπουδαστών');
    expect(named('en').length).toBeGreaterThan(20);
    expect(named('el')).toHaveLength(named('en').length);
  });

  it.each(['en', 'el'] as const)('names only buttons, tabs and pages that exist (%s)', (language) => {
    const labels = textsOf(language);

    const unknown = named(language).filter((label) => !labels.has(label));

    expect(unknown).toEqual([]);
  });

  it('names the same places in the same order in both languages', () => {
    // Each English name and the Greek one at the same position are two texts of one key.
    const en = textsOf('en');
    const el = textsOf('el');
    const pairs = named('en').map((label, index) => [label, named('el')[index]]);

    expect(pairs.filter(([english, greek]) => !en.has(english) || !el.has(greek))).toEqual([]);
    expect(pairs[0]).toEqual(['Students', 'Σπουδαστές']);
    expect(pairs[pairs.length - 1]).toEqual(['Feedback Inbox', 'Κιβώτιο Ανατροφοδότησης']);
  });
});
