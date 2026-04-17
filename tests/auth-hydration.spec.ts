import { test, expect, type Page } from '@playwright/test';

async function mockCustomerApi(page: Page) {
  // Set dummy customer token
  await page.context().addCookies([{
    name: 'customer_token',
    value: 'mock_customer_token',
    domain: '127.0.0.1',
    path: '/',
  }]);

  // Mock customer profile info for hydration
  await page.route('**/api/v1/customer/me', async route => {
    await route.fulfill({
      status: 200,
      json: {
        id: 1,
        name: 'Test User',
        email: 'asd@asd.com',
        phone: '1234567890',
        address: '1 Test Street',
        city: 'London',
        postcode: 'E1 6AN',
        country: 'United Kingdom',
        is_business: false,
        company_name: null,
        company_vat_number: null
      }
    });
  });

  // Mock payment methods
  await page.route('**/api/v1/customer/payment-methods', async route => {
    await route.fulfill({
      status: 200,
      json: []
    });
  });

  // Mock settings and other checkout/payment endpoints if needed
  await page.route('**/api/v1/settings', async route => {
    await route.fulfill({
      status: 200,
      json: [
        { key: 'bank_account_name', value: 'Midia Metal Ltd' },
        { key: 'bank_sort_code', value: '12-34-56' },
        { key: 'bank_account_number', value: '12345678' }
      ]
    });
  });

  await page.route('**/api/v1/payment/intent*', async route => {
    await route.fulfill({
      status: 200,
      json: { client_secret: 'pi_3Pxxxx_secret_xxxx' }
    });
  });
}

async function seedCart(page: Page) {
  await page.addInitScript(() => {
    const item = {
      id: '1',
      product_id: 1,
      name: 'Hydration Product',
      price: '£10.00',
      qty: 1,
      image: '',
      selected_variants: {},
      track_stock: false,
      stock_quantity: null,
      available_stock: null,
    };
    window.localStorage.setItem('midia_cart', JSON.stringify([item]));
  });
}

async function seedCheckoutForm(page: Page) {
  await page.addInitScript(() => {
    const form = {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      company: '',
      companyVat: '',
      fulfillmentMethod: 'click_collect',
      shipping_address: '1 Test Street',
      shipping_city: 'London',
      shipping_postcode: 'E1 6AN',
      shipping_county: '',
      shipping_country: 'United Kingdom',
      billingSameAsShipping: true,
      address: '1 Test Street',
      city: 'London',
      postcode: 'E1 6AN',
      county: '',
      country: 'United Kingdom',
      notes: '',
      shippingOptionToken: '',
      selectedShippingOption: null,
    };
    window.sessionStorage.setItem('checkoutForm', JSON.stringify(form));
  });
}

test.describe('Auth Hydration', () => {
  test('fresh authenticated load of /checkout hydrates customer fields', async ({ page }) => {
    await mockCustomerApi(page);
    await seedCart(page);
    
    await page.goto('/checkout');
    
    await expect(page.getByRole('heading', { name: 'Contact Details' })).toBeVisible();
    
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveValue('asd@asd.com', { timeout: 10000 });
  });

  test('fresh authenticated load of /payment triggers payment-methods request after hydration', async ({ page }) => {
    await mockCustomerApi(page);
    await seedCart(page);
    await seedCheckoutForm(page);

    const paymentMethodsPromise = page.waitForResponse(response => 
      response.url().includes('/api/v1/customer/payment-methods')
    );

    await page.goto('/payment');

    await expect(page.getByRole('heading', { name: 'Payment Method' })).toBeVisible();

    const response = await paymentMethodsPromise;
    expect(response.status()).toBeLessThan(500);

    expect(page.url()).toContain('/payment');
  });
});
