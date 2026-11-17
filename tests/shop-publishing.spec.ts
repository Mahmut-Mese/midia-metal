import { test, expect, API_BASE } from './support/fixtures';

test('a newly published product appears first after refreshing the default shop', async ({ page, request }) => {
  const initial = await page.goto('/shop');
  expect(initial?.headers()['cache-control']).toBe('no-store');
  await expect(page.locator('select[name="sort"]')).toHaveValue('latest');

  const admin = API_BASE.replace(/\/v1$/, '/admin');
  const login = await request.post(`${admin}/login`, { data: { email: 'admin@midiametal.com', password: 'password' } });
  expect(login.ok()).toBeTruthy();
  const saved = await request.post(`${admin}/products`, { data: {
    name: 'Latest publishing regression', price: '£11.00', active: true, order: 9999,
    product_category_id: 1, image: '/images/baffle-filter.jpg',
    variants: [{ option: 'Model', value: 'Test', price: '£11.00' }],
  } });
  expect(saved.status()).toBe(201);
  const product = await saved.json();
  const productPath = `/shop/${product.slug}`;

  const refreshed = await page.reload();
  expect(refreshed?.headers()['cache-control']).toBe('no-store');
  const firstCard = page.locator('[data-product-card]').first();
  await expect(firstCard).toBeVisible();
  await expect(firstCard).toHaveAttribute('href', productPath);

  const search = page.locator('input[name="search"]');
  await search.fill(product.name);
  await expect(page).toHaveURL(/search=Latest/);
  await expect(page.locator('[data-product-card]')).toHaveCount(1);
  await expect(firstCard).toHaveAttribute('href', productPath);
  await search.fill('');
  await expect(page).not.toHaveURL(/search=/);
  await expect(firstCard).toHaveAttribute('href', productPath);
  await expect(firstCard).toBeVisible();

  // Detail and category pages must also reflect publishing changes without a stale CDN response.
  for (const path of [productPath, '/shop/category/baffle-filters']) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    expect(response?.headers()['cache-control']).toBe('no-store');
  }
});
