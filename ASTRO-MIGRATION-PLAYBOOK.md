# Astro Migration Playbook

Reusable guide for migrating another frontend project to Astro based on the `midia-metal` migration.

This file covers:
- which agents to use
- how to split pages between Astro and React islands
- what was done in this project
- what broke during migration and deployment
- what must be committed locally so future deploys do not regress

## 1. Goal

Migrate an existing frontend to Astro without losing working business flows.

Default target architecture:
- content and SEO pages: pure Astro
- lightly interactive pages: Astro + small React islands
- heavily interactive pages: React islands
- admin panel: keep as React SPA mounted inside Astro
- backend API: keep existing backend if it already works

The priority order is:
1. keep behavior correct
2. reduce unnecessary client JavaScript
3. preserve deployment simplicity
4. avoid production regressions during staging work

## 2. Agent Setup

Use the agents in this order.

### `explore`

Use first to map the app before changing code.

Ask it to find:
- routes
- auth flow
- cart and checkout flow
- payment integration
- admin entry points
- API usage patterns
- environment variable usage
- hardcoded URLs or localhost references

### `bulk-converter`

Use for static and semi-static page conversion.

Good targets:
- about
- faq
- legal pages
- blog list/detail
- services list/detail
- portfolio list/detail

Rules:
- follow one reference Astro page pattern
- move data fetching to Astro frontmatter
- keep styling intact
- avoid introducing new abstractions unless needed

### `island-builder`

Use for interactive pages that should stay React but be mounted by Astro.

Good targets:
- shop
- cart
- checkout
- payment
- login/register
- account pages
- forms with validation and async submit
- filters and search UI

Rules:
- keep existing React logic where possible
- move only the page shell to Astro
- use the smallest hydration strategy that still works

### `critical-reviewer`

Use only on the highest-risk files.

Review these first:
- cart store
- checkout flow
- auth/session code
- payment/Stripe code
- API helper code

Focus the review on:
- CSRF and cookies
- hydration mismatches
- stale state across navigation
- missing error handling
- pricing/order bugs

### `verifier`

Use after each major phase.

Have it:
- run builds
- fix build errors
- verify route output
- verify SSR/static behavior
- check that assets are served correctly

### `general`

Use for mixed tasks that do not fit the conversion agents.

Examples:
- deployment debugging
- remote environment investigation
- end-to-end staging fixes

## 3. Migration Decision Rules

Use these rules repeatedly.

### Convert to pure Astro

Use Astro when a page:
- fetches data once and renders it
- is mostly static content
- needs SEO
- does not depend on client-side shared state

Examples from this project:
- about
- faq
- legal pages
- blog pages
- services pages
- some portfolio pages

### Use Astro + small React island

Use this when the page is mostly static but has one focused interactive area.

Examples from this project:
- home with carousel
- contact with form
- quote page with form/upload
- portfolio list with client filtering

### Keep as a full React island

Use a full island when the page needs:
- cart state
- auth state
- payment SDKs
- complex filters/variants
- sessionStorage/localStorage coordination
- user-specific content

Examples from this project:
- shop
- cart
- checkout
- payment
- account

### Keep admin as React SPA

Do not force-convert admin pages unless there is a strong reason.

For this project, the correct approach was:
- Astro catch-all page for `/admin/*`
- React Router app mounted as `AdminApp`
- admin code kept under `src/pages-react/admin/`

## 4. Recommended Phase Order

1. Explore current architecture
2. Establish Astro config, layout, env handling, and one reference conversion
3. Convert static pages in bulk
4. Convert interactive pages to islands
5. Mount admin as a React SPA inside Astro
6. Fix state sync, auth, payment, and session behavior
7. Build and verify locally
8. Deploy to staging only
9. Fix staging-only issues
10. Commit code-side fixes for every server-side hotfix

## 5. What Was Done In `midia-metal`

### Frontend migration

Completed:
- migrated the React SPA to Astro with React islands
- reduced many public pages to pure Astro
- kept only genuinely interactive commerce pages as islands
- kept admin as a React SPA mounted under Astro
- updated env usage to `import.meta.env.PUBLIC_API_URL`
- removed hardcoded `127.0.0.1:8000` frontend references

### Admin handling

Completed:
- admin mounted through `src/pages/admin/[...path].astro`
- React admin entry kept in `src/islands/AdminApp.tsx`
- admin page implementations kept in `src/pages-react/admin/`
- Tailwind content scanning updated so admin styles are not purged

