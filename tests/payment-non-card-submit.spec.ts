import { test, expect, type Page } from '@playwright/test';

async function seedCheckoutState(page: Page) {
  await page.addInitScript(() => {
    if (window.sessionStorage.getItem('__payment_test_seeded') === 'true') {
      return;
    }

    const cart = [
      {
        id: 'product-1',
        product_id: 101,
        name: 'Steel Beam',
        price: '£25.00',
        qty: 2,
        image: '',
        selected_variants: { Finish: { value: 'Galvanised' } },
        track_stock: false,
        stock_quantity: null,
        available_stock: null,
      },
    ];

    const checkoutForm = {
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '07123456789',
      email: 'jane@example.com',
      company: 'Test Fabrication Ltd',
      companyVat: 'GB123456789',
      fulfillmentMethod: 'delivery',
      shipping_address: '1 Test Street',
      shipping_city: 'London',
      shipping_postcode: 'E1 6AN',
      shipping_county: 'Greater London',
      shipping_country: 'United Kingdom',
      billingSameAsShipping: true,
      address: '1 Billing Street',
      city: 'London',
      postcode: 'E1 6AN',
      county: 'Greater London',
      country: 'United Kingdom',
      notes: 'Ring the gate bell',
      shippingOptionToken: 'shiptok_123',
      selectedShippingOption: {
        service: 'Royal Mail Tracked 48',
        rate: 6.5,
      },
    };

    window.localStorage.setItem('midia_cart', JSON.stringify(cart));
    window.sessionStorage.setItem('checkoutForm', JSON.stringify(checkoutForm));
    window.sessionStorage.setItem('__payment_test_seeded', 'true');
  });
}

async function mockPaymentPageApis(
  page: Page,
  authenticated = false,
  options?: {
    onPaymentMethodsIntercepted?: () => void;
    onCustomerMeIntercepted?: () => void;
  }
) {
  await page.route('**/sanctum/csrf-cookie', async (route) => {
    await route.fulfill({
      status: 204,
      headers: {
        'set-cookie': 'XSRF-TOKEN=test-xsrf-token; Path=/;',
      },
      body: '',
    });
  });

  if (authenticated) {
    await page.context().addCookies([{
      name: 'customer_token',
      value: 'mock_customer_token',
      domain: 'localhost',
      path: '/',
    }]);

    await page.route('**/api/v1/customer/me', async (route) => {
      options?.onCustomerMeIntercepted?.();
      await route.fulfill({
        status: 200,
        json: {
          id: 1,
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '07123456789',
          address: '1 Test Street',
          city: 'London',
          postcode: 'E1 6AN',
          country: 'United Kingdom',
          is_business: true,
          company_name: 'Test Fabrication Ltd',
          company_vat_number: 'GB123456789'
        },
      });
    });

    await page.route('**/api/v1/customer/payment-methods', async (route) => {
      options?.onPaymentMethodsIntercepted?.();
      await route.fulfill({
        status: 200,
        json: [],
      });
    });
  } else {
    await page.route('**/api/v1/customer/me', async (route) => {
      await route.fulfill({
        status: 401,
        json: { message: 'Unauthenticated.' },
      });
    });
  }

  await page.route('**/api/v1/settings', async (route) => {
    await route.fulfill({
      status: 200,
      json: [
        { key: 'bank_account_name', value: 'Midia Metal Ltd' },
        { key: 'bank_sort_code', value: '12-34-56' },
        { key: 'bank_account_number', value: '12345678' },
      ],
    });
  });
}

