<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add missing performance indexes on frequently queried columns.
     * See TECH-DEBT.md item 4.2.
     */
    public function up(): void
    {
        // orders: queried by status, payment_status, customer_email in admin list/filters
        Schema::table('orders', function (Blueprint $table) {
            $table->index('status');
            $table->index('payment_status');
            $table->index('customer_email');
        });

        // contact_messages: filtered by read, email, message_type in admin inbox
        Schema::table('contact_messages', function (Blueprint $table) {
            $table->index('email');
            $table->index('read');
            if (Schema::hasColumn('contact_messages', 'message_type')) {
                $table->index('message_type');
            }
        });

        // quote_requests: filtered by email, status in admin quotes list
        Schema::table('quote_requests', function (Blueprint $table) {
            $table->index('email');
            $table->index('status');
        });

        // blog_posts: filtered by published_at, active in public listing
        Schema::table('blog_posts', function (Blueprint $table) {
            $table->index('published_at');
            $table->index('active');
        });

        // audit_logs: queried by model_type + model_id together
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->index(['model_type', 'model_id'], 'audit_logs_model_type_model_id_index');
        });

        // product_reviews: enforce one review per customer per product
        Schema::table('product_reviews', function (Blueprint $table) {
            $table->unique(['product_id', 'customer_id'], 'product_reviews_product_customer_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['payment_status']);
            $table->dropIndex(['customer_email']);
        });

        Schema::table('contact_messages', function (Blueprint $table) {
            $table->dropIndex(['email']);
            $table->dropIndex(['read']);
            if (Schema::hasColumn('contact_messages', 'message_type')) {
                $table->dropIndex(['message_type']);
            }
        });

        Schema::table('quote_requests', function (Blueprint $table) {
            $table->dropIndex(['email']);
            $table->dropIndex(['status']);
        });

        Schema::table('blog_posts', function (Blueprint $table) {
            $table->dropIndex(['published_at']);
            $table->dropIndex(['active']);
        });

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex('audit_logs_model_type_model_id_index');
        });

        Schema::table('product_reviews', function (Blueprint $table) {
            $table->dropUnique('product_reviews_product_customer_unique');
        });
    }
};
