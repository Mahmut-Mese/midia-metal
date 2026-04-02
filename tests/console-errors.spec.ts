/**
 * COMPREHENSIVE Console & Network Error Detection Test
 * 
 * AUTO-DISCOVERS all pages and tests:
 * 1. HTTP 200 status (server responds correctly)
 * 2. No console errors/warnings
 * 3. No React hydration mismatches
 * 4. No network failures
 * 
 * For cart-dependent pages (cart, checkout, payment, thank-you),
 * tests are run WITH items in cart to catch hydration issues.
 * 
 * Run with: npx playwright test tests/console-errors.spec.ts
 */
import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Auto-discover all static pages from src/pages
function discoverAllPages(): string[] {
  const pagesDir = path.join(process.cwd(), 'src', 'pages');
  const pages: string[] = [];
  
  function walkDir(dir: string, basePath: string = '') {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Skip dynamic route folders like [slug] and [...path]
        if (!file.startsWith('[')) {
          walkDir(filePath, `${basePath}/${file}`);
        }
      } else if (file.endsWith('.astro')) {
        // Skip dynamic route files
        if (file.startsWith('[')) continue;
        
        let route = basePath;
        if (file === 'index.astro') {
          route = basePath || '/';
        } else {
          route = `${basePath}/${file.replace('.astro', '')}`;
        }
        pages.push(route);
      }
    }
  }
  
  walkDir(pagesDir);
  return pages.sort();
}

// Pages that need cart items to properly test hydration
const CART_DEPENDENT_PAGES = ['/cart', '/checkout', '/payment', '/thank-you'];

// Pages to skip (like 404 which intentionally returns 404)
const SKIP_PAGES = ['/404'];

// Sample dynamic pages to test (verified to exist)
const DYNAMIC_PAGES = [
  '/shop/baffle-grease-filters-1',

  '/shop/category/baffle-filters',

  '/blog/importance-of-commercial-ventilation',

  '/services/ventilation-systems',

  '/portfolio/commercial-kitchen-ventilation',

  // ── Admin (login + dashboard — uses React Router SPA) ──
  '/admin',
  '/admin/login',
];

// Patterns to ignore (expected behaviors in test environment)
const IGNORE_PATTERNS = [
  'stripe.com',               // Stripe JS - external service
  '/api/v1/settings',         // Settings API - may not be running in test
  '/api/v1/shipping',         // Shipping API - may not be running in test
  'Failed to fetch',          // Network errors from APIs in test env
  'Failed to load settings',  // Wrapper error from APIs
  'Failed to load header',    // Wrapper error from APIs
  'net::ERR_ABORTED',         // Aborted requests (navigation, etc.)
  '/api/v1/customer/me',      // Auth check returns 401 for guests - expected
  'status of 401',            // 401 responses are expected for auth endpoints when not logged in
];

// These are REAL errors we want to catch
const NEVER_IGNORE = [
  'Hydration',                // React hydration errors
  'did not match',            // SSR mismatch
  'Text content does not',    // SSR text mismatch
  'server rendered HTML',     // SSR HTML mismatch
];

function shouldIgnore(issue: string): boolean {
  // Never ignore critical errors
  if (NEVER_IGNORE.some(pattern => issue.includes(pattern))) {
    return false;
  }
  return IGNORE_PATTERNS.some(pattern => issue.includes(pattern));
}

/**
 * Setup error capturing on a page
 */
async function setupErrorCapture(page: Page) {
  const allIssues: string[] = [];

  // Inject script to capture ALL console output BEFORE page loads
  await page.addInitScript(() => {
    const originalWarn = console.warn;
    const originalError = console.error;
    
    // @ts-ignore
    window.__consoleIssues = [];

    const capture = (type: string, args: any[]) => {
      const text = args.map(a => {
        if (typeof a === 'object') {
          try { return JSON.stringify(a); } catch { return String(a); }
        }
        return String(a);
      }).join(' ');
      // @ts-ignore
      window.__consoleIssues.push({ type, text });
    };

    console.warn = (...args) => { capture('WARN', args); originalWarn.apply(console, args); };
    console.error = (...args) => { capture('ERROR', args); originalError.apply(console, args); };
  });

  // Capture from Playwright console events
  page.on('console', (msg) => {
    const type = msg.type().toUpperCase();
    const text = msg.text();
    
    if (type === 'ERROR' || type === 'WARNING' || 
        text.includes('Warning:') || 
        text.includes('Error') ||
        text.includes('did not match') ||
        text.includes('Hydration')) {
      allIssues.push(`[CONSOLE:${type}] ${text}`);
    }
  });

  page.on('pageerror', (error) => {
    allIssues.push(`[PAGE_ERROR] ${error.message}`);
  });

  page.on('requestfailed', (request) => {
    const failure = request.failure();
    if (failure) {
      allIssues.push(`[REQUEST_FAILED] ${request.method()} ${request.url()} - ${failure.errorText}`);
    }
  });

  return allIssues;
}

