import { test, expect } from '@playwright/test';

test.describe('Thank-you recovery', () => {
  test('renders immediate sessionStorage thank-you state without calling recovery API', async ({ page }) => {
    let confirmationRequestCount = 0;

    await page.route('**/api/v1/orders/confirmation?*', async (route) => {
      confirmationRequestCount += 1;

      await route.fulfill({
        status: 200,
        json: {
          order_number: 'ORD-SHOULD-NOT-BE-USED',
          created_at: '2026-04-17T12:00:00.000000Z',
          payment_method: 'Credit / Debit Card',
          total: 999.99,
          items: [],
        },
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem('lastOrder', JSON.stringify({
        orderDetails: {
          orderNumber: 'ORD-SESSION-123',
          createdAt: '2026-04-17T12:00:00.000Z',
          method: 'Direct Bank Transfer',
          total: '£88.50',
          items: [
            {
              name: 'Session Product',
              qty: 3,
            },
          ],
        },
      }));
    });

    await page.goto('/thank-you');

    await expect(page.getByText('ORD-SESSION-123')).toBeVisible();
    await expect(page.getByText('Session Product x 3')).toBeVisible();
    await expect(page.getByText('£88.50')).toBeVisible();
    expect(confirmationRequestCount).toBe(0);
  });

  test('recovers order details from backend lookup on direct revisit', async ({ page }) => {
    let interceptedUrl = '';

    await page.route('**/api/v1/orders/confirmation?*', async (route) => {
      interceptedUrl = route.request().url();

      await route.fulfill({
        status: 200,
        json: {
          order_number: 'ORD-RECOVER-123',
          created_at: '2026-04-17T12:00:00.000000Z',
          payment_method: 'Credit / Debit Card',
          total: 123.45,
          items: [
            {
              name: 'Recovered Product',
              quantity: 2,
            },
          ],
        },
      });
    });

    await page.goto('/thank-you?order=ORD-RECOVER-123&token=valid-token');

    await expect(page.getByText('ORD-RECOVER-123')).toBeVisible();
    await expect(page.getByText('Recovered Product x 2')).toBeVisible();
    await expect(page.getByText('£123.45')).toBeVisible();
    await expect(page.getByText("We couldn't", { exact: false })).toHaveCount(0);
    expect(interceptedUrl).toContain('order=ORD-RECOVER-123');
    expect(interceptedUrl).toContain('token=valid-token');
    await expect(page).toHaveURL(/\/thank-you$/);
  });

  test('shows explicit recovery fallback when backend lookup fails', async ({ page }) => {
    await page.route('**/api/v1/orders/confirmation?*', async (route) => {
      await route.fulfill({
        status: 403,
        json: {
          message: 'Invalid confirmation token.',
        },
      });
    });

    await page.goto('/thank-you?order=ORD-RECOVER-999&token=bad-token');

    await expect(page.getByText(/We couldn't (reload|find) the order details/i)).toBeVisible();
    await expect(page.getByText('Unable to load order details.')).toBeVisible();
    await expect(page.getByText('Unavailable')).toHaveCount(4);
  });
});
