<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('shipping_address_line1')->nullable()->after('shipping_address');
            $table->string('shipping_address_line2')->nullable()->after('shipping_address_line1');
            $table->string('shipping_city')->nullable()->after('shipping_address_line2');
            $table->string('shipping_postcode')->nullable()->after('shipping_city');
            $table->string('shipping_country')->nullable()->after('shipping_postcode');

            $table->string('billing_address_line1')->nullable()->after('billing_address');
            $table->string('billing_address_line2')->nullable()->after('billing_address_line1');
            $table->string('billing_city')->nullable()->after('billing_address_line2');
            $table->string('billing_postcode')->nullable()->after('billing_city');
            $table->string('billing_country')->nullable()->after('billing_postcode');

            $table->string('shipping_provider')->nullable()->after('tracking_number');
            $table->string('shipping_carrier')->nullable()->after('shipping_provider');
            $table->string('shipping_service')->nullable()->after('shipping_carrier');
            $table->string('shipping_status')->nullable()->after('shipping_service');
            $table->string('shipping_shipment_id')->nullable()->after('shipping_status');
            $table->string('shipping_label_url')->nullable()->after('shipping_shipment_id');
            $table->string('shipping_tracking_url')->nullable()->after('shipping_label_url');
            $table->json('shipping_metadata')->nullable()->after('shipping_tracking_url');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'shipping_address_line1',
                'shipping_address_line2',
                'shipping_city',
                'shipping_postcode',
                'shipping_country',
                'billing_address_line1',
                'billing_address_line2',
                'billing_city',
                'billing_postcode',
                'billing_country',
                'shipping_provider',
                'shipping_carrier',
                'shipping_service',
                'shipping_status',
                'shipping_shipment_id',
                'shipping_label_url',
                'shipping_tracking_url',
                'shipping_metadata',
            ]);
        });
    }
};