/**
 * Collect issues after page load
 */
async function collectIssues(page: Page, allIssues: string[]) {
  // Get captured console issues from injected script
  const injected = await page.evaluate(() => {
    // @ts-ignore
    return window.__consoleIssues || [];
  }) as { type: string; text: string }[];

  for (const log of injected) {
    allIssues.push(`[INJECTED:${log.type}] ${log.text}`);
  }

  // Dedupe and filter
  const deduped = [...new Set(allIssues)];
  return deduped.filter(issue => !shouldIgnore(issue));
}

/**
 * Add item to cart for cart-dependent page tests
 */
async function addItemToCart(page: Page) {
  await page.goto('/shop/canopy-2', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  const addBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Add to Basket")').first();
  if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await addBtn.click();
    await page.waitForTimeout(2000);
  }
}

// Get all pages to test
const ALL_STATIC_PAGES = discoverAllPages().filter(p => !SKIP_PAGES.includes(p));
const ALL_PAGES = [...ALL_STATIC_PAGES, ...DYNAMIC_PAGES];

console.log(`\n📋 Auto-discovered ${ALL_STATIC_PAGES.length} static pages`);
console.log(`📋 Added ${DYNAMIC_PAGES.length} dynamic sample pages`);
console.log(`📋 Total pages to test: ${ALL_PAGES.length}\n`);

test.describe('Comprehensive Page Tests - Auto-discovered', () => {
  
  // Test each page for HTTP 200 and no console errors
  for (const pagePath of ALL_PAGES) {
    const isCartDependent = CART_DEPENDENT_PAGES.includes(pagePath);
    const testName = isCartDependent 
      ? `${pagePath} (with cart items) - HTTP 200 & no errors`
      : `${pagePath} - HTTP 200 & no errors`;
    
    test(testName, async ({ page }) => {
      const allIssues = await setupErrorCapture(page);
      
      // For cart-dependent pages, add item to cart first
      if (isCartDependent) {
        await addItemToCart(page);
      }
      
      // Navigate to the page and check HTTP status
      const response = await page.goto(pagePath, { waitUntil: 'networkidle' });
      const status = response?.status() || 0;
      
      // Wait for hydration
      await page.waitForTimeout(3000);
      
      // Collect all issues
      const uniqueIssues = await collectIssues(page, allIssues);
      
      // Report results
      console.log(`\n========== ${pagePath} ==========`);
      console.log(`   HTTP Status: ${status}`);
      console.log(`   Issues: ${uniqueIssues.length}`);
      if (uniqueIssues.length > 0) {
        uniqueIssues.forEach((e, i) => console.log(`   ${i + 1}. ${e.substring(0, 300)}`));
      }
      
      // Assertions
      expect(status, `${pagePath} should return HTTP 200`).toBe(200);
      expect(uniqueIssues.length, `${pagePath} should have no console errors. Found: ${uniqueIssues.join(', ')}`).toBe(0);
    });
  }
});

// Separate test to verify we're testing all pages
test('Verify all pages are covered', async () => {
  const discovered = discoverAllPages().filter(p => !SKIP_PAGES.includes(p));
  
  console.log('\n📋 ALL DISCOVERED PAGES:');
  discovered.forEach((p, i) => console.log(`   ${i + 1}. ${p}`));
  
  console.log('\n📋 DYNAMIC SAMPLE PAGES:');
  DYNAMIC_PAGES.forEach((p, i) => console.log(`   ${i + 1}. ${p}`));
  
  console.log('\n📋 CART-DEPENDENT PAGES (tested with items):');
  CART_DEPENDENT_PAGES.forEach((p, i) => console.log(`   ${i + 1}. ${p}`));
  
  console.log('\n📋 SKIPPED PAGES:');
  SKIP_PAGES.forEach((p, i) => console.log(`   ${i + 1}. ${p}`));
  
  // Verify cart-dependent pages are in discovered list
  for (const cartPage of CART_DEPENDENT_PAGES) {
    expect(discovered, `Cart-dependent page ${cartPage} should exist`).toContain(cartPage);
  }
  
  console.log(`\n✅ Total pages being tested: ${discovered.length + DYNAMIC_PAGES.length}`);
});
