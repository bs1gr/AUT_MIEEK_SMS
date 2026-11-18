/**
 * The names RBAC Configuration shows for the permissions, kept to the list the server has.
 *
 * Until 18 November 2026 the two were written apart and had drifted: the table held some
 * sixty names, forty of them for permissions that never existed ("students:view_all",
 * "backups:restore"), and the Overview tab showed a third of the real ones without a name.
 * The server's list (PERMISSION_DEFS) is the only list now, so the table is pinned to it:
 * a permission added there fails this test until it has a name in both languages.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import rbacEn from '@/locales/en/rbac.js';
import rbacEl from '@/locales/el/rbac.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.resolve(here, '../../../../backend/routers/routers_rbac.py'), 'utf8');
const block = source.slice(source.indexOf('PERMISSION_DEFS: tuple'), source.indexOf('# What the role teacher holds'));
// The first entry is written with the constant ADMIN_WILDCARD, the others with their key.
const listed = ['*:*', ...[...block.matchAll(/\(\s*"([a-z.]+:[a-z_]+)"/g)].map((match) => match[1])];

const names = {
  en: (rbacEn as { permissionNames: Record<string, string> }).permissionNames,
  el: (rbacEl as { permissionNames: Record<string, string> }).permissionNames,
};

describe('the names of the permissions', () => {
  it('reads the list of the server', () => {
    expect(block).toContain('ADMIN_WILDCARD, "*", "*"');
    expect(listed).toHaveLength(44);
    expect(new Set(listed).size).toBe(44);
    expect(listed).toEqual(expect.arrayContaining(['students:view', 'imports:execute', 'jobs:view', 'sessions:manage']));
  });

  it.each(['en', 'el'] as const)('has a name for each permission of the list and for no other (%s)', (language) => {
    expect(Object.keys(names[language])).toEqual(listed);
    const blank = listed.filter((key) => !names[language][key]?.trim());
    expect(blank).toEqual([]);
  });

  it('does not show two permissions under one name', () => {
    for (const language of ['en', 'el'] as const) {
      const seen = new Map<string, string>();
      const twice: string[] = [];
      for (const key of listed) {
        const name = names[language][key];
        if (seen.has(name)) twice.push(`${seen.get(name)} / ${key}: ${name}`);
        seen.set(name, key);
      }
      expect(twice).toEqual([]);
    }
  });
});
