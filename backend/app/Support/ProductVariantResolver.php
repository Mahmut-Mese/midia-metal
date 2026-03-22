<?php

namespace App\Support;

use App\Models\Product;

class ProductVariantResolver
{
    /**
     * @param  Product|array<string, mixed>|null  $product
     */
    public static function usesCombinationMode(Product|array|null $product): bool
    {
        $variantMode = strtolower(trim((string) data_get($product, 'variant_mode', '')));
        if ($variantMode === 'combination') {
            return true;
        }

        return collect(data_get($product, 'variants', []))
            ->contains(fn ($variant) => count(self::attributesForVariant(is_array($variant) ? $variant : [])) > 0);
    }

    /**
     * @param  Product|array<string, mixed>|null  $product
     * @return array<int, string>
     */
    public static function optionNames(Product|array|null $product): array
    {
        if (!self::usesCombinationMode($product)) {
            return collect(data_get($product, 'variants', []))
                ->map(fn ($variant) => trim((string) data_get($variant, 'option')))
                ->filter()
                ->unique()
                ->values()
                ->all();
        }

        $configured = collect(data_get($product, 'variant_options', []))
            ->map(fn ($option) => trim((string) $option))
            ->filter()
            ->values();

        $fromVariants = collect(data_get($product, 'variants', []))
            ->flatMap(fn ($variant) => array_keys(self::attributesForVariant(is_array($variant) ? $variant : [])))
            ->map(fn ($option) => trim((string) $option))
            ->filter()
            ->values();

        return $configured
            ->concat($fromVariants)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>|null  $selectedVariants
     * @return array<string, string>
     */
    public static function normalizeSelections(?array $selectedVariants): array
    {
        return collect($selectedVariants ?? [])
            ->mapWithKeys(function ($selection, $option) {
                $normalizedOption = trim((string) $option);
                $value = is_array($selection) ? trim((string) ($selection['value'] ?? '')) : '';

                if ($normalizedOption === '' || $value === '') {
                    return [];
                }

                return [$normalizedOption => $value];
            })
            ->all();
    }

    /**
     * @param  Product|array<string, mixed>|null  $product
     * @param  array<string, mixed>|null  $selectedVariants
     * @return array<string, mixed>|null
     */
    public static function findMatchingCombinationVariant(Product|array|null $product, ?array $selectedVariants): ?array
    {
        if (!self::usesCombinationMode($product)) {
            return null;
        }

        $requiredOptions = self::optionNames($product);
        $normalizedSelections = self::normalizeSelections($selectedVariants);

        foreach ($requiredOptions as $option) {
            if (!array_key_exists($option, $normalizedSelections) || $normalizedSelections[$option] === '') {
                return null;
            }
        }

        $match = collect(data_get($product, 'variants', []))->first(function ($variant) use ($requiredOptions, $normalizedSelections) {
            if (!is_array($variant)) {
                return false;
            }

            $attributes = self::attributesForVariant($variant);
            foreach ($requiredOptions as $option) {
                if (($attributes[$option] ?? null) !== ($normalizedSelections[$option] ?? null)) {
                    return false;
                }
            }

            return true;
        });

        return is_array($match) ? $match : null;
    }

    /**
     * @param  array<string, mixed>  $variant
     * @return array<string, string>
     */
    public static function attributesForVariant(array $variant): array
    {
        $attributes = $variant['attributes'] ?? null;
        if (!is_array($attributes)) {
            return [];
        }

        return collect($attributes)
            ->mapWithKeys(function ($value, $key) {
                $normalizedKey = trim((string) $key);
                $normalizedValue = trim((string) $value);

                if ($normalizedKey === '' || $normalizedValue === '') {
                    return [];
                }

                return [$normalizedKey => $normalizedValue];
            })
            ->all();
    }
}
