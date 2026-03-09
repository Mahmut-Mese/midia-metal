<?php

namespace App\Support;

use App\Models\Coupon;
use App\Models\Product;
use App\Models\SiteSetting;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class CheckoutCalculator
{
    public function calculate(array $items, ?string $couponCode = null): array
    {
        if (count($items) === 0) {
            throw ValidationException::withMessages([
                'items' => ['At least one item is required.'],
            ]);
        }

        $productIds = collect($items)
            ->pluck('product_id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $products = Product::whereIn('id', $productIds)->get()->keyBy('id');

        if ($products->count() !== $productIds->count()) {
            throw ValidationException::withMessages([
                'items' => ['One or more products are no longer available.'],
            ]);
        }

        $lineItems = collect($items)->map(function (array $item, int $index) use ($products) {
            $productId = (int) ($item['product_id'] ?? 0);
            $quantity = max(1, (int) ($item['quantity'] ?? 1));
            /** @var Product|null $product */
            $product = $products->get($productId);

            if (!$product || !$product->active) {
                throw ValidationException::withMessages([
                    "items.$index.product_id" => ['This product is no longer available.'],
                ]);
            }

            if ($product->track_stock && $product->stock_quantity !== null && $product->stock_quantity < $quantity) {
                throw ValidationException::withMessages([
                    "items.$index.quantity" => ["Only {$product->stock_quantity} unit(s) of {$product->name} are currently in stock."],
                ]);
            }

            [$variantDetails, $variantExtra] = $this->resolveVariants($product, $item['selected_variants'] ?? [], $quantity, $index);
            $unitPrice = round($this->parseMoney($product->price) + $variantExtra, 2);

            return [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'product_price' => $this->formatMoney($unitPrice),
                'quantity' => $quantity,
                'variant_details' => $variantDetails,
                'unit_price' => $unitPrice,
                'line_total' => round($unitPrice * $quantity, 2),
            ];
        });

        $subtotal = round($lineItems->sum('line_total'), 2);
        $settings = SiteSetting::pluck('value', 'key');
        $shipping = $subtotal > 0 ? round($this->parseMoney(
            $settings->get('shipping_flat_rate', $settings->get('shipping_rate', '0'))
        ), 2) : 0.0;

        $coupon = null;
        $discountAmount = 0.0;
        if ($couponCode) {
            $coupon = Coupon::where('code', strtoupper(trim($couponCode)))->first();

            if (!$coupon || !$coupon->isValid($subtotal)) {
                throw ValidationException::withMessages([
                    'coupon_code' => ['This coupon is expired, inactive, or the order does not meet the minimum amount.'],
                ]);
            }

            $discountAmount = round($coupon->calculateDiscount($subtotal), 2);
        }

        $vatEnabled = in_array(strtolower((string) $settings->get('vat_enabled', '0')), ['1', 'true', 'yes', 'on'], true);
        $vatRate = (float) $settings->get('vat_rate', $settings->get('tax_rate', 20));
        $taxableAmount = max(0, $subtotal + $shipping - $discountAmount);
        $taxAmount = $vatEnabled ? round($taxableAmount * ($vatRate / 100), 2) : 0.0;
        $total = round(max(0, $subtotal + $shipping + $taxAmount - $discountAmount), 2);

        return [
            'items' => $lineItems->values()->all(),
            'subtotal' => $subtotal,
            'shipping' => $shipping,
            'discount_amount' => $discountAmount,
            'tax_amount' => $taxAmount,
            'total' => $total,
            'coupon' => $coupon,
        ];
    }

    private function resolveVariants(Product $product, mixed $selectedVariants, int $quantity, int $index): array
    {
        if (!is_array($selectedVariants) || count($selectedVariants) === 0) {
            return [null, 0.0];
        }

        $available = collect($product->variants ?? []);
        $resolved = [];
        $extra = 0.0;

        foreach ($selectedVariants as $option => $selection) {
            $value = is_array($selection) ? ($selection['value'] ?? null) : null;

            if ($value === null) {
                throw ValidationException::withMessages([
                    "items.$index.selected_variants" => ['Invalid variant selection.'],
                ]);
            }

            $variant = $available->first(function ($candidate) use ($option, $value) {
                return (string) ($candidate['option'] ?? '') === (string) $option
                    && (string) ($candidate['value'] ?? '') === (string) $value;
            });

            if (!$variant) {
                throw ValidationException::withMessages([
                    "items.$index.selected_variants" => ["The selected {$option} option is no longer available."],
                ]);
            }

            $variantStock = $variant['stock'] ?? null;
            if ($variantStock !== null && (int) $variantStock < $quantity) {
                throw ValidationException::withMessages([
                    "items.$index.quantity" => ["Only {$variantStock} unit(s) are available for {$product->name} ({$option}: {$value})."],
                ]);
            }

            $resolved[$option] = [
                'option' => $variant['option'] ?? $option,
                'value' => $variant['value'] ?? $value,
                'price' => $variant['price'] ?? null,
                'stock' => $variant['stock'] ?? null,
            ];
            $extra += $this->parseMoney($variant['price'] ?? 0);
        }

        return [$resolved, round($extra, 2)];
    }

    private function parseMoney(mixed $value): float
    {
        if (is_numeric($value)) {
            return round((float) $value, 2);
        }

        return round((float) preg_replace('/[^0-9.\-]/', '', (string) $value), 2);
    }

    private function formatMoney(float $value): string
    {
        return '£' . number_format($value, 2, '.', '');
    }
}
