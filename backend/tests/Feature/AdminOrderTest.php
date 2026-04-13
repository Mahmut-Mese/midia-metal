<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminOrderTest extends TestCase
{
    use RefreshDatabase;

    private function authenticatedAdmin(): AdminUser
    {
        $admin = AdminUser::factory()->create();
        $this->actingAs($admin, 'sanctum');

        return $admin;
    }

    // ─── Order listing ────────────────────────────────────────────────

    public function test_admin_can_list_orders(): void
    {
        $this->authenticatedAdmin();
        $orders = Order::factory()->count(5)->create();

        $response = $this->getJson('/api/admin/orders');

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                '*' => ['id', 'order_number', 'customer_name', 'status', 'total'],
            ],
        ]);
        $this->assertSame(5, $response->json('total'));
    }

    public function test_admin_can_search_orders_by_name(): void
    {
        $this->authenticatedAdmin();
        Order::factory()->create(['customer_name' => 'Alice Smith']);
        Order::factory()->create(['customer_name' => 'Bob Jones']);

        $response = $this->getJson('/api/admin/orders?search=Alice');

        $response->assertOk();
        $this->assertSame(1, $response->json('total'));
        $this->assertSame('Alice Smith', $response->json('data.0.customer_name'));
    }

    public function test_admin_can_filter_orders_by_status(): void
    {
        $this->authenticatedAdmin();
        Order::factory()->count(3)->create(['status' => 'pending']);
        Order::factory()->count(2)->create(['status' => 'shipped']);

        $response = $this->getJson('/api/admin/orders?status=shipped');

        $response->assertOk();
        $this->assertSame(2, $response->json('total'));
    }

    // ─── Order view ───────────────────────────────────────────────────

    public function test_admin_can_view_single_order(): void
    {
        $this->authenticatedAdmin();
        $order = Order::factory()->create();
        $product = Product::factory()->create(['price' => '£50.00']);
        OrderItem::factory()->forProduct($product)->create([
            'order_id' => $order->id,
            'quantity' => 2,
        ]);

        $response = $this->getJson("/api/admin/orders/{$order->id}");

        $response->assertOk();
        $response->assertJsonPath('order_number', $order->order_number);
        $this->assertCount(1, $response->json('items'));
    }

    // ─── Order update ─────────────────────────────────────────────────

    public function test_admin_can_update_order_status(): void
    {
        $this->authenticatedAdmin();
        $order = Order::factory()->create(['status' => 'pending']);

        $response = $this->putJson("/api/admin/orders/{$order->id}", [
            'status' => 'processing',
        ]);

        $response->assertOk();
        $this->assertSame('processing', $order->fresh()->status);
    }

    public function test_admin_can_update_payment_status(): void
    {
        $this->authenticatedAdmin();
        $order = Order::factory()->create(['payment_status' => 'pending']);

        $response = $this->putJson("/api/admin/orders/{$order->id}", [
            'payment_status' => 'paid',
        ]);

        $response->assertOk();
        $this->assertSame('paid', $order->fresh()->payment_status);
    }

    public function test_admin_can_set_partially_refunded_status(): void
    {
        $this->authenticatedAdmin();
        $order = Order::factory()->paid()->create();

        $response = $this->putJson("/api/admin/orders/{$order->id}", [
            'payment_status' => 'partially_refunded',
        ]);

        $response->assertOk();
        $this->assertSame('partially_refunded', $order->fresh()->payment_status);
    }

    public function test_admin_cannot_set_invalid_status(): void
    {
        $this->authenticatedAdmin();
        $order = Order::factory()->create();

        $response = $this->putJson("/api/admin/orders/{$order->id}", [
            'status' => 'invalid_status',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['status']);
    }

    public function test_admin_cannot_set_invalid_payment_status(): void
    {
        $this->authenticatedAdmin();
        $order = Order::factory()->create();

        $response = $this->putJson("/api/admin/orders/{$order->id}", [
            'payment_status' => 'bitcoin_received',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['payment_status']);
    }

    public function test_admin_can_add_tracking_number(): void
    {
        $this->authenticatedAdmin();
        $order = Order::factory()->create();

        $response = $this->putJson("/api/admin/orders/{$order->id}", [
            'tracking_number' => 'RM123456789GB',
        ]);

        $response->assertOk();
        $this->assertSame('RM123456789GB', $order->fresh()->tracking_number);
    }

    public function test_admin_can_add_notes(): void
    {
        $this->authenticatedAdmin();
        $order = Order::factory()->create();

        $response = $this->putJson("/api/admin/orders/{$order->id}", [
            'notes' => 'Customer requested gift wrapping',
        ]);

        $response->assertOk();
        $this->assertSame('Customer requested gift wrapping', $order->fresh()->notes);
    }

    // ─── Order deletion ───────────────────────────────────────────────

    public function test_admin_can_delete_order(): void
    {
        $this->authenticatedAdmin();
        $order = Order::factory()->create();

        $response = $this->deleteJson("/api/admin/orders/{$order->id}");

        $response->assertOk();
        $this->assertDatabaseMissing('orders', ['id' => $order->id]);
    }

    // ─── Auth guard ───────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access_orders(): void
    {
        $response = $this->getJson('/api/admin/orders');

        $response->assertStatus(401);
    }
}
