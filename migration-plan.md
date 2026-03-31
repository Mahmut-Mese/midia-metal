# Midia Metal: React → Astro Migration Plan
## Detailed File-by-File Conversion Guide

> Target: Astro 5 with React Islands, Hybrid output mode, Nanostores for shared state
> Deployment: Hostinger Cloud (Node app for hybrid SSR/SSG)

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Output mode | Hybrid (SSG default, SSR opt-in) | Most pages static, SSR for product pages if needed later |
| Routing | Astro file-based + React Router for admin | Incremental migration, admin stays as SPA |
| Shared state | Nanostores | Works across React islands, ~1KB, Astro-recommended |
| CSS | Tailwind via @astrojs/tailwind | Same config, drop-in replacement |
| API proxy | Astro dev server proxy | Same as current Vite proxy |
| React islands | client:load / client:visible / client:idle | Hydration strategy per-component |
| Admin panel | Single catch-all Astro page → React SPA | No conversion needed for admin pages |

---

## Phase 1: SETUP

**Agent**: Architect (Copilot) — ~40 requests  
**Duration**: ~1 hour

### 1.1 Initialize Astro alongside existing project

```bash
# Install Astro + integrations into existing project
npm install astro @astrojs/react @astrojs/tailwind nanostores @nanostores/react
```

Create `astro.config.mjs` at project root.

### 1.2 Create Astro directory structure

```
src/
├── layouts/              # NEW — Astro layouts
│   └── BaseLayout.astro  # Header + Footer + slot
├── pages-astro/          # NEW — Astro pages (temporary, rename to pages/ at end)
│   ├── index.astro
│   ├── about.astro
│   ├── ...
│   └── admin/
│       └── [...path].astro   # Catch-all for admin SPA
├── stores/               # NEW — Nanostores
│   ├── cart.ts
│   ├── auth.ts
│   └── wishlist.ts
├── islands/              # NEW — React island wrappers (thin components)
│   ├── CartIsland.tsx
│   ├── HeaderIsland.tsx
│   └── ...
├── pages/                # EXISTING — React pages (kept during migration)
├── components/           # EXISTING — React components (shared between old/new)
├── context/              # EXISTING — React contexts (keep until nanostores proven)
├── hooks/                # EXISTING — React hooks (keep)
├── lib/                  # EXISTING — Utilities (keep)
└── ...
```

### 1.3 Nanostores migration

Create stores that mirror existing React contexts:

| Store File | Replaces | Key State |
|------------|----------|-----------|
| `src/stores/cart.ts` | `CartContext.tsx` | cart[], subtotal, vatAmount, total, coupon |
| `src/stores/auth.ts` | `CustomerAuthContext.tsx` | customer, isAuthenticated, isLoading |
| `src/stores/wishlist.ts` | `WishlistContext.tsx` | wishlist[], add/remove/isIn |

### 1.4 Reference conversions (3 templates)

| Template | Source | Target | Purpose |
|----------|--------|--------|---------|
| Static page | `NotFound.tsx` | `404.astro` | Shows simplest Astro page pattern |
| API-fetching page | `AboutPage.tsx` | `about.astro` | Shows data fetching in frontmatter |
| Interactive island | `CartPage.tsx` | `cart.astro` + `CartIsland.tsx` | Shows React island mounting |

---

## Phase 2: BULK CONVERSION (Static & Semi-Static Pages)

**Agent**: Bulk Converter (Free models) — unlimited  
**Duration**: ~2 hours

### Static Pages (pure markup, no API)

| # | Source | Target | Conversion Notes |
|---|--------|--------|-----------------|
| 1 | `src/pages/NotFound.tsx` (26 lines) | `src/pages-astro/404.astro` | Pure HTML, Link → `<a>` |

### API-Fetching Pages (fetch data, render static HTML)

