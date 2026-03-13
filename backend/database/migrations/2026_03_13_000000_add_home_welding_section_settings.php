<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();
        $settings = [
            [
                'key' => 'home_welding_label',
                'value' => 'Metal welding services',
                'type' => 'text',
                'group' => 'home',
            ],
            [
                'key' => 'home_welding_title',
                'value' => 'Metal welding & bespoke fabrication',
                'type' => 'text',
                'group' => 'home',
            ],
            [
                'key' => 'home_welding_desc',
                'value' => 'Custom stainless steel builds, repair work, on-site modifications, and workshop welding for commercial kitchens, industrial spaces, and made-to-order metalwork.',
                'type' => 'textarea',
                'group' => 'home',
            ],
            [
                'key' => 'home_welding_primary_cta',
                'value' => 'Request Welding Quote',
                'type' => 'text',
                'group' => 'home',
            ],
            [
                'key' => 'home_welding_secondary_cta',
                'value' => 'View More',
                'type' => 'text',
                'group' => 'home',
            ],
            [
                'key' => 'home_welding_service_slug',
                'value' => 'custom-fabrication',
                'type' => 'text',
                'group' => 'home',
            ],
            [
                'key' => 'home_welding_image',
                'value' => '/images/welding.jpg',
                'type' => 'image',
                'group' => 'home',
            ],
            [
                'key' => 'home_welding_image_alt',
                'value' => 'Metal welding and fabrication work',
                'type' => 'text',
                'group' => 'home',
            ],
            [
                'key' => 'home_welding_secondary_image',
                'value' => '/images/workshop.jpg',
                'type' => 'image',
                'group' => 'home',
            ],
            [
                'key' => 'home_welding_secondary_image_alt',
                'value' => 'Workshop fabrication',
                'type' => 'text',
                'group' => 'home',
            ],
            [
                'key' => 'home_welding_card_label',
                'value' => 'Workshop + site support',
                'type' => 'text',
                'group' => 'home',
            ],
            [
                'key' => 'home_welding_card_title',
                'value' => 'From fabrication bench to final install',
                'type' => 'text',
                'group' => 'home',
            ],
            [
                'key' => 'home_welding_card_desc',
                'value' => 'Built for projects that need custom metalwork, fast adjustments, and practical welding support on the job.',
                'type' => 'textarea',
                'group' => 'home',
            ],
        ];

        foreach ($settings as $setting) {
            $exists = DB::table('site_settings')->where('key', $setting['key'])->exists();
            if ($exists) {
                continue;
            }

            DB::table('site_settings')->insert([
                ...$setting,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        DB::table('site_settings')
            ->whereIn('key', [
                'home_welding_label',
                'home_welding_title',
                'home_welding_desc',
                'home_welding_primary_cta',
                'home_welding_secondary_cta',
                'home_welding_service_slug',
                'home_welding_image',
                'home_welding_image_alt',
                'home_welding_secondary_image',
                'home_welding_secondary_image_alt',
                'home_welding_card_label',
                'home_welding_card_title',
                'home_welding_card_desc',
            ])
            ->delete();
    }
};

