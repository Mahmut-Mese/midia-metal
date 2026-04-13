/**
 * Login Flow Test
 * Tests that customer login works correctly
 */
import { test, expect } from '@playwright/test';

async function dismissCookieBanner(page: import('@playwright/test').Page) {
  const acceptButton = page.getByRole('button', { name: 'Accept All' });
  if (await acceptButton.isVisible().catch(() => false)) {
    await acceptButton.click();
  }
}

test('Customer can login with valid credentials', async ({ page }) => {
  // Go to login page
  await page.goto('/login');
  await dismissCookieBanner(page);
  
  // Fill in credentials
  await page.fill('input[type="email"]', 'asd@asd.com');
  await page.fill('input[type="password"]', '12345678');
  
  // Click login button
  await page.click('button[type="submit"]');

  await expect.poll(() => page.url(), { timeout: 15000 }).toContain('/account');
  await expect(page.getByRole('heading', { name: 'Order History' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible({ timeout: 10000 });
});

test('Customer can logout', async ({ page }) => {
  // First login
  await page.goto('/login');
  await dismissCookieBanner(page);
  await page.fill('input[type="email"]', 'asd@asd.com');
  await page.fill('input[type="password"]', '12345678');
  await page.click('button[type="submit"]');
  await expect.poll(() => page.url(), { timeout: 15000 }).toContain('/account');
  await expect(page.getByRole('heading', { name: 'Order History' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible({ timeout: 10000 });
  
  // Click logout button
  await page.click('button:has-text("Logout")');
  
  // Should redirect away from account page
  // The logout flow: click logout -> redirect to / -> AccountIsland detects no user -> redirect to /login
  // So we end up at /login eventually
  await page.waitForURL('**/login', { timeout: 10000 });
  
  // Verify we're on login page (logged out)
  expect(page.url()).toContain('/login');
});
