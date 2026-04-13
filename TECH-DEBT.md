# Technical Debt Register — Midia Metal

> Generated: 2026-04-13
> Scope: Full-stack audit of `/backend` (Laravel 12) and `/src` (Astro + React)

---

## Priority Legend

| Tag | Meaning |
|-----|---------|
| **P0** | Critical — blocks production readiness or is a security risk |
| **P1** | High — causes real bugs, maintenance pain, or scaling issues |
| **P2** | Medium — slows development or is an architectural concern |
| **P3** | Low — code hygiene, nice-to-have improvements |

---

## 1. Security

### 1.1 Root `.env` tracked in git — **P0**
The root `/.env` file is committed to version control. It contains the Stripe test publishable key and staging API URL. The `.gitignore` does not exclude `.env` at the root level. This trains developers to commit environment files and risks leaking secrets.

**Fix:** Add `.env` to root `.gitignore`, remove from tracking with `git rm --cached .env`, create a `.env.example`.

### 1.2 `dangerouslySetInnerHTML` without sanitization — **P0**
`src/islands/ProductDetailIsland.tsx:969` renders product descriptions with `dangerouslySetInnerHTML`. If any product description contains injected scripts, this is an XSS vector. The backend `HtmlSanitizer` exists but has zero tests confirming its correctness.

**Fix:** Audit all `dangerouslySetInnerHTML` usage (also in blog, portfolio, legal pages). Ensure backend sanitizer runs on every write path and add tests for it.

### 1.3 Placeholder bank details in PaymentIsland — **P0**
`src/islands/PaymentIsland.tsx:529-532` contains hardcoded placeholder bank transfer details. If bank transfer payment is enabled in production, customers see dummy data.

**Fix:** Move bank details to site_settings or remove the section if unused.

### 1.4 `env()` called outside config files — **P1**
`backend/app/Http/Controllers/Api/EasyPostWebhookController.php:13` calls `env('EASYPOST_WEBHOOK_SECRET')` directly. This returns `null` when config is cached in production.

**Fix:** Move to `config('services.easypost.webhook_secret')`.

### 1.5 Hardcoded admin notification email — **P1**
`backend/app/Http/Controllers/Api/ProductReviewController.php:77` hardcodes `mahmutmese.uk@gmail.com`. The `getAdminNotificationEmail()` helper exists in `FormController` but isn't reused here.

**Fix:** Extract `getAdminNotificationEmail()` to a shared service or helper, use it everywhere.

### 1.6 CORS config includes localhost origins — **P2**
`backend/config/cors.php` hardcodes `http://localhost:3000`, `http://localhost:5173`, etc. in `allowed_origins`. These ship to production.

**Fix:** Use `env('CORS_ALLOWED_ORIGINS')` or filter by `APP_ENV`.

---

## 2. Architecture

### 2.1 Fat controllers — no service layer — **P1**
`FormController::order()` (~200 lines) handles validation, Stripe verification, stock decrement, order creation, item creation, coupon tracking, and two emails in a single method. `ProductController` (686 lines) has massive inline variant normalization.

**Fix:** Extract `CheckoutService`, `OrderService`, and `VariantNormalizationService`.

### 2.2 `AdminProducts.tsx` is 3,428 lines — **P1**
This single React component contains the product list, product form, variant mode chooser, three variant table types, bulk paste, clone, column management, image upload, specifications, and shipping config. It is the largest file in the codebase and the most common source of runtime errors.

**Fix:** Split into: `ProductList`, `ProductForm`, `VariantEditor` (with sub-components per mode), `ImageUploader`, `SpecificationsEditor`, `ShippingConfig`.

### 2.3 `routes/web.php` is 975 lines of inline SSR — **P1**
The web routes file contains full HTML template generation with inline closures, meta tag logic, and data fetching. Route files should only define routes.

**Fix:** Move all rendering logic to controllers and Blade views.

### 2.4 Duplicated freight/zone logic across gateways — **P2**
`EasyPostGateway.php` and `MockEasyPostGateway.php` both contain nearly identical postcode-zone detection and surcharge lookup logic (~50 lines each). Also duplicated: `aggregateTrackingStatus()` / `aggregateStatus()`.

