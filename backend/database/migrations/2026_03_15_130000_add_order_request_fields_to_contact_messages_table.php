<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contact_messages', function (Blueprint $table) {
            $table->foreignId('order_id')->nullable()->after('phone')->constrained()->nullOnDelete();
            $table->string('message_type')->default('contact')->after('subject');
            $table->string('request_type')->nullable()->after('message_type');
            $table->string('reason')->nullable()->after('request_type');
            $table->text('details')->nullable()->after('reason');
        });
    }

    public function down(): void
    {
        Schema::table('contact_messages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('order_id');
            $table->dropColumn(['message_type', 'request_type', 'reason', 'details']);
        });
    }
};
