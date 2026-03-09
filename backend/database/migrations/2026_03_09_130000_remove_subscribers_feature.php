<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('site_settings')
            ->whereIn('key', [
                'footer_newsletter_title',
                'footer_newsletter_desc',
                'footer_label_newsletter',
            ])
            ->delete();

        Schema::dropIfExists('subscribers');
    }

    public function down(): void
    {
        Schema::create('subscribers', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->timestamps();
        });

        DB::table('site_settings')->insert([
            [
                'key' => 'footer_newsletter_title',
                'value' => 'Newsletter',
                'type' => 'text',
                'group' => 'general',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'footer_newsletter_desc',
                'value' => 'Get the latest updates and offers from Midia M Metal.',
                'type' => 'textarea',
                'group' => 'general',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'footer_label_newsletter',
                'value' => 'Newsletter',
                'type' => 'text',
                'group' => 'general',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
};