**Fix:** Extract `FreightZoneResolver` service and a shared base class or trait for common gateway methods.

### 2.5 No service container bindings — **P2**
`AppServiceProvider` is empty. `ShippingManager` uses `new MockEasyPostGateway()` / `new EasyPostGateway()` directly. No interfaces are bound in the container.

**Fix:** Bind `ShippingGateway` interface in `AppServiceProvider`. Resolve gateways from the container.

### 2.6 No FormRequest classes — **P2**
Every controller uses inline `$request->validate([...])`. Validation rules are duplicated between `store()` and `update()` in ProductController, BlogController, PortfolioController, ServiceController.

**Fix:** Create FormRequest classes for each resource. Share rules via a base request or rule method.

### 2.7 No authorization policies — **P2**
No Policy classes exist. Any authenticated admin can perform any action. There is no role-based access control beyond "is authenticated".

**Fix:** If multi-role admin is planned, implement Policies. Otherwise, document this as an accepted limitation.

---

## 3. TypeScript & Frontend Code Quality

### 3.1 Pervasive `any` usage — **P1**
`@typescript-eslint/no-explicit-any` is disabled in ESLint config. Approximately 400+ instances of `: any` across the codebase. Key areas:
- All admin page components use `any` for API responses
- `apiFetch` returns `Promise<any>`
- Variant, product, order types are all untyped

**Fix:** Create shared interfaces (`Product`, `Order`, `Category`, `Variant`, `Customer`, `ApiResponse<T>`). Enable the ESLint rule gradually.

### 3.2 No shared TypeScript interfaces for API data — **P1**
There are zero `.d.ts` or interface files for the data models. Every component independently assumes the shape of API responses.

**Fix:** Create `src/types/` directory with interfaces matching backend models.

### 3.3 Duplicate toast systems — **P2**
Both `sonner` (used in most places) and shadcn `Toaster` + `use-toast.ts` are installed and mounted. The shadcn toast system appears unused but its components are still imported.

**Fix:** Remove `@/components/ui/toaster.tsx`, `@/components/ui/toast.tsx`, `@/hooks/use-toast.ts`. Keep only `sonner`.

### 3.4 Dead code in `api.ts` — **P2**
`getAuthToken()`, `setAuthToken()`, `removeAuthToken()` in `src/lib/api.ts` are no-ops (they just call `clearLegacyTokens()` which removes old localStorage keys). The app uses cookie-based auth via Sanctum. These functions exist only for backward compatibility during the migration from token-based auth.

**Fix:** Remove after confirming no callers depend on them (search for imports).

### 3.5 Native `confirm()` dialogs in admin — **P3**
15 instances of `window.confirm()` across admin pages. The project already has `@radix-ui/react-alert-dialog` installed.

**Fix:** Replace with a reusable `<ConfirmDialog>` component.

