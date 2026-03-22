<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'variant_mode')) {
                $table->string('variant_mode')->default('legacy')->after('show_variant_in_title');
            }

            if (!Schema::hasColumn('products', 'variant_options')) {
                $table->json('variant_options')->nullable()->after('variant_mode');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'variant_options')) {
                $table->dropColumn('variant_options');
            }

            if (Schema::hasColumn('products', 'variant_mode')) {
                $table->dropColumn('variant_mode');
            }
        });
    }
};
