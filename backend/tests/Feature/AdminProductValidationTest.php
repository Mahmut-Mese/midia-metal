<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminProductValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_product_store_normalizes_valid_money_values(): void
    {
        $response = $this
            ->withoutMiddleware()
            ->postJson('/api/admin/products', [
                'name' => 'Validation Product',
                'price' => '£1234.50',
                'old_price' => '£1,499.99',
                'image' => 'https://example.com/product.jpg',
                'active' => true,
                'featured' => false,
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('price', '£1234.50')
            ->assertJsonPath('old_price', '£1499.99');

        $this->assertDatabaseHas('products', [
            'name' => 'Validation Product',
            'price' => '£1234.50',
            'old_price' => '£1499.99',
        ]);
    }

    public function test_admin_product_store_rejects_invalid_price_strings(): void
    {
        $response = $this
            ->withoutMiddleware()
            ->postJson('/api/admin/products', [
                'name' => 'Broken Price Product',
                'price' => 'abc',
                'image' => 'https://example.com/product.jpg',
                'active' => true,
                'featured' => false,
            ]);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors(['price']);

        $this->assertDatabaseCount('products', 0);
    }

    public function test_admin_product_store_rejects_invalid_old_price_strings(): void
    {
        $response = $this
            ->withoutMiddleware()
            ->postJson('/api/admin/products', [
                'name' => 'Broken Old Price Product',
                'price' => '£999.99',
                'old_price' => 'twelve hundred',
                'image' => 'https://example.com/product.jpg',
                'active' => true,
                'featured' => false,
            ]);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors(['old_price']);

        $this->assertNull(Product::first());
    }

    public function test_admin_product_store_rejects_combination_mode_without_attributes(): void
    {
        $response = $this
            ->withoutMiddleware()
            ->postJson('/api/admin/products', [
                'name' => 'Broken Combination Product',
                'price' => '£999.99',
                'image' => 'https://example.com/product.jpg',
                'variant_mode' => 'combination',
                'variant_options' => [],
                'variants' => [],
                'active' => true,
                'featured' => false,
            ]);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors(['variant_options']);
    }

    public function test_admin_product_store_rejects_combination_mode_without_complete_rows(): void
    {
        $response = $this
            ->withoutMiddleware()
            ->postJson('/api/admin/products', [
                'name' => 'Broken Combination Rows Product',
                'price' => '£999.99',
                'image' => 'https://example.com/product.jpg',
                'variant_mode' => 'combination',
                'variant_options' => ['Material'],
                'variants' => [],
                'active' => true,
                'featured' => false,
            ]);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors(['variants']);
    }

    public function test_admin_product_store_rejects_deprecated_shipping_classes(): void
    {
        $response = $this
            ->withoutMiddleware()
            ->postJson('/api/admin/products', [
                'name' => 'Deprecated Shipping Class Product',
                'price' => '£99.99',
                'image' => 'https://example.com/product.jpg',
                'shipping_class' => 'bulky',
                'active' => true,
                'featured' => false,
            ]);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors(['shipping_class']);
    }

    public function test_admin_product_store_rejects_deprecated_variant_shipping_classes(): void
    {
        $response = $this
            ->withoutMiddleware()
            ->postJson('/api/admin/products', [
                'name' => 'Deprecated Variant Shipping Class Product',
                'price' => '£99.99',
                'image' => 'https://example.com/product.jpg',
                'active' => true,
                'featured' => false,
                'variants' => [[
                    'option' => 'Size',
                    'value' => 'Large',
                    'price' => '£120.00',
                    'shipping_class' => 'oversized',
                ]],
            ]);

        $response->assertCreated();

        $this->assertDatabaseHas('products', [
            'name' => 'Deprecated Variant Shipping Class Product',
        ]);

        $product = Product::where('name', 'Deprecated Variant Shipping Class Product')->firstOrFail();
        $this->assertNull($product->variants[0]['shipping_class'] ?? null);
    }
}
