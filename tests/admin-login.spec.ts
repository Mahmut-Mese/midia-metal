import { test, expect } from '@playwright/test';

test('admin can log in with seeded credentials', async ({ page }) => {
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') console.log(`CONSOLE [${msg.type()}]: ${text}`);
  });

  await page.goto('/admin/login');
  await page.locator('input[type="email"]').fill('admin@midiametal.com');
  await page.locator('input[type="password"]').fill('password');
  const loginResponsePromise = page.waitForResponse((response) => response.url().includes('/api/admin/login'));
  await page.getByRole('button', { name: /sign in/i }).click();

  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok()).toBeTruthy();

  await expect.poll(() => page.url(), { timeout: 15000 }).toBe('http://127.0.0.1:4323/admin');
  await expect(page.getByText('Admin Panel')).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
});
