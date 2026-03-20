<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Fix existing duplicates before adding the unique constraint
        $duplicates = \Illuminate\Support\Facades\DB::table('orders')
            ->select('order_number')
            ->groupBy('order_number')
            ->havingRaw('COUNT(id) > 1')
            ->pluck('order_number');

        foreach ($duplicates as $orderNumber) {
            $orders = \Illuminate\Support\Facades\DB::table('orders')
                ->where('order_number', $orderNumber)
                ->orderBy('created_at')
                ->get();

            // Skip the first one, update the rest
            foreach ($orders->skip(1) as $order) {
                \Illuminate\Support\Facades\DB::table('orders')
                    ->where('id', $order->id)
                    ->update(['order_number' => $orderNumber . '-' . $order->id]);
            }
        }

        try {
            Schema::table('orders', function (Blueprint $table) {
                $table->unique('order_number');
            });
        } catch (\Exception $e) {
            // Index likely already exists
        }
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique(['order_number']);
        });
    }
};