test.describe('Payment non-card submission', () => {
  test('submits bank transfer order with expected payload and redirects to thank-you', async ({ page }) => {
    await seedCheckoutState(page);
    await mockPaymentPageApis(page);

    let orderRequestCount = 0;
    let submittedPayload: Record<string, unknown> | null = null;

    await page.route('**/api/v1/orders', async (route) => {
      orderRequestCount += 1;
      submittedPayload = route.request().postDataJSON() as Record<string, unknown>;

      await route.fulfill({
        status: 201,
        json: {
          order_number: 'ORD-BANK-123',
          confirmation: {
            order: 'ORD-BANK-123',
            token: 'confirmation-token-123',
          },
        },
      });
    });

    await page.goto('/payment');

    await expect(page.getByRole('heading', { name: 'Payment Method' })).toBeVisible();
    await page.getByLabel('Direct Bank Transfer').check();
    await expect(page.getByText('Account Name:')).toBeVisible();
    await page.getByRole('button', { name: 'Place Order' }).click();

    await expect(page).toHaveURL(/\/thank-you\?order=ORD-BANK-123&token=confirmation-token-123/);
    await expect(page.getByText('ORD-BANK-123')).toBeVisible();

    expect(orderRequestCount).toBe(1);
    expect(submittedPayload).not.toBeNull();
    expect(submittedPayload).toMatchObject({
      customer_name: 'Jane Smith',
      customer_email: 'jane@example.com',
      customer_phone: '07123456789',
      fulfilment_method: 'delivery',
      shipping_option_token: 'shiptok_123',
      payment_method: 'Direct Bank Transfer',
      company_name: 'Test Fabrication Ltd',
      company_vat_number: 'GB123456789',
      notes: 'Ring the gate bell',
      stripe_payment_intent_id: null,
      save_card: false,
      items: [
        {
          product_id: 101,
          quantity: 2,
          selected_variants: { Finish: { value: 'Galvanised' } },
        },
      ],
    });

    const clientState = await page.evaluate(() => ({
      checkoutForm: window.sessionStorage.getItem('checkoutForm'),
      cart: window.localStorage.getItem('midia_cart'),
    }));

    expect(clientState.checkoutForm).toBeNull();
    expect(clientState.cart).toBe('[]');
  });

  test('preserves state when bank transfer submission fails with 422', async ({ page }) => {
    await seedCheckoutState(page);
    await mockPaymentPageApis(page);

    let orderRequestCount = 0;

    await page.route('**/api/v1/orders', async (route) => {
      orderRequestCount += 1;
      await route.fulfill({
        status: 422,
        json: {
          message: 'The given data was invalid.',
          errors: {
            customer_phone: ['The customer phone field is required.'],
          },
        },
      });
    });

    await page.goto('/payment');

    await expect(page.getByRole('heading', { name: 'Payment Method' })).toBeVisible();
    await page.getByLabel('Direct Bank Transfer').check();
    await page.getByRole('button', { name: 'Place Order' }).click();

    // Verify browser remains on /payment
    await expect(page).toHaveURL(/\/payment/);
    
    // Verify checkoutForm (or representative element) remains present
    await expect(page.getByRole('button', { name: 'Place Order' })).toBeVisible();

    // Verify endpoint called exactly once
    expect(orderRequestCount).toBe(1);

    // Verify cart and checkout state remain intact in storage
    const clientState = await page.evaluate(() => ({
      checkoutForm: window.sessionStorage.getItem('checkoutForm'),
      cart: window.localStorage.getItem('midia_cart'),
    }));

    expect(clientState.checkoutForm).not.toBeNull();
    const cart = JSON.parse(clientState.cart || '[]');
    expect(cart.length).toBeGreaterThan(0);
    expect(cart[0].id).toBe('product-1');

    await expect(page.url()).not.toContain('/thank-you');
  });

  test('submits bank transfer order as authenticated customer and redirects to thank-you', async ({ page }) => {
    await seedCheckoutState(page);

    let orderRequestCount = 0;
    let submittedPayload: Record<string, unknown> | null = null;
    let paymentMethodsCalled = false;
    let customerHydrated = false;
    let paymentMethodsObservedAfterHydration = false;

    await mockPaymentPageApis(page, true, {
      onCustomerMeIntercepted: () => {
        customerHydrated = true;
      },
      onPaymentMethodsIntercepted: () => {
        paymentMethodsCalled = true;
        paymentMethodsObservedAfterHydration = customerHydrated;
      },
    });

    await page.route('**/api/v1/orders', async (route) => {
      orderRequestCount += 1;
      submittedPayload = route.request().postDataJSON() as Record<string, unknown>;

      await route.fulfill({
        status: 201,
        json: {
          order_number: 'ORD-AUTH-123',
          confirmation: {
            order: 'ORD-AUTH-123',
            token: 'auth-token-123',
          },
        },
      });
    });

    await page.goto('/payment');

    await expect(page.getByRole('heading', { name: 'Payment Method' })).toBeVisible();
    
    // Wait for the payment methods call to have happened (it's triggered by hydration)
    await expect.poll(() => paymentMethodsCalled).toBe(true);
    expect(paymentMethodsObservedAfterHydration).toBe(true);

    await page.getByLabel('Direct Bank Transfer').check();
    await page.getByRole('button', { name: 'Place Order' }).click();

    await expect(page).toHaveURL(/\/thank-you\?order=ORD-AUTH-123&token=auth-token-123/);
    await expect(page.getByText('ORD-AUTH-123')).toBeVisible();

    expect(orderRequestCount).toBe(1);
    expect(submittedPayload).not.toBeNull();
    
    // Authenticated order should reflect customer state
    expect(submittedPayload).toMatchObject({
      customer_name: 'Jane Smith',
      customer_email: 'jane@example.com',
      customer_phone: '07123456789',
      payment_method: 'Direct Bank Transfer',
      company_name: 'Test Fabrication Ltd',
      company_vat_number: 'GB123456789',
      fulfilment_method: 'delivery',
      shipping_option_token: 'shiptok_123',
    });
  });

  test('preserves state when authenticated bank transfer submission fails with 422', async ({ page }) => {
    await seedCheckoutState(page);

    let orderRequestCount = 0;
    let paymentMethodsCalled = false;
    let customerHydrated = false;

    await mockPaymentPageApis(page, true, {
      onCustomerMeIntercepted: () => {
        customerHydrated = true;
      },
      onPaymentMethodsIntercepted: () => {
        paymentMethodsCalled = true;
      },
    });

    await page.route('**/api/v1/orders', async (route) => {
      orderRequestCount += 1;
      await route.fulfill({
        status: 422,
        json: {
          message: 'The given data was invalid.',
          errors: {
            customer_phone: ['The customer phone field is required.'],
          },
        },
      });
    });

    await page.goto('/payment');

    await expect(page.getByRole('heading', { name: 'Payment Method' })).toBeVisible();

    // Verify authenticated hydration occurred
    await expect.poll(() => customerHydrated).toBe(true);
    // Verify payment-methods request occurred
    await expect.poll(() => paymentMethodsCalled).toBe(true);

    await page.getByLabel('Direct Bank Transfer').check();
    await page.getByRole('button', { name: 'Place Order' }).click();

    // Verify browser remains on /payment (exact URL)
    await expect(page).toHaveURL(/\/payment$/);

    // Verify checkoutForm (Place Order button) remains present
    await expect(page.getByRole('button', { name: 'Place Order' })).toBeVisible();

    // Verify endpoint called exactly once
    expect(orderRequestCount).toBe(1);

    // Verify cart and checkout state remain intact in storage
    const clientState = await page.evaluate(() => ({
      checkoutForm: window.sessionStorage.getItem('checkoutForm'),
      cart: window.localStorage.getItem('midia_cart'),
    }));

    expect(clientState.checkoutForm).not.toBeNull();
    const cart = JSON.parse(clientState.cart || '[]');
    expect(cart.length).toBeGreaterThan(0);
    expect(cart[0].id).toBe('product-1');

    // Verify no thank-you redirect occurred
    await expect(page.url()).not.toContain('/thank-you');
  });

  test('preserves state when bank transfer submission fails with 500', async ({ page }) => {
    await seedCheckoutState(page);
    await mockPaymentPageApis(page);

    let orderRequestCount = 0;

    await page.route('**/api/v1/orders', async (route) => {
      orderRequestCount += 1;
      await route.fulfill({
        status: 500,
        json: {
          message: 'Internal server error.',
        },
      });
    });

    await page.goto('/payment');

    await expect(page.getByRole('heading', { name: 'Payment Method' })).toBeVisible();
    await page.getByLabel('Direct Bank Transfer').check();
    await page.getByRole('button', { name: 'Place Order' }).click();

    // Verify browser remains on /payment after server error
    await expect(page).toHaveURL(/\/payment$/);

    // Verify checkoutForm (Place Order button) remains present
    await expect(page.getByRole('button', { name: 'Place Order' })).toBeVisible();
    await expect(page.getByLabel('Direct Bank Transfer')).toBeChecked();

    // Verify endpoint called exactly once
    expect(orderRequestCount).toBe(1);

    // Verify cart and checkout state remain intact in storage
    const clientState = await page.evaluate(() => ({
      checkoutForm: window.sessionStorage.getItem('checkoutForm'),
      cart: window.localStorage.getItem('midia_cart'),
    }));

    expect(clientState.checkoutForm).not.toBeNull();
    const cart = JSON.parse(clientState.cart || '[]');
    expect(cart.length).toBeGreaterThan(0);
    expect(cart[0].id).toBe('product-1');

    // Verify no thank-you redirect occurred
    await expect(page.url()).not.toContain('/thank-you');
  });

  test('preserves state when bank transfer submission fails with network abort', async ({ page }) => {
    await seedCheckoutState(page);
    await mockPaymentPageApis(page);

    let orderRequestCount = 0;

    await page.route('**/api/v1/orders', async (route) => {
      orderRequestCount += 1;
      // Simulate network-level failure (no HTTP response at all)
      await route.abort('failed');
    });

    await page.goto('/payment');

    await expect(page.getByRole('heading', { name: 'Payment Method' })).toBeVisible();
    await page.getByLabel('Direct Bank Transfer').check();
    await page.getByRole('button', { name: 'Place Order' }).click();

    // Verify browser remains on /payment after network failure
    await expect(page).toHaveURL(/\/payment$/);

    // Verify checkoutForm (Place Order button) remains present
    await expect(page.getByRole('button', { name: 'Place Order' })).toBeVisible();
    await expect(page.getByLabel('Direct Bank Transfer')).toBeChecked();

    // Verify endpoint was attempted exactly once
    expect(orderRequestCount).toBe(1);

    // Verify cart and checkout state remain intact in storage
    const clientState = await page.evaluate(() => ({
      checkoutForm: window.sessionStorage.getItem('checkoutForm'),
      cart: window.localStorage.getItem('midia_cart'),
    }));

    expect(clientState.checkoutForm).not.toBeNull();
    const cart = JSON.parse(clientState.cart || '[]');
    expect(cart.length).toBeGreaterThan(0);
    expect(cart[0].id).toBe('product-1');

    // Verify no thank-you redirect occurred
    await expect(page.url()).not.toContain('/thank-you');

    // Verify an error toast is shown (sonner renders data-sonner-toast with data-type="error")
    await expect(page.locator('[data-sonner-toast][data-type="error"]').first()).toBeVisible({ timeout: 5000 });

    // Verify Place Order button is re-enabled (isSubmitting reset to false in finally block)
    await expect(page.getByRole('button', { name: 'Place Order' })).toBeEnabled();
  });

  test('preserves state when authenticated bank transfer submission fails with network abort', async ({ page }) => {
    await seedCheckoutState(page);

    let orderRequestCount = 0;
    let customerHydrated = false;
    let paymentMethodsCalled = false;

    await mockPaymentPageApis(page, true, {
      onCustomerMeIntercepted: () => {
        customerHydrated = true;
      },
      onPaymentMethodsIntercepted: () => {
        paymentMethodsCalled = true;
      },
    });

    await page.route('**/api/v1/orders', async (route) => {
      orderRequestCount += 1;
      // Simulate network-level failure (no HTTP response at all)
      await route.abort('failed');
    });

    await page.goto('/payment');

    await expect(page.getByRole('heading', { name: 'Payment Method' })).toBeVisible();

    // Verify authenticated hydration occurred
    await expect.poll(() => customerHydrated).toBe(true);
    await expect.poll(() => paymentMethodsCalled).toBe(true);

    await page.getByLabel('Direct Bank Transfer').check();
    await page.getByRole('button', { name: 'Place Order' }).click();

    // Verify browser remains on /payment after network failure
    await expect(page).toHaveURL(/\/payment$/);

    // Verify checkoutForm (Place Order button) remains present
    await expect(page.getByRole('button', { name: 'Place Order' })).toBeVisible();
    await expect(page.getByLabel('Direct Bank Transfer')).toBeChecked();

    // Verify endpoint was attempted exactly once
    expect(orderRequestCount).toBe(1);

    // Verify cart and checkout state remain intact in storage
    const clientState = await page.evaluate(() => ({
      checkoutForm: window.sessionStorage.getItem('checkoutForm'),
      cart: window.localStorage.getItem('midia_cart'),
    }));

    expect(clientState.checkoutForm).not.toBeNull();
    const cart = JSON.parse(clientState.cart || '[]');
    expect(cart.length).toBeGreaterThan(0);
    expect(cart[0].id).toBe('product-1');

    // Verify no thank-you redirect occurred
    await expect(page.url()).not.toContain('/thank-you');

    // Verify at least one error toast is shown (sonner renders data-sonner-toast with data-type="error")
    await expect(page.locator('[data-sonner-toast][data-type="error"]').first()).toBeVisible({ timeout: 5000 });

    // Verify Place Order button is re-enabled (isSubmitting reset to false in finally block)
    await expect(page.getByRole('button', { name: 'Place Order' })).toBeEnabled();
  });
});
