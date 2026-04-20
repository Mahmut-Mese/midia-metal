<?php

use App\Models\Product;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Product::query()->where('variant_mode', 'combination')->chunkById(100, function ($products): void {
            foreach ($products as $product) {
                $variantOptions = is_array($product->variant_options) ? $product->variant_options : [];
                $variants = is_array($product->variants) ? $product->variants : [];

                if (count($variantOptions) > 0 || count($variants) !== 1) {
                    continue;
                }

                $variant = $variants[0];
                if (! is_array($variant)) {
                    continue;
                }

                $attributes = is_array($variant['attributes'] ?? null) ? array_filter($variant['attributes']) : [];
                if (count($attributes) > 0) {
                    continue;
                }

                $sizeValue = $this->buildSizeValue($variant);
                if ($sizeValue === null) {
                    continue;
                }

                $variant['attributes'] = ['Size' => $sizeValue];
                $product->variant_options = ['Size'];
                $product->variants = [$variant];
                $product->save();
            }
        });
    }

    public function down(): void {}

    private function buildSizeValue(array $variant): ?string
    {
        $length = $this->toPositiveFloat($variant['shipping_length_cm'] ?? null);
        $width = $this->toPositiveFloat($variant['shipping_width_cm'] ?? null);
        $height = $this->toPositiveFloat($variant['shipping_height_cm'] ?? null);

        if ($length === null || $width === null || $height === null) {
            return null;
        }

        $widthMm = (int) round($length * 10);
        $heightMm = (int) round($width * 10);
        $depthMm = (int) round($height * 10);
        $widthInches = (int) round($widthMm / 25);
        $heightInches = (int) round($heightMm / 25);
        $depthInches = (int) round($depthMm / 25);

        return sprintf(
            'Size : H %d x W %d x D %dmm (%d" x %d" x %d")',
            $heightMm,
            $widthMm,
            $depthMm,
            $heightInches,
            $widthInches,
            $depthInches,
        );
    }

    private function toPositiveFloat(mixed $value): ?float
    {
        if (! is_numeric($value)) {
            return null;
        }

        $numeric = (float) $value;

        return $numeric > 0 ? $numeric : null;
    }
};
