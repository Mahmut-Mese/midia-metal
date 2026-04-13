<?php

namespace App\Shipping;

use App\Models\SiteSetting;

/**
 * Resolves freight zone surcharges based on UK postcode areas.
 *
 * Shared logic extracted from EasyPostGateway and MockEasyPostGateway
 * to eliminate duplication of postcode-zone detection and surcharge lookup.
 */
class FreightZoneResolver
{
    /** @var array{highlands:float,ni:float,scotland:float,london:float,default:float}|null */
    private ?array $surcharges = null;

    /**
     * Determine the freight zone surcharge for the given address.
     *
     * @param  array<string, mixed>  $toAddress
     */
    public function resolve(array $toAddress): float
    {
        $surcharges = $this->loadSurcharges();
        $zone = $this->detectZone($toAddress);

        return $surcharges[$zone];
    }

    /**
     * Detect the freight zone for a given address.
     *
     * @param  array<string, mixed>  $toAddress
     * @return 'ni'|'highlands'|'scotland'|'london'|'default'
     */
    public function detectZone(array $toAddress): string
    {
        $postcode = strtoupper(preg_replace('/\s+/', '', (string) ($toAddress['postcode'] ?? '')) ?: '');
        $city = strtoupper(trim((string) ($toAddress['city'] ?? '')));

        $area = $this->extractPostcodeArea($postcode);

        if (in_array($area, ['BT'], true)) {
            return 'ni';
        }

        if (in_array($area, ['AB', 'HS', 'IV', 'KW', 'PA', 'PH', 'ZE', 'IM'], true)) {
            return 'highlands';
        }

        if (in_array($area, ['DD', 'DG', 'EH', 'FK', 'G', 'KA', 'KY', 'ML', 'TD'], true)
            || str_contains($city, 'GLASGOW')
            || str_contains($city, 'EDINBURGH')) {
            return 'scotland';
        }

        if (in_array($area, ['E', 'EC', 'N', 'NW', 'SE', 'SW', 'W', 'WC'], true)
            || str_contains($city, 'LONDON')) {
            return 'london';
        }

        return 'default';
    }

    /**
     * Load freight zone surcharges from the settings table.
     *
     * @return array{highlands:float,ni:float,scotland:float,london:float,default:float}
     */
    public function loadSurcharges(): array
    {
        if ($this->surcharges !== null) {
            return $this->surcharges;
        }

        $rows = SiteSetting::whereIn('key', [
            'freight_surcharge_highlands',
            'freight_surcharge_ni',
            'freight_surcharge_scotland',
            'freight_surcharge_london',
            'freight_surcharge_default',
        ])->pluck('value', 'key');

        $this->surcharges = [
            'highlands' => (float) ($rows['freight_surcharge_highlands'] ?? 7.00),
            'ni' => (float) ($rows['freight_surcharge_ni'] ?? 4.50),
            'scotland' => (float) ($rows['freight_surcharge_scotland'] ?? 2.00),
            'london' => (float) ($rows['freight_surcharge_london'] ?? 0.00),
            'default' => (float) ($rows['freight_surcharge_default'] ?? 1.00),
        ];

        return $this->surcharges;
    }

    /**
     * Check whether a postcode matches any of the given area prefixes.
     *
     * @param  array<int, string>  $prefixes
     */
    public function matchesPrefix(string $postcode, array $prefixes): bool
    {
        $area = $this->extractPostcodeArea($postcode);
        if ($area === '') {
            return false;
        }

        foreach ($prefixes as $prefix) {
            if ($area === strtoupper($prefix)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Extract the 1-2 letter area code from a UK postcode.
     */
    private function extractPostcodeArea(string $postcode): string
    {
        $clean = preg_replace('/\s+/', '', strtoupper($postcode));
        if (! $clean) {
            return '';
        }

        preg_match('/^([A-Z]{1,2})/', $clean, $matches);

        return $matches[1] ?? '';
    }
}
