/**
 * Delete the accounts this E2E run created.
 *
 * Every spec that calls `registerUser` leaves an account behind, and nothing removed them: 234
 * had accumulated by 2026-09-16 and were cleared by hand. `TestDataTracker` handles the specs
 * that use it; this catches the rest, and — because the record is a file rather than in-memory
 * state — it also clears what a previous *crashed* run left behind.
 *
 * Deleting a user needs "users:manage", which the teacher accounts the specs create do not
 * have, so this uses an admin token. With no working admin credentials it reports what it is
 * leaving behind and keeps the record file, so the next run can try again.
 */

import { request } from '@playwright/test';
import { clearCreatedUsers, readCreatedUsers } from './tests/e2e/created-users';
import { getAdminToken, getApiBase } from './tests/e2e/helpers';

export default async function globalTeardown(): Promise<void> {
  const created = readCreatedUsers();
  if (created.length === 0) return;

  const adminToken = await getAdminToken();
  if (!adminToken) {
    console.warn(
      `⚠️  [E2E TEARDOWN] ${created.length} test account(s) left in the database — no working ` +
        `admin credentials. Set PLAYWRIGHT_ADMIN_EMAIL and PLAYWRIGHT_ADMIN_PASSWORD; the next ` +
        `run will retry them.\n  ${created.map((u) => u.email).join('\n  ')}`
    );
    return;
  }

  const apiBase = getApiBase();
  const context = await request.newContext({
    extraHTTPHeaders: { Authorization: `Bearer ${adminToken}` },
  });

  let removed = 0;
  const failures: string[] = [];
  try {
    for (const user of created) {
      try {
        const resp = await context.delete(`${apiBase}/api/v1/admin/users/${user.id}`);
        // 404 means a tracker already deleted it, which is the intended outcome.
        if (resp.ok() || resp.status() === 404) removed += 1;
        else failures.push(`${user.email} (id ${user.id}) → ${resp.status()}`);
      } catch (err) {
        failures.push(`${user.email} (id ${user.id}) → ${String(err)}`);
      }
    }
  } finally {
    await context.dispose();
  }

  if (failures.length > 0) {
    console.warn(
      `⚠️  [E2E TEARDOWN] ${failures.length} test account(s) could not be deleted and remain in ` +
        `the database:\n  ${failures.join('\n  ')}`
    );
    // Keep the record so the next run retries them.
    return;
  }

  console.log(`🧹 [E2E TEARDOWN] Removed ${removed} test account(s) created by this run.`);
  clearCreatedUsers();
}
