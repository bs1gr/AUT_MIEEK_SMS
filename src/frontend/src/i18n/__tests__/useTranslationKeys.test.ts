/**
 * Every literal key passed to react-i18next's `t` must resolve in both EN and EL.
 *
 * `useTranslation()` without a namespace reads only the root namespace, so a call such as
 * `t('common.save')` never resolves there: i18next falls back to the English default (or the raw
 * key) and Greek users see English. `useLanguage().t` resolves `ns.key`, `useTranslation().t` does
 * not. This scans the source for files that take `t` from `useTranslation(...)` and checks each
 * literal key against the real i18n resources, per language, without falling back to English.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import i18n from '../config';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const LANGUAGES = ['en', 'el'];

// Files allowed to have unresolved keys for now (none since the predictions panel was wired in).
const KNOWN_UNRESOLVED = new Set<string>();

const HOOK = /const\s*\{[^}]*\bt\b(?!\s*:)[^}]*\}\s*=\s*useTranslation\(([^)]*)\)/;
const CALL = /\bt\(\s*['"]([^'"`$]+)['"]\s*(?:,\s*(\{[^}]*\}|['"][^'"]*['"]))?/g;

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return ['__tests__', 'locales', 'node_modules'].includes(entry.name) ? [] : sourceFiles(full);
    }
    return /\.(t|j)sx?$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name) ? [full] : [];
  });
}

function resolves(lng: string, namespaces: string[], key: string): boolean {
  const prefixed = /^([A-Za-z]+):(.+)$/.exec(key);
  const [nsList, k] = prefixed ? [[prefixed[1]], prefixed[2]] : [namespaces, key];
  return nsList.some((ns) => typeof i18n.getResource(lng, ns, k) === 'string');
}

function unresolvedCalls(root: string = SRC): Map<string, string[]> {
  const byFile = new Map<string, string[]>();
  for (const file of sourceFiles(root)) {
    const source = fs.readFileSync(file, 'utf8');
    const hook = HOOK.exec(source);
    if (!hook) continue;
    const declared = [...hook[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
    const namespaces = declared.length ? declared : ['translation'];
    const misses: string[] = [];
    for (const call of source.matchAll(CALL)) {
      const nsOption = /\bns:\s*['"](\w+)['"]/.exec(call[2] ?? '');
      const callNs = nsOption ? [nsOption[1]] : namespaces;
      for (const lng of LANGUAGES) {
        if (!resolves(lng, callNs, call[1])) misses.push(`t('${call[1]}') [${lng}]`);
      }
    }
    if (misses.length) byFile.set(path.relative(root, file).split(path.sep).join('/'), misses);
  }
  return byFile;
}

describe('useTranslation() keys', () => {
  const byFile = unresolvedCalls();

  it('resolve in EN and EL for every literal t() call', () => {
    const unexpected = [...byFile].filter(([file]) => !KNOWN_UNRESOLVED.has(file));
    expect(Object.fromEntries(unexpected)).toEqual({});
  });

  it('known exceptions still need their exception', () => {
    for (const file of KNOWN_UNRESOLVED) {
      expect(byFile.get(file)?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('finds a broken call in a real file (positive control)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-scan-'));
    try {
      fs.writeFileSync(
        path.join(dir, 'Broken.tsx'),
        "const { t } = useTranslation();\nexport const A = () => t('common.logout') + t('save');\n",
      );
      expect(Object.fromEntries(unresolvedCalls(dir))).toEqual({
        'Broken.tsx': ["t('common.logout') [en]", "t('common.logout') [el]"],
      });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('treats a namespace-prefixed key under the default namespace as unresolved', () => {
    expect(resolves('el', ['translation'], 'common.logout')).toBe(false);
    expect(resolves('el', ['common'], 'logout')).toBe(true);
    expect(resolves('el', ['translation'], 'common:logout')).toBe(true);
  });
});
