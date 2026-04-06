<?php

namespace App\Models\Concerns;

trait NormalizesMediaUrls
{
    protected function normalizeMediaUrl(?string $value): ?string
    {
        if (!$value) {
            return $value;
        }

        if (str_starts_with($value, '/images/')) {
            return $value;
        }

        if (str_starts_with($value, '/storage/')) {
            return url($value);
        }

        if (str_starts_with($value, 'storage/')) {
            return url('/' . ltrim($value, '/'));
        }

        if (str_starts_with($value, 'uploads/')) {
            return url('/storage/' . ltrim($value, '/'));
        }

        if (!preg_match('#^https?://#i', $value)) {
            return $value;
        }

        $parts = parse_url($value);
        $path = $parts['path'] ?? null;

        if (!$path || !str_starts_with($path, '/storage/')) {
            return $value;
        }

        $normalized = url($path);

        if (!empty($parts['query'])) {
            $normalized .= '?' . $parts['query'];
        }

        return $normalized;
    }

    protected function normalizeMediaArray(mixed $value): mixed
    {
        if ($value === null || $value === '') {
            return $value;
        }

        $items = is_array($value) ? $value : json_decode((string) $value, true);

        if (!is_array($items)) {
            return $value;
        }

        return array_map(function ($item) {
            return is_string($item) ? $this->normalizeMediaUrl($item) : $item;
        }, $items);
    }
}
