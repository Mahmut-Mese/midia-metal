<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quote_requests', function (Blueprint $table) {
            $table->foreignId('order_id')->nullable()->after('customer_id')->constrained('orders')->nullOnDelete();
        });

        DB::table('quote_requests')
            ->where('status', 'approved')
            ->update(['status' => 'replied']);
    }

    public function down(): void
    {
        Schema::table('quote_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('order_id');
        });
    }
};
