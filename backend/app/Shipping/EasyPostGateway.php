<?php

namespace App\Shipping;

use App\Models\Order;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class EasyPostGateway implements ShippingGateway
{
    public function provider(): string
    {
        return 'easypost';
    }

    public function quote(array $toAddress, array $items = [], array $context = []): array
    {
        $shipments = $this->createShipmentsForParcels(
            $this->toAddressPayload($toAddress),
            $this->resolveParcels($context),
        );

        $options = $this->aggregateRates($shipments, $context);

        if (count($options) === 0) {
            throw new RuntimeException('No courier delivery options are currently available for this address.');
        }

        return $options;
    }

    public function createLabel(Order $order, array $context = []): array
    {
        $parcels = $this->resolveParcels($context);
        $selectedOption = is_array(data_get($order->shipping_metadata, 'selected_delivery_option')) ? data_get($order->shipping_metadata, 'selected_delivery_option') : [];
        $shipments = $this->createShipmentsForParcels($this->orderToAddressPayload($order), $parcels);

        $purchasedShipments = collect($shipments)->map(function (array $shipment) use ($selectedOption) {
            $selectedRate = $this->selectRateForShipment($shipment, $selectedOption);
            $shipmentId = (string) data_get($shipment, 'id');

            if ($shipmentId === '') {
                throw new RuntimeException('Shipment id missing from courier response.');
            }

            $bought = $this->request('post', "/shipments/{$shipmentId}/buy", [
                'rate' => ['id' => (string) $selectedRate['id']],
            ]);

            $trackingNumber = (string) (data_get($bought, 'tracker.tracking_code')
                ?: data_get($bought, 'tracking_code')
                ?: data_get($bought, 'tracking_number'));

            $labelUrl = (string) (data_get($bought, 'postage_label.label_pdf_url')
                ?: data_get($bought, 'postage_label.label_url')
                ?: '');

            return [
                'shipment_id' => $shipmentId,
                'parcel_reference' => $shipment['parcel_reference'] ?? null,
                'tracking_number' => $trackingNumber !== '' ? $trackingNumber : null,
                'carrier' => (string) ($selectedRate['carrier'] ?? data_get($bought, 'tracker.carrier') ?? ''),
                'service' => (string) ($selectedRate['service'] ?? ''),
                'service_code' => $this->normalizeServiceCode((string) ($selectedRate['service'] ?? '')),
                'status' => (string) (data_get($bought, 'tracker.status') ?: 'pre_transit'),
                'label_url' => $labelUrl !== '' ? $labelUrl : null,
                'tracking_url' => data_get($bought, 'tracker.public_url'),
                'tracker_id' => data_get($bought, 'tracker.id'),
                'selected_rate' => [
                    'id' => (string) ($selectedRate['id'] ?? ''),
                    'carrier' => (string) ($selectedRate['carrier'] ?? ''),
                    'service' => (string) ($selectedRate['service'] ?? ''),
                    'rate' => (string) ($selectedRate['rate'] ?? ''),
                    'currency' => (string) ($selectedRate['currency'] ?? ''),
                ],
            ];
        })->values()->all();

        if (count($purchasedShipments) === 0) {
            throw new RuntimeException('Could not purchase carrier labels for this shipment.');
        }

        $primaryShipment = $purchasedShipments[0];

        return [
            'tracking_number' => $primaryShipment['tracking_number'] ?? $order->tracking_number,
            'shipping_provider' => $this->provider(),
            'shipping_carrier' => (string) ($selectedOption['carrier'] ?? $primaryShipment['carrier'] ?? $order->shipping_carrier),
            'shipping_service' => (string) ($selectedOption['service'] ?? $primaryShipment['service'] ?? $order->shipping_service),
            'shipping_status' => $this->aggregateTrackingStatus(array_column($purchasedShipments, 'status')),
            'shipping_shipment_id' => $primaryShipment['shipment_id'] ?? null,
            'shipping_label_url' => $primaryShipment['label_url'] ?? null,
            'shipping_tracking_url' => $primaryShipment['tracking_url'] ?? null,
            'shipping_metadata' => array_merge($order->shipping_metadata ?? [], [
                'mode' => 'live',
                'gateway' => $this->provider(),
                'selected_rate' => [
                    'carrier' => (string) ($selectedOption['carrier'] ?? $primaryShipment['carrier'] ?? ''),
                    'service' => (string) ($selectedOption['service'] ?? $primaryShipment['service'] ?? ''),
                    'service_code' => (string) ($selectedOption['service_code'] ?? $primaryShipment['service_code'] ?? ''),
                ],
                'tracker_id' => $primaryShipment['tracker_id'] ?? null,
                'parcels' => $parcels,
                'parcel_summary' => $context['parcel_summary'] ?? data_get($order->shipping_metadata, 'selected_delivery_option.parcel_summary'),
                'shipments' => $purchasedShipments,
                'label_generated_at' => now()->toIso8601String(),
            ]),
        ];
    }

    public function track(Order $order): array
    {
        $shipmentRecords = data_get($order->shipping_metadata, 'shipments', []);

        if (is_array($shipmentRecords) && count($shipmentRecords) > 0) {
            $trackedShipments = collect($shipmentRecords)
                ->map(fn (array $shipment) => $this->trackShipmentRecord($shipment, $order))
                ->filter(fn ($shipment) => is_array($shipment))
                ->values()
                ->all();

            if (count($trackedShipments) === 0) {
                throw new RuntimeException('Tracking information is not available for this shipment yet.');
            }

            $primary = $trackedShipments[0];

            return [
                'tracking_number' => $primary['tracking_number'] ?? $order->tracking_number,
                'shipping_provider' => $this->provider(),
                'shipping_carrier' => (string) ($primary['carrier'] ?? $order->shipping_carrier),
                'shipping_service' => (string) ($order->shipping_service ?? ''),
                'shipping_status' => $this->aggregateTrackingStatus(array_column($trackedShipments, 'status')),
                'shipping_shipment_id' => $primary['shipment_id'] ?? $order->shipping_shipment_id,
                'shipping_tracking_url' => $primary['tracking_url'] ?? $order->shipping_tracking_url,
                'shipping_metadata' => array_merge($order->shipping_metadata ?? [], [
                    'mode' => 'live',
                    'gateway' => $this->provider(),
                    'tracker_id' => $primary['tracker_id'] ?? null,
                    'tracking_detail' => $primary['tracking_detail'] ?? null,
                    'last_checked_at' => now()->toIso8601String(),
                    'shipments' => $trackedShipments,
                ]),
            ];
        }

        $tracked = $this->trackShipmentRecord([
            'shipment_id' => $order->shipping_shipment_id,
            'tracking_number' => $order->tracking_number,
            'carrier' => $order->shipping_carrier,
        ], $order);

        if (!is_array($tracked)) {
            throw new RuntimeException('Tracking information is not available for this shipment yet.');
        }

        $trackingNumber = (string) ($tracked['tracking_number'] ?? $order->tracking_number);

        return [
            'tracking_number' => $trackingNumber !== '' ? $trackingNumber : null,
            'shipping_provider' => $this->provider(),
            'shipping_carrier' => (string) ($tracked['carrier'] ?? $order->shipping_carrier),
            'shipping_service' => (string) ($order->shipping_service ?? ''),
            'shipping_status' => (string) ($tracked['status'] ?? $order->shipping_status),
            'shipping_shipment_id' => $tracked['shipment_id'] ?? $order->shipping_shipment_id,
            'shipping_tracking_url' => $tracked['tracking_url'] ?? $order->shipping_tracking_url,
            'shipping_metadata' => array_merge($order->shipping_metadata ?? [], [
                'mode' => 'live',
                'gateway' => $this->provider(),
                'tracker_id' => $tracked['tracker_id'] ?? null,
                'tracking_detail' => $tracked['tracking_detail'] ?? null,
                'last_checked_at' => now()->toIso8601String(),
            ]),
        ];
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array<int, array<string, mixed>>
     */
    private function resolveParcels(array $context): array
    {
        $parcels = $context['parcels'] ?? [];
        if (!is_array($parcels) || count($parcels) === 0) {
            return [[
                'reference' => 'parcel_1',
                'length' => (float) config('services.shipping.default_parcel.length', 30),
                'width' => (float) config('services.shipping.default_parcel.width', 20),
                'height' => (float) config('services.shipping.default_parcel.height', 10),
                'distance_unit' => (string) config('services.shipping.default_parcel.distance_unit', 'cm'),
                'weight' => (float) config('services.shipping.default_parcel.weight', 2),
                'mass_unit' => (string) config('services.shipping.default_parcel.mass_unit', 'kg'),
            ]];
        }

        return array_values($parcels);
    }

    /**
     * @param  array<string, mixed>  $toAddress
     * @param  array<int, array<string, mixed>>  $parcels
     * @return array<int, array<string, mixed>>
     */
    private function createShipmentsForParcels(array $toAddress, array $parcels): array
    {
        return collect($parcels)->map(function (array $parcel, int $index) use ($toAddress) {
            $shipmentPayload = [
                'to_address' => $toAddress,
                'from_address' => $this->fromAddressPayload(),
                'parcel' => $this->parcelPayload($parcel),
            ];

            $shipmentOptions = $this->shipmentOptionsPayload($parcel);
            if ($shipmentOptions !== []) {
                $shipmentPayload['options'] = $shipmentOptions;
            }

            $shipment = $this->request('post', '/shipments', [
                'shipment' => $shipmentPayload,
            ]);

            $shipment['parcel_reference'] = (string) ($parcel['reference'] ?? ('parcel_' . ($index + 1)));
            $shipment['parcel_input'] = $parcel;

            return $shipment;
        })->all();
    }

    /**
     * @param  array<int, array<string, mixed>>  $shipments
     * @param  array<string, mixed>  $context
     * @return array<int, array<string, mixed>>
     */
    private function aggregateRates(array $shipments, array $context): array
    {
        $rateBuckets = [];

        foreach ($shipments as $shipment) {
            $rates = collect(data_get($shipment, 'rates', []))
                ->filter(fn ($rate) => is_array($rate) && !empty($rate['id']) && is_numeric($rate['rate'] ?? null))
                ->values();

            if ($rates->isEmpty()) {
                throw new RuntimeException('No courier delivery options are currently available for one of the parcels.');
            }

            $indexed = $rates->mapWithKeys(fn (array $rate) => [
                $this->rateKey($rate) => $rate,
            ])->all();

            if (count($rateBuckets) === 0) {
                foreach ($indexed as $key => $rate) {
                    $rateBuckets[$key] = [[$shipment, $rate]];
                }
                continue;
            }

            foreach (array_keys($rateBuckets) as $key) {
                if (!array_key_exists($key, $indexed)) {
                    unset($rateBuckets[$key]);
                    continue;
                }

                $rateBuckets[$key][] = [$shipment, $indexed[$key]];
            }
        }

        return collect($rateBuckets)
            ->filter(fn (array $matchedRates) => count($matchedRates) === count($shipments))
            ->map(function (array $matchedRates) use ($context) {
                [$firstShipment, $firstRate] = $matchedRates[0];
                $carrier = (string) ($firstRate['carrier'] ?? 'Carrier');
                $service = (string) ($firstRate['service'] ?? 'Delivery');

                $dates = collect($matchedRates)
                    ->map(fn (array $entry) => $this->normalizeDate((string) (($entry[1]['delivery_date'] ?? ''))))
                    ->filter()
                    ->values();

                $windowStarts = collect($matchedRates)
                    ->map(fn (array $entry) => data_get($entry[1], 'delivery_date_guaranteed') ? '07:30' : null)
                    ->filter()
                    ->values();

                $windowEnds = collect($matchedRates)
                    ->map(fn (array $entry) => data_get($entry[1], 'delivery_date_guaranteed') ? '18:00' : null)
                    ->filter()
                    ->values();

                return [
                    'provider' => $this->provider(),
                    'carrier' => $carrier,
                    'service' => $this->formatServiceLabel($carrier, $service),
                    'service_code' => $this->normalizeServiceCode($service),
                    'rate' => round(collect($matchedRates)->sum(fn (array $entry) => (float) ($entry[1]['rate'] ?? 0)), 2),
                    'currency' => strtoupper((string) ($firstRate['currency'] ?? 'GBP')),
                    'delivery_days' => collect($matchedRates)
                        ->map(fn (array $entry) => is_numeric($entry[1]['delivery_days'] ?? null) ? (int) $entry[1]['delivery_days'] : null)
                        ->filter(fn ($value) => $value !== null)
                        ->max(),
                    'estimated_delivery_date' => $dates->isNotEmpty() ? $dates->sort()->last() : null,
                    'estimated_delivery_window_start' => $windowStarts->isNotEmpty() ? $windowStarts->sort()->first() : null,
                    'estimated_delivery_window_end' => $windowEnds->isNotEmpty() ? $windowEnds->sort()->last() : null,
                    'is_premium' => $this->isPremiumService($service),
                    'rate_id' => (string) ($firstRate['id'] ?? ''),
                    'rate_ids' => collect($matchedRates)->map(function (array $entry) {
                        [$shipment, $rate] = $entry;

                        return [
                            'shipment_id' => (string) ($shipment['id'] ?? ''),
                            'parcel_reference' => (string) ($shipment['parcel_reference'] ?? ''),
                            'rate_id' => (string) ($rate['id'] ?? ''),
                        ];
                    })->values()->all(),
                    'parcels' => $context['parcels'] ?? [],
                    'parcel_summary' => $context['parcel_summary'] ?? null,
                ];
            })
            ->sortBy('rate')
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $shipment
     * @param  array<string, mixed>  $selectedOption
     * @return array<string, mixed>
     */
    private function selectRateForShipment(array $shipment, array $selectedOption): array
    {
        $rates = collect(data_get($shipment, 'rates', []))
            ->filter(fn ($rate) => is_array($rate) && !empty($rate['id']) && is_numeric($rate['rate'] ?? null))
            ->values();

        if ($rates->isEmpty()) {
            throw new RuntimeException('No purchasable carrier rates found for this shipment.');
        }

        $preferredCarrier = strtolower(trim((string) ($selectedOption['carrier'] ?? '')));
        $preferredServiceCode = $this->normalizeServiceCode((string) ($selectedOption['service_code'] ?? ''));
        $preferredService = strtolower(trim((string) ($selectedOption['service'] ?? '')));

        $exact = $rates->first(function (array $rate) use ($preferredCarrier, $preferredServiceCode, $preferredService) {
            $carrier = strtolower(trim((string) ($rate['carrier'] ?? '')));
            $service = (string) ($rate['service'] ?? '');
            $serviceCode = $this->normalizeServiceCode($service);
            $formatted = strtolower($this->formatServiceLabel((string) ($rate['carrier'] ?? ''), $service));

            return ($preferredCarrier === '' || $carrier === $preferredCarrier)
                && (
                    ($preferredServiceCode !== '' && $serviceCode === $preferredServiceCode)
                    || ($preferredService !== '' && $formatted === $preferredService)
                );
        });

        if (is_array($exact)) {
            return $exact;
        }

        $cheapest = $rates->sortBy(fn (array $rate) => (float) ($rate['rate'] ?? 0))->first();
        if (!is_array($cheapest)) {
            throw new RuntimeException('Could not select a carrier rate for this shipment.');
        }

        return $cheapest;
    }

    /**
     * @param  array<string, mixed>  $shipmentRecord
     * @return array<string, mixed>|null
     */
    private function trackShipmentRecord(array $shipmentRecord, Order $order): ?array
    {
        $tracker = null;
        $shipmentId = (string) ($shipmentRecord['shipment_id'] ?? '');
        $trackingNumber = (string) ($shipmentRecord['tracking_number'] ?? '');
        $carrier = (string) ($shipmentRecord['carrier'] ?? $order->shipping_carrier ?? '');

        if ($shipmentId !== '') {
            $shipment = $this->request('get', '/shipments/' . $shipmentId);
            $shipmentTracker = data_get($shipment, 'tracker');
            if (is_array($shipmentTracker)) {
                $tracker = $shipmentTracker;
            }
        }

        if (!$tracker && $trackingNumber !== '') {
            $trackerResponse = $this->request('post', '/trackers', [
                'tracker' => [
                    'tracking_code' => $trackingNumber,
                    'carrier' => $carrier !== '' ? $carrier : null,
                ],
            ]);

            $tracker = is_array($trackerResponse) ? $trackerResponse : null;
        }

        if (!is_array($tracker)) {
            return null;
        }

        return array_merge($shipmentRecord, [
            'shipment_id' => $shipmentId !== '' ? $shipmentId : data_get($tracker, 'shipment_id'),
            'tracking_number' => (string) ($tracker['tracking_code'] ?? $trackingNumber),
            'carrier' => (string) ($tracker['carrier'] ?? $carrier),
            'status' => (string) ($tracker['status'] ?? ''),
            'tracking_url' => data_get($tracker, 'public_url'),
            'tracker_id' => data_get($tracker, 'id'),
            'tracking_detail' => data_get($tracker, 'status_detail'),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function request(string $method, string $path, array $payload = []): array
    {
        $apiKey = (string) config('services.easypost.api_key');
        if ($apiKey === '') {
            throw new RuntimeException('EasyPost API key is missing. Set EASYPOST_API_KEY or keep SHIPPING_MOCK=true.');
        }

        $baseUrl = rtrim((string) config('services.easypost.base_url', 'https://api.easypost.com/v2'), '/');
        $url = $baseUrl . '/' . ltrim($path, '/');

        try {
            $response = Http::withBasicAuth($apiKey, '')
                ->acceptJson()
                ->timeout(20)
                ->send(strtoupper($method), $url, [
                    'json' => $payload,
                ])
                ->throw();

            $data = $response->json();
            return is_array($data) ? $data : [];
        } catch (Throwable $e) {
            throw new RuntimeException('Courier service temporarily unavailable: ' . $e->getMessage());
        }
    }

    private function normalizeCountry(string $country): string
    {
        $upper = strtoupper(trim($country));
        return match ($upper) {
            'UNITED KINGDOM', 'UK', 'GBR' => 'GB',
            'UNITED STATES', 'USA' => 'US',
            default => strlen($upper) === 2 ? $upper : 'GB',
        };
    }

    private function normalizeDate(string $value): ?string
    {
        if ($value === '') {
            return null;
        }

        try {
            return \Carbon\Carbon::parse($value)->toDateString();
        } catch (Throwable) {
            return null;
        }
    }

    private function formatServiceLabel(string $carrier, string $service): string
    {
        return trim($carrier . ' - ' . $service);
    }

    private function normalizeServiceCode(string $service): string
    {
        return Str::of($service)->lower()->replaceMatches('/[^a-z0-9]+/', '_')->trim('_')->value();
    }

    /**
     * @param  array<string, mixed>  $rate
     */
    private function rateKey(array $rate): string
    {
        return strtolower(trim((string) ($rate['carrier'] ?? ''))) . '|' . $this->normalizeServiceCode((string) ($rate['service'] ?? ''));
    }

    /**
     * @param  array<string, mixed>  $toAddress
     * @return array<string, mixed>
     */
    private function toAddressPayload(array $toAddress): array
    {
        return [
            'name' => (string) ($toAddress['name'] ?? 'Customer'),
            'street1' => (string) ($toAddress['street1'] ?? ''),
            'street2' => (string) ($toAddress['street2'] ?? ''),
            'city' => (string) ($toAddress['city'] ?? ''),
            'zip' => (string) ($toAddress['postcode'] ?? ''),
            'country' => $this->normalizeCountry((string) ($toAddress['country'] ?? 'GB')),
            'phone' => (string) ($toAddress['phone'] ?? ''),
            'email' => (string) ($toAddress['email'] ?? ''),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function orderToAddressPayload(Order $order): array
    {
        return [
            'name' => (string) ($order->customer_name ?: 'Customer'),
            'street1' => (string) ($order->shipping_address_line1 ?: $order->shipping_address),
            'street2' => (string) ($order->shipping_address_line2 ?: ''),
            'city' => (string) ($order->shipping_city ?: ''),
            'zip' => (string) ($order->shipping_postcode ?: ''),
            'country' => $this->normalizeCountry((string) ($order->shipping_country ?: 'GB')),
            'phone' => (string) ($order->customer_phone ?: ''),
            'email' => (string) ($order->customer_email ?: ''),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function fromAddressPayload(): array
    {
        return [
            'name' => (string) config('services.shipping.from_name'),
            'company' => (string) config('services.shipping.from_company'),
            'street1' => (string) config('services.shipping.from_address_line1'),
            'street2' => (string) config('services.shipping.from_address_line2'),
            'city' => (string) config('services.shipping.from_city'),
            'zip' => (string) config('services.shipping.from_postcode'),
            'country' => $this->normalizeCountry((string) config('services.shipping.from_country', 'GB')),
            'phone' => (string) config('services.shipping.from_phone'),
            'email' => (string) config('services.shipping.from_email'),
        ];
    }

    /**
     * @param  array<string, mixed>  $parcel
     * @return array<string, mixed>
     */
    private function parcelPayload(array $parcel): array
    {
        $lengthInches = $this->cmToInches((float) ($parcel['length'] ?? config('services.shipping.default_parcel.length', 30)));
        $widthInches = $this->cmToInches((float) ($parcel['width'] ?? config('services.shipping.default_parcel.width', 20)));
        $heightInches = $this->cmToInches((float) ($parcel['height'] ?? config('services.shipping.default_parcel.height', 10)));
        $weightOunces = $this->kgToOunces((float) ($parcel['weight'] ?? config('services.shipping.default_parcel.weight', 2)));

        return [
            'length' => $lengthInches,
            'width' => $widthInches,
            'height' => $heightInches,
            'weight' => $weightOunces,
        ];
    }

    /**
     * @param  array<string, mixed>  $parcel
     * @return array<string, mixed>
     */
    private function shipmentOptionsPayload(array $parcel): array
    {
        $lengthInches = $this->cmToInches((float) ($parcel['length'] ?? config('services.shipping.default_parcel.length', 30)));
        $widthInches = $this->cmToInches((float) ($parcel['width'] ?? config('services.shipping.default_parcel.width', 20)));
        $heightInches = $this->cmToInches((float) ($parcel['height'] ?? config('services.shipping.default_parcel.height', 10)));
        $weightOunces = $this->kgToOunces((float) ($parcel['weight'] ?? config('services.shipping.default_parcel.weight', 2)));
        $shippingClass = (string) ($parcel['shipping_class'] ?? 'standard');

        $sortedDimensions = collect([$lengthInches, $widthInches, $heightInches])->sortDesc()->values();
        $longestSide = (float) ($sortedDimensions[0] ?? 0);
        $secondLongestSide = (float) ($sortedDimensions[1] ?? 0);
        $requiresAdditionalHandling = in_array($shippingClass, ['bulky', 'oversized'], true)
            || $longestSide > 60
            || $secondLongestSide > 30
            || $weightOunces > 1120;

        return $requiresAdditionalHandling ? [
            'additional_handling' => true,
        ] : [];
    }

    private function cmToInches(float $cm): float
    {
        return round(max(0.1, $cm / 2.54), 1);
    }

    private function kgToOunces(float $kg): float
    {
        return round(max(0.1, $kg * 35.27396195), 1);
    }

    /**
     * @param  array<int, string>  $statuses
     */
    private function aggregateTrackingStatus(array $statuses): string
    {
        $statuses = array_values(array_filter($statuses, fn ($value) => is_string($value) && $value !== ''));

        if (count($statuses) === 0) {
            return 'unknown';
        }

        if (count(array_unique($statuses)) === 1) {
            return $statuses[0];
        }

        if (in_array('out_for_delivery', $statuses, true)) {
            return 'out_for_delivery';
        }

        if (in_array('in_transit', $statuses, true)) {
            return 'in_transit';
        }

        if (in_array('pre_transit', $statuses, true)) {
            return 'pre_transit';
        }

        return $statuses[0];
    }

    private function isPremiumService(string $service): bool
    {
        $serviceLower = strtolower($service);
        return str_contains($serviceLower, 'express')
            || str_contains($serviceLower, 'before')
            || str_contains($serviceLower, 'next day');
    }
}
