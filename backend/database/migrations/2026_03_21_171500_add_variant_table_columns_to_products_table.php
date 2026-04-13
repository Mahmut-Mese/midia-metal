<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('products', 'variant_table_columns')) {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            $table->json('variant_table_columns')->nullable()->after('variants');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('products', 'variant_table_columns')) {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('variant_table_columns');
        });
    }
};
