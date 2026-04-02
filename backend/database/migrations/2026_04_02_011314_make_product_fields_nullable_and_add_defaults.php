<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('image')->nullable()->default(null)->change();
            $table->string('old_price')->nullable()->default(null)->change();
            $table->string('badge')->nullable()->default(null)->change();
            $table->text('description')->nullable()->default(null)->change();
            $table->integer('stock_quantity')->nullable()->default(0)->change();
            $table->boolean('track_stock')->default(false)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            //
        });
    }
};
