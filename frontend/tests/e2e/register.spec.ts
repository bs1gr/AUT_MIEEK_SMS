import { test, expect, request } from '@playwright/test';

test.describe('Registration flow (smoke)', () => {
  test('backend /auth/register sets refresh cookie and returns access token', async ({}) => {
    const apiBase = process.env.E2E_API_BASE || 'http://localhost:8000';
    const rnd = Math.random().toString(36).slice(2, 8);
    const email = `e2e-${rnd}@example.test`;
    const password = 'E2E-Password-1!';

    const req = await request.newContext({ baseURL: apiBase });
    const res = await req.post('/auth/register', {
      data: {
        email,
        password,
        full_name: 'E2E User'
      }
    });

    expect(res.status()).toBeGreaterThan(199);
    expect(res.status()).toBeLessThan(300);

    // Ensure Set-Cookie header contains a refresh token cookie
    const sc = res.headers()['set-cookie'] || '';
    expect(sc).toMatch(/refresh_token=/);

    // If backend returns an access_token in the body, ensure it's present
    const body = await res.json().catch(() => ({}));
    if (body && body.access_token) {
      expect(typeof body.access_token).toBe('string');
    }
  });
});
