<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('interparcel_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->unique()->constrained()->restrictOnDelete();
            $table->uuid('idempotency_key')->unique();
            $table->longText('request');
            $table->json('shipments')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interparcel_bookings');
    }
};
