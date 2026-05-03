import { test, expect, type Page } from '@playwright/test';
import { generateTeacherUser, loginViaAPI, registerUser } from './helpers';

const getAccessToken = async (page: Page) =>
  page.evaluate(() => window.localStorage.getItem('sms_access_token') || '');

const getApiBase = (page: Page) => {
  const apiBase = new URL('/api/v1', page.url()).toString();
  return apiBase.replace(/\/$/, '');
};

const unwrapData = async <T>(response: Awaited<ReturnType<Page['request']['get']>>): Promise<T> => {
  const json = await response.json();
  return (json?.data ?? json) as T;
};

test.describe('Saved Search Authorization', () => {
  test('users should not see searches created by others', async ({ browser }) => {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    const userA = generateTeacherUser();
    const userB = generateTeacherUser();
    const searchName = `Private Search ${Date.now()}`;

    try {
      await registerUser(pageA, userA);
      await registerUser(pageB, userB);
      await loginViaAPI(pageA, userA.email, userA.password);
      await loginViaAPI(pageB, userB.email, userB.password);

      const apiBase = getApiBase(pageA);
      const tokenA = await getAccessToken(pageA);
      const tokenB = await getAccessToken(pageB);

      const createResponse = await pageA.request.post(`${apiBase}/search/saved`, {
        headers: { Authorization: `Bearer ${tokenA}` },
        data: {
          name: searchName,
          description: 'Private E2E saved search',
          search_type: 'students',
          query: 'Test Student',
          filters: {},
          is_favorite: false,
        },
      });
      expect(createResponse.ok()).toBeTruthy();
      const created = await unwrapData<{ id: number; name: string }>(createResponse);
      expect(created.name).toBe(searchName);

      const ownResponse = await pageA.request.get(`${apiBase}/search/saved`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(ownResponse.ok()).toBeTruthy();
      const ownSearches = await unwrapData<Array<{ name: string }>>(ownResponse);
      expect(ownSearches.some((search) => search.name === searchName)).toBeTruthy();

      const otherResponse = await pageB.request.get(`${apiBase}/search/saved`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      expect(otherResponse.ok()).toBeTruthy();
      const otherSearches = await unwrapData<Array<{ name: string }>>(otherResponse);
      expect(otherSearches.some((search) => search.name === searchName)).toBeFalsy();

      await pageA.request.delete(`${apiBase}/search/saved/${created.id}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
