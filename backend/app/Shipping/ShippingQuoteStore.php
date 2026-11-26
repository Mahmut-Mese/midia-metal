<?php

namespace App\Shipping;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class ShippingQuoteStore
{
    /** Bind live quotes to the basket and destination so a cheap quote cannot be reused for a different order. */
    public function fingerprint(array $items, array $address): string
    {
        $lines = array_map(function ($item) {
            $variants = [];
            foreach ($item['selected_variants'] ?? [] as $option => $selection) {
                $variants[(string) $option] = is_array($selection) ? (string) ($selection['value'] ?? '') : (string) $selection;
            }
            ksort($variants);

            return [(int) $item['product_id'], (int) $item['quantity'], $variants];
        }, $items);
        usort($lines, fn ($a, $b) => json_encode($a) <=> json_encode($b));
        $destination = [];
        foreach (['shipping_address_line1', 'shipping_address_line2', 'shipping_city', 'shipping_postcode', 'shipping_country'] as $field) {
            $value = strtoupper(trim((string) ($address[$field] ?? '')));
            if ($field === 'shipping_country' && in_array($value, ['UK', 'UNITED KINGDOM', 'GB', ''], true)) {
                $value = 'GB';
            }
            $destination[$field] = preg_replace('/\s+/', '', $value);
        }

        return hash('sha256', json_encode([$lines, $destination], JSON_THROW_ON_ERROR));
    }

    /**
     * @param  array<string, mixed>  $option
     * @return array<string, mixed>
     */
    public function issue(array $option, int $ttlMinutes = 45): array
    {
        $token = (string) Str::uuid();
        Cache::put($this->key($token), $option, now()->addMinutes($ttlMinutes));

        return array_merge($option, [
            'quote_token' => $token,
            'expires_in_minutes' => $ttlMinutes,
        ]);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function resolve(?string $token): ?array
    {
        if (! $token) {
            return null;
        }

        $option = Cache::get($this->key($token));

        return is_array($option) ? $option : null;
    }

    private function key(string $token): string
    {
        return 'shipping_quote:'.$token;
    }
}
