<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrderItem>
 */
class OrderItemFactory extends Factory
{
    protected $model = OrderItem::class;

    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'product_id' => Product::factory(),
            'product_name' => fake()->words(3, true),
            'product_price' => '£'.number_format(fake()->randomFloat(2, 10, 500), 2, '.', ''),
            'quantity' => fake()->numberBetween(1, 5),
        ];
    }

    public function forProduct(Product $product): static
    {
        return $this->state(fn (array $attributes) => [
            'product_id' => $product->id,
            'product_name' => $product->name,
            'product_price' => $product->price,
        ]);
    }

    public function withVariants(array $variantDetails): static
    {
        return $this->state(fn (array $attributes) => [
            'variant_details' => $variantDetails,
        ]);
    }
}
