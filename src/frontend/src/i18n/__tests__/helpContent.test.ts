/**
 * The answers of Utils > Help & Documentation, kept to the pages.
 *
 * On 18 November 2026 the help was read against the application and most of it was older
 * than the pages: buttons that do not exist ("Save Attendance"), paths that lead nowhere
 * ("Operations → Backups"), features that were never built (a "System" theme, sample data),
 * and a model of absences the application left a year ago. An answer goes stale silently,
 * so three things are pinned here:
 *
 * - the page shows only texts that exist in both languages, and the two languages hold the
 *   same texts;
 * - no text is left in the files that the page does not show (an unused answer is not read
 *   by anybody, and is the first to be wrong);
 * - every button, tab or page an answer names in quotation marks exists under that name in
 *   the application's texts of the same language. Rename a button and this test says which
 *   answers have to follow.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { translations, translationNamespaces } from '@/translations';
import helpEn from '@/locales/en/help.js';
import helpEl from '@/locales/el/help.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const component = fs.readFileSync(path.resolve(here, '../../components/tools/HelpDocumentation.tsx'), 'utf8');
const help = { en: helpEn as Record<string, string>, el: helpEl as Record<string, string> };

const used = new Set([...component.matchAll(/\bt\('([^']+)'\)/g)].map((match) => match[1]));
const groups = [...component.matchAll(/id: '([^']+)',\s*title: t\('([^']+)'\)/g)];
const pairs = [...component.matchAll(/question: t\('([^']+)'\), answer: t\('([^']+)'\)/g)];

// Every text of the application in one language, as the pages show them.
function textsOf(language: 'en' | 'el'): Set<string> {
  const found = new Set<string>();
  const walk = (value: unknown) => {
    if (typeof value === 'string') found.add(value.trim());
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(translations[language]);
  Object.entries(translationNamespaces[language]).forEach(([name, table]) => {
    if (name !== 'help') walk(table);
  });
  return found;
}

// What stands in quotation marks without being a label of the application.
const NOT_A_LABEL: Record<'en' | 'el', string[]> = {
  en: ['the final grade so far', '15.5/20, Καλώς'],
  el: ['ο τελικός βαθμός ως τώρα', '15,5/20, Καλώς'],
};
const QUOTED = { en: /"([^"\n]+)"/g, el: /«([^»\n]+)»/g };

describe('Help & Documentation', () => {
  it('has the groups and answers that were read against the pages', () => {
    expect(groups).toHaveLength(18);
    expect(pairs).toHaveLength(81);
    expect(new Set(pairs.map((pair) => pair[1])).size).toBe(pairs.length);
    expect(new Set(pairs.map((pair) => pair[2])).size).toBe(pairs.length);
  });

  it.each(['en', 'el'] as const)('has a text for everything the page shows (%s)', (language) => {
    const missing = [...used].filter((key) => typeof help[language][key] !== 'string' || !help[language][key].trim());
    expect(missing).toEqual([]);
  });

  it('holds the same texts in both languages, and none that the page does not show', () => {
    expect(Object.keys(help.el).sort()).toEqual(Object.keys(help.en).sort());
    expect(Object.keys(help.en).filter((key) => !used.has(key))).toEqual([]);
  });

  it.each(['en', 'el'] as const)('names only buttons, tabs and pages that exist (%s)', (language) => {
    const labels = textsOf(language);
    const allowed = new Set(NOT_A_LABEL[language]);
    const unknown: string[] = [];
    for (const [, questionKey, answerKey] of pairs) {
      for (const key of [questionKey, answerKey]) {
        for (const match of help[language][key].matchAll(QUOTED[language])) {
          const label = match[1].trim();
          if (!labels.has(label) && !allowed.has(label)) unknown.push(`${key}: ${label}`);
        }
      }
    }
    expect(unknown).toEqual([]);
  });

  it('does not bring back what the reading took out', () => {
    const all = Object.values(help.en).join('\n');
    for (const gone of ['Save Attendance', 'Operations →', 'sample data', '"System" theme', 'unexcused', 'Power']) {
      expect(all).not.toContain(gone);
    }
  });
});
