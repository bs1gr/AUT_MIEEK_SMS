/**
 * The four contrast design calls of 2026-10-07, settled by the owner on 2026-11-20 ("fix all four").
 *
 * The classes below were measured against the compiled CSS in all 32 combinations of theme
 * (light, dark, relaxing, fancy) and appearance (default and the seven named ones). The old ones
 * gave 1.6 to 4.4:1 somewhere; the new ones give 5.0:1 or more everywhere (WCAG AA for small
 * text is 4.5:1). The pairs that failed must not come back.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (relative: string) => readFileSync(resolve(__dirname, '..', relative), 'utf-8');

describe('contrast design calls', () => {
  it('the Present and Late buttons of the Attendance page are readable', () => {
    for (const file of [
      'features/attendance/components/AttendanceQuickActions.tsx',
      'features/attendance/components/AttendanceStudentList.tsx',
    ]) {
      const text = source(file);
      expect(text, file).not.toMatch(/bg-green-500 text-white/); // 2.3:1
      expect(text, file).not.toMatch(/bg-yellow-500 text-white/); // 1.7 to 1.9:1
      expect(text, file).toMatch(/bg-green-700 text-white/);
      expect(text, file).toMatch(/bg-yellow-400 text-slate-950/);
    }
  });

  it("the footer takes the appearance's muted text colour", () => {
    const text = source('components/Footer.tsx');
    expect(text).not.toMatch(/text-gray-400/); // 2.5:1 on white
    expect(text).toMatch(/text-\[color:var\(--appearance-muted-text,#4b5563\)\]/);
  });

  it('the small text of the Dashboard cards is readable', () => {
    const text = source('features/dashboard/components/EnhancedDashboardView.tsx');
    expect(text).not.toMatch(/text-xs text-slate-400|text-\[11px\] text-slate-400/); // 2.1 to 2.5:1
    expect(text).not.toMatch(/label: 'text-(indigo|emerald|amber|violet)-[0-9]+'/); // down to 1.6:1
  });
});
