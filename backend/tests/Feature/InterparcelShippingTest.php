<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\InterparcelBooking;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Shipping\InterparcelGateway;
use App\Shipping\ShippingGateway;
use App\Shipping\ShippingQuoteStore;
use App\Support\CheckoutCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class InterparcelShippingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 11, 26)->startOfDay());
        config([
            'services.shipping.provider' => 'interparcel', 'services.shipping.mock' => false,
            'services.interparcel.api_key' => 'test-key-never-real', 'services.interparcel.booking_enabled' => false,
            'services.interparcel.parcel_services' => ['PF48', 'IPCOL'], 'services.interparcel.pallet_services' => ['HAULECO'],
            'services.interparcel.quote_prices_include_vat' => false, 'services.interparcel.vat_rate' => 20,
            'services.interparcel.payment_method' => 'prepay',
            'services.shipping.from_name' => 'Dispatch', 'services.shipping.from_company' => 'Midia M Limited',
            'services.shipping.from_address_line1' => 'Unit 8A Cromwell Centre',
            'services.shipping.from_address_line2' => 'Roebuck Road', 'services.shipping.from_city' => 'Ilford',
            'services.shipping.from_postcode' => 'IG6 3UG', 'services.shipping.from_country' => 'GB',
            'services.shipping.from_phone' => '02079460000', 'services.shipping.from_email' => 'dispatch@example.com',
        ]);
        Cache::flush();
        Mail::fake();
        Http::preventStrayRequests();
    }

    public function test_quotes_use_documented_headers_units_filters_and_vat(): void
    {
        Http::fake(['api.interparcel.com/quote' => Http::response($this->rates())]);
        $product = $this->product(['shipping_length_cm' => 30.2]);
        $result = $this->postJson('/api/v1/shipping/options', $this->checkout($product))->assertOk();
        $result->assertJsonPath('options.0.provider', 'interparcel')->assertJsonPath('options.0.rate', 12);
        Http::assertSent(fn (Request $request) => $request->method() === 'POST'
            && $request->hasHeader('X-Interparcel-Auth', 'test-key-never-real')
            && $request->hasHeader('X-Interparcel-API-Version', '3')
            && $request['collection']['postcode'] === 'IG6 3UG'
            && $request['delivery']['country'] === 'GB'
            && $request['filter']['pickupType'] === ['collection']
            && $request['parcels'][0] === ['weight' => 2.15, 'length' => 33, 'width' => 22, 'height' => 12]);
        $this->assertNotEmpty($result->json('options.0.quote_token'));
        $this->assertInstanceOf(InterparcelGateway::class, app(ShippingGateway::class));
    }

    public function test_pallets_use_measured_dimensions_and_live_rates_without_flat_freight_price(): void
    {
        Http::fake(['api.interparcel.com/quote' => Http::response($this->rates(true))]);
        $product = $this->product([
            'shipping_class' => 'freight', 'freight_delivery_price' => null,
            'shipping_weight_kg' => 250, 'shipping_length_cm' => 120, 'shipping_width_cm' => 100, 'shipping_height_cm' => 80,
        ]);
        $checkout = $this->checkout($product);
        $checkout['items'][0]['quantity'] = 2;
        $this->postJson('/api/v1/shipping/options', $checkout)->assertOk()
            ->assertJsonPath('options.0.service_code', 'HAULECO')
            ->assertJsonPath('options.0.parcel_summary.pallet_count', 2)
            ->assertJsonPath('options.0.parcel_summary.total_weight_kg', 500)
            ->assertJsonPath('options.0.rate', 60);
        Http::assertSent(fn (Request $request) => $request['filter']['serviceLevel'] === ['pallet']
            && count($request['parcels']) === 2
            && $request['parcels'][0] == ['weight' => 250, 'length' => 120, 'width' => 100, 'height' => 80]);
    }

    public function test_mixed_basket_quotes_both_groups_and_requires_both_to_have_rates(): void
    {
        $standard = $this->product();
        $pallet = $this->product(['shipping_class' => 'freight']);
        $checkout = $this->checkout($standard);
        $checkout['items'][] = ['product_id' => $pallet->id, 'quantity' => 1];
        $palletAvailable = true;
        Http::fake(function (Request $r) use (&$palletAvailable) {
            $pallet = $r['filter']['serviceLevel'] === ['pallet'];

            return Http::response($pallet && ! $palletAvailable ? ['status' => 0, 'services' => []] : $this->rates($pallet));
        });
        $this->postJson('/api/v1/shipping/options', $checkout)->assertOk()
            ->assertJsonPath('options.0.rate', 72)->assertJsonCount(2, 'options.0.consignments');
        Http::assertSentCount(2);

        $palletAvailable = false;
        $this->postJson('/api/v1/shipping/options', $checkout)->assertOk()->assertJsonPath('options', []);
    }

    public function test_missing_measurements_and_international_destination_fail_without_network(): void
    {
        Http::fake();
        $product = $this->product(['shipping_weight_kg' => 0]);
        $this->postJson('/api/v1/shipping/options', $this->checkout($product))->assertStatus(422);
        $product->update(['shipping_weight_kg' => 2]);
        $checkout = $this->checkout($product);
        $checkout['shipping_country'] = 'FR';
        $this->postJson('/api/v1/shipping/options', $checkout)->assertStatus(422);
        Http::assertNothingSent();
    }

    public function test_client_cannot_inject_shipping_weight_in_variant_selection(): void
    {
        Http::fake(['api.interparcel.com/quote' => Http::response($this->rates())]);
        $product = $this->product(['variants' => [['option' => 'Size', 'value' => 'Large', 'shipping_weight_kg' => 10]]]);
        $checkout = $this->checkout($product);
        $checkout['items'][0]['selected_variants'] = ['Size' => ['value' => 'Large', 'shipping_weight_kg' => 0.01]];
        $this->postJson('/api/v1/shipping/options', $checkout)->assertOk();
        Http::assertSent(fn (Request $r) => $r['parcels'][0]['weight'] === 10.15);
    }

    public function test_prices_already_including_vat_are_not_taxed_twice_and_wrong_services_are_ignored(): void
    {
        config(['services.interparcel.quote_prices_include_vat' => true]);
        $rates = $this->rates();
        $rates['services'][] = array_merge($rates['services'][0], ['id' => 'OTHER', 'price' => 1]);
        $rates['services'][] = array_merge($rates['services'][0], ['currency' => 'USD', 'price' => 1]);
        $rates['services'][] = array_merge($rates['services'][0], ['pickupType' => 'dropoff', 'price' => 1]);
        Http::fake(['api.interparcel.com/quote' => Http::response($rates)]);
        $this->postJson('/api/v1/shipping/options', $this->checkout($this->product()))->assertOk()
            ->assertJsonCount(1, 'options')->assertJsonPath('options.0.rate', 10);
    }

    public function test_quote_is_bound_to_items_and_destination_before_payment(): void
    {
        Http::fake(['api.interparcel.com/quote' => Http::response($this->rates())]);
        $checkout = $this->checkout($this->product());
        $token = $this->postJson('/api/v1/shipping/options', $checkout)->json('options.0.quote_token');
        $calculator = app(CheckoutCalculator::class);
        $this->assertSame(12.0, $calculator->calculate($checkout['items'], null, 'delivery', $token, $checkout)['shipping']);
        foreach (['basket', 'address'] as $change) {
            $changed = $checkout;
            if ($change === 'basket') {
                $changed['items'][0]['quantity'] = 2;
            } else {
                $changed['shipping_postcode'] = 'EH1 1AA';
            }
            try {
                $calculator->calculate($changed['items'], null, 'delivery', $token, $changed);
                $this->fail('A changed '.$change.' must not reuse the old quote.');
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('shipping_option_token', $e->errors());
            }
        }
        $this->travel(46)->minutes();
        $this->assertNull(app(ShippingQuoteStore::class)->resolve($token));
    }

    public function test_provider_error_is_sanitized_and_does_not_fallback_to_mock_rates(): void
    {
        Http::fake(['api.interparcel.com/quote' => Http::response(['status' => 1, 'errorMessage' => 'test-key-never-real private data'], 401)]);
        $response = $this->postJson('/api/v1/shipping/options', $this->checkout($this->product()))->assertStatus(422);
        $this->assertStringNotContainsString('test-key-never-real', $response->getContent());
        $this->assertStringContainsString('credentials', $response->json('message'));
    }

    public function test_missing_key_and_mock_mode_block_outbound_requests(): void
    {
        Http::fake();
        $checkout = $this->checkout($this->product());
        config(['services.interparcel.api_key' => '']);
        $this->postJson('/api/v1/shipping/options', $checkout)->assertStatus(422);
        config(['services.interparcel.api_key' => 'test-key-never-real', 'services.shipping.mock' => true]);
        $this->postJson('/api/v1/shipping/options', $checkout)->assertStatus(422);
        Http::assertNothingSent();
    }

    public function test_ip_allowlist_rejection_is_private_in_checkout_and_actionable_in_quote_checker(): void
    {
        Http::fake(['api.interparcel.com/quote' => Http::response([
            'status' => 1, 'errorCode' => '403002',
            'errorMessage' => 'IP address 203.0.113.10 is not authorised; test-key-never-real',
        ], 403)]);
        $this->postJson('/api/v1/shipping/options', $this->checkout($this->product()))
            ->assertStatus(422)
            ->assertExactJson(['message' => 'Delivery quotes are temporarily unavailable. Please try again later.']);
        $this->artisan('interparcel:check')
            ->expectsOutput("Interparcel has not authorised this server's outbound IP address (403002). Ask Interparcel to allow the testing/server IP, then rerun this quote-only check. Keep paid bookings disabled.")
            ->assertFailed();
        Http::assertSentCount(2);
        Http::assertNotSent(fn (Request $request) => $request->url() !== 'https://api.interparcel.com/quote');
        $this->assertDatabaseCount('interparcel_bookings', 0);
    }

    public function test_booking_requires_enabled_flag_confirmation_paid_order_and_pickup(): void
    {
        Http::fake();
        $this->admin();
        $order = $this->order();
        $url = '/api/admin/orders/'.$order->id.'/shipping/label';
        $this->postJson($url, $this->bookingInput())->assertStatus(422);
        config(['services.interparcel.booking_enabled' => true]);
        $this->postJson($url, [])->assertStatus(422);
        $order->update(['payment_status' => 'pending']);
        $this->postJson($url, $this->bookingInput())->assertStatus(422);
        $order->update(['payment_status' => 'paid']);
        $this->postJson($url, ['confirm_booking' => true])->assertStatus(422);
        Http::assertNothingSent();
        $this->assertDatabaseCount('interparcel_bookings', 0);
    }

    public function test_accepted_booking_is_idempotent_and_pending_labels_are_not_reported_ready(): void
    {
        $this->admin();
        config(['services.interparcel.booking_enabled' => true]);
        $this->fakeBooking();
        $order = $this->order();
        $url = '/api/admin/orders/'.$order->id.'/shipping/label';
        $response = $this->postJson($url, $this->bookingInput())->assertOk();
        $response->assertJsonPath('shipping_shipment_id', '23794871')
            ->assertJsonPath('shipping_metadata.interparcel_shipments.0.label_status', 'pending')
            ->assertJsonPath('shipping_label_url', null)->assertJsonPath('status', 'processing');
        $this->postJson($url, $this->bookingInput())->assertOk();
        Http::assertSentCount(2); // One fresh quote and one order, even after the second click.
        Http::assertSent(fn (Request $r) => $r->url() === 'https://api.interparcel.com/orders'
            && $r->hasHeader('X-Interparcel-API-Version', '2') && strlen($r['idempotencyKey']) === 36
            && $r['payment'] === ['method' => 'prepay'] && $r['orders'][0]['service'] === 'PF48');
        $saved = DB::table('interparcel_bookings')->first();
        $this->assertStringNotContainsString('Customer Example', $saved->request);
        $this->assertArrayNotHasKey('request', InterparcelBooking::first()->toArray());
        $this->assertArrayNotHasKey('idempotency_key', InterparcelBooking::first()->toArray());
    }

    public function test_timeout_retry_reuses_exact_request_and_key_even_when_form_and_configuration_change(): void
    {
        $this->admin();
        config(['services.interparcel.booking_enabled' => true]);
        $requests = [];
        Http::fake(function (Request $r) use (&$requests) {
            if ($r->url() === 'https://api.interparcel.com/quote') {
                return Http::response($this->rates());
            }
            $requests[] = $r->data();
            if (count($requests) === 1) {
                throw new ConnectionException('Simulated lost response after acceptance');
            }

            return Http::response($this->accepted());
        });
        $order = $this->order();
        $url = '/api/admin/orders/'.$order->id.'/shipping/label';
        $this->postJson($url, $this->bookingInput())->assertStatus(422);
        $this->assertDatabaseCount('interparcel_bookings', 1);
        config(['services.shipping.from_phone' => 'changed']);
        $changed = $this->bookingInput();
        $changed['pickup']['date'] = '2026-12-05';
        $this->postJson($url, $changed)->assertOk();
        $this->assertSame($requests[0], $requests[1]);
        $this->assertSame('2026-11-30', $requests[1]['orders'][0]['pickup']['date']);
    }

    public function test_quote_price_increase_stops_before_any_chargeable_request(): void
    {
        $this->admin();
        config(['services.interparcel.booking_enabled' => true]);
        $rates = $this->rates();
        $rates['services'][0]['price'] = 30;
        Http::fake(['api.interparcel.com/quote' => Http::response($rates)]);
        $order = $this->order();
        $this->postJson('/api/admin/orders/'.$order->id.'/shipping/label', $this->bookingInput())->assertStatus(422);
        Http::assertSentCount(1);
        $this->assertDatabaseCount('interparcel_bookings', 0);
    }

    public function test_tracking_uses_delivery_status_and_download_proxies_private_pdf(): void
    {
        $this->admin();
        config(['services.interparcel.booking_enabled' => true]);
        $this->fakeBooking();
        $order = $this->order();
        $this->postJson('/api/admin/orders/'.$order->id.'/shipping/label', $this->bookingInput())->assertOk();
        Http::fake([
            'api.interparcel.com/orders/23794871' => Http::response(['status' => 0, 'order' => [
                'orderId' => '23794871', 'status' => 'booked', 'interparcelTrackingNumber' => 'GB1234567890',
                'label' => ['status' => 'ready', 'url' => 'https://untrusted.example/label'],
            ]]),
            'api.interparcel.com/tracking/GB1234567890' => Http::response(['status' => 0, 'currentStatus' => 'D', 'events' => [['event' => 'Delivered']]]),
            'api.interparcel.com/orders/23794871/label*' => Http::response('%PDF-1.4 test label', 200, ['Content-Type' => 'application/pdf']),
        ]);
        $this->postJson('/api/admin/orders/'.$order->id.'/shipping/track')->assertOk()
            ->assertJsonPath('status', 'delivered')->assertJsonPath('shipping_metadata.interparcel_shipments.0.label_status', 'ready');
        $response = $this->get('/api/admin/orders/'.$order->id.'/shipping/label/download')->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
        $this->assertSame('%PDF-1.4 test label', $response->getContent());
        Http::assertSent(fn (Request $r) => str_contains($r->url(), '/label?format=A4') && $r->hasHeader('X-Interparcel-API-Version', '1'));
        Http::assertNotSent(fn (Request $r) => str_contains($r->url(), 'untrusted'));
        $this->get('/api/admin/orders/'.$order->id.'/shipping/label/download?shipment=10')->assertStatus(422);
    }

    public function test_pending_label_returns_actionable_message_and_cancel_is_explicitly_unsupported(): void
    {
        $this->admin();
        config(['services.interparcel.booking_enabled' => true]);
        $this->fakeBooking();
        $order = $this->order();
        $this->postJson('/api/admin/orders/'.$order->id.'/shipping/label', $this->bookingInput())->assertOk();
        Http::fake(['api.interparcel.com/orders/23794871/label*' => Http::response(['status' => 0, 'labelStatus' => 'pending'], 202)]);
        $this->getJson('/api/admin/orders/'.$order->id.'/shipping/label/download')->assertStatus(422);
        $this->postJson('/api/admin/orders/'.$order->id.'/shipping/void')->assertStatus(422);
        $this->assertNotSame('voided', $order->fresh()->shipping_status);
    }

    public function test_old_provider_setting_cannot_reactivate_easypost_or_fake_rates(): void
    {
        Http::fake();
        config(['services.shipping.provider' => 'easypost', 'services.interparcel.api_key' => '']);
        $this->assertInstanceOf(InterparcelGateway::class, app(ShippingGateway::class));
        $this->postJson('/api/v1/shipping/options', $this->checkout($this->product()))->assertStatus(422)
            ->assertJsonPath('message', 'Interparcel API access is not configured. Add INTERPARCEL_API_KEY on the server.');
        Http::assertNothingSent();
    }

    public function test_saved_easypost_order_remains_readable_but_cannot_use_shipping_actions(): void
    {
        $this->admin();
        Http::fake();
        $order = $this->order();
        $order->update([
            'shipping_provider' => 'easypost', 'tracking_number' => 'saved-tracking',
            'shipping_shipment_id' => 'shp_existing', 'shipping_metadata' => ['mode' => 'live'],
        ]);
        $before = $order->fresh()->getAttributes();
        $this->getJson('/api/admin/orders/'.$order->id)->assertOk()
            ->assertJsonPath('shipping_provider', 'easypost')->assertJsonPath('tracking_number', 'saved-tracking')
            ->assertJsonCount(1, 'items');
        foreach (['label', 'track', 'void'] as $action) {
            $this->postJson('/api/admin/orders/'.$order->id.'/shipping/'.$action, ['tracking_number' => 'do-not-overwrite'])
                ->assertStatus(422)->assertJsonPath('message', 'This order was not booked with Interparcel. Its saved shipping details cannot be updated through Interparcel.');
        }
        $this->assertSame($before, $order->fresh()->getAttributes());
        $this->assertDatabaseCount('interparcel_bookings', 0);
        Http::assertNothingSent();
    }

    public function test_retired_webhook_cannot_change_saved_order(): void
    {
        Http::fake();
        $order = $this->order();
        $order->update(['shipping_provider' => 'easypost', 'shipping_status' => 'pre_transit', 'shipping_shipment_id' => 'shp_existing']);
        $this->postJson('/api/v1/webhooks/easypost', [
            'description' => 'tracker.updated', 'result' => ['shipment_id' => 'shp_existing', 'status' => 'delivered'],
        ])->assertStatus(405);
        $this->assertSame('pre_transit', $order->fresh()->shipping_status);
        Http::assertNothingSent();
    }

    public function test_checkout_rejects_quotes_cached_before_the_provider_switch(): void
    {
        Http::fake();
        $product = $this->product();
        Cache::put('shipping_quote:old-provider-token', ['provider' => 'easypost', 'rate' => 1], now()->addMinutes(45));
        $this->assertNull(app(ShippingQuoteStore::class)->resolve('old-provider-token'));
        Http::assertNothingSent();
        $this->expectException(ValidationException::class);
        app(CheckoutCalculator::class)->calculate([['product_id' => $product->id, 'quantity' => 1]], null, 'delivery', 'old-provider-token');
    }

    public function test_mixed_booking_sends_both_consignments_and_waits_for_all_deliveries(): void
    {
        $this->admin();
        config(['services.interparcel.booking_enabled' => true]);
        $order = $this->order();
        $pallet = $this->product(['shipping_class' => 'freight']);
        OrderItem::create(['order_id' => $order->id, 'product_id' => $pallet->id, 'product_name' => 'Packed pallet', 'product_price' => '£800.00', 'quantity' => 1]);
        $metadata = $order->shipping_metadata;
        $option = &$metadata['selected_delivery_option'];
        $option['service_code'] = 'PF48+HAULECO';
        $option['consignments'][] = ['type' => 'pallet', 'service_code' => 'HAULECO', 'parcels' => [[
            'weight' => 250, 'length' => 120, 'width' => 100, 'height' => 80, 'shipping_class' => 'freight',
            'items' => [['product_id' => $pallet->id, 'quantity' => 1]],
        ]]];
        $order->update(['shipping_metadata' => $metadata, 'shipping' => 72]);
        $accepted = $this->accepted();
        $accepted['orders'][] = array_merge($accepted['orders'][0], ['orderId' => '23794872', 'interparcelTrackingNumber' => 'GB1234567891']);
        Http::fake(function (Request $r) use ($accepted) {
            if ($r->url() === 'https://api.interparcel.com/quote') {
                return Http::response($this->rates($r['filter']['serviceLevel'] === ['pallet']));
            }
            if ($r->url() === 'https://api.interparcel.com/orders') {
                return Http::response($accepted);
            }
            if (str_contains($r->url(), '/tracking/')) {
                return Http::response(['status' => 0, 'currentStatus' => str_ends_with($r->url(), '90') ? 'D' : 'T']);
            }
            $id = basename($r->url());

            return Http::response(['status' => 0, 'order' => ['orderId' => $id, 'status' => 'booked', 'label' => ['status' => 'ready']]]);
        });
        $input = $this->bookingInput();
        $input['max_cost'] = 72;
        $this->postJson('/api/admin/orders/'.$order->id.'/shipping/label', $input)->assertOk();
        Http::assertSent(fn (Request $r) => $r->url() === 'https://api.interparcel.com/orders'
            && count($r['orders']) === 2 && $r['orders'][0]['value'] == 50 && $r['orders'][1]['value'] == 800);
        $this->postJson('/api/admin/orders/'.$order->id.'/shipping/track')->assertOk()
            ->assertJsonPath('status', 'shipped')->assertJsonPath('shipping_status', 'in_transit')
            ->assertJsonCount(2, 'shipping_metadata.interparcel_shipments');
        $this->deleteJson('/api/admin/orders/'.$order->id)->assertStatus(409);
        $this->assertDatabaseHas('orders', ['id' => $order->id]);
    }

    public function test_concurrent_booking_lock_prevents_a_second_request(): void
    {
        $this->admin();
        Http::fake();
        config(['services.interparcel.booking_enabled' => true]);
        $order = $this->order();
        $lock = Cache::lock('interparcel-booking:'.$order->id, 120);
        $this->assertTrue($lock->get());
        try {
            $this->postJson('/api/admin/orders/'.$order->id.'/shipping/label', $this->bookingInput())->assertStatus(422);
            Http::assertNothingSent();
        } finally {
            $lock->release();
        }
    }

    public function test_variants_of_the_same_product_are_valued_in_their_own_parcel_or_pallet(): void
    {
        $this->admin();
        config(['services.interparcel.booking_enabled' => true]);
        $product = $this->product(['variants' => [
            ['option' => 'Size', 'value' => 'Small', 'shipping_class' => 'standard', 'shipping_weight_kg' => 2],
            ['option' => 'Size', 'value' => 'Large', 'shipping_class' => 'freight', 'shipping_weight_kg' => 250],
        ]]);
        $accepted = $this->accepted();
        $accepted['orders'][] = array_merge($accepted['orders'][0], ['orderId' => '23794872', 'interparcelTrackingNumber' => 'GB1234567891']);
        Http::fake(fn (Request $r) => Http::response($r->url() === 'https://api.interparcel.com/orders'
            ? $accepted : $this->rates($r['filter']['serviceLevel'] === ['pallet'])));
        $checkout = $this->checkout($product);
        $checkout['items'] = array_map(fn ($size) => [
            'product_id' => $product->id, 'quantity' => 1, 'selected_variants' => ['Size' => ['value' => $size]],
        ], ['Small', 'Large']);
        $option = $this->postJson('/api/v1/shipping/options', $checkout)->assertOk()->json('options.0');
        $order = $this->order();
        $order->items()->delete();
        foreach ($checkout['items'] as $index => $item) {
            OrderItem::create([
                'order_id' => $order->id, 'product_id' => $product->id, 'product_name' => $product->name,
                'product_price' => $index === 0 ? '£50.00' : '£800.00', 'quantity' => 1, 'variant_details' => $item['selected_variants'],
            ]);
        }
        $order->update(['shipping_metadata' => ['fulfilment_method' => 'delivery', 'selected_delivery_option' => $option]]);
        $input = $this->bookingInput();
        $input['max_cost'] = 72;
        $this->postJson('/api/admin/orders/'.$order->id.'/shipping/label', $input)->assertOk();
        Http::assertSent(fn (Request $r) => $r->url() === 'https://api.interparcel.com/orders'
            && $r['orders'][0]['value'] == 50 && $r['orders'][1]['value'] == 800);
    }

    public function test_pending_carrier_booking_does_not_mark_order_shipped(): void
    {
        $this->admin();
        config(['services.interparcel.booking_enabled' => true]);
        $this->fakeBooking();
        $order = $this->order();
        $this->postJson('/api/admin/orders/'.$order->id.'/shipping/label', $this->bookingInput())->assertOk();
        Http::fake(['api.interparcel.com/orders/23794871' => Http::response(['status' => 0, 'order' => [
            'orderId' => '23794871', 'status' => 'requires_staff_attention', 'label' => ['status' => 'pending'],
        ]])]);
        $this->postJson('/api/admin/orders/'.$order->id.'/shipping/track')->assertOk()
            ->assertJsonPath('status', 'processing')
            ->assertJsonPath('shipping_metadata.interparcel_shipments.0.booking_status', 'requires_staff_attention');
        Http::assertNotSent(fn (Request $r) => str_contains($r->url(), '/tracking/'));
    }

    public function test_quote_checker_covers_pallets_empty_results_and_does_not_book(): void
    {
        Http::fake(['api.interparcel.com/quote' => Http::response(['status' => 0, 'services' => []])]);
        $this->artisan('interparcel:check', ['--pallet' => true, '--weight' => 250, '--length' => 120, '--width' => 100, '--height' => 80])->assertFailed();
        Http::assertSent(fn (Request $r) => $r['filter']['serviceLevel'] === ['pallet']);
        Http::assertSentCount(1);
    }

    public function test_private_label_route_requires_admin_authentication(): void
    {
        Http::fake();
        $order = $this->order();
        $this->getJson('/api/admin/orders/'.$order->id.'/shipping/label/download')->assertUnauthorized();
        $this->postJson('/api/admin/orders/'.$order->id.'/shipping/label', $this->bookingInput())->assertUnauthorized();
        Http::assertNothingSent();
    }

    public function test_quote_check_command_only_quotes_and_reports_missing_access(): void
    {
        Http::fake(['api.interparcel.com/quote' => Http::response($this->rates())]);
        $this->artisan('interparcel:check')->assertSuccessful();
        Http::assertSentCount(1);
        Http::assertNotSent(fn (Request $r) => str_contains($r->url(), '/orders'));
        config(['services.interparcel.api_key' => '']);
        $this->artisan('interparcel:check')->assertFailed();
    }

    private function admin(): void
    {
        $this->actingAs(AdminUser::factory()->create(), 'sanctum');
    }

    private function product(array $attributes = []): Product
    {
        return Product::factory()->create(array_merge([
            'price' => '£50.00', 'active' => true, 'track_stock' => false, 'variants' => null,
            'shipping_class' => 'standard', 'ships_separately' => false, 'price_on_request' => false,
            'shipping_weight_kg' => 2, 'shipping_length_cm' => 30, 'shipping_width_cm' => 20, 'shipping_height_cm' => 10,
        ], $attributes));
    }

    private function checkout(Product $product): array
    {
        return [
            'shipping_address_line1' => '1 Example Street', 'shipping_city' => 'Birmingham',
            'shipping_postcode' => 'B1 1BB', 'shipping_country' => 'United Kingdom',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ];
    }

    private function rates(bool $pallet = false): array
    {
        return ['status' => 0, 'services' => [[
            'id' => $pallet ? 'HAULECO' : 'PF48', 'carrier' => $pallet ? 'Haulable' : 'Parcelforce',
            'service' => $pallet ? 'Haulable Economy' : 'Parcelforce Express 48',
            'serviceLevel' => $pallet ? 'pallet' : 'standard', 'price' => $pallet ? 50 : 10,
            'currency' => 'GBP', 'taxable' => true, 'pickupType' => 'collection',
            'printerNeeded' => true, 'delivery' => ['daysFrom' => 2, 'daysTo' => 3],
        ]]];
    }

    private function order(): Order
    {
        $product = $this->product();
        $parcel = [
            'weight' => 2, 'length' => 30, 'width' => 20, 'height' => 10,
            'items' => [['product_id' => $product->id, 'product_name' => $product->name, 'quantity' => 1]],
        ];
        $option = [
            'provider' => 'interparcel', 'service_code' => 'PF48', 'service' => 'Parcelforce Express 48',
            'carrier' => 'Parcelforce', 'rate' => 12, 'consignments' => [[
                'type' => 'parcel', 'service_code' => 'PF48', 'parcels' => [$parcel],
            ]],
        ];
        $order = Order::factory()->paid()->create([
            'customer_name' => 'Customer Example', 'customer_email' => 'customer@example.com', 'customer_phone' => '02079460001',
            'shipping_address_line1' => '1 Example Street', 'shipping_address_line2' => '',
            'shipping_city' => 'Birmingham', 'shipping_postcode' => 'B1 1BB', 'shipping_country' => 'GB',
            'shipping_provider' => 'interparcel', 'shipping' => 12,
            'shipping_metadata' => ['fulfilment_method' => 'delivery', 'selected_delivery_option' => $option],
        ]);
        OrderItem::create(['order_id' => $order->id, 'product_id' => $product->id, 'product_name' => $product->name, 'product_price' => '£50.00', 'quantity' => 1]);

        return $order;
    }

    private function bookingInput(): array
    {
        return ['confirm_booking' => true, 'pickup' => ['date' => '2026-11-30', 'earliest' => '09:00', 'latest' => '17:00'], 'max_cost' => 12];
    }

    private function accepted(): array
    {
        return ['status' => 0, 'bookingStatus' => 'accepted', 'payment' => ['status' => 'paid'], 'orders' => [[
            'orderId' => '23794871', 'interparcelTrackingNumber' => 'GB1234567890', 'status' => 'processing', 'labelStatus' => 'pending',
        ]]];
    }

    private function fakeBooking(): void
    {
        Http::fake([
            'api.interparcel.com/quote' => Http::response($this->rates()),
            'api.interparcel.com/orders' => Http::response($this->accepted()),
        ]);
    }
}
