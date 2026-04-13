<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quote_requests', function (Blueprint $table) {
            $table->dropColumn(['admin_notes', 'quoted_amount']);
        });
    }

    public function down(): void
    {
        Schema::table('quote_requests', function (Blueprint $table) {
            $table->text('admin_notes')->nullable()->after('status');
            $table->decimal('quoted_amount', 10, 2)->nullable()->after('admin_notes');
        });
    }
};