| # | Source | Target | Conversion Notes |
|---|--------|--------|-----------------|
| 2 | `src/pages/PrivacyPolicyPage.tsx` + `LegalContentPage.tsx` | `src/pages-astro/privacy-policy.astro` | Fetch `/v1/legal/privacy-policy`, render HTML content |
| 3 | `src/pages/TermsPage.tsx` | `src/pages-astro/terms-of-service.astro` | Same pattern, different endpoint |
| 4 | `src/pages/ReturnsPage.tsx` | `src/pages-astro/returns-policy.astro` | Same pattern |
| 5 | `src/pages/CookiesPage.tsx` | `src/pages-astro/cookies.astro` | Same pattern |
| 6 | `src/pages/AboutPage.tsx` (165 lines) | `src/pages-astro/about.astro` | Fetch about data, render team/stats |
| 7 | `src/pages/ServicesPage.tsx` (238 lines) | `src/pages-astro/services/index.astro` | Fetch services list, render cards |
| 8 | `src/pages/ServiceDetailPage.tsx` (188 lines) | `src/pages-astro/services/[slug].astro` | Dynamic route, fetch by slug |
| 9 | `src/pages/BlogPage.tsx` (184 lines) | `src/pages-astro/blog/index.astro` | Fetch blog posts list |
| 10 | `src/pages/BlogDetailPage.tsx` (284 lines) | `src/pages-astro/blog/[slug].astro` | Dynamic route, fetch by slug |
| 11 | `src/pages/PortfolioPage.tsx` (163 lines) | `src/pages-astro/portfolio/index.astro` | Fetch portfolio items |
| 12 | `src/pages/PortfolioDetailPage.tsx` (189 lines) | `src/pages-astro/portfolio/[slug].astro` | Dynamic route, fetch by slug |

### Semi-Static Pages (mostly static + small interactive element)

| # | Source | Target | Conversion Notes |
|---|--------|--------|-----------------|
| 13 | `src/pages/FaqPage.tsx` (207 lines) | `src/pages-astro/faq.astro` | Fetch FAQs, use `<details>` for accordion (CSS-only, no React needed) |

### Component Conversions

| # | Source | Target | Conversion Notes |
|---|--------|--------|-----------------|
| 14 | `src/components/Breadcrumb.tsx` (82 lines) | `src/components/Breadcrumb.astro` | Pure render, no hooks — direct conversion |
| 15 | `src/components/CheckoutSteps.tsx` (69 lines) | `src/components/CheckoutSteps.astro` | Pure render — direct conversion |
| 16 | `src/components/Seo.tsx` (94 lines) | DELETE — replaced by Astro `<head>` | Astro handles meta tags natively in layouts |

### Dead Code Cleanup

| # | Source | Action | Reason |
|---|--------|--------|--------|
| 17 | `src/components/FloatingSidebar.tsx` | DELETE | Returns null — dead code |
| 18 | `src/components/StickySidebar.tsx` | DELETE or skip | Non-functional buttons |

---

## Phase 3: INTERACTIVE ISLANDS

**Agent**: Interactive Builder (Free models first pass + Copilot review)  
**Duration**: ~3 hours

### Strategy per page:
- Create a thin `.astro` wrapper that imports the React component as an island
- Swap `useContext` calls for `useStore` from nanostores inside React components
- Choose hydration directive: `client:load`, `client:visible`, or `client:idle`

### Homepage & Product Pages (Complex — Copilot review needed)

| # | Source | Astro Wrapper | React Island | Hydration | Agent |
|---|--------|--------------|--------------|-----------|-------|
| 1 | `Index.tsx` (355 lines) | `pages-astro/index.astro` | `<IndexPage client:load />` | load | Free + Copilot review |
| 2 | `ShopPage.tsx` (480 lines) | `pages-astro/shop/index.astro` | `<ShopPage client:load />` | load | Free + Copilot review |
| 3 | `CategoryPage.tsx` (130 lines) | `pages-astro/shop/category/[slug].astro` | `<CategoryPage client:load />` | load | Free |
| 4 | `ProductDetailPage.tsx` (1163 lines) | `pages-astro/shop/[id].astro` | `<ProductDetailPage client:load />` | load | **Copilot** (complex variants, cart, wishlist, reviews) |

### Cart & Checkout Flow (Critical — Copilot)

