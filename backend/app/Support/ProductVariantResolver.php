<?php

namespace App\Support;

use App\Models\Product;

class ProductVariantResolver
{
    /**
     * @param  Product|array<string, mixed>|null  $product
     * @return array<int, array<string, mixed>>
     */
    public static function variants(Product|array|null $product): array
    {
        return collect(data_get($product, 'variants', []))
            ->filter(fn ($variant) => is_array($variant))
            ->values()
            ->all();
    }

    /**
     * @param  Product|array<string, mixed>|null  $product
     */
    public static function usesCombinationMode(Product|array|null $product): bool
    {
        $variantMode = strtolower(trim((string) data_get($product, 'variant_mode', '')));
        if ($variantMode === 'combination') {
            return true;
        }

        return collect(self::variants($product))
            ->contains(fn ($variant) => count(self::attributesForVariant(is_array($variant) ? $variant : [])) > 0);
    }

    /**
     * @param  Product|array<string, mixed>|null  $product
     * @return array<int, string>
     */
    public static function optionNames(Product|array|null $product): array
    {
        if (! self::usesCombinationMode($product)) {
            return collect(self::variants($product))
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

        $fromVariants = collect(self::variants($product))
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
        if (! self::usesCombinationMode($product)) {
            return null;
        }

        $variants = self::variants($product);
        if (count($variants) === 0) {
            return null;
        }

        $requiredOptions = self::optionNames($product);
        if (count($requiredOptions) === 0) {
            return $variants[0];
        }

        $normalizedSelections = self::normalizeSelections($selectedVariants);

        foreach ($requiredOptions as $option) {
            if (! array_key_exists($option, $normalizedSelections) || $normalizedSelections[$option] === '') {
                return null;
            }
        }

        $match = collect($variants)->first(function ($variant) use ($requiredOptions, $normalizedSelections) {
            if (! is_array($variant)) {
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
     * @param  Product|array<string, mixed>|null  $product
     * @param  array<string, mixed>|null  $selectedVariants
     * @return array<string, mixed>|null
     */
    public static function resolveSelectedVariant(Product|array|null $product, ?array $selectedVariants = null): ?array
    {
        if (self::usesCombinationMode($product)) {
            $variants = self::variants($product);
            $normalizedSelections = self::normalizeSelections($selectedVariants);

            if (count($variants) === 1 && count($normalizedSelections) === 0) {
                return $variants[0];
            }

            return self::findMatchingCombinationVariant($product, $selectedVariants);
        }

        $variants = self::variants($product);

        if (count($variants) === 1) {
            return $variants[0];
        }

        if (! is_array($selectedVariants) || count($selectedVariants) === 0) {
            return null;
        }

        foreach ($selectedVariants as $option => $selection) {
            $value = is_array($selection) ? trim((string) ($selection['value'] ?? '')) : '';
            if ($value === '') {
                continue;
            }

            $match = collect($variants)->first(function (array $variant) use ($option, $value) {
                return (string) ($variant['option'] ?? '') === (string) $option
                    && (string) ($variant['value'] ?? '') === $value;
            });

            if (is_array($match)) {
                return $match;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $variant
     * @return array<string, string>
     */
    public static function attributesForVariant(array $variant): array
    {
        $attributes = $variant['attributes'] ?? null;
        if (! is_array($attributes)) {
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
