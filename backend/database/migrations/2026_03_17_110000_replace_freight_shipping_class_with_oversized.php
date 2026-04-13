<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('products')
            ->where('shipping_class', 'freight')
            ->update(['shipping_class' => 'oversized']);

        $products = DB::table('products')
            ->select('id', 'variants')
            ->whereNotNull('variants')
            ->get();

        foreach ($products as $product) {
            $variants = json_decode((string) $product->variants, true);
            if (! is_array($variants)) {
                continue;
            }

            $changed = false;
            foreach ($variants as &$variant) {
                if (is_array($variant) && (($variant['shipping_class'] ?? null) === 'freight')) {
                    $variant['shipping_class'] = 'oversized';
                    $changed = true;
                }
            }
            unset($variant);

            if ($changed) {
                DB::table('products')
                    ->where('id', $product->id)
                    ->update(['variants' => json_encode($variants)]);
            }
        }
    }

    public function down(): void
    {
        // Irreversible on purpose. Previous freight values have been normalized to oversized.
    }
};
