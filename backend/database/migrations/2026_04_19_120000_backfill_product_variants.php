<?php

use App\Models\Product;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Product::query()->chunkById(100, function ($products): void {
            foreach ($products as $product) {
                $variants = is_array($product->variants) ? $product->variants : [];

                if (count($variants) === 0) {
                    $product->variants = [[
                        'attributes' => [],
                        'price' => $product->price,
                        'stock' => $product->stock_quantity,
                        'shipping_weight_kg' => $product->shipping_weight_kg,
                        'shipping_length_cm' => $product->shipping_length_cm,
                        'shipping_width_cm' => $product->shipping_width_cm,
                        'shipping_height_cm' => $product->shipping_height_cm,
                        'shipping_class' => $product->shipping_class,
                        'ships_separately' => (bool) $product->ships_separately,
                        'custom_fields' => null,
                    ]];
                    $product->variant_mode = 'combination';
                    $product->variant_options = [];
                    $product->save();

                    continue;
                }

                $hasCombinationVariant = collect($variants)->contains(function ($variant) {
                    return is_array($variant) && is_array($variant['attributes'] ?? null);
                });

                if ($hasCombinationVariant) {
                    continue;
                }

                $optionNames = collect($variants)
                    ->map(fn ($variant) => is_array($variant) ? trim((string) ($variant['option'] ?? '')) : '')
                    ->filter()
                    ->unique()
                    ->values()
                    ->all();

                $product->variants = collect($variants)
                    ->filter(fn ($variant) => is_array($variant))
                    ->map(function (array $variant) {
                        $option = trim((string) ($variant['option'] ?? ''));
                        $value = trim((string) ($variant['value'] ?? ''));

                        return [
                            'attributes' => $option !== '' && $value !== '' ? [$option => $value] : [],
                            'price' => $variant['price'] ?? null,
                            'stock' => $variant['stock'] ?? null,
                            'shipping_weight_kg' => $variant['shipping_weight_kg'] ?? null,
                            'shipping_length_cm' => $variant['shipping_length_cm'] ?? null,
                            'shipping_width_cm' => $variant['shipping_width_cm'] ?? null,
                            'shipping_height_cm' => $variant['shipping_height_cm'] ?? null,
                            'shipping_class' => $variant['shipping_class'] ?? null,
                            'ships_separately' => (bool) ($variant['ships_separately'] ?? false),
                            'custom_fields' => $variant['custom_fields'] ?? null,
                        ];
                    })
                    ->values()
                    ->all();
                $product->variant_mode = 'combination';
                $product->variant_options = $optionNames;
                $product->save();
            }
        });
    }

    public function down(): void {}
};
