<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Shipping\ShippingQuoteStore;
use App\Support\CheckoutCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckoutVariantPricingTest extends TestCase
{
    use RefreshDatabase;

    public function test_checkout_uses_selected_size_variant_price_for_legacy_products(): void
    {
        $product = Product::create([
            'name' => 'Legacy Variant Product',
            'slug' => 'legacy-variant-product',
            'price' => '£10.00',
            'image' => 'https://example.com/product.jpg',
            'active' => true,
            'featured' => false,
            'shipping_class' => 'standard',
            'shipping_weight_kg' => 2,
            'shipping_length_cm' => 30,
            'shipping_width_cm' => 20,
            'shipping_height_cm' => 10,
            'variants' => [
                [
                    'option' => 'Size',
                    'value' => 'Large',
                    'price' => '£25.00',
                    'stock' => null,
                ],
                [
                    'option' => 'Colour',
                    'value' => 'Blue',
                    'price' => '£12.00',
                    'stock' => null,
                ],
            ],
        ]);

        $quote = app(ShippingQuoteStore::class)->issue([
            'rate' => 6.50,
            'service' => 'Royal Mail Tracked 48',
        ]);

        $totals = app(CheckoutCalculator::class)->calculate(
            [[
                'product_id' => $product->id,
                'quantity' => 1,
                'selected_variants' => [
                    'Size' => ['option' => 'Size', 'value' => 'Large'],
                    'Colour' => ['option' => 'Colour', 'value' => 'Blue'],
                ],
            ]],
            null,
            'delivery',
            $quote['quote_token'],
        );

        $this->assertSame('£25.00', $totals['items'][0]['product_price']);
        $this->assertSame(25.00, $totals['items'][0]['unit_price']);
    }
}
