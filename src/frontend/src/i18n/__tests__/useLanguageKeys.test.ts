/**
 * Every literal key passed to the `t` of `useLanguage()` must resolve in both EN and EL.
 *
 * `useLanguage().t` answers a key it cannot find with the key itself, so a missing text is
 * shown on the page as its own name: "currentRules:" stood above the rules of a course, and
 * "failedToLoadSemesters" was the message of a failed request (both found on 18 November 2026
 * by reading the pages). `useTranslationKeys.test.ts` checks the keys of `useTranslation()`;
 * this is the same check for the application's own hook, which most pages use.
 *
 * It follows the hook's order of search (LanguageContext.tsx): `ns.key` as a key of that
 * namespace, then the root texts, then the list of namespaces the hook falls back to.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import i18n from '../config';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const LANGUAGES = ['en', 'el'];

// The namespaces `useLanguage().t` falls back to, in its order. The first test below keeps
// this list equal to the one in LanguageContext.tsx.
const FALLBACKS = [
  'dashboard', 'attendance', 'search', 'grades', 'students', 'courses', 'calendar', 'utils',
  'controlPanel', 'rbac', 'auth', 'common', 'export', 'help', 'reports', 'feedback',
  'analytics', 'notifications', 'errors', 'customReports', 'messages', 'system',
];

// Components that do not call the hook but are handed its `t` by the component that does.
const HANDED_T = new Set([
  'components/tools/SessionExportImport.tsx',
  'components/tools/useSessionExportImport.ts',
]);

const HOOK = /const\s*\{[^}]*\bt\b(?!\s*:)[^}]*\}\s*=\s*useLanguage\(\)/;
const CALL = /(?<![\w.])t\(\s*['"]([^'"`$]+)['"]\s*(?:,\s*(\{[^}]*\}))?/g;

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return ['__tests__', 'locales', 'node_modules'].includes(entry.name) ? [] : sourceFiles(full);
    }
    return /\.(t|j)sx?$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name) ? [full] : [];
  });
}

function has(lng: string, ns: string, key: string): boolean {
  // A key used with a count has its text under key_one / key_other.
  return [key, `${key}_one`, `${key}_other`].some((k) => typeof i18n.getResource(lng, ns, k) === 'string');
}

export function resolves(lng: string, key: string, nsOption?: string): boolean {
  if (key.includes('.')) {
    const [ns, ...rest] = key.split('.');
    if (has(lng, ns, rest.join('.'))) return true;
  }
  if (has(lng, nsOption ?? 'translation', key)) return true;
  return FALLBACKS.some((ns) => has(lng, ns, key));
}

function unresolvedCalls(root: string = SRC): Map<string, string[]> {
  const byFile = new Map<string, string[]>();
  for (const file of sourceFiles(root)) {
    const relative = path.relative(root, file).split(path.sep).join('/');
    const source = fs.readFileSync(file, 'utf8');
    if (!HOOK.test(source) && !HANDED_T.has(relative)) continue;
    const misses = new Set<string>();
    for (const call of source.matchAll(CALL)) {
      const nsOption = /\bns:\s*['"](\w+)['"]/.exec(call[2] ?? '')?.[1];
      for (const lng of LANGUAGES) {
        if (!resolves(lng, call[1], nsOption)) misses.add(`t('${call[1]}') [${lng}]`);
      }
    }
    if (misses.size) byFile.set(relative, [...misses]);
  }
  return byFile;
}

describe('useLanguage() keys', () => {
  it('knows the namespaces the hook falls back to', () => {
    const context = fs.readFileSync(path.join(SRC, 'LanguageContext.tsx'), 'utf8');
    const list = /const namespaceFallbacks = useMemo\(\s*\(\) => \[([^\]]+)\]/.exec(context);
    expect(list).not.toBeNull();
    expect([...list![1].matchAll(/'(\w+)'/g)].map((m) => m[1])).toEqual(FALLBACKS);
  });

  // A synchronous scan of every source file: about 2 s alone, 7.5 s with six test workers at once
  // (a commit gate on 2026-11-20), so the default 5 s is too tight.
  it('resolve in EN and EL for every literal t() call', () => {
    expect(Object.fromEntries(unresolvedCalls())).toEqual({});
  }, 30_000);

  it('finds a broken call in a real file (positive control)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-language-scan-'));
    try {
      fs.writeFileSync(
        path.join(dir, 'Broken.tsx'),
        "const { t } = useLanguage();\nexport const A = () => t('currentRulez') + t('save') + t('rbac.overview') + t('enrolled', { ns: 'dashboard' });\n",
      );
      expect(Object.fromEntries(unresolvedCalls(dir))).toEqual({
        'Broken.tsx': ["t('currentRulez') [en]", "t('currentRulez') [el]"],
      });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('finds the two texts that were missing', () => {
    for (const lng of LANGUAGES) {
      expect(resolves(lng, 'currentRules')).toBe(true);
      expect(resolves(lng, 'failedToLoadSemesters')).toBe(true);
      expect(resolves(lng, 'sessionNotAllowed')).toBe(true);
    }
  });
});
