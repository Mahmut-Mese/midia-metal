import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const API_ORIGIN = 'http://127.0.0.1:8000';
const API_BASE = `${API_ORIGIN}/api/v1`;
const ADMIN_API_BASE = `${API_ORIGIN}/api/admin`;
const ASTRO_SERVER_LOG = '/tmp/midia-astro-playwright.log';
const ADMIN_EMAIL = 'admin@midiametal.com';
const ADMIN_PASSWORD = 'password';
const CUSTOMER_EMAIL = 'asd@asd.com';
const CUSTOMER_PASSWORD = '12345678';

const STATIC_SKIP_PAGES = new Set(['/404']);
const ADMIN_ROUTES = [
  '/admin',
  '/admin/dashboard',
  '/admin/products',
  '/admin/product-categories',
  '/admin/blog',
  '/admin/portfolio',
  '/admin/portfolio-categories',
  '/admin/orders',
  '/admin/quotes',
  '/admin/coupons',
  '/admin/messages',
  '/admin/product-reviews',
  '/admin/customers',
  '/admin/faq',
  '/admin/services',
  '/admin/settings',
  '/admin/login',
  '/admin/forgot-password',
  '/admin/reset-password',
];

const CUSTOMER_AUTH_ROUTES = ['/account'];
const CART_REQUIRED_ROUTES = ['/cart', '/checkout'];
const CHECKOUT_STATE_ROUTES = ['/payment', '/thank-you'];

const ALLOWED_NON_200 = new Map<string, number[]>([
  ['/admin/reset-password', [200, 400, 422]],
  ['/reset-password', [200, 400, 422]],
]);

const IGNORE_CONSOLE_PATTERNS = [
  'Failed to load resource: the server responded with a status of 401',
  '/api/v1/customer/me',
  '/api/admin/me',
  'TypeError: Failed to fetch',
  'AdminDashboard.tsx',
  '401 (Unauthorized)',
  'Stripe',
  'js.stripe.com',
  'React Router Future Flag Warning',
];

const IGNORE_REQUEST_FAILURE_PATTERNS = [
  'js.stripe.com',
  'm.stripe.network',
  'google-analytics',
  '/sanctum/csrf-cookie - net::ERR_ABORTED',
  '/api/admin/dashboard - net::ERR_ABORTED',
  '/api/admin/stats/top-products - net::ERR_ABORTED',
];

const IGNORE_ASTRO_LOG_PATTERNS = [
  '[vite] connecting',
  '[vite] connected',
  'The server is being restarted or closed. Request is outdated',
  'Re-optimizing dependencies because vite config has changed',
  'ready in',
  'Local',
  'Network',
  'watching for file changes',
  'Enabling sessions with filesystem storage',
  'Syncing content',
  'Synced content',
  'Generated',
];

type CatalogItem = { slug?: string | null; id?: number | string | null };
type ProductRecord = { id: number | string; slug?: string | null; name?: string; price?: string | number; image?: string | null; selected_variants?: Record<string, any> | null };
type SessionCookie = { name: string; value: string };

let cachedAdminCookies: SessionCookie[] | null = null;
let cachedCustomerCookies: SessionCookie[] | null = null;

function discoverStaticPages(): string[] {
  const pagesDir = path.join(process.cwd(), 'src', 'pages');
  const pages: string[] = [];

  function walk(dir: string, basePath = '') {
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const filePath = path.join(dir, entry);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        if (!entry.startsWith('[')) {
          walk(filePath, `${basePath}/${entry}`);
        }
        continue;
      }

      if (!entry.endsWith('.astro') || entry.startsWith('[')) {
        continue;
      }

      const route = entry === 'index.astro'
        ? (basePath || '/')
        : `${basePath}/${entry.replace(/\.astro$/, '')}`;

      if (!STATIC_SKIP_PAGES.has(route)) {
        pages.push(route);
      }
    }
  }

  walk(pagesDir);
  return [...new Set(pages)].sort();
}

