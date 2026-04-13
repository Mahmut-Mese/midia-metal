<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quote_requests', function (Blueprint $table) {
            $table->decimal('quoted_amount', 10, 2)->nullable()->after('admin_notes');
            $table->text('response_message')->nullable()->after('quoted_amount');
            $table->date('quoted_valid_until')->nullable()->after('response_message');
        });
    }

    public function down(): void
    {
        Schema::table('quote_requests', function (Blueprint $table) {
            $table->dropColumn(['quoted_amount', 'response_message', 'quoted_valid_until']);
        });
    }
};
