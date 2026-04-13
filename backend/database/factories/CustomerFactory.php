<?php

namespace Database\Factories;

use App\Models\Customer;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<Customer>
 */
class CustomerFactory extends Factory
{
    protected $model = Customer::class;

    protected static ?string $password;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('password'),
            'phone' => fake()->phoneNumber(),
            'address' => fake()->streetAddress(),
            'city' => fake()->city(),
            'postcode' => fake()->postcode(),
            'country' => 'United Kingdom',
            'is_business' => false,
        ];
    }

    public function business(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_business' => true,
            'company_name' => fake()->company(),
            'company_vat_number' => 'GB'.fake()->numerify('#########'),
        ]);
    }

    public function withStripe(): static
    {
        return $this->state(fn (array $attributes) => [
            'stripe_customer_id' => 'cus_'.fake()->bothify('??????????????'),
        ]);
    }
}
