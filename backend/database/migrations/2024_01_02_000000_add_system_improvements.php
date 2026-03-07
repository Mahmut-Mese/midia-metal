<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Quote Requests
        Schema::create('quote_requests', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->string('service')->nullable();
            $table->text('description');
            $table->json('files')->nullable(); // array of uploaded file URLs
            $table->string('status')->default('new'); // new, reviewing, replied
            $table->text('admin_notes')->nullable();
            $table->timestamps();
        });

        // Coupons
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('type')->default('percentage'); // percentage, fixed
            $table->decimal('value', 10, 2);
            $table->decimal('min_order_amount', 10, 2)->default(0);
            $table->integer('max_uses')->nullable(); // null = unlimited
            $table->integer('used_count')->default(0);
            $table->timestamp('expires_at')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        // Add stock columns to products
        Schema::table('products', function (Blueprint $table) {
            $table->integer('stock_quantity')->default(0)->after('order');
            $table->boolean('track_stock')->default(false)->after('stock_quantity');
        });

        // Add tracking_number to orders
        Schema::table('orders', function (Blueprint $table) {
            $table->string('tracking_number')->nullable()->after('payment_status');
            $table->string('coupon_code')->nullable()->after('tracking_number');
            $table->decimal('discount_amount', 10, 2)->default(0)->after('coupon_code');
            $table->decimal('tax_amount', 10, 2)->default(0)->after('discount_amount');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quote_requests');
        Schema::dropIfExists('coupons');

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['stock_quantity', 'track_stock']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['tracking_number', 'coupon_code', 'discount_amount', 'tax_amount']);
        });
    }
};
