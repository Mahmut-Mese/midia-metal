# Interparcel integration

Branch: `interparcel`, based on `qa` at `92102c7`. This branch does not deploy to Hostinger automatically. The existing QA deployment remains restricted to `qa` and `test.midiametal.com`.

## Setup

Use the API key issued by Interparcel after API access is approved. An EasyPost key cannot be used. Set these values in the **backend environment**, never in a frontend `PUBLIC_` variable or Git:

```dotenv
SHIPPING_PROVIDER=interparcel
SHIPPING_MOCK=false
INTERPARCEL_API_KEY=your_interparcel_key
INTERPARCEL_BOOKING_ENABLED=false
INTERPARCEL_PAYMENT_METHOD=prepay
INTERPARCEL_PARCEL_SERVICES=IPCOL,PF48
INTERPARCEL_PALLET_SERVICES=HAULECO
INTERPARCEL_QUOTE_PRICES_INCLUDE_VAT=false
INTERPARCEL_VAT_RATE=20
```

The service allowlists select InPost Collect, Parcelforce Express 48 and Haulable Economy. Empty lists allow all returned collection services of the appropriate type. Availability depends on the account, route and package. There is no fallback to fabricated rates. Interparcel does not document a sandbox in these endpoints; `SHIPPING_MOCK=true` blocks Interparcel network calls. Automated tests use HTTP fakes independently of these settings.

Check `SHIPPING_FROM_*` against the real collection contact. Interparcel limits name/company/address lines to 30 characters. Split the Ilford address across the configured lines; the existing `Roebuck Road, Hainault Business Park` default is too long. Use a real collection phone number. Confirm whether the account's quote `price` includes VAT with Interparcel before enabling checkout: the adapter defaults to adding 20% when `taxable=true`, and checkout expects VAT-inclusive shipping prices.

Run `php artisan migrate` for the new `interparcel_bookings` table and `php artisan config:clear` after environment changes. The table retains encrypted booking requests and idempotency keys. Retain the same Laravel `APP_KEY` so interrupted bookings can be recovered. An order with a booking cannot be hard-deleted while this record exists.

## Read-only live checks

From `backend/`:

```sh
php artisan interparcel:check
php artisan interparcel:check --weight=20 --length=60 --width=40 --height=40
php artisan interparcel:check --pallet --weight=250 --length=120 --width=100 --height=80
```

These commands call **only the quote endpoint**. They return failure for missing credentials, rejected authentication, API errors or no matching services. A successful quote does not prove that paid booking or labels are enabled on the account.

## Packing and checkout

Every product/selected variant must have an explicit weight in kg and length, width, height in cm. Standard items use the existing packing algorithm and configured packaging allowances. For a `freight` product, those four fields must describe **one fully packed pallet**, including its base and packaging. Each quantity is one pallet; there is no invented pallet consolidation. Freight prices come from Interparcel, not `freight_delivery_price` or the old postcode surcharge settings.

Set the base values under Admin → Products → Delivery measurements, and edit any variant overrides in the variant table.

Mixed baskets quote standard parcels and pallets separately, then offer combined prices. If either group has no eligible service, no incomplete delivery option is offered. Quotes are tied to the basket and destination and expire after 45 minutes. Changing either requires another quote. This integration supports UK-to-UK collection services; drop-off and international/customs shipments are not enabled.

Confirm that the chosen carriers accept the particular goods, and that pallet collection/delivery access is suitable. The public API does not provide explicit tail-lift/access fields. Carrier prohibitions and site requirements need to be resolved before enabling bookings; do not assume a returned rate means all metal products or sinks are accepted.

## Booking, labels and tracking

Once account funding, VAT basis, carrier acceptance and collection details are verified, enable `INTERPARCEL_BOOKING_ENABLED=true`. This enables **real paid bookings**, including on a test website. Use `prepay`, or `account` only if Interparcel has enabled account terms. Stored-card and raw-card payments are not implemented.

Admin → Orders → Shipping offers a collection date/time window and quote budget. Only paid, unfulfilled orders can be booked. The service is re-quoted before submission and must fit that budget; Interparcel's API has no documented atomic price cap, and carrier measurement surcharges can still apply. Booking is an explicit admin action, not an automatic side effect of a test Stripe payment.

The first request is saved encrypted before it is sent. Retries reuse the exact payload and idempotency key; changing form fields on a retry does not change an already attempted booking. Mixed baskets submit both consignments in one Orders request. Do not delete a booking record or create a separate booking after a timeout: first recover/check the original in Interparcel. If the saved request was rejected for incorrect details, reconcile it with Interparcel before an operator repairs it; the application intentionally does not silently generate another chargeable request.

Accepted bookings may still have pending labels or require staff attention. Use **Refresh tracking** to retrieve booking and label state, then download each ready label. PDFs are fetched server-side with the API key and served only through authenticated admin routes; no secret-bearing URL or public label file is created. Delivery status comes from Tracking, not from the booking's `booked` status. A mixed order is delivered only after every consignment is delivered.

Cancellation is through the Interparcel account/support: no cancellation endpoint is published in this API. Existing EasyPost orders continue to use their saved provider. Tracking refresh is currently an admin action; there is no Interparcel webhook or scheduled polling job in this change.

## Verification and references

```sh
cd backend
php artisan test --filter=Interparcel
vendor/bin/pint --test
```

Contract tests cover authentication/version headers, parcel and pallet quotes, VAT, missing measurements, mixed baskets, quote binding, booking guards, encrypted durable retries, asynchronous labels, tracking and private PDF delivery. They do not establish live account access.

Verification on 26 November 2026: all 23 Interparcel feature tests passed. The full backend suite passed (321 tests before the final additional variant-value regression test), as did all 620 frontend tests, PHP formatting, ESLint and Astro type checks. ESLint reports 12 existing warnings in unrelated code; Astro reports existing hints with no errors. Tests ran in an isolated copy with dependencies installed from the unchanged lockfiles because some local dependency files were offloaded by macOS. Node 25 required `NODE_OPTIONS=--no-experimental-webstorage` for the existing jsdom tests. No live Interparcel API call was made: API access is still awaiting approval.

Official references: [Authentication](https://uk.interparcel.com/docs/api/authentication), [Quote v3](https://uk.interparcel.com/docs/api/quote/get-a-quote), [Orders v2](https://uk.interparcel.com/docs/api/orders/create), [Retrieve order v2](https://uk.interparcel.com/docs/api/orders/get), [Labels v1](https://uk.interparcel.com/docs/api/orders/labels), [Tracking v1](https://uk.interparcel.com/docs/api/tracking/track). Reviewed 26 November 2026. The label endpoint's own documentation specifies version 1, while the order response contains v2 relative label URLs; this implementation follows the label endpoint's header and constructs the authenticated URL itself.
