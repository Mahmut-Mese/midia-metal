import { test, expect } from '@playwright/test';

const API_BASE = 'http://127.0.0.1:8000/api/v1';

test('product detail page renders for a real product slug', async ({ page }) => {
  const productsResponse = await fetch(`${API_BASE}/products?page=1`);
  expect(productsResponse.ok).toBeTruthy();

  const productsPayload = await productsResponse.json() as { data?: Array<{ slug?: string | null; name?: string | null }> };
  const product = productsPayload.data?.find((item) => item.slug && item.name);

  expect(product?.slug, 'Expected at least one real product slug from the API').toBeTruthy();

  const response = await page.goto(`/shop/${product!.slug}`, { waitUntil: 'networkidle' });

  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: String(product!.name) }).first()).toBeVisible();
});
