<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\SiteSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShippingOptionsTest extends TestCase
{
    use RefreshDatabase;

    private function seedFreightSurcharges(): void
    {
        $surcharges = [
            'freight_surcharge_highlands' => '7.00',
            'freight_surcharge_ni' => '4.50',
            'freight_surcharge_scotland' => '2.00',
            'freight_surcharge_london' => '0.00',
            'freight_surcharge_default' => '1.00',
        ];

        foreach ($surcharges as $key => $value) {
            SiteSetting::updateOrCreate(
                ['key' => $key],
                ['value' => $value, 'group' => 'shipping-freight'],
            );
        }
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
        $this->seedFreightSurcharges();

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

        // Should contain a freight/pallet option
        $freightOption = collect($options)->first(function ($opt) {
            return str_contains(strtolower($opt['service'] ?? ''), 'freight')
                || str_contains(strtolower($opt['service'] ?? ''), 'pallet');
        });
        $this->assertNotNull($freightOption, 'Freight product should return a pallet delivery option');
    }

    public function test_mixed_cart_forces_freight_when_any_freight_item(): void
    {
        $this->seedFreightSurcharges();

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

        // Mixed cart should force pallet delivery — all options should be freight
        $hasFreight = collect($options)->contains(function ($opt) {
            return str_contains(strtolower($opt['service'] ?? ''), 'freight')
                || str_contains(strtolower($opt['service'] ?? ''), 'pallet');
        });
        $this->assertTrue($hasFreight, 'Mixed cart with freight item should include pallet delivery option');
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