| # | Source | Astro Wrapper | React Island | Hydration | Agent |
|---|--------|--------------|--------------|-----------|-------|
| 5 | `CartPage.tsx` (211 lines) | `pages-astro/cart.astro` | `<CartPage client:load />` | load | **Copilot** (reference conversion) |
| 6 | `CheckoutPage.tsx` (568 lines) | `pages-astro/checkout.astro` | `<CheckoutPage client:load />` | load | **Copilot** (forms, cart, auth) |
| 7 | `PaymentPage.tsx` (522 lines) | `pages-astro/payment.astro` | `<PaymentPage client:load />` | load | **Copilot** (Stripe integration — CRITICAL) |
| 8 | `ThankYouPage.tsx` (91 lines) | `pages-astro/thank-you.astro` | `<ThankYouPage client:load />` | load | Free |

### Customer Auth Pages

| # | Source | Astro Wrapper | React Island | Hydration | Agent |
|---|--------|--------------|--------------|-----------|-------|
| 9 | `CustomerLogin.tsx` (88 lines) | `pages-astro/login.astro` | `<LoginForm client:load />` | load | Free |
| 10 | `CustomerRegister.tsx` (126 lines) | `pages-astro/register.astro` | `<RegisterForm client:load />` | load | Free |
| 11 | `CustomerPortal.tsx` (900+ lines) | `pages-astro/account.astro` | `<CustomerPortal client:load />` | load | Free + Copilot review |
| 12 | `ForgotPasswordPage.tsx` (135 lines) | `pages-astro/forgot-password.astro` | `<ForgotPasswordForm client:load />` | load | Free |
| 13 | `ResetPasswordPage.tsx` (174 lines) | `pages-astro/reset-password.astro` | `<ResetPasswordForm client:load />` | load | Free |

### Form Pages (Contact & Quote)

| # | Source | Astro Wrapper | React Island | Hydration | Agent |
|---|--------|--------------|--------------|-----------|-------|
| 14 | `ContactPage.tsx` (233 lines) | `pages-astro/contact.astro` | Static header in Astro + `<ContactForm client:visible />` | visible | Free |
| 15 | `QuoteRequestPage.tsx` (177 lines) | `pages-astro/get-a-quote.astro` | Static header in Astro + `<QuoteForm client:visible />` | visible | Free |

### Layout Components

| # | Source | Target | Strategy | Agent |
|---|--------|--------|----------|-------|
| 16 | `Header.tsx` (264 lines) | `components/Header.astro` + `islands/HeaderIsland.tsx` | Split: static nav links in Astro, search + cart badge + mobile menu as React island | **Copilot** |
| 17 | `Footer.tsx` (136 lines) | `components/Footer.astro` | Mostly static. Replace API fetch with Astro frontmatter fetch. Scroll-to-top = inline `<script>` | Free |
| 18 | `CookieBanner.tsx` (54 lines) | `<CookieBanner client:idle />` | Loads after page idle, not critical | Free |

### Components That Stay React (No Conversion)

| Component | Reason |
|-----------|--------|
| `SelectionTableSection.tsx` (750 lines) | Used inside ProductDetailPage React island |
| `ErrorBoundary.tsx` (65 lines) | Used in React tree |
| `NavLink.tsx` (28 lines) | Only used in React Router context |
| All `components/ui/*` (49 files) | shadcn/ui — used by React components |
| `components/admin/*` (2 files) | Admin panel stays React |

---

## Phase 4: ADMIN PANEL (React SPA Mount)

**Agent**: Architect (Copilot) — ~15 requests  
**Duration**: ~30 min

### Strategy
Mount the entire admin panel as a single React SPA using a catch-all Astro route.

| Task | File | Details |
|------|------|---------|
| 4.1 | `src/pages-astro/admin/[...path].astro` | Catch-all route, renders `<AdminApp client:only="react" />` |
| 4.2 | `src/islands/AdminApp.tsx` | New component: wraps React Router + all admin routes + providers |
| 4.3 | Keep all `src/pages/admin/*` files | No changes needed |
| 4.4 | Keep `src/components/admin/*` | No changes needed |

