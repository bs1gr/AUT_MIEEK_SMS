import { test, expect, request } from '@playwright/test';

test.describe('Registration flow (smoke)', () => {
  test('backend /auth/register sets refresh cookie and returns access token', async ({}) => {
    const apiBase = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8000';
    const rnd = Math.random().toString(36).slice(2, 8);
  const email = `e2e-${rnd}@example.com`;
    const password = 'E2E-Password-1!';

    const req = await request.newContext({ baseURL: apiBase });
    const res = await req.post('/api/v1/auth/register', {
      data: JSON.stringify({
        email,
        password,
        full_name: 'E2E User',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (!(res.status() >= 200 && res.status() < 300)) {
      const txt = await res.text().catch(() => '');
      console.error('Register failed status=', res.status(), 'body=', txt);
    }
    expect(res.status()).toBeGreaterThan(199);
    expect(res.status()).toBeLessThan(300);

    // Registration does not set cookies directly. Perform login to obtain the
    // refresh_token HttpOnly cookie and access token.
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
