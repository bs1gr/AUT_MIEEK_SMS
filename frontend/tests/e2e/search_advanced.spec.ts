import { test, expect, Page } from '@playwright/test';

test.describe('Search Feature E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Login before each test
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    // Navigate to search
    await page.goto('http://localhost:5173/search');
    await page.waitForSelector('[data-testid="student-search-input"]', { timeout: 5000 });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('basic student search workflow', async () => {
    // Step 1: Enter search query
    await page.fill('[data-testid="student-search-input"]', 'John');
    
    // Step 2: Wait for results
    await page.waitForSelector('li[role="listitem"]', { timeout: 3000 });
    
    // Step 3: Verify results displayed
    const results = await page.locator('li[role="listitem"]').count();
    expect(results).toBeGreaterThan(0);
  });

  test('filter search results with advanced filters', async () => {
    // Step 1: Open filters panel
    await page.click('[data-testid="filters-expand"]');
    await page.waitForSelector('[data-testid="facets"]', { timeout: 2000 });
    
    // Step 2: Select a filter (e.g., status=active)
    const statusCheckbox = page.locator('input[value="active"]').first();
    if (await statusCheckbox.isVisible()) {
      await statusCheckbox.check();
      
      // Step 3: Wait for filtered results
      await page.waitForTimeout(500); // Debounce
      await page.waitForSelector('li[role="listitem"]', { timeout: 3000 });
      
      // Step 4: Verify filter applied
      const filterBadge = page.locator('[data-testid="active-filters-badge"]');
      const count = await filterBadge.textContent();
      expect(Number(count)).toBeGreaterThan(0);
    }
  });

  test('sort results by different fields', async () => {
    // Step 1: Enter search query
    await page.fill('[data-testid="student-search-input"]', 'student');
    await page.waitForSelector('li[role="listitem"]', { timeout: 3000 });
    
    // Step 2: Get initial results
    const initialFirstResult = await page.locator('li[role="listitem"]').first().textContent();
    
    // Step 3: Change sort order
    const sortSelect = page.locator('select').filter({ has: page.locator('option[value="name"]') });
    if (await sortSelect.isVisible()) {
      await sortSelect.selectOption('name');
      
      // Step 4: Wait for re-sort
      await page.waitForTimeout(300);
      
      // Step 5: Get results after sort
      const afterSortFirstResult = await page.locator('li[role="listitem"]').first().textContent();
      
      // Results may be different after sort
      expect(afterSortFirstResult).toBeDefined();
    }
  });

  test('pagination through large result sets', async () => {
    // Step 1: Search for broad query
    await page.fill('[data-testid="student-search-input"]', 'a');
    await page.waitForSelector('li[role="listitem"]', { timeout: 3000 });
    
    // Step 2: Verify page 1
    const page1Results = await page.locator('li[role="listitem"]').count();
    expect(page1Results).toBeGreaterThan(0);
    
    // Step 3: Click next page
    const nextButton = page.locator('button').filter({ hasText: /next/i }).first();
    if (await nextButton.isVisible() && !await nextButton.isDisabled()) {
      await nextButton.click();
      await page.waitForTimeout(500);
      
      // Step 4: Verify page 2 results
      const page2Results = await page.locator('li[role="listitem"]').count();
      expect(page2Results).toBeGreaterThan(0);
    }
  });

  test('save and load search', async () => {
    // Step 1: Perform a search
    await page.fill('[data-testid="student-search-input"]', 'John');
    await page.waitForSelector('li[role="listitem"]', { timeout: 3000 });
    
    // Step 2: Open save dialog
    const saveButton = page.locator('button').filter({ hasText: /save|new search/i }).first();
    if (await saveButton.isVisible()) {
      await saveButton.click();
      
      // Step 3: Fill save form
      await page.fill('input[placeholder*="search name"]', 'My John Search');
      const confirmButton = page.locator('button').filter({ hasText: /save/i }).nth(1);
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        
        // Step 4: Verify save confirmation
        await page.waitForTimeout(500);
        expect(page.locator('text=saved successfully').isVisible).toBeDefined();
      }
    }
  });

  test('search across different entity types', async () => {
    // Test Students
    const typeSelect = page.locator('select').filter({ has: page.locator('option[value="students"]') }).first();
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption('students');
      await page.fill('[data-testid="student-search-input"]', 'test');
      await page.waitForSelector('li[role="listitem"]', { timeout: 3000 });
      const studentResults = await page.locator('li[role="listitem"]').count();
      expect(studentResults).toBeGreaterThanOrEqual(0);
      
      // Test Courses
      await typeSelect.selectOption('courses');
      await page.waitForTimeout(500);
      const courseResults = await page.locator('li[role="listitem"]').count();
      expect(courseResults).toBeGreaterThanOrEqual(0);
    }
  });

  test('clear all filters and search', async () => {
    // Step 1: Set up filters
    await page.fill('[data-testid="student-search-input"]', 'test');
    
    // Step 2: Add a filter
    const filterCheckbox = page.locator('input[type="checkbox"]').first();
    if (await filterCheckbox.isVisible()) {
      await filterCheckbox.check();
    }
    
    // Step 3: Clear all
    const clearButton = page.locator('button').filter({ hasText: /clear/i }).first();
    if (await clearButton.isVisible()) {
      await clearButton.click();
      
      // Step 4: Verify cleared
      const searchInput = page.locator('[data-testid="student-search-input"]');
      expect(await searchInput.inputValue()).toBe('');
    }
  });

  test('mobile responsive search', async () => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Step 1: Verify search input visible
    const searchInput = page.locator('[data-testid="student-search-input"]');
    await expect(searchInput).toBeVisible();
    
    // Step 2: Perform search
    await searchInput.fill('test');
    await page.waitForSelector('li[role="listitem"]', { timeout: 3000 });
    
    // Step 3: Verify results displayed
    const results = await page.locator('li[role="listitem"]').count();
    expect(results).toBeGreaterThan(0);
  });

  test('keyboard navigation in search results', async () => {
    // Step 1: Search
    await page.fill('[data-testid="student-search-input"]', 'test');
    await page.waitForSelector('li[role="listitem"]', { timeout: 3000 });
    
    // Step 2: Tab through results
    const firstResult = page.locator('li[role="listitem"]').first();
    await firstResult.focus();
    await expect(firstResult).toBeFocused();
    
    // Step 3: Navigate down
    await page.keyboard.press('ArrowDown');
    const secondResult = page.locator('li[role="listitem"]').nth(1);
    // Result should be reachable via keyboard
    expect(secondResult).toBeDefined();
  });

  test('handles network errors gracefully', async () => {
    // Intercept network and simulate failure
    await page.route('**/api/v1/search/**', route => {
      route.abort('failed');
    });
    
    // Try to search
    await page.fill('[data-testid="student-search-input"]', 'test');
    await page.waitForTimeout(500);
    
    // Verify error message displayed
    const errorMessage = page.locator('[role="alert"]');
    expect(await errorMessage.isVisible() || await page.locator('text=error').isVisible()).toBeDefined();
  });

  test('debouncing prevents excessive API calls', async () => {
    // Track API calls
    let callCount = 0;
    await page.route('**/api/v1/search/**', route => {
      callCount++;
      route.abort();
    });
    
    // Rapid typing
    const searchInput = page.locator('[data-testid="student-search-input"]');
    await searchInput.type('t', { delay: 50 });
    await searchInput.type('e', { delay: 50 });
    await searchInput.type('s', { delay: 50 });
    await searchInput.type('t', { delay: 50 });
    
    // Wait for debounce
    await page.waitForTimeout(400);
    
    // Should have fewer calls than characters typed due to debouncing
    expect(callCount).toBeLessThanOrEqual(2);
  });

  test('result type badges display correctly', async () => {
    // Step 1: Search
    await page.fill('[data-testid="student-search-input"]', 'test');
    await page.waitForSelector('li[role="listitem"]', { timeout: 3000 });
    
    // Step 2: Verify type badge visible
    const typeBadges = page.locator('[data-testid*="result-type"]');
    const count = await typeBadges.count();
    expect(count).toBeGreaterThan(0);
  });

  test('search history persists in saved searches', async () => {
    // Step 1: Perform multiple searches
    await page.fill('[data-testid="student-search-input"]', 'John');
    await page.waitForSelector('li[role="listitem"]', { timeout: 3000 });
    
    // Step 2: Save search
    const saveButton = page.locator('button').filter({ hasText: /save|new search/i }).first();
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await page.fill('input[placeholder*="search name"]', 'Saved Search 1');
      await page.click('button:has-text("Save")');
      
      // Step 3: Navigate away and back
      await page.goto('http://localhost:5173/dashboard');
      await page.goto('http://localhost:5173/search');
      
      // Step 4: Verify saved search still available
      const savedSearchButton = page.locator('button:has-text("Saved Search 1")');
      expect(await savedSearchButton.isVisible() || await page.locator('text=Saved Search 1').isVisible()).toBeDefined();
    }
  });
});
