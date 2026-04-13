<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductCategory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $name = fake()->unique()->words(3, true);

        return [
            'name' => ucwords($name),
            'slug' => Str::slug($name),
            'price' => '£'.number_format(fake()->randomFloat(2, 10, 2000), 2, '.', ''),
            'image' => 'https://example.com/product.jpg',
            'description' => fake()->paragraph(),
            'active' => true,
            'featured' => false,
            'shipping_class' => 'standard',
            'shipping_weight_kg' => fake()->randomFloat(2, 0.5, 15),
            'shipping_length_cm' => fake()->randomFloat(1, 10, 80),
            'shipping_width_cm' => fake()->randomFloat(1, 10, 60),
            'shipping_height_cm' => fake()->randomFloat(1, 5, 40),
            'ships_separately' => false,
            'track_stock' => false,
        ];
    }

    public function withCategory(?ProductCategory $category = null): static
    {
        return $this->state(fn (array $attributes) => [
            'product_category_id' => $category?->id ?? ProductCategory::factory(),
        ]);
    }

    public function freight(float $deliveryPrice = 150.00): static
    {
        return $this->state(fn (array $attributes) => [
            'shipping_class' => 'freight',
            'freight_delivery_price' => $deliveryPrice,
            'shipping_weight_kg' => fake()->randomFloat(2, 50, 200),
            'shipping_length_cm' => fake()->randomFloat(1, 100, 200),
            'shipping_width_cm' => fake()->randomFloat(1, 60, 120),
            'shipping_height_cm' => fake()->randomFloat(1, 50, 150),
        ]);
    }

    public function withVariants(array $variants): static
    {
        return $this->state(fn (array $attributes) => [
            'variants' => $variants,
        ]);
    }

    public function combination(array $options, array $variants): static
    {
        return $this->state(fn (array $attributes) => [
            'variant_mode' => 'combination',
            'variant_options' => $options,
            'variants' => $variants,
        ]);
    }

    public function tracked(int $stock = 10): static
    {
        return $this->state(fn (array $attributes) => [
            'track_stock' => true,
            'stock_quantity' => $stock,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'active' => false,
        ]);
    }

    public function featured(): static
    {
        return $this->state(fn (array $attributes) => [
            'featured' => true,
        ]);
    }
}