async function fetchJson<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`);
  expect(response.ok, `Failed to fetch ${endpoint}: ${response.status}`).toBeTruthy();
  return response.json() as Promise<T>;
}

async function fetchAllPaginated<T extends CatalogItem>(endpoint: string): Promise<T[]> {
  const results: T[] = [];
  let page = 1;

  while (true) {
    const payload = await fetchJson<{ data?: T[]; next_page_url?: string | null }>(`${endpoint}${endpoint.includes('?') ? '&' : '?'}page=${page}`);
    results.push(...(Array.isArray(payload.data) ? payload.data : []));
    if (!payload.next_page_url) {
      break;
    }
    page += 1;
  }

  return results;
}

async function discoverAllRoutes() {
  const staticPages = discoverStaticPages();

  const [products, categories, blogPayload, services, portfolio] = await Promise.all([
    fetchAllPaginated<ProductRecord>('/products'),
    fetchJson<Array<{ slug?: string | null }>>('/product-categories'),
    fetchJson<{ data?: Array<{ slug?: string | null }> }>('/blog'),
    fetchJson<Array<{ slug?: string | null }>>('/services'),
    fetchJson<Array<{ slug?: string | null }>>('/portfolio'),
  ]);

  const dynamicRoutes = [
    ...products.map((product) => `/shop/${product.slug || product.id}`),
    ...categories.map((category) => `/shop/category/${category.slug}`).filter((route) => !route.endsWith('/undefined')),
    ...((blogPayload.data || []).map((post) => `/blog/${post.slug}`)).filter((route) => !route.endsWith('/undefined')),
    ...services.map((service) => `/services/${service.slug}`).filter((route) => !route.endsWith('/undefined')),
    ...portfolio.map((item) => `/portfolio/${item.slug}`).filter((route) => !route.endsWith('/undefined')),
  ];

  const routes = [...new Set([...staticPages, ...dynamicRoutes, ...ADMIN_ROUTES])].sort();

  const firstPurchasableProduct = products.find((product) => product.slug && product.image !== undefined) ?? products[0];
  expect(firstPurchasableProduct, 'At least one product is required for cart-dependent route tests').toBeTruthy();

  return {
    routes,
    firstProduct: firstPurchasableProduct!,
  };
}

async function captureIssues(page: Page) {
  const issues: string[] = [];

  await page.addInitScript(() => {
    const originalError = console.error;
    const originalWarn = console.warn;

    // @ts-expect-error test-only field
    window.__capturedConsoleIssues = [];

    const pushIssue = (type: string, args: unknown[]) => {
      const text = args.map((arg) => {
        if (typeof arg === 'string') return arg;
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }).join(' ');

      // @ts-expect-error test-only field
      window.__capturedConsoleIssues.push({ type, text });
    };

    console.error = (...args) => {
      pushIssue('ERROR', args);
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      pushIssue('WARN', args);
      originalWarn.apply(console, args);
    };
  });

  page.on('console', (msg) => {
    const type = msg.type().toUpperCase();
    const text = msg.text();
    if (type === 'ERROR' || type === 'WARNING' || text.includes('Hydration') || text.includes('did not match')) {
      issues.push(`[CONSOLE:${type}] ${text}`);
    }
  });

  page.on('pageerror', (error) => {
    issues.push(`[PAGE_ERROR] ${error.message}`);
  });

  page.on('requestfailed', (request) => {
    const failure = request.failure();
    const failureText = failure?.errorText || 'unknown';
    issues.push(`[REQUEST_FAILED] ${request.method()} ${request.url()} - ${failureText}`);
  });

  return issues;
}

function shouldIgnoreIssue(issue: string) {
  if (issue.includes('Hydration') || issue.includes('did not match') || issue.includes('server rendered HTML')) {
    return false;
  }

  if (issue.startsWith('[REQUEST_FAILED]')) {
    if (issue.includes(' - net::ERR_ABORTED') && issue.includes('http://127.0.0.1:4323/src/')) {
      return true;
    }

    return IGNORE_REQUEST_FAILURE_PATTERNS.some((pattern) => issue.includes(pattern));
  }

  return IGNORE_CONSOLE_PATTERNS.some((pattern) => issue.includes(pattern));
}

function hasTransientViteOptimizeIssue(issues: string[]) {
  return issues.some((issue) =>
    issue.includes('Outdated Optimize Dep') || issue.includes('/node_modules/.vite/deps/'),
  );
}

async function collectIssues(page: Page, issues: string[]) {
  const injected = await page.evaluate(() => {
    // @ts-expect-error test-only field
    return window.__capturedConsoleIssues || [];
  }) as Array<{ type: string; text: string }>;

  for (const issue of injected) {
    issues.push(`[INJECTED:${issue.type}] ${issue.text}`);
  }

  return [...new Set(issues)].filter((issue) => !shouldIgnoreIssue(issue));
}

function getAstroServerLogIssues() {
  if (!fs.existsSync(ASTRO_SERVER_LOG)) {
    return [];
  }

  const contents = fs.readFileSync(ASTRO_SERVER_LOG, 'utf8');
  return contents
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /error|exception|failed|\[500\]/i.test(line))
    .filter((line) => !IGNORE_ASTRO_LOG_PATTERNS.some((pattern) => line.includes(pattern)));
}

async function loginViaApi(endpoint: '/customer/login' | '/admin/login', credentials: { email: string; password: string }) {
  const baseUrl = endpoint.startsWith('/admin/') ? ADMIN_API_BASE : API_BASE;
  const normalizedEndpoint = endpoint.startsWith('/admin/')
    ? endpoint.replace('/admin', '')
    : endpoint;

  const response = await fetch(`${baseUrl}${normalizedEndpoint}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(credentials),
  });

  expect(response.ok, `Failed API login for ${endpoint}: ${response.status}`).toBeTruthy();

  const setCookie = response.headers.getSetCookie?.() ?? [];
  return setCookie
    .map((cookieHeader) => {
      const [pair] = cookieHeader.split(';');
      const separator = pair.indexOf('=');
      return {
        name: pair.slice(0, separator),
        value: pair.slice(separator + 1),
      };
    })
    .filter((cookie) => cookie.name === 'customer_token' || cookie.name === 'admin_token');
}

