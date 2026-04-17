# Tech Debt & Flow Audit

## Assumptions
- "Carier flow" is interpreted as carrier/shipping.
- If the user meant careers/recruiting, no career-related flow was found in the repo.

## 1. Customer Flow

### Confirmed Coverage
- Login, register, and account pages exist.
- API routes for customer management are present.
- `src/stores/auth.ts` contains `fetchCurrentCustomer()`.
- Playwright tests cover basic login/logout functionality.

### Issues / Likely Broken
- **Auth Hydration**: `src/islands/CheckoutIsland.tsx` reads `$customer` for prefills and `src/islands/PaymentIsland.tsx` reads `$customer` for saved cards, but neither hydrates auth state on a fresh page load. This is directly related to the **Saved Cards** issue below; without hydration, `PaymentIsland` cannot display saved cards on refresh.
- **Limited Interaction**: `fetchCurrentCustomer()` is only called from `src/islands/AccountIsland.tsx`, potentially leaving other customer-dependent views stale. (See `src/stores/auth.ts`)

### Missing Automated Coverage
- Playwright coverage is limited to login/logout; it does not exercise account management or registration flows.

## 2. Admin Flow

### Confirmed Coverage
- `src/pages/admin/[...path].astro` includes a dashboard entry in `getStaticPaths`.
- Admin tests cover login, `/admin`, and `/admin/products`.
- Backend admin order API coverage comes from `backend/tests/Feature/AdminOrderTest.php`.

### Issues / Likely Broken
- **Missing Dashboard**: `src/islands/AdminApp.tsx` has no nested `/admin/dashboard` route and falls back to a "Coming Soon" wildcard.

### Missing Automated Coverage
- No automated evidence found for admin shipping label actions (generate, track, void).

## 3. Checkout & Payment Flow

### Confirmed Coverage
- `src/islands/CheckoutIsland.tsx` stores `checkoutForm` in `sessionStorage` before navigating to `/payment`.
- Backend coverage exists for `OrderPlacementTest` and `CheckoutCalculatorTest`.

### Issues / Likely Broken
- **Payment Guard**: `src/islands/PaymentIsland.tsx` intentionally redirects to `/checkout` if `checkoutForm` is missing from `sessionStorage`. While the guard logic is correct, the flow is fragile because it relies solely on client-side `sessionStorage` with no backend/server-side fallback to recover a pending checkout state.
- **Saved Cards**: Related to the **Auth Hydration** issue, `src/islands/PaymentIsland.tsx` fails to load saved cards on fresh page loads because the auth store is not hydrated.
- **Thank-You Page**: The `src/pages/thank-you.astro` page reads only `sessionStorage('lastOrder')` instead of fetching persisted order data, which may lead to data loss on session expiry or page refresh.
- **Test Seeding**: `console-errors.spec.ts` seeds `checkoutForm` and `lastOrder` directly instead of exercising a full end-to-end checkout flow.

### Missing Automated Coverage
- No automated evidence found for `PaymentController` `createIntent` or saved card functionality.

## 4. Carrier / Shipping Flow

### Confirmed Coverage
- Backend coverage exists for `ShippingOptionsTest`.

### Missing Automated Coverage
- No automated evidence found for `EasyPost` webhooks.
- No automated evidence found for `OrderShippingController` tests regarding labels, tracking, or voiding.

## 5. Prioritised Next Steps

1.  **Fix Auth Hydration**: Ensure `CheckoutIsland` and `PaymentIsland` trigger auth hydration to support returning customers.
2.  **Verify Admin Dashboard**: Align the Astro routing with the `AdminApp.tsx` router to resolve the "Coming Soon" fallback for the dashboard.
3.  **End-to-End Checkout Test**: Replace session seeding in tests with a full E2E flow to validate `checkoutForm` and `Payment` handoffs.
4.  **Persisted Thank-You Data**: Update the `thank-you` page to fetch order details from the backend via an order ID rather than relying solely on `sessionStorage`.
5.  **Expand Shipping Coverage**: Implement tests for EasyPost webhooks and shipping label management within the admin interface.
