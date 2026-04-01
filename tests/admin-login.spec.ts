import { test, expect } from '@playwright/test';

test('admin can log in with seeded credentials', async ({ page }) => {
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') console.log(`CONSOLE [${msg.type()}]: ${text}`);
  });

  await page.goto('http://127.0.0.1:4321/admin/login');
  await page.locator('input[type="email"]').fill('admin@midiaematal.com');
  await page.locator('input[type="password"]').fill('password');
  await page.getByRole('button', { name: /sign in/i }).click();

  await page.waitForURL('**/admin', { timeout: 10000 });
  await expect(page.getByText('Admin Panel')).toBeVisible({ timeout: 10000 });
});
