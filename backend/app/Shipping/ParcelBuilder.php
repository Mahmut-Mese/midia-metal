<?php

namespace App\Shipping;

use App\Models\Order;
use App\Models\Product;
use App\Support\ProductVariantResolver;
use RuntimeException;

class ParcelBuilder
{
    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array{parcels: array<int, array<string, mixed>>, parcel_summary: array<string, mixed>, freight_plan: array<string, mixed>|null}
     */
    public function buildForCheckoutItems(array $items): array
    {
        $productIds = collect($items)
            ->pluck('product_id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $products = Product::query()
            ->whereIn('id', $productIds)
            ->get()
            ->keyBy('id');

        if ($products->count() !== $productIds->count()) {
            throw new RuntimeException('One or more products are unavailable for shipping.');
        }

        $lines = collect($items)
            ->map(function (array $item, int $index) use ($products) {
                $productId = (int) ($item['product_id'] ?? 0);
                $product = $products->get($productId);

                if (!$product instanceof Product || !$product->active) {
                    throw new RuntimeException("Product on line " . ($index + 1) . " is unavailable for shipping.");
                }

                return [
                    'product' => $product,
                    'quantity' => max(1, (int) ($item['quantity'] ?? 1)),
                    'selected_variants' => is_array($item['selected_variants'] ?? null) ? $item['selected_variants'] : null,
                ];
            })
            ->all();

        return $this->buildFromLines($lines);
    }

    /**
     * @return array{parcels: array<int, array<string, mixed>>, parcel_summary: array<string, mixed>, freight_plan: array<string, mixed>|null}
     */
    public function buildForOrder(Order $order): array
    {
        $order->loadMissing('items.product');

        $lines = $order->items->map(function ($item, int $index) {
            if (!$item->product instanceof Product) {
                throw new RuntimeException("Shipping profile is missing for ordered item #" . ($index + 1) . '.');
            }

            return [
                'product' => $item->product,
                'quantity' => max(1, (int) $item->quantity),
                'selected_variants' => is_array($item->variant_details ?? null) ? $item->variant_details : null,
            ];
        })->all();

        return $this->buildFromLines($lines);
    }

    /**
     * @param  array<int, array{product: Product, quantity: int, selected_variants?: array<string, mixed>|null}>  $lines
     * @return array{parcels: array<int, array<string, mixed>>, parcel_summary: array<string, mixed>, freight_plan: array<string, mixed>|null}
     */
    private function buildFromLines(array $lines): array
    {
        $units = [];
        $freightItems = [];

        foreach ($lines as $line) {
            $product = $line['product'];
            $profile = $this->profileForProduct($product, $line['selected_variants'] ?? null);

            if ($profile['shipping_class'] === 'freight') {
                $freightPrice = is_numeric($product->freight_delivery_price ?? null)
                    ? (float) $product->freight_delivery_price
                    : null;

                if ($freightPrice === null) {
                    throw new RuntimeException(
                        "\"{$product->name}\" requires pallet delivery. Please contact us for a freight quote."
                    );
                }

                for ($i = 0; $i < $line['quantity']; $i++) {
                    $freightItems[] = [
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'freight_delivery_price' => $freightPrice,
                        'quantity' => 1,
                    ];
                }
                continue;
            }

            for ($i = 0; $i < $line['quantity']; $i++) {
                $units[] = $profile;
            }
        }

        if (count($units) === 0 && count($freightItems) === 0) {
            throw new RuntimeException('No shippable items were provided.');
        }

        // Build freight plan if any freight items are present
        $freightPlan = null;
        if (count($freightItems) > 0) {
            $flatRate = collect($freightItems)->sum(fn (array $item) => $item['freight_delivery_price']);
            $freightPlan = [
                'flat_rate' => round($flatRate, 2),
                'items' => collect($freightItems)
                    ->groupBy('product_id')
                    ->map(function ($group) {
                        $first = $group->first();
                        return [
                            'product_id' => $first['product_id'],
                            'product_name' => $first['product_name'],
                            'quantity' => $group->count(),
                            'freight_delivery_price' => $first['freight_delivery_price'],
                        ];
                    })
                    ->values()
                    ->all(),
            ];
        }

        // If the order is freight-only there are no standard parcels to build
        if (count($units) === 0) {
            return [
                'parcels' => [],
                'parcel_summary' => [
                    'parcel_count' => 0,
                    'total_weight_kg' => 0,
                    'shipping_classes' => ['freight'],
                    'contains_separate_parcels' => false,
                ],
                'freight_plan' => $freightPlan,
            ];
        }

        usort($units, function (array $left, array $right) {
            $leftVolume = $left['length_cm'] * $left['width_cm'] * $left['height_cm'];
            $rightVolume = $right['length_cm'] * $right['width_cm'] * $right['height_cm'];

            return $rightVolume <=> $leftVolume;
        });

        $draftParcels = [];
        foreach ($units as $unit) {
            if ($unit['ships_separately']) {
                $draftParcels[] = $this->createDraftParcel($unit);
                continue;
            }

            $placed = false;
            foreach ($draftParcels as $index => $parcel) {
                if ($parcel['locked'] || !$this->canAddUnit($parcel, $unit)) {
                    continue;
                }

                $draftParcels[$index] = $this->appendUnit($parcel, $unit);
                $placed = true;
                break;
            }

            if (!$placed) {
                $draftParcels[] = $this->createDraftParcel($unit);
            }
        }

        $parcels = collect($draftParcels)
            ->values()
            ->map(fn (array $parcel, int $index) => $this->finalizeParcel($parcel, $index + 1))
            ->all();

        $summary = [
            'parcel_count' => count($parcels),
            'total_weight_kg' => round(collect($parcels)->sum(fn (array $parcel) => (float) ($parcel['weight'] ?? 0)), 3),
            'shipping_classes' => array_values(array_unique(array_merge(
                array_map(fn (array $parcel) => (string) ($parcel['shipping_class'] ?? 'standard'), $parcels),
                $freightPlan !== null ? ['freight'] : []
            ))),
            'contains_separate_parcels' => collect($parcels)->contains(fn (array $parcel) => (bool) ($parcel['ships_separately'] ?? false)),
        ];

        return [
            'parcels' => $parcels,
            'parcel_summary' => $summary,
            'freight_plan' => $freightPlan,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function profileForProduct(Product $product, ?array $selectedVariants = null): array
    {
        $weight = round(max(0.01, (float) ($product->shipping_weight_kg ?: config('services.shipping.default_parcel.weight', 2))), 3);
        $length = round(max(1, (float) ($product->shipping_length_cm ?: config('services.shipping.default_parcel.length', 30))), 2);
        $width = round(max(1, (float) ($product->shipping_width_cm ?: config('services.shipping.default_parcel.width', 20))), 2);
        $height = round(max(1, (float) ($product->shipping_height_cm ?: config('services.shipping.default_parcel.height', 10))), 2);
        $shippingClass = (string) ($product->shipping_class ?: 'standard');
        $shipsSeparately = (bool) $product->ships_separately;
        $variantOverride = $this->variantShippingOverride($product, $selectedVariants);

        if ($variantOverride['weight_kg'] !== null) {
            $weight = $variantOverride['weight_kg'];
        }
        if ($variantOverride['length_cm'] !== null) {
            $length = $variantOverride['length_cm'];
        }
        if ($variantOverride['width_cm'] !== null) {
            $width = $variantOverride['width_cm'];
        }
        if ($variantOverride['height_cm'] !== null) {
            $height = $variantOverride['height_cm'];
        }
        if ($variantOverride['shipping_class'] !== null) {
            $shippingClass = $variantOverride['shipping_class'];
        }
        if ($variantOverride['ships_separately']) {
            $shipsSeparately = true;
        }

        return [
            'product_id' => $product->id,
            'product_name' => $product->name,
            'shipping_class' => $shippingClass,
            'ships_separately' => $shipsSeparately,
            'weight_kg' => $weight,
            'length_cm' => $length,
            'width_cm' => $width,
            'height_cm' => $height,
        ];
    }

    /**
     * @param  array<string, mixed>  $unit
     * @return array<string, mixed>
     */
    private function createDraftParcel(array $unit): array
    {
        return [
            'units' => [$unit],
            'base_weight_kg' => (float) $unit['weight_kg'],
            'base_length_cm' => (float) $unit['length_cm'],
            'base_width_cm' => (float) $unit['width_cm'],
            'base_height_cm' => (float) $unit['height_cm'],
            'shipping_class' => (string) $unit['shipping_class'],
            'ships_separately' => (bool) $unit['ships_separately'],
            'locked' => (bool) $unit['ships_separately'],
        ];
    }

    /**
     * @param  array<string, mixed>  $parcel
     * @param  array<string, mixed>  $unit
     * @return array<string, mixed>
     */
    private function appendUnit(array $parcel, array $unit): array
    {
        $parcel['units'][] = $unit;
        $parcel['base_weight_kg'] += (float) $unit['weight_kg'];
        $parcel['base_length_cm'] = max((float) $parcel['base_length_cm'], (float) $unit['length_cm']);
        $parcel['base_width_cm'] = max((float) $parcel['base_width_cm'], (float) $unit['width_cm']);
        $parcel['base_height_cm'] += (float) $unit['height_cm'];

        return $parcel;
    }

    /**
     * @param  array<string, mixed>  $parcel
     * @param  array<string, mixed>  $unit
     */
    private function canAddUnit(array $parcel, array $unit): bool
    {
        $candidate = $this->appendUnit($parcel, $unit);
        $candidate = $this->applyPackagingAllowance($candidate);

        $maxWeight = (float) config('services.shipping.packaging.max_parcel_weight_kg', 25);
        $maxLength = (float) config('services.shipping.packaging.max_parcel_length_cm', 100);
        $maxLengthPlusGirth = (float) config('services.shipping.packaging.max_length_plus_girth_cm', 300);

        $length = (float) $candidate['length'];
        $width = (float) $candidate['width'];
        $height = (float) $candidate['height'];
        $longestEdge = max($length, $width, $height);
        $girth = 2 * (($length + $width + $height) - $longestEdge);

        return (float) $candidate['weight'] <= $maxWeight
            && $longestEdge <= $maxLength
            && ($longestEdge + $girth) <= $maxLengthPlusGirth;
    }

    /**
     * @param  array<string, mixed>  $parcel
     * @return array<string, mixed>
     */
    private function applyPackagingAllowance(array $parcel): array
    {
        $padding = (float) config('services.shipping.packaging.padding_cm', 1);
        $tareWeight = (float) config('services.shipping.packaging.tare_weight_kg', 0.15);

        $parcel['length'] = round((float) $parcel['base_length_cm'] + ($padding * 2), 2);
        $parcel['width'] = round((float) $parcel['base_width_cm'] + ($padding * 2), 2);
        $parcel['height'] = round((float) $parcel['base_height_cm'] + ($padding * 2), 2);
        $parcel['weight'] = round((float) $parcel['base_weight_kg'] + $tareWeight, 3);

        return $parcel;
    }

    /**
     * @param  array<string, mixed>  $parcel
     * @return array<string, mixed>
     */
    private function finalizeParcel(array $parcel, int $index): array
    {
        $parcel = $this->applyPackagingAllowance($parcel);

        $itemBreakdown = collect($parcel['units'])
            ->groupBy('product_id')
            ->map(function ($units) {
                $first = $units->first();

                return [
                    'product_id' => $first['product_id'],
                    'product_name' => $first['product_name'],
                    'quantity' => $units->count(),
                ];
            })
            ->values()
            ->all();

        return [
            'reference' => 'parcel_' . $index,
            'length' => (float) $parcel['length'],
            'width' => (float) $parcel['width'],
            'height' => (float) $parcel['height'],
            'distance_unit' => (string) config('services.shipping.default_parcel.distance_unit', 'cm'),
            'weight' => (float) $parcel['weight'],
            'mass_unit' => (string) config('services.shipping.default_parcel.mass_unit', 'kg'),
            'shipping_class' => (string) $parcel['shipping_class'],
            'ships_separately' => (bool) $parcel['ships_separately'],
            'items' => $itemBreakdown,
        ];
    }

    /**
     * @return array{weight_kg:?float,length_cm:?float,width_cm:?float,height_cm:?float,shipping_class:?string,ships_separately:bool}
     */
    private function variantShippingOverride(Product $product, ?array $selectedVariants): array
    {
        if (!$selectedVariants || count($selectedVariants) === 0) {
            return [
                'weight_kg' => null,
                'length_cm' => null,
                'width_cm' => null,
                'height_cm' => null,
                'shipping_class' => null,
                'ships_separately' => false,
            ];
        }

        if (ProductVariantResolver::usesCombinationMode($product)) {
            $matchedVariant = ProductVariantResolver::findMatchingCombinationVariant($product, $selectedVariants);
            $resolvedSelections = collect($matchedVariant ? [$matchedVariant] : [])->values();
        } else {
            $resolvedSelections = collect($selectedVariants)->map(function ($selection, $option) use ($product) {
                if (is_array($selection) && array_key_exists('shipping_weight_kg', $selection)) {
                    return $selection;
                }

                $value = is_array($selection) ? ($selection['value'] ?? null) : null;
                if ($value === null) {
                    return null;
                }

                return collect($product->variants ?? [])->first(function ($variant) use ($option, $value) {
                    return (string) ($variant['option'] ?? '') === (string) $option
                        && (string) ($variant['value'] ?? '') === (string) $value;
                });
            })->filter(fn ($selection) => is_array($selection))->values();
        }

        if ($resolvedSelections->isEmpty()) {
            return [
                'weight_kg' => null,
                'length_cm' => null,
                'width_cm' => null,
                'height_cm' => null,
                'shipping_class' => null,
                'ships_separately' => false,
            ];
        }

        $classPriority = ['standard' => 1, 'freight' => 2];
        $shippingClass = $resolvedSelections
            ->map(fn (array $selection) => (string) ($selection['shipping_class'] ?? ''))
            ->filter(fn (string $value) => array_key_exists($value, $classPriority))
            ->sortByDesc(fn (string $value) => $classPriority[$value])
            ->first();

        return [
            'weight_kg' => $this->maxVariantNumeric($resolvedSelections->pluck('shipping_weight_kg')->all(), 0.01, 999.999, 3),
            'length_cm' => $this->maxVariantNumeric($resolvedSelections->pluck('shipping_length_cm')->all(), 1, 999.99, 2),
            'width_cm' => $this->maxVariantNumeric($resolvedSelections->pluck('shipping_width_cm')->all(), 1, 999.99, 2),
            'height_cm' => $this->maxVariantNumeric($resolvedSelections->pluck('shipping_height_cm')->all(), 1, 999.99, 2),
            'shipping_class' => $shippingClass ?: null,
            'ships_separately' => $resolvedSelections->contains(fn (array $selection) => (bool) ($selection['ships_separately'] ?? false)),
        ];
    }

    /**
     * @param  array<int, mixed>  $values
     */
    private function maxVariantNumeric(array $values, float $min, float $max, int $precision): ?float
    {
        $numbers = collect($values)
            ->filter(fn ($value) => $value !== null && $value !== '')
            ->map(function ($value) use ($min, $max, $precision) {
                if (!is_numeric($value)) {
                    return null;
                }

                $numeric = (float) $value;
                if ($numeric < $min || $numeric > $max) {
                    return null;
                }

                return round($numeric, $precision);
            })
            ->filter(fn ($value) => $value !== null)
            ->values();

        return $numbers->isNotEmpty() ? (float) $numbers->max() : null;
    }
}