async function ensureAdminLoggedIn(page: Page) {
  if (!cachedAdminCookies) {
    cachedAdminCookies = await loginViaApi('/admin/login', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
  }

  await page.context().addCookies(cachedAdminCookies.map((cookie) => ({
    ...cookie,
    domain: '127.0.0.1',
    path: '/',
    httpOnly: true,
    sameSite: 'Lax' as const,
    secure: false,
  })));
}

async function ensureCustomerLoggedIn(page: Page) {
  if (!cachedCustomerCookies) {
    cachedCustomerCookies = await loginViaApi('/customer/login', {
      email: CUSTOMER_EMAIL,
      password: CUSTOMER_PASSWORD,
    });
  }

  await page.context().addCookies(cachedCustomerCookies.map((cookie) => ({
    ...cookie,
    domain: '127.0.0.1',
    path: '/',
    httpOnly: true,
    sameSite: 'Lax' as const,
    secure: false,
  })));
}

async function seedCart(page: Page, product: ProductRecord) {
  const slugOrId = product.slug || String(product.id);
  const detail = await fetchJson<any>(`/products/${slugOrId}`);
  const variantEntries = Object.entries(detail.selected_variants || {});
  const variantId = variantEntries.length > 0
    ? `-${variantEntries.map(([key, value]: [string, any]) => `${key}-${value.value}`).join('-')}`
    : '';

  const cartItem = {
    id: `${detail.id}${variantId}`,
    product_id: detail.id,
    name: detail.name,
    price: detail.price,
    qty: 1,
    image: detail.image || '',
    selected_variants: detail.selected_variants || {},
    track_stock: detail.track_stock,
    stock_quantity: detail.stock_quantity ?? null,
    available_stock: detail.track_stock ? (detail.stock_quantity ?? 0) : null,
  };

  await page.addInitScript((item) => {
    localStorage.setItem('midia_cart', JSON.stringify([item]));
    localStorage.removeItem('midia_coupon');
  }, cartItem);
}

async function seedCheckoutState(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('checkoutForm', JSON.stringify({
      firstName: 'Playwright',
      lastName: 'Tester',
      phone: '07123456789',
      email: 'asd@asd.com',
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
    }));

    sessionStorage.setItem('lastOrder', JSON.stringify({
      orderDetails: {
        orderNumber: '#PW-1001',
        method: 'Card',
        total: '£10.00',
        items: [{ name: 'Playwright Product', qty: 1 }],
      },
    }));
  });
}

async function prepareRouteState(page: Page, route: string, product: ProductRecord) {
  if (ADMIN_ROUTES.includes(route) && route !== '/admin/login' && route !== '/admin/forgot-password' && route !== '/admin/reset-password') {
    await ensureAdminLoggedIn(page);
    return;
  }

  if (CUSTOMER_AUTH_ROUTES.includes(route)) {
    await ensureCustomerLoggedIn(page);
    return;
  }

  if (CART_REQUIRED_ROUTES.includes(route) || CHECKOUT_STATE_ROUTES.includes(route)) {
    await seedCart(page, product);
  }

  if (CHECKOUT_STATE_ROUTES.includes(route)) {
    await seedCheckoutState(page);
  }
}

async function clearBrowserState(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('about:blank');
}

test.describe('Every route returns a healthy page', () => {
  test('all discovered routes return expected status with no runtime issues', async ({ page }) => {
    const { routes, firstProduct } = await discoverAllRoutes();

    for (const route of routes) {
      let issues = await captureIssues(page);
      await prepareRouteState(page, route, firstProduct);

      let response = await page.goto(route, { waitUntil: 'networkidle' });
      let status = response?.status() || 0;
      const allowedStatuses = ALLOWED_NON_200.get(route) || [200];

      await page.waitForTimeout(500);

      let uniqueIssues = await collectIssues(page, issues);

      if (hasTransientViteOptimizeIssue(uniqueIssues)) {
        await page.waitForTimeout(1000);
        issues = await captureIssues(page);
        response = await page.goto(route, { waitUntil: 'networkidle' });
        status = response?.status() || 0;
        await page.waitForTimeout(500);
        uniqueIssues = await collectIssues(page, issues);
      }

      expect(
        allowedStatuses.includes(status),
        `${route} returned unexpected HTTP status ${status}`,
      ).toBeTruthy();

      expect(
        uniqueIssues,
        `${route} had runtime issues:\n${uniqueIssues.join('\n')}`,
      ).toEqual([]);

      await page.context().clearCookies();
      await clearBrowserState(page);
    }

    const astroLogIssues = getAstroServerLogIssues();
    expect(
      astroLogIssues,
      `Astro dev server reported errors:\n${astroLogIssues.join('\n')}`,
    ).toEqual([]);
  });
});
