const { test, expect } = require('@playwright/test');

test('example: verify a page title', async ({ page }) => {
  await page.goto('http://127.0.0.1:8000/docs');
  await expect(page).toHaveTitle(/TestMind AI API/);
});
