/**
 * Login Flow Test
 * Tests that customer login works correctly
 */
import { test, expect } from '@playwright/test';

test('Customer can login with valid credentials', async ({ page }) => {
  // Go to login page
  await page.goto('/login');
  
  // Fill in credentials
  await page.fill('input[type="email"]', 'asd@asd.com');
  await page.fill('input[type="password"]', '12345678');
  
  // Click login button
  await page.click('button[type="submit"]');
  
  // Should redirect to account page after successful login
  await page.waitForURL('/account', { timeout: 10000 });
  
  // Verify we're on the account page
  expect(page.url()).toContain('/account');
  
  // Wait for the account page to fully load (Orders heading indicates data loaded)
  await expect(page.locator('h2:has-text("Order History")')).toBeVisible({ timeout: 10000 });
});

test('Customer can logout', async ({ page }) => {
  // First login
  await page.goto('/login');
  await page.fill('input[type="email"]', 'asd@asd.com');
  await page.fill('input[type="password"]', '12345678');
  await page.click('button[type="submit"]');
  await page.waitForURL('/account', { timeout: 10000 });
  await expect(page.locator('h2:has-text("Order History")')).toBeVisible({ timeout: 10000 });
  
  // Click logout button
  await page.click('button:has-text("Logout")');
  
  // Should redirect away from account page
  // The logout flow: click logout -> redirect to / -> AccountIsland detects no user -> redirect to /login
  // So we end up at /login eventually
  await page.waitForURL('**/login', { timeout: 10000 });
  
  // Verify we're on login page (logged out)
  expect(page.url()).toContain('/login');
});
