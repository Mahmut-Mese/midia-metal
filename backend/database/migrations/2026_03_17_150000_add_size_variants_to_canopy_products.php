<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private array $targetNames = [
        'Canopy',
        'Commercial Canopy Hood',
        'Stainless Extraction Canopy',
    ];

    private array $lengthVariants = [
        ['value' => '1800mm', 'scale' => 0.8, 'length_cm' => 180],
        ['value' => '2400mm', 'scale' => 1.0, 'length_cm' => 240],
        ['value' => '3000mm', 'scale' => 1.2, 'length_cm' => 300],
    ];

    public function up(): void
    {
        $products = DB::table('products')
            ->select([
                'id',
                'name',
                'price',
                'variants',
                'shipping_weight_kg',
                'shipping_width_cm',
                'shipping_height_cm',
                'shipping_class',
                'ships_separately',
            ])
            ->whereIn('name', $this->targetNames)
            ->get();

        foreach ($products as $product) {
            $existingVariants = json_decode((string) ($product->variants ?? ''), true);
            if (is_array($existingVariants) && count($existingVariants) > 0) {
                continue;
            }

            DB::table('products')
                ->where('id', $product->id)
                ->update([
                    'variants' => json_encode($this->buildVariants($product), JSON_UNESCAPED_SLASHES),
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        $products = DB::table('products')
            ->select(['id', 'name', 'variants'])
            ->whereIn('name', $this->targetNames)
            ->get();

        $allowedValues = collect($this->lengthVariants)->pluck('value')->all();

        foreach ($products as $product) {
            $variants = json_decode((string) ($product->variants ?? ''), true);
            if (!is_array($variants) || count($variants) !== count($this->lengthVariants)) {
                continue;
            }

            $matchesGeneratedTemplate = collect($variants)->every(function ($variant) use ($allowedValues) {
                return is_array($variant)
                    && ($variant['option'] ?? null) === 'Canopy Length'
                    && in_array($variant['value'] ?? null, $allowedValues, true);
            });

            if (!$matchesGeneratedTemplate) {
                continue;
            }

            DB::table('products')
                ->where('id', $product->id)
                ->update([
                    'variants' => null,
                    'updated_at' => now(),
                ]);
        }
    }

    private function buildVariants(object $product): array
    {
        $baseWeight = max(1.0, (float) ($product->shipping_weight_kg ?? 35));
        $baseWidth = max(1.0, (float) ($product->shipping_width_cm ?? 90));
        $baseHeight = max(1.0, (float) ($product->shipping_height_cm ?? 70));
        $shippingClass = in_array($product->shipping_class, ['standard', 'bulky', 'oversized'], true)
            ? $product->shipping_class
            : 'oversized';
        $shipsSeparately = filter_var($product->ships_separately, FILTER_VALIDATE_BOOL);

        return array_map(function (array $variant) use ($product, $baseWeight, $baseWidth, $baseHeight, $shippingClass, $shipsSeparately) {
            return [
                'option' => 'Canopy Length',
                'value' => $variant['value'],
                'price' => $product->price,
                'stock' => null,
                'shipping_weight_kg' => round($baseWeight * $variant['scale'], 3),
                'shipping_length_cm' => round((float) $variant['length_cm'], 2),
                'shipping_width_cm' => round($baseWidth, 2),
                'shipping_height_cm' => round($baseHeight, 2),
                'shipping_class' => $shippingClass,
                'ships_separately' => $shipsSeparately,
            ];
        }, $this->lengthVariants);
    }
};
