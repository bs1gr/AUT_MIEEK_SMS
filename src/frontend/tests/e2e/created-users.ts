/**
 * A record of the accounts an E2E run creates, so the run can delete them again.
 *
 * Every spec that registers a user leaves an account behind: 234 had accumulated by
 * 2026-09-16 and had to be cleared by hand. `TestDataTracker` removes the ones a tracked test
 * creates, but specs that just call `registerUser` are not tracked, and a run that crashes
 * cannot clean up at all.
 *
 * So `registerUser` appends here, and the Playwright global teardown deletes whatever the file
 * holds at the end of the run. Because the record survives the process, a crashed run is tidied
 * up by the *next* one rather than leaking forever.
 *
 * Kept free of `@/` imports and Playwright page types so the global teardown, which runs
 * outside any test worker, can import it.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export interface CreatedUser {
  id: number;
  email: string;
}

/**
 * Workers are separate processes, so the registry has to be a file rather than module state.
 * It lives under test-results/, which is already ignored by git.
 */
export const CREATED_USERS_FILE = resolve(process.cwd(), 'test-results', 'e2e-created-users.jsonl');

export function recordCreatedUser(id: unknown, email: unknown): void {
  const numericId = typeof id === 'string' ? Number(id) : id;
  if (typeof numericId !== 'number' || !Number.isFinite(numericId)) return;

  try {
    mkdirSync(dirname(CREATED_USERS_FILE), { recursive: true });
    // One JSON object per line: appends from parallel workers cannot corrupt each other the
    // way rewriting a single JSON array would.
    appendFileSync(
      CREATED_USERS_FILE,
      `${JSON.stringify({ id: numericId, email: String(email ?? '') })}\n`,
      'utf-8'
    );
  } catch {
    // Never fail a test because bookkeeping failed; the teardown reports what it finds.
  }
}

export function readCreatedUsers(): CreatedUser[] {
  if (!existsSync(CREATED_USERS_FILE)) return [];

  try {
    const seen = new Map<number, CreatedUser>();
    for (const line of readFileSync(CREATED_USERS_FILE, 'utf-8').split('\n')) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as CreatedUser;
        if (typeof entry?.id === 'number') seen.set(entry.id, entry);
      } catch {
        // Skip a torn line rather than abandoning the rest.
      }
    }
    return [...seen.values()];
  } catch {
    return [];
  }
}

export function clearCreatedUsers(): void {
  try {
    rmSync(CREATED_USERS_FILE, { force: true });
  } catch {
    // Nothing to do; the next run will read the same entries and retry the deletes.
  }
}