### Backend and staging integration

Completed:
- Laravel staging API deployed separately
- isolated staging database used
- cross-subdomain cookies configured
- checkout/payment flows fixed for staging
- staging frontend pointed only to staging API

### Local code changes that matter

Important local changes from this migration:
- `tailwind.config.ts` includes `./src/pages-react/**/*.{ts,tsx}`
- `src/lib/api.ts` always refreshes CSRF cookie before mutating requests
- `src/pages/cart.astro` is SSR, not prerendered
- `src/pages/checkout.astro` is SSR, not prerendered
- `src/pages/payment.astro` is SSR, not prerendered
- Laravel migration files were added locally for staging DB schema fixes in `backend/database/migrations/`

## 6. Core Lessons Learned

### 6.1 Build-time env vars are baked into client bundles

If `PUBLIC_API_URL` or `PUBLIC_STRIPE_KEY` changes, a rebuild is required.

Changing only server env values is not enough for client code that was already bundled.

### 6.2 User-specific commerce pages should not be prerendered

Do not prerender pages like:
- cart
- checkout
- payment

These pages depend on current user/session/cart state and should be SSR or client-driven.

### 6.3 Cross-subdomain Sanctum cookies are fragile

For frontend and API on sibling subdomains, cookies must be configured correctly.

Needed settings in Laravel staging:
- `SESSION_DOMAIN=.midiawork.com`
- `SESSION_SAME_SITE=none`
- `SESSION_SECURE_COOKIE=true`
- correct `SANCTUM_STATEFUL_DOMAINS`
- correct `FRONTEND_URL`

### 6.4 Client-side navigation can leave CSRF state stale

With Astro `ViewTransitions`, browser cookies may still exist while the backend session/token has rotated.

The fix used here:
- always fetch a fresh CSRF cookie before every mutating request

This was implemented in `src/lib/api.ts`.

### 6.5 Tailwind purge problems are easy to miss

If styles disappear only in admin or only in production, verify every source directory is included in `tailwind.config.ts`.

The missing path here was:
- `./src/pages-react/**/*.{ts,tsx}`

### 6.6 Server hotfixes must be represented in local code

If you fix DB constraints directly on staging, also create migrations locally.

Otherwise the next environment or redeploy will fail again.

This happened here with product-related nullable/default fields.

### 6.7 File uploads need the Laravel storage link

If uploads appear to succeed but files are not accessible, verify:
- `public/storage` symlink exists
- `storage/app/public/uploads` exists
- the web server can serve those files

### 6.8 Astro SSR asset output may not match hosting assumptions

On this Hostinger setup, page-level CSS landed in:
- `dist/server/_astro/`

But static assets were served from:
- `dist/client/_astro/`

So post-deploy CSS copy was required:

```bash
cp dist/server/_astro/*.css dist/client/_astro/
```

### 6.9 Clear Astro/Vite build caches when output looks stale

If stale hashes or old HTML keep appearing, clear:

```bash
rm -rf .astro node_modules/.vite dist
```

## 7. Hostinger-Specific Notes

This project exposed a few important Hostinger behaviors.

### Node/Passenger setup

Important values used here:
- Node path: `/opt/alt/alt-nodejs20/root/usr/bin/node`
- app root: `~/domains/support.midiawork.com/public_html/`
- source build dir: `~/domains/support.midiawork.com/public_html/.builds/source/`

### Important env

```bash
PUBLIC_API_URL="https://staging-api.midiawork.com/api"
PUBLIC_STRIPE_KEY="..."
ASTRO_NODE_AUTOSTART="disabled"
NODE_ENV="production"
```

`ASTRO_NODE_AUTOSTART=disabled` was required to avoid `EADDRINUSE`.

### Deployment workflow that worked

```bash
export PATH=/opt/alt/alt-nodejs20/root/usr/bin:$PATH
export PUBLIC_API_URL="https://staging-api.midiawork.com/api"
export PUBLIC_STRIPE_KEY="pk_test_..."
export ASTRO_NODE_AUTOSTART="disabled"
export NODE_ENV="production"

cd ~/domains/support.midiawork.com/public_html/.builds/source
rm -rf .astro node_modules/.vite dist
node node_modules/astro/astro.js build

SOURCE=~/domains/support.midiawork.com/public_html/.builds/source/dist
DEST=~/domains/support.midiawork.com/public_html/dist
rm -rf "$DEST" && cp -r "$SOURCE" "$DEST"
cp "$SOURCE/server/_astro/"*.css "$DEST/client/_astro/"
touch ~/domains/support.midiawork.com/public_html/tmp/restart.txt
```

