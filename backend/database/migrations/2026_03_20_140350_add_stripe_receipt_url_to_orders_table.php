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
        $afterColumn = null;

        if (Schema::getConnection()->getDriverName() !== 'sqlite') {
            $afterColumn = Schema::hasColumn('orders', 'stripe_payment_method_id')
                ? 'stripe_payment_method_id'
                : (Schema::hasColumn('orders', 'stripe_payment_intent_id') ? 'stripe_payment_intent_id' : null);
        }

        Schema::table('orders', function (Blueprint $table) use ($afterColumn) {
            $column = $table->string('stripe_receipt_url')->nullable();

            if ($afterColumn !== null) {
                $column->after($afterColumn);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('stripe_receipt_url');
        });
    }
};