### 3.6 ~7 unused npm dependencies — **P3**
Several shadcn/ui and Radix packages appear unused: `@radix-ui/react-alert-dialog`, `@radix-ui/react-avatar`, `@radix-ui/react-menubar`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-progress`, `@radix-ui/react-separator`, `@radix-ui/react-switch` (verify before removing).

**Fix:** Audit with `depcheck` and remove confirmed unused packages.

---

## 4. Database

### 4.1 Product prices stored as strings — **P1**
`products.price` and `products.old_price` are `string` columns storing values like `"£1234.50"`. This prevents numeric sorting, range filtering, and requires constant regex parsing in `CheckoutCalculator` and frontend.

**Fix:** Migrate to `decimal(10,2)` columns. Store raw numbers; format with currency symbol in presentation layer only.

### 4.2 Missing indexes on frequently queried columns — **P1**
- `orders`: no index on `customer_email`, `status`, `payment_status`, `customer_id`
- `contact_messages`: no index on `email`, `read`, `message_type`
- `quote_requests`: no index on `email`, `status`
- `blog_posts`: no index on `published_at`, `active`
- `audit_logs`: no composite index on `model_type` + `model_id`
- `product_reviews`: no unique constraint on `product_id` + `customer_id`

**Fix:** Add a migration with the missing indexes.

### 4.3 Data seeding inside migrations — **P2**
Multiple migrations contain `DB::table()->insert()` or `Product::where()->update()` calls that seed/mutate production data. Examples:
- `seed_default_testimonials.php`
- `add_home_welding_section_settings.php`
- `replace_freight_shipping_class_with_oversized.php`
- `add_size_variants_to_canopy_products.php`

These are non-idempotent and environment-specific.

**Fix:** For future changes, keep migrations schema-only. Use seeders or artisan commands for data mutations.

### 4.4 `specifications` stored in two formats — **P2**
Some products have `specifications` as `{key: value}` (correct), others as `[{key, value}]` (legacy). The frontend `normalizeSpecifications()` handles both, but the backend doesn't normalize on read.

**Fix:** Run a one-time migration to normalize all specifications to `{key: value}` format.

---

## 5. Testing

### 5.1 Near-zero backend test coverage — **P0**
Only 7 real tests exist for an application with 34 controllers, 21 models, and critical payment/shipping logic. Zero tests for: checkout, payment (Stripe), shipping quotes, customer auth, coupon system, order management, refunds, email sending, HTML sanitizer.

**Fix:** Prioritize tests for the money path: checkout -> payment -> order creation -> shipping.

### 5.2 No model factories — **P1**
Only `UserFactory` exists (for the unused default `User` model). No factories for `Product`, `Order`, `Customer`, `AdminUser`, or any other model. This makes writing tests extremely difficult.

**Fix:** Create factories for all 21 models. Start with `Product`, `Customer`, `AdminUser`, `Order`, `OrderItem`.

### 5.3 E2E tests not run in CI — **P1**
Playwright tests only run locally. The GitHub Actions workflow has no job that spins up backend + frontend and runs `npx playwright test`.

**Fix:** Add a CI job with service containers (MySQL + PHP + Node) that runs the E2E suite.

### 5.4 Zero frontend unit tests — **P1**
Vitest is configured with a single `assertTrue` placeholder. Zero tests for: cart store logic, pricing utilities, variant selection, stock calculations, API layer.

**Fix:** Add unit tests for `cart.ts`, `pricing.ts`, `variants.ts`, `stock.ts`, `api.ts`.

### 5.5 Monolithic E2E route scanner — **P2**
`console-errors.spec.ts` visits 50+ routes in a single `test()` block. If route #3 fails, routes #4-50 are never tested.

**Fix:** Parametrize with `test.describe` / individual `test()` per route group, or use soft assertions.

### 5.6 Flaky `waitForTimeout` patterns — **P2**
3 instances of hardcoded delays (`waitForTimeout(1500)`) in `login.spec.ts` instead of event-driven waits.

**Fix:** Replace with `waitForURL`, `waitForResponse`, or `expect.poll`.

### 5.7 Tests bypass auth middleware — **P2**
`AdminProductValidationTest.php` calls `$this->withoutMiddleware()`, meaning the authentication layer is never exercised.

**Fix:** Use `actingAs()` with a factory-created admin user instead.

---

## 6. CI/CD & Infrastructure

### 6.1 No backend linting in CI — **P2**
Laravel Pint is installed but never run in CI. PHP formatting is unenforced.

**Fix:** Add `composer pint:check` step to the CI workflow.

### 6.2 No health check endpoint — **P2**
No `/api/health` or similar endpoint. No post-deploy verification that the app is responding.

**Fix:** Add a simple health endpoint that checks DB connectivity and returns 200.

### 6.3 No production deployment pipeline — **P2**
CI only deploys to staging (`staging` branch). Production deployment is undocumented.

**Fix:** Document the production deployment process, ideally as a separate CI workflow.

### 6.4 Compiled assets tracked in git — **P2**
`backend/public/assets/` contains 81 compiled JS/CSS build artifacts (0.80 MB). These should be generated during deployment.

**Fix:** Add `backend/public/assets/` to `.gitignore`, remove from tracking.

### 6.5 No Docker configuration — **P3**
No Dockerfile or docker-compose.yml. Local development requires manually installing PHP, MySQL, Node, etc.

**Fix:** Add docker-compose for local development with PHP, MySQL, and Node services.

### 6.6 `bun.lockb` tracked — **P3**
Binary lockfile for Bun package manager is tracked, but the project uses npm (`package-lock.json`).

**Fix:** Remove `bun.lockb` and add to `.gitignore`.

---

## 7. Frontend Performance

### 7.1 Missing `loading="lazy"` on images — **P2**
React island components render `<img>` tags without `loading="lazy"`. Product listing pages may load all product images eagerly.

**Fix:** Add `loading="lazy"` to all below-fold images in islands.

### 7.2 Missing `useMemo`/`useCallback` in heavy components — **P2**
`AdminProducts.tsx` and `ProductDetailIsland.tsx` contain expensive derived computations (variant grouping, filtering, price calculations) that re-run on every render.

**Fix:** Wrap derived values in `useMemo` and event handlers in `useCallback`.

### 7.3 Full lucide-react imports — **P3**
Icons are imported individually (correct tree-shaking pattern), but the sheer number of imports (~30 in AdminProducts.tsx) adds to bundle size.

**Fix:** Consider using `lucide-react/dynamicIcon` or splitting icon-heavy components.

---

## 8. Code Hygiene

### 8.1 Unused default `User` model — **P3**
`backend/app/Models/User.php` and its migration `create_users_table.php` exist but the app uses `AdminUser` and `Customer` for authentication.

**Fix:** Remove `User` model and migration (or repurpose as `AdminUser`).

### 8.2 Missing return type hints on model relationships — **P3**
Most model relationship methods (`belongsTo`, `hasMany`, etc.) lack return type declarations across all models.

**Fix:** Add `: BelongsTo`, `: HasMany`, etc. return types.

### 8.3 `Auditable` trait uses string comparison — **P3**
`backend/app/Traits/Auditable.php:35` uses `get_class($user) === 'App\Models\AdminUser'` instead of `$user instanceof AdminUser`.

**Fix:** Replace with `instanceof` check.

### 8.4 `static` variable caching in gateways — **P3**
`EasyPostGateway.php` and `MockEasyPostGateway.php` use `static $cache = null;` for surcharge lookups. This persists across tests and in long-running processes (queues, Octane).

**Fix:** Use request-scoped caching or the service container singleton pattern.

### 8.5 Typo in admin seeder email — **P3**
`DatabaseSeeder.php:25` seeds `admin@midiaematal.com` — likely should be `admin@midiametal.com`.

**Fix:** Correct the typo (note: this will require updating any systems that use the current email to log in).

### 8.6 No Prettier configured — **P3**
No `.prettierrc` or Prettier dependency. Frontend code formatting is inconsistent.

**Fix:** Add Prettier with a config, integrate with ESLint via `eslint-config-prettier`.

### 8.7 No pre-commit hooks — **P3**
No Husky or lint-staged. Developers can push unlinted code.

**Fix:** Add Husky + lint-staged for ESLint and Pint on staged files.

---

## 9. Documentation

### 9.1 Backend README is Laravel boilerplate — **P2**
`backend/README.md` has no project-specific content. No API documentation for 70+ endpoints.

**Fix:** Document the API endpoints, models, and setup. Consider auto-generating with Scribe or Scramble.

### 9.2 No root `.env.example` — **P2**
The frontend requires `PUBLIC_API_URL` and `PUBLIC_STRIPE_KEY` but there's no `.env.example` documenting this.

**Fix:** Create a root `.env.example` with all required frontend env vars.

---

## Summary

| Priority | Count | Key Areas |
|----------|-------|-----------|
| **P0** | 4 | .env in git, XSS risk, placeholder bank details, near-zero test coverage |
| **P1** | 12 | Fat controllers, giant component, `any` types, no factories, no E2E in CI, missing indexes, string prices |
| **P2** | 16 | Duplicated logic, no FormRequests, data in migrations, flaky tests, no health check, CORS, docs |
| **P3** | 11 | Dead code, typos, formatting, type hints, unused dependencies |
| **Total** | **43** |

### Recommended Attack Order

1. **Security first**: Fix `.env` in git, audit `dangerouslySetInnerHTML`, fix `env()` outside config
2. **Test foundation**: Create model factories, add checkout/payment tests, run E2E in CI
3. **Architecture**: Extract services from fat controllers, split AdminProducts.tsx
4. **Database**: Add missing indexes, plan price column migration
5. **Code quality**: TypeScript interfaces, remove dead code, enable stricter linting
