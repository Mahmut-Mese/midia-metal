<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $updates = [
            'home_reward_title' => ['from' => 'Reward program', 'to' => 'Commercial-grade fabrication'],
            'home_reward_desc' => ['from' => 'Exclusive benefits for our repeat customers.', 'to' => 'Built for demanding kitchen and ventilation environments.'],
            'home_discount_title' => ['from' => 'Special discounts', 'to' => 'Fast quote turnaround'],
            'home_discount_desc' => ['from' => 'Seasonal offers on selected fabrication services.', 'to' => 'Clear commercial pricing and lead times for every enquiry.'],
            'home_shipping_title' => ['from' => 'Fast shipping', 'to' => 'UK-wide delivery'],
            'home_shipping_desc' => ['from' => 'Reliable delivery for all our standard products.', 'to' => 'Reliable dispatch for stocked products and fabricated components.'],
            'home_prices_title' => ['from' => 'Great Prices', 'to' => 'Installation support'],
            'home_prices_desc' => ['from' => 'Competitive pricing without compromising quality.', 'to' => 'Supply, fabrication, installation, and aftercare in one workflow.'],
            'home_trending_title' => ['from' => 'Trending items', 'to' => 'Best-selling products'],
            'home_comfort_title' => ['from' => 'Our products bring comfort to your home', 'to' => 'Built for commercial kitchens'],
            'home_comfort_desc' => ['from' => 'Quality fabrication that enhances your living and working environments.', 'to' => 'Stainless steel products and systems designed for hygiene, durability, and compliance.'],
        ];

        foreach ($updates as $key => $copy) {
            DB::table('site_settings')
                ->where('key', $key)
                ->where('value', $copy['from'])
                ->update(['value' => $copy['to']]);
        }
    }

    public function down(): void
    {
        // Intentionally left empty to avoid overwriting newer content.
    }
};