### LiteSpeed / `.htaccess`

Do not assume Apache proxy behavior is available.

We learned:
- `mod_proxy [P]` routing in `.htaccess` did not work here
- trying to proxy through `.htaccess` caused 403 behavior under LiteSpeed

## 8. Common Failure Modes

### Symptom: staging still points to production or localhost

Check:
- hardcoded frontend URLs
- `PUBLIC_API_URL`
- build-time client bundle values
- backend `APP_URL` / `FRONTEND_URL`

### Symptom: admin looks unstyled in staging

Check:
- Tailwind `content` paths
- whether the correct CSS file exists after build
- whether CSS from `dist/server/_astro` was copied into `dist/client/_astro`

### Symptom: POST requests fail with 419

Check:
- `sanctum/csrf-cookie` flow
- cookie domain and SameSite settings
- whether frontend refreshes CSRF before mutating requests

### Symptom: product/category creation fails only on staging

Check:
- DB schema differences between local and staging
- nullable/default mismatches
- whether empty form inputs are being converted to `NULL`

### Symptom: image upload chooser opens but nothing saves

Check:
- Laravel upload endpoint
- `public/storage` symlink
- `storage/app/public/uploads`
- file size validation

## 9. Local-First Rules

Every fix should end in the repository, not only on the server.

Always commit locally for:
- frontend config fixes
- env usage fixes
- Tailwind scan fixes
- API helper fixes
- Astro route rendering mode fixes
- Laravel migrations for DB schema corrections

Server-only steps should be documented when they cannot live in code.

Examples:
- `php artisan storage:link`
- Hostinger Passenger restart
- first-time server directory setup

## 10. Pre-Deploy Checklist

- no production URLs in staging code or env
- no localhost references in staging code or env
- `PUBLIC_API_URL` includes the correct path segment if required by the app
- checkout/cart/payment pages are not wrongly prerendered
- Tailwind `content` covers all live source directories
- staging DB migrations are applied
- storage link exists for Laravel uploads
- build completes from a clean cache

## 11. Post-Deploy Checklist

- homepage loads
- admin login works
- admin CSS matches local
- product/category create works
- image upload works
- cart works
- checkout works
- payment intent works
- order creation works
- no requests hit production

## 12. Reusable Prompt Templates

### Explore prompt

```text
Audit this codebase for an Astro migration. Return:
1. all page routes
2. all admin entry points
3. all auth/cart/payment code paths
4. all API base URL usage
5. all hardcoded localhost or production URLs
6. your recommendation for pure Astro vs React island vs keep-as-SPA
```

### Bulk conversion prompt

```text
Convert these content pages to Astro following the existing reference pattern.
Move data fetching to Astro frontmatter, preserve styling, and do not invent new abstractions.
Return changed files and any route-specific caveats.
```

### Island conversion prompt

```text
Convert this page to Astro plus a React island.
Keep current React logic unless simplification is clearly safe.
Choose the smallest hydration mode that preserves behavior.
Return changed files and any state/hydration risks.
```

### Critical review prompt

```text
Review these migration files for:
1. auth/session correctness
2. CSRF/cookie correctness
3. checkout/payment regressions
4. hydration issues
5. stale shared state
List findings by severity with file references.
```

## 13. Files To Review In This Repo Before Reusing The Pattern

- `MIGRATION-STATUS.md`
- `migration-plan.md`
- `opencode-agent-strategy.md`
- `tailwind.config.ts`
- `src/lib/api.ts`
- `src/pages/cart.astro`
- `src/pages/checkout.astro`
- `src/pages/payment.astro`
- `src/pages/admin/[...path].astro`
- `src/islands/AdminApp.tsx`
- `backend/database/migrations/2026_04_02_011314_make_product_fields_nullable_and_add_defaults.php`
- `backend/database/migrations/2026_04_02_011314_make_product_category_fields_nullable_and_add_defaults.php`

## 14. Final Rule

Do not treat migration as only a framework rewrite.

A real Astro migration includes:
- rendering model decisions
- auth/session behavior
- build-time env behavior
- hosting quirks
- asset serving quirks
- staging isolation
- backend schema consistency

If those are not handled, the code may look migrated while the app is still not deployable.
