import { test, expect } from '@playwright/test';

async function mockAdminApi(page: import('@playwright/test').Page) {
  // Set dummy admin token
  await page.context().addCookies([{
    name: 'admin_token',
    value: 'mock_admin_token',
    domain: '127.0.0.1',
    path: '/',
    httpOnly: true,
    sameSite: 'Lax' as const,
    secure: false,
  }]);

  // Mock essential endpoints for admin
  await page.route('**/api/admin/me', async route => {
    await route.fulfill({
      status: 200,
      json: { id: 1, name: 'Admin', email: 'admin@midiametal.com' }
    });
  });

  await page.route('**/api/admin/dashboard', async route => {
    await route.fulfill({
      status: 200,
      json: { stats: { monthly_revenue: 0, total_products: 0, pending_orders: 0, unread_messages: 0 }, recent_orders: [], recent_messages: [] }
    });
  });

  await page.route('**/api/admin/stats/top-products', async route => {
    await route.fulfill({
      status: 200,
      json: []
    });
  });

  await page.route('**/api/admin/products*', async route => {
    await route.fulfill({
      status: 200,
      json: { data: [], meta: { current_page: 1, last_page: 1, total: 0 } }
    });
  });
}

test('authenticated admin can open dashboard route', async ({ page }) => {
  await mockAdminApi(page);

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Admin Panel')).toBeVisible({ timeout: 10000 });
});

test('authenticated admin can open nested dashboard route', async ({ page }) => {
  await mockAdminApi(page);

  await page.goto('/admin/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Coming Soon')).toHaveCount(0);
});

test('authenticated admin can open products route', async ({ page }) => {
  await mockAdminApi(page);

  await page.goto('/admin/products');
  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: /add product/i })).toBeVisible({ timeout: 10000 });
});
