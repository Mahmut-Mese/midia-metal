<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('shipping_weight_kg', 8, 3)->default(2)->after('track_stock');
            $table->decimal('shipping_length_cm', 8, 2)->default(30)->after('shipping_weight_kg');
            $table->decimal('shipping_width_cm', 8, 2)->default(20)->after('shipping_length_cm');
            $table->decimal('shipping_height_cm', 8, 2)->default(10)->after('shipping_width_cm');
            $table->string('shipping_class')->default('standard')->after('shipping_height_cm');
            $table->boolean('ships_separately')->default(false)->after('shipping_class');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'shipping_weight_kg',
                'shipping_length_cm',
                'shipping_width_cm',
                'shipping_height_cm',
                'shipping_class',
                'ships_separately',
            ]);
        });
    }
};
