<?php

namespace App\Shipping;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class ShippingQuoteStore
{
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
