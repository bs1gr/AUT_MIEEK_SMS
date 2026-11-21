/**
 * The Control Panel on the System page is a "light island" (plan todo 66, 2026-11-21).
 *
 * In the dark theme of the default appearance the app shows white cards on a dark page (the
 * Dashboard's, the System page's). The Control Panel's container there stayed white too, but its
 * tabs' dark: colours (dark backgrounds, light text) still applied, so much of it was unreadable.
 * Inside an element with the class light-island the dark variant does not apply. Seen in a
 * browser: all eight tabs, both themes, before and after.
 *
 * Tailwind does not run here, so this reads the sources: the variant, every hand-written dark
 * rule of the CSS files (a rule written with :is(.dark *) bypasses the variant), and the
 * container's class.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = resolve(__dirname, '..');
const source = (relative: string) => readFileSync(join(SRC, relative), 'utf-8');
const ISLAND = ':not(:where(.light-island, .light-island *))';

const cssFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : cssFiles(path);
    return entry.name.endsWith('.css') ? [path] : [];
  });

describe('light island', () => {
  it('the dark variant does not apply inside a .light-island', () => {
    const variant = source('index.css').match(/@custom-variant dark \((.+)\);/);
    expect(variant?.[1]).toBe(`&:is(.dark *)${ISLAND}`);
  });

  it('no hand-written dark rule reaches into a .light-island', () => {
    const offenders: string[] = [];
    for (const file of cssFiles(SRC)) {
      readFileSync(file, 'utf-8')
        .split('\n')
        .forEach((line, index) => {
          if (line.includes(':is(.dark *)') && !line.includes('@custom-variant') && !line.includes(ISLAND)) {
            offenders.push(`${file.slice(SRC.length + 1)}:${index + 1}: ${line.trim()}`);
          }
        });
    }
    expect(offenders).toEqual([]);
  });

  it('the Control Panel on the System page is one', () => {
    const embedded = source('components/ControlPanel.tsx').match(/const containerClass = isEmbedded\s*\?\s*'([^']*)'/);
    expect(embedded?.[1].split(' ')).toContain('light-island');
    // Its text colour no longer turns light in the dark theme while its background stays white
    expect(embedded?.[1]).not.toMatch(/dark:text-/);
  });
});