The `client:only="react"` directive means:
- No server rendering (admin doesn't need SEO)
- Full React lifecycle available
- React Router handles all `/admin/*` sub-routes

---

## Phase 5: CRITICAL REVIEW

**Agent**: Critical Reviewer (Antigravity Gemini) — 3-4 exchanges  
**Duration**: ~20 min

| Review # | File(s) | What to Check |
|----------|---------|---------------|
| 1 | `src/stores/cart.ts`, `auth.ts`, `wishlist.ts` | State sync between islands, localStorage race conditions, SSR safety |
| 2 | `pages-astro/payment.astro` + PaymentPage | Stripe Elements mounting, CSRF handling, error states |
| 3 | `pages-astro/admin/[...path].astro` + AdminApp | Auth guard works, lazy loading preserved, no route conflicts |
| 4 | (Optional) `components/Header.astro` + HeaderIsland | Cart badge updates across islands, mobile menu state |

---

## Phase 6: VERIFY & CLEANUP

**Agent**: Verifier (Free models) — unlimited  
**Duration**: ~1 hour

### Verification Tasks

| # | Task | Command / Check |
|---|------|----------------|
| 6.1 | Build project | `npm run build` — fix all errors |
| 6.2 | Verify all routes | Manually navigate to each route in dev mode |
| 6.3 | Test cart operations | Add to cart, update quantity, remove, apply coupon |
| 6.4 | Test auth flow | Login, register, logout, access account page |
| 6.5 | Test admin access | Login to admin, navigate pages, create/edit content |
| 6.6 | Test payment flow | Stripe checkout (test mode) |
| 6.7 | Check API proxy | All `/api/*` requests reach Laravel backend |

### Cleanup Tasks

| # | Task | Details |
|---|------|---------|
| 6.8 | Rename directories | `pages-astro/` → `pages/` (old `pages/` → `pages-react/` or delete) |
| 6.9 | Remove old entry point | Delete `index.html`, `src/main.tsx`, `src/App.tsx` |
| 6.10 | Remove Vite config | Delete `vite.config.ts` (Astro has its own Vite config) |
| 6.11 | Update package.json | Scripts: `dev` → `astro dev`, `build` → `astro build` |
| 6.12 | Remove unused deps | `@vitejs/plugin-react-swc`, `lovable-tagger`, `react-router-dom` (if admin uses Astro routing), `react-helmet-async` |
| 6.13 | Update .gitignore | Add `.astro/` to gitignore |
| 6.14 | Update environment vars | `VITE_API_URL` → `PUBLIC_API_URL` in Astro |

---

## File Inventory Summary

| Category | Count | Action |
|----------|-------|--------|
| Static pages to convert to .astro | 13 | Phase 2 (Free) |
| Interactive pages → Astro + React island | 15 | Phase 3 (Free + Copilot) |
| Admin pages (no change) | 19 | Phase 4 (mount as SPA) |
| Components to convert to .astro | 3 | Phase 2 (Free) |
| Components split (Astro + React island) | 2 | Phase 3 (Copilot) |
| Dead code to delete | 2-3 | Phase 2 |
| shadcn/ui components (no change) | 49 | Keep |
| Lib/utility files (no change) | 7 | Keep |
| Hooks (no change) | 2 | Keep |
| Context files (keep until stores proven) | 3 | Keep, then delete after Phase 5 |
| New nanostore files | 3 | Phase 1 (Copilot) |
| **Total files touched** | ~38 | |

---

## Token Budget Summary

| Phase | Provider | Estimated Usage | Remaining After |
|-------|----------|----------------|-----------------|
| Phase 1 | Copilot | ~40 requests | 260 |
| Phase 2 | Free | Unlimited | 260 |
| Phase 3 | Free + Copilot | ~40 Copilot requests | 220 |
| Phase 4 | Copilot | ~15 requests | 205 |
| Phase 5 | Antigravity Gemini | 3-4 exchanges | 205 Copilot / ~6-12 Gemini |
| Phase 6 | Free + Copilot | ~15 Copilot requests | 190 |
| **Total Copilot used** | | **~110 requests** | **190 remaining (63% buffer)** |
| **Antigravity Gemini** | | **3-4 of ~10-15** | **~6-12 remaining** |
| **Antigravity Opus** | | **0-1 (optional)** | **~2-5 remaining** |
