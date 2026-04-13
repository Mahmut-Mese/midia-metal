<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'frontend_variant_layout')) {
                $table->string('frontend_variant_layout')->default('default')->after('variant_options');
            }

            if (! Schema::hasColumn('products', 'selection_table_config')) {
                $table->json('selection_table_config')->nullable()->after('frontend_variant_layout');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'selection_table_config')) {
                $table->dropColumn('selection_table_config');
            }

            if (Schema::hasColumn('products', 'frontend_variant_layout')) {
                $table->dropColumn('frontend_variant_layout');
            }
        });
    }
};
