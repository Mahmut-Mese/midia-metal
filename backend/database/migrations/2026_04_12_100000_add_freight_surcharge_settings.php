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
                'key'   => 'freight_surcharge_highlands',
                'value' => '7.00',
                'type'  => 'number',
                'group' => 'shipping-freight',
            ],
            [
                'key'   => 'freight_surcharge_ni',
                'value' => '4.50',
                'type'  => 'number',
                'group' => 'shipping-freight',
            ],
            [
                'key'   => 'freight_surcharge_scotland',
                'value' => '2.00',
                'type'  => 'number',
                'group' => 'shipping-freight',
            ],
            [
                'key'   => 'freight_surcharge_london',
                'value' => '0.00',
                'type'  => 'number',
                'group' => 'shipping-freight',
            ],
            [
                'key'   => 'freight_surcharge_default',
                'value' => '1.00',
                'type'  => 'number',
                'group' => 'shipping-freight',
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
                'freight_surcharge_highlands',
                'freight_surcharge_ni',
                'freight_surcharge_scotland',
                'freight_surcharge_london',
                'freight_surcharge_default',
            ])
            ->delete();
    }
};
