<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ShippingOptionsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.shipping.mock' => false, 'services.interparcel.api_key' => 'test-only']);
        Http::preventStrayRequests();
        Http::fake(['api.interparcel.com/quote' => function (Request $request) {
            $pallet = $request['filter']['serviceLevel'] === ['pallet'];

            return Http::response(['status' => 0, 'services' => [[
                'id' => $pallet ? 'HAULECO' : 'PF48', 'carrier' => $pallet ? 'Haulable' : 'Parcelforce',
                'service' => $pallet ? 'Haulable Economy' : 'Parcelforce Express 48',
                'serviceLevel' => $pallet ? 'pallet' : 'standard', 'price' => $pallet ? 50 : 10,
                'currency' => 'GBP', 'taxable' => true, 'pickupType' => 'collection',
                'printerNeeded' => true, 'delivery' => ['daysFrom' => 2, 'daysTo' => 3],
            ]]]);
        }]);
    }

    // ─── Standard shipping ────────────────────────────────────────────

    public function test_returns_shipping_options_for_standard_product(): void
    {
        $product = Product::factory()->create([
            'price' => '£50.00',
            'shipping_class' => 'standard',
            'shipping_weight_kg' => 2,
            'shipping_length_cm' => 30,
            'shipping_width_cm' => 20,
            'shipping_height_cm' => 10,
        ]);

        $response = $this->postJson('/api/v1/shipping/options', [
            'shipping_address_line1' => '123 High Street',
            'shipping_city' => 'London',
            'shipping_postcode' => 'SW1A 1AA',
            'shipping_country' => 'United Kingdom',
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1],
            ],
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'fulfilment_method',
            'options' => [
                '*' => ['rate', 'service', 'quote_token'],
            ],
        ]);
        $this->assertSame('delivery', $response->json('fulfilment_method'));
        $this->assertNotEmpty($response->json('options'));
    }

    public function test_click_and_collect_returns_empty_options(): void
    {
        $product = Product::factory()->create(['price' => '£50.00']);

        $response = $this->postJson('/api/v1/shipping/options', [
            'fulfilment_method' => 'click_collect',
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1],
            ],
        ]);

        $response->assertOk();
        $this->assertSame('click_collect', $response->json('fulfilment_method'));
        $this->assertEmpty($response->json('options'));
    }

    // ─── Freight shipping ─────────────────────────────────────────────

    public function test_freight_product_returns_pallet_delivery_option(): void
    {
        $product = Product::factory()->freight(150.00)->create(['price' => '£999.00']);

        $response = $this->postJson('/api/v1/shipping/options', [
            'shipping_address_line1' => '123 High Street',
            'shipping_city' => 'London',
            'shipping_postcode' => 'SW1A 1AA',
            'shipping_country' => 'United Kingdom',
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1],
            ],
        ]);

        $response->assertOk();
        $options = $response->json('options');
        $this->assertNotEmpty($options);

        $response->assertJsonPath('options.0.provider', 'interparcel')
            ->assertJsonPath('options.0.consignments.0.type', 'pallet')
            ->assertJsonPath('options.0.service_code', 'HAULECO');
    }

    public function test_mixed_cart_includes_both_parcel_and_pallet_consignments(): void
    {
        $standardProduct = Product::factory()->create([
            'price' => '£25.00',
            'shipping_class' => 'standard',
        ]);
        $freightProduct = Product::factory()->freight(200.00)->create(['price' => '£1500.00']);

        $response = $this->postJson('/api/v1/shipping/options', [
            'shipping_address_line1' => '10 Downing Street',
            'shipping_city' => 'London',
            'shipping_postcode' => 'SW1A 2AA',
            'shipping_country' => 'United Kingdom',
            'items' => [
                ['product_id' => $standardProduct->id, 'quantity' => 1],
                ['product_id' => $freightProduct->id, 'quantity' => 1],
            ],
        ]);

        $response->assertOk();
        $options = $response->json('options');
        $this->assertNotEmpty($options);

        $response->assertJsonCount(2, 'options.0.consignments')
            ->assertJsonPath('options.0.consignments.0.type', 'parcel')
            ->assertJsonPath('options.0.consignments.1.type', 'pallet')
            ->assertJsonPath('options.0.rate', 72);
    }

    // ─── Validation ───────────────────────────────────────────────────

    public function test_rejects_missing_items(): void
    {
        $response = $this->postJson('/api/v1/shipping/options', [
            'shipping_postcode' => 'SW1A 1AA',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['items']);
    }

    public function test_rejects_invalid_fulfilment_method(): void
    {
        $product = Product::factory()->create(['price' => '£50.00']);

        $response = $this->postJson('/api/v1/shipping/options', [
            'fulfilment_method' => 'drone',
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['fulfilment_method']);
    }
}
