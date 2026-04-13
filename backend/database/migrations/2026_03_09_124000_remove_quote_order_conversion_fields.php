<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('quote_requests')
            ->where('status', 'converted')
            ->update(['status' => 'replied']);

        Schema::table('quote_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('order_id');
        });
    }

    public function down(): void
    {
        Schema::table('quote_requests', function (Blueprint $table) {
            $table->foreignId('order_id')->nullable()->after('customer_id')->constrained('orders')->nullOnDelete();
        });
    }
};
