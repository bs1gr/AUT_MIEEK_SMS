import { test, expect, request } from '@playwright/test';
import { getAdminToken } from './helpers';
import { recordCreatedUser } from './created-users';

test.describe('Registration flow (smoke)', () => {
  test('public registration waits for admin approval, then login sets the refresh cookie', async () => {
    const apiBase = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8000';
    const rnd = Math.random().toString(36).slice(2, 8);
    const email = `e2e-${rnd}@example.com`;
    const password = 'E2E-Password-1!';

    const req = await request.newContext({ baseURL: apiBase });
    const res = await req.post('/api/v1/auth/register', {
      data: JSON.stringify({ email, password, full_name: 'E2E User' }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (!(res.status() >= 200 && res.status() < 300)) {
      console.error('Register failed status=', res.status(), 'body=', await res.text().catch(() => ''));
    }
    expect(res.status()).toBeGreaterThan(199);
    expect(res.status()).toBeLessThan(300);
    const created = await res.json();
    recordCreatedUser(created.id, email);

    // The account exists but is inactive: the right password gets 403 AUTH_ACCOUNT_INACTIVE.
    expect(created.is_active).toBe(false);
    const pending = await req.post('/api/v1/auth/login', {
      data: JSON.stringify({ email, password }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(pending.status()).toBe(403);
    expect(JSON.stringify(await pending.json())).toContain('AUTH_ACCOUNT_INACTIVE');
    expect(pending.headers()['set-cookie'] || '').not.toMatch(/refresh_token=/);

    // An admin approves it.
    const adminToken = await getAdminToken();
    expect(adminToken, 'seeded E2E admin must be able to log in').toBeTruthy();
    const approve = await req.patch(`/api/v1/admin/users/${created.id}`, {
      data: JSON.stringify({ is_active: true }),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    });
    expect(approve.status()).toBe(200);
    expect((await approve.json()).is_active).toBe(true);

    // Now login works and issues the HttpOnly refresh cookie.
    const loginResp = await req.post('/api/v1/auth/login', {
      data: JSON.stringify({ email, password }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(loginResp.status()).toBeGreaterThan(199);
    expect(loginResp.status()).toBeLessThan(300);
    const sc = loginResp.headers()['set-cookie'] || '';
    expect(sc).toMatch(/refresh_token=/);
    const body = await loginResp.json().catch(() => ({}));
    if (body && body.access_token) {
      expect(typeof body.access_token).toBe('string');
    }
  });
});
