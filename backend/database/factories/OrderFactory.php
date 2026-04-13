<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    protected $model = Order::class;

    public function definition(): array
    {
        $subtotal = fake()->randomFloat(2, 20, 2000);
        $shipping = fake()->randomFloat(2, 0, 30);
        $total = round($subtotal + $shipping, 2);

        return [
            'order_number' => 'ORD-'.strtoupper(Str::random(8)),
            'customer_name' => fake()->name(),
            'customer_email' => fake()->safeEmail(),
            'customer_phone' => fake()->phoneNumber(),
            'shipping_address' => fake()->address(),
            'shipping_address_line1' => fake()->streetAddress(),
            'shipping_city' => fake()->city(),
            'shipping_postcode' => fake()->postcode(),
            'shipping_country' => 'United Kingdom',
            'billing_address' => fake()->address(),
            'billing_address_line1' => fake()->streetAddress(),
            'billing_city' => fake()->city(),
            'billing_postcode' => fake()->postcode(),
            'billing_country' => 'United Kingdom',
            'status' => 'pending',
            'subtotal' => $subtotal,
            'shipping' => $shipping,
            'total' => $total,
            'discount_amount' => 0,
            'tax_amount' => 0,
            'payment_method' => 'bank_transfer',
            'payment_status' => 'pending',
        ];
    }

    public function paid(): static
    {
        return $this->state(fn (array $attributes) => [
            'payment_status' => 'paid',
            'payment_method' => 'stripe',
            'stripe_payment_intent_id' => 'pi_'.fake()->bothify('????????????????????????'),
        ]);
    }

    public function processing(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'processing',
        ]);
    }

    public function shipped(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'shipped',
            'tracking_number' => fake()->bothify('??########'),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'cancelled',
        ]);
    }

    public function forCustomer(Customer $customer): static
    {
        return $this->state(fn (array $attributes) => [
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'customer_email' => $customer->email,
            'customer_phone' => $customer->phone,
        ]);
    }

    public function withFreightShipping(float $freightRate = 150.00): static
    {
        return $this->state(function (array $attributes) use ($freightRate) {
            $subtotal = (float) ($attributes['subtotal'] ?? 100);
            $total = round($subtotal + $freightRate, 2);

            return [
                'shipping' => $freightRate,
                'total' => $total,
                'shipping_metadata' => [
                    'fulfilment_method' => 'delivery',
                    'selected_delivery_option' => [
                        'service' => 'Freight – Pallet Delivery',
                        'carrier' => 'freight',
                        'rate' => $freightRate,
                    ],
                ],
            ];
        });
    }

    public function clickAndCollect(): static
    {
        return $this->state(function (array $attributes) {
            $subtotal = (float) ($attributes['subtotal'] ?? 100);

            return [
                'shipping' => 0,
                'total' => $subtotal,
                'shipping_metadata' => [
                    'fulfilment_method' => 'click_collect',
                ],
            ];
        });
    }
}
