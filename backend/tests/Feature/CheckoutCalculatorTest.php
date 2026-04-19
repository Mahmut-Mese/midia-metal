<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Coupon;
use App\Shipping\ShippingQuoteStore;
use App\Support\CheckoutCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class CheckoutCalculatorTest extends TestCase
{
    use RefreshDatabase;

    private function issueShippingQuote(array $option = []): string
    {
        $store = app(ShippingQuoteStore::class);
        $quote = $store->issue(array_merge([
            'rate' => 6.50,
            'service' => 'Royal Mail Tracked 48',
            'carrier' => 'royal_mail',
            'provider' => 'easypost',
        ], $option));

        return $quote['quote_token'];
    }

    // ─── Basic checkout ───────────────────────────────────────────────

    public function test_calculates_simple_order_total(): void
    {
        $product = Product::factory()->create(['price' => '£100.00']);
        $token = $this->issueShippingQuote();

        $result = app(CheckoutCalculator::class)->calculate(
            [['product_id' => $product->id, 'quantity' => 2]],
            null,
            'delivery',
            $token,
        );

        $this->assertSame(200.00, $result['subtotal']);
        $this->assertSame(6.50, $result['shipping']);
        $this->assertSame(206.50, $result['total']);
        $this->assertCount(1, $result['items']);
        $this->assertSame('£100.00', $result['items'][0]['product_price']);
        $this->assertSame(100.00, $result['items'][0]['unit_price']);
    }

    public function test_click_and_collect_has_zero_shipping(): void
    {
        $product = Product::factory()->create(['price' => '£50.00']);

        $result = app(CheckoutCalculator::class)->calculate(
            [['product_id' => $product->id, 'quantity' => 1]],
            null,
            'click_collect',
            null,
        );

        $this->assertSame(50.00, $result['subtotal']);
        $this->assertSame(0.0, $result['shipping']);
        $this->assertSame(50.00, $result['total']);
    }

    public function test_rejects_empty_items(): void
    {
        $this->expectException(ValidationException::class);

        app(CheckoutCalculator::class)->calculate([], null, 'delivery', null);
    }

    public function test_rejects_nonexistent_product(): void
    {
        $this->expectException(ValidationException::class);

        $token = $this->issueShippingQuote();
        app(CheckoutCalculator::class)->calculate(
            [['product_id' => 99999, 'quantity' => 1]],
            null,
            'delivery',
            $token,
        );
    }

    public function test_rejects_inactive_product(): void
    {
        $product = Product::factory()->inactive()->create();

        $this->expectException(ValidationException::class);

        $token = $this->issueShippingQuote();
        app(CheckoutCalculator::class)->calculate(
            [['product_id' => $product->id, 'quantity' => 1]],
            null,
            'delivery',
            $token,
        );
    }

    // ─── Stock enforcement ────────────────────────────────────────────

    public function test_rejects_insufficient_stock(): void
    {
        $product = Product::factory()->tracked(3)->create(['price' => '£25.00']);

        $this->expectException(ValidationException::class);

        $token = $this->issueShippingQuote();
        app(CheckoutCalculator::class)->calculate(
            [['product_id' => $product->id, 'quantity' => 5]],
            null,
            'delivery',
            $token,
        );
    }

    public function test_allows_order_within_stock(): void
    {
        $product = Product::factory()->tracked(10)->create(['price' => '£25.00']);
        $token = $this->issueShippingQuote();

        $result = app(CheckoutCalculator::class)->calculate(
            [['product_id' => $product->id, 'quantity' => 5]],
            null,
            'delivery',
            $token,
        );

        $this->assertSame(125.00, $result['subtotal']);
    }

    // ─── Variant pricing ──────────────────────────────────────────────

    public function test_size_variant_price_takes_priority(): void
    {
        $product = Product::factory()->withVariants([
            ['option' => 'Size', 'value' => 'Large', 'price' => '£40.00', 'stock' => null],
            ['option' => 'Colour', 'value' => 'Red', 'price' => '£15.00', 'stock' => null],
        ])->create(['price' => '£10.00']);

        $token = $this->issueShippingQuote();

        $result = app(CheckoutCalculator::class)->calculate(
            [[
                'product_id' => $product->id,
                'quantity' => 1,
                'selected_variants' => [
                    'Size' => ['option' => 'Size', 'value' => 'Large'],
                    'Colour' => ['option' => 'Colour', 'value' => 'Red'],
                ],
            ]],
            null,
            'delivery',
            $token,
        );

        // Size variant price (£40) should override base (£10) and Colour (£15)
        $this->assertSame(40.00, $result['items'][0]['unit_price']);
        $this->assertSame('£40.00', $result['items'][0]['product_price']);
    }

    public function test_first_variant_with_price_used_when_no_size(): void
    {
        $product = Product::factory()->withVariants([
            ['option' => 'Material', 'value' => 'Steel', 'price' => '£75.00', 'stock' => null],
            ['option' => 'Colour', 'value' => 'Chrome', 'price' => null, 'stock' => null],
        ])->create(['price' => '£50.00']);

        $token = $this->issueShippingQuote();

        $result = app(CheckoutCalculator::class)->calculate(
            [[
                'product_id' => $product->id,
                'quantity' => 1,
                'selected_variants' => [
                    'Material' => ['option' => 'Material', 'value' => 'Steel'],
                    'Colour' => ['option' => 'Colour', 'value' => 'Chrome'],
                ],
            ]],
            null,
            'delivery',
            $token,
        );

        $this->assertSame(75.00, $result['items'][0]['unit_price']);
    }

    public function test_falls_back_to_base_price_when_no_variant_has_price(): void
    {
        $product = Product::factory()->withVariants([
            ['option' => 'Colour', 'value' => 'Blue', 'price' => null, 'stock' => null],
        ])->create(['price' => '£30.00']);

        $token = $this->issueShippingQuote();

        $result = app(CheckoutCalculator::class)->calculate(
            [[
                'product_id' => $product->id,
                'quantity' => 1,
                'selected_variants' => [
                    'Colour' => ['option' => 'Colour', 'value' => 'Blue'],
                ],
            ]],
            null,
            'delivery',
            $token,
        );

        $this->assertSame(30.00, $result['items'][0]['unit_price']);
    }

    public function test_rejects_missing_required_variant_selection(): void
    {
        $product = Product::factory()->withVariants([
            ['option' => 'Size', 'value' => 'Small', 'price' => '£20.00', 'stock' => null],
            ['option' => 'Size', 'value' => 'Large', 'price' => '£30.00', 'stock' => null],
        ])->create(['price' => '£10.00']);

        $this->expectException(ValidationException::class);

        $token = $this->issueShippingQuote();
        app(CheckoutCalculator::class)->calculate(
            [[
                'product_id' => $product->id,
                'quantity' => 1,
                'selected_variants' => [], // Missing Size selection
            ]],
            null,
            'delivery',
            $token,
        );
    }

    // ─── Combination mode variants ────────────────────────────────────

    public function test_combination_mode_variant_pricing(): void
    {
        $product = Product::factory()->combination(
            ['Material', 'Size'],
            [
                ['attributes' => ['Material' => 'Steel', 'Size' => 'Small'], 'price' => '£100.00', 'stock' => null],
                ['attributes' => ['Material' => 'Steel', 'Size' => 'Large'], 'price' => '£150.00', 'stock' => null],
                ['attributes' => ['Material' => 'Aluminium', 'Size' => 'Small'], 'price' => '£80.00', 'stock' => null],
            ],
        )->create(['price' => '£50.00']);

        $token = $this->issueShippingQuote();

        $result = app(CheckoutCalculator::class)->calculate(
            [[
                'product_id' => $product->id,
                'quantity' => 1,
                'selected_variants' => [
                    'Material' => ['option' => 'Material', 'value' => 'Steel'],
                    'Size' => ['option' => 'Size', 'value' => 'Large'],
                ],
            ]],
            null,
            'delivery',
            $token,
        );

        $this->assertSame(150.00, $result['items'][0]['unit_price']);
    }

    // ─── VAT calculation ──────────────────────────────────────────────

    public function test_total_stays_vat_inclusive(): void
    {
        $product = Product::factory()->create(['price' => '£100.00']);
        $token = $this->issueShippingQuote(['rate' => 10.00]);

        $result = app(CheckoutCalculator::class)->calculate(
            [['product_id' => $product->id, 'quantity' => 1]],
            null,
            'delivery',
            $token,
        );

        $this->assertSame(100.00, $result['subtotal']);
        $this->assertSame(10.00, $result['shipping']);
        $this->assertSame(18.33, $result['tax_amount']);
        $this->assertSame(110.00, $result['total']);
    }

    public function test_discounted_total_derives_inclusive_vat_amount(): void
    {
        Coupon::create([
            'code' => 'SAVE10',
            'type' => 'fixed',
            'value' => 10,
            'min_order_amount' => 0,
            'active' => true,
        ]);

        $product = Product::factory()->create(['price' => '£100.00']);
        $token = $this->issueShippingQuote(['rate' => 10.00]);

        $result = app(CheckoutCalculator::class)->calculate(
            [['product_id' => $product->id, 'quantity' => 1]],
            'SAVE10',
            'delivery',
            $token,
        );

        $this->assertSame(100.00, $result['total']);
        $this->assertSame(16.67, $result['tax_amount']);
    }

    // ─── Shipping quote expiry ────────────────────────────────────────

    public function test_rejects_expired_shipping_quote(): void
    {
        $product = Product::factory()->create(['price' => '£50.00']);

        $this->expectException(ValidationException::class);

        // Use a non-existent token to simulate expiry
        app(CheckoutCalculator::class)->calculate(
            [['product_id' => $product->id, 'quantity' => 1]],
            null,
            'delivery',
            'expired-token-that-does-not-exist',
        );
    }

    public function test_delivery_requires_shipping_token(): void
    {
        $product = Product::factory()->create(['price' => '£50.00']);

        $this->expectException(ValidationException::class);

        app(CheckoutCalculator::class)->calculate(
            [['product_id' => $product->id, 'quantity' => 1]],
            null,
            'delivery',
            null,
        );
    }

    // ─── Multi-item orders ────────────────────────────────────────────

    public function test_multiple_products_sum_correctly(): void
    {
        $productA = Product::factory()->create(['price' => '£50.00']);
        $productB = Product::factory()->create(['price' => '£30.00']);
        $token = $this->issueShippingQuote(['rate' => 8.99]);

        $result = app(CheckoutCalculator::class)->calculate(
            [
                ['product_id' => $productA->id, 'quantity' => 2],
                ['product_id' => $productB->id, 'quantity' => 3],
            ],
            null,
            'delivery',
            $token,
        );

        // (50×2) + (30×3) = 100 + 90 = 190
        $this->assertSame(190.00, $result['subtotal']);
        $this->assertSame(8.99, $result['shipping']);
        $this->assertSame(198.99, $result['total']);
        $this->assertCount(2, $result['items']);
    }
}
