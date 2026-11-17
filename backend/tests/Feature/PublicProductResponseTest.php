<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductReview;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicProductResponseTest extends TestCase
{
    use RefreshDatabase;

    public function test_latest_products_are_sorted_before_pagination_with_filters_preserved(): void
    {
        $category = ProductCategory::factory()->create(['slug' => 'fans']);
        $newer = Product::factory()->withCategory($category)->create([
            'name' => 'Fan newer', 'created_at' => '2026-01-20 12:00:00', 'order' => 500,
        ]);
        $older = Product::factory()->withCategory($category)->create([
            'name' => 'Fan older', 'created_at' => '2026-01-01 12:00:00', 'order' => 0,
        ]);
        $newest = Product::factory()->withCategory($category)->create([
            'name' => 'Fan newest', 'created_at' => '2026-01-20 12:00:00', 'order' => 999,
        ]);
        Product::factory()->withCategory($category)->inactive()->create([
            'name' => 'Fan draft', 'created_at' => '2026-01-21 12:00:00',
        ]);
        Product::factory()->withCategory()->create([
            'name' => 'Fan other category', 'created_at' => '2026-01-21 12:00:00',
        ]);
        Product::factory()->withCategory($category)->create([
            'name' => 'Unrelated item', 'created_at' => '2026-01-21 12:00:00',
        ]);

        $path = '/api/v1/products?category=fans&search=Fan';
        $latest = $this->getJson($path.'&sort=latest&per_page=2')->assertOk()->assertJsonPath('total', 3);
        $this->assertSame([$newest->id, $newer->id], array_column($latest->json('data'), 'id'));
        $this->getJson($path.'&sort=latest&per_page=2&page=2')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $older->id);

        // Consumers that request no sort retain the curated catalogue order.
        $manual = $this->getJson($path.'&per_page=10')->assertOk();
        $this->assertSame([$older->id, $newer->id, $newest->id], array_column($manual->json('data'), 'id'));
    }

    public function test_catalog_rejects_unsupported_sort_values(): void
    {
        $this->getJson('/api/v1/products?sort=unsupported')->assertUnprocessable()->assertJsonValidationErrors('sort');
    }

    public function test_public_review_only_exposes_the_customer_display_identity(): void
    {
        $product = Product::create(['name' => 'Fan', 'slug' => 'fan', 'price' => '£10.00', 'active' => true]);
        $customer = Customer::create(['name' => 'Reviewer', 'email' => 'private@example.test', 'password' => 'secret-password',
            'phone' => '07000000000', 'address' => 'Private address', 'stripe_customer_id' => 'cus_private']);
        ProductReview::create(['product_id' => $product->id, 'customer_id' => $customer->id, 'rating' => 5, 'comment' => 'Useful']);

        $response = $this->getJson('/api/v1/products/fan')->assertOk();
        $this->assertSame(['id' => $customer->id, 'name' => 'Reviewer'], $response->json('reviews.0.customer'));
        foreach (['private@example.test', 'Private address', '07000000000', 'cus_private'] as $private) {
            $this->assertStringNotContainsString($private, $response->getContent());
        }
    }

    public function test_catalog_responses_keep_purchase_fields_without_full_editor_content(): void
    {
        $product = Product::create(['name' => 'Fan', 'slug' => 'fan', 'price' => '£10.00', 'active' => true, 'featured' => true,
            'description' => '<p>Detailed content</p>', 'gallery' => ['/large.jpg'],
            'variants' => [['option' => 'Size', 'value' => '7', 'price' => '£12.00']]]);
        $other = Product::create(['name' => 'Other', 'slug' => 'other', 'price' => '£10.00', 'active' => true]);
        foreach (['/api/v1/products' => 'data.0', '/api/v1/products/featured' => '0', '/api/v1/products/'.$other->id.'/related' => '0'] as $path => $key) {
            $item = $this->getJson($path)->assertOk()->json($key);
            $this->assertSame($product->id, $item['id']);
            $this->assertArrayNotHasKey('description', $item);
            $this->assertArrayNotHasKey('gallery', $item);
            $this->assertSame('£12.00', $item['variants'][0]['price']);
        }
        $this->getJson('/api/v1/products/fan')->assertOk()->assertJsonPath('description', '<p>Detailed content</p>')->assertJsonPath('gallery.0', '/large.jpg');
    }

    public function test_api_authentication_returns_json_even_for_browser_html_requests(): void
    {
        foreach (['/api/admin/products', '/api/admin/orders', '/api/v1/customer/me', '/api/v1/customer/orders'] as $path) {
            $this->get($path, ['Accept' => 'text/html'])->assertUnauthorized()->assertJsonPath('message', 'Unauthenticated.');
        }
    }
}
