<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('billing_address')->nullable()->after('address');
            $table->string('billing_city')->nullable()->after('billing_address');
            $table->string('billing_postcode')->nullable()->after('billing_city');
            $table->string('billing_country')->default('United Kingdom')->after('billing_postcode');
            $table->string('shipping_address')->nullable()->after('billing_country');
            $table->string('shipping_city')->nullable()->after('shipping_address');
            $table->string('shipping_postcode')->nullable()->after('shipping_city');
            $table->string('shipping_country')->default('United Kingdom')->after('shipping_postcode');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn([
                'billing_address',
                'billing_city',
                'billing_postcode',
                'billing_country',
                'shipping_address',
                'shipping_city',
                'shipping_postcode',
                'shipping_country',
            ]);
        });
    }
};
