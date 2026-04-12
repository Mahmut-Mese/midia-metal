import { test, expect } from '@playwright/test';

const ADMIN_API_BASE = 'http://127.0.0.1:8000/api/admin';

async function loginAsAdmin(page: import('@playwright/test').Page) {
  const response = await fetch(`${ADMIN_API_BASE}/login`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({
      email: 'admin@midiaematal.com',
      password: 'password',
    }),
  });

  expect(response.ok, `Admin API login failed: ${response.status}`).toBeTruthy();

  const setCookie = response.headers.getSetCookie?.() ?? [];
  const cookies = setCookie
    .map((cookieHeader) => {
      const [pair] = cookieHeader.split(';');
      const separator = pair.indexOf('=');
      return {
        name: pair.slice(0, separator),
        value: pair.slice(separator + 1),
      };
    })
    .filter((cookie) => cookie.name === 'admin_token');

  await page.context().addCookies(cookies.map((cookie) => ({
    ...cookie,
    domain: '127.0.0.1',
    path: '/',
    httpOnly: true,
    sameSite: 'Lax' as const,
    secure: false,
  })));
}

test('authenticated admin can open dashboard route', async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Admin Panel')).toBeVisible({ timeout: 10000 });
});

test('authenticated admin can open products route', async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto('/admin/products');
  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: /add product/i })).toBeVisible({ timeout: 10000 });
});
