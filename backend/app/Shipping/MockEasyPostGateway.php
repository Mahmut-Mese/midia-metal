<?php

namespace App\Shipping;

use App\Models\Order;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MockEasyPostGateway implements ShippingGateway
{
    /**
     * EasyPost official test tracking codes from the tracker docs.
     *
     * @var array<string, array<string, string>>
     */
    public const MAGIC_TRACKING_CODES = [
        'EZ1000000001' => [
            'status' => 'pre_transit',
            'detail' => 'Shipment information received by carrier.',
        ],
        'EZ2000000002' => [
            'status' => 'in_transit',
            'detail' => 'Parcel is moving through the carrier network.',
        ],
        'EZ3000000003' => [
            'status' => 'out_for_delivery',
            'detail' => 'Parcel is out for delivery.',
        ],
        'EZ4000000004' => [
            'status' => 'delivered',
            'detail' => 'Parcel delivered successfully.',
        ],
        'EZ5000000005' => [
            'status' => 'return_to_sender',
            'detail' => 'Parcel is returning to sender.',
        ],
        'EZ6000000006' => [
            'status' => 'failure',
            'detail' => 'Carrier reported an exception for this parcel.',
        ],
        'EZ7000000007' => [
            'status' => 'unknown',
            'detail' => 'Carrier could not determine the parcel status.',
        ],
    ];

    public function provider(): string
    {
        return 'easypost';
    }

    public function quote(array $toAddress, array $items = [], array $context = []): array
    {
        $baseRate = round((float) config('services.shipping.default_rate', 6.50), 2);
        $currency = 'GBP';
        $profile = $this->resolveDeliveryProfile($toAddress);
        $parcelSummary = is_array($context['parcel_summary'] ?? null) ? $context['parcel_summary'] : [];
        $parcelCount = max(1, (int) ($parcelSummary['parcel_count'] ?? 1));
        $totalWeight = max(0, (float) ($parcelSummary['total_weight_kg'] ?? config('services.shipping.default_parcel.weight', 2)));
        $classes = collect($parcelSummary['shipping_classes'] ?? [])->map(fn ($value) => (string) $value)->all();
        $classSurcharge = in_array('oversized', $classes, true) ? 12.00 : (in_array('bulky', $classes, true) ? 5.00 : 0.00);
        $parcelSurcharge = max(0, $parcelCount - 1) * 3.50;
        $weightSurcharge = max(0, ceil(max(0, $totalWeight - 2))) * 1.25;
        $standardRate = round($baseRate + $profile['rate_surcharge'] + $classSurcharge + $parcelSurcharge + $weightSurcharge, 2);

        $estimatedDate48 = CarbonImmutable::now('Europe/London')->addWeekdays($profile['tracked_48_days'])->format('Y-m-d');
        $estimatedDate24 = CarbonImmutable::now('Europe/London')->addWeekdays($profile['tracked_24_days'])->format('Y-m-d');
        $estimatedDateSD = CarbonImmutable::now('Europe/London')->addWeekdays(1)->format('Y-m-d');

        return [
            [
                'provider' => $this->provider(),
                'carrier' => 'Royal Mail',
                'service' => 'Royal Mail Tracked 48',
                'service_code' => 'tracked_48',
                'rate' => $standardRate,
                'currency' => $currency,
                'delivery_days' => $profile['tracked_48_days'],
                'estimated_delivery_date' => $estimatedDate48,
                'estimated_delivery_window_start' => '08:00',
                'estimated_delivery_window_end' => '18:00',
                'is_premium' => false,
                'rate_id' => 'mock_tracked_48',
                'rate_ids' => [['rate_id' => 'mock_tracked_48', 'parcel_reference' => 'aggregate']],
                'parcels' => $context['parcels'] ?? [],
                'parcel_summary' => $parcelSummary,
            ],
            [
                'provider' => $this->provider(),
                'carrier' => 'Royal Mail',
                'service' => 'Royal Mail Tracked 24',
                'service_code' => 'tracked_24',
                'rate' => round($standardRate + 3.50, 2),
                'currency' => $currency,
                'delivery_days' => $profile['tracked_24_days'],
                'estimated_delivery_date' => $estimatedDate24,
                'estimated_delivery_window_start' => '08:00',
                'estimated_delivery_window_end' => '18:00',
                'is_premium' => false,
                'rate_id' => 'mock_tracked_24',
                'rate_ids' => [['rate_id' => 'mock_tracked_24', 'parcel_reference' => 'aggregate']],
                'parcels' => $context['parcels'] ?? [],
                'parcel_summary' => $parcelSummary,
            ],
            [
                'provider' => $this->provider(),
                'carrier' => 'Royal Mail',
                'service' => 'Royal Mail Special Delivery Guaranteed by 1pm',
                'service_code' => 'special_delivery_1pm',
                'rate' => round($standardRate + 12.00 + $profile['premium_surcharge'], 2),
                'currency' => $currency,
                'delivery_days' => 1,
                'estimated_delivery_date' => $estimatedDateSD,
                'estimated_delivery_window_start' => '07:30',
                'estimated_delivery_window_end' => '13:00',
                'is_premium' => true,
                'rate_id' => 'mock_special_delivery_1pm',
                'rate_ids' => [['rate_id' => 'mock_special_delivery_1pm', 'parcel_reference' => 'aggregate']],
                'parcels' => $context['parcels'] ?? [],
                'parcel_summary' => $parcelSummary,
            ],
        ];
    }

    public function createLabel(Order $order, array $context = []): array
    {
        $parcels = is_array($context['parcels'] ?? null) ? $context['parcels'] : [];
        $packageCount = max(1, count($parcels));
        $shipments = [];

        for ($index = 0; $index < $packageCount; $index++) {
            $trackingNumber = $index === 0
                ? trim((string) ($order->tracking_number ?: 'EZ1000000001'))
                : 'EZ' . str_pad((string) random_int(1000000000, 9999999999), 10, '0', STR_PAD_LEFT);
            $tracking = $this->resolveTracking($trackingNumber);
            $shipments[] = [
                'tracking_number' => $trackingNumber,
                'shipment_id' => ($order->shipping_shipment_id ?: 'mock_easypost_' . Str::lower(Str::random(18))) . '_' . ($index + 1),
                'status' => $tracking['status'],
                'detail' => $tracking['detail'],
                'parcel' => $parcels[$index] ?? null,
            ];
        }

        $primaryShipment = $shipments[0];
        $trackingNumber = (string) $primaryShipment['tracking_number'];
        $tracking = $this->resolveTracking($trackingNumber);
        $shipmentId = $order->shipping_shipment_id ?: 'mock_easypost_' . Str::lower(Str::random(18));
        $labelPath = $this->writeLabel($order, $shipmentId, $trackingNumber);

        return [
            'tracking_number' => $primaryShipment['tracking_number'],
            'shipping_provider' => $this->provider(),
            'shipping_carrier' => 'Royal Mail',
            'shipping_service' => data_get($order->shipping_metadata, 'selected_delivery_option.service', 'Royal Mail Tracked 48'),
            'shipping_status' => $tracking['status'],
            'shipping_shipment_id' => $shipmentId,
            'shipping_label_url' => url(Storage::url($labelPath)),
            'shipping_tracking_url' => null,
            'shipping_metadata' => [
                'mode' => 'mock',
                'gateway' => 'easypost',
                'mock_tracking_code' => $primaryShipment['tracking_number'],
                'tracking_detail' => $tracking['detail'],
                'label_path' => $labelPath,
                'supported_magic_codes' => array_keys(self::MAGIC_TRACKING_CODES),
                'parcels' => $parcels,
                'parcel_summary' => $context['parcel_summary'] ?? null,
                'shipments' => $shipments,
                'label_generated_at' => now()->toIso8601String(),
            ],
        ];
    }

    public function track(Order $order): array
    {
        $shipmentRecords = data_get($order->shipping_metadata, 'shipments', []);
        if (is_array($shipmentRecords) && count($shipmentRecords) > 0) {
            $resolved = collect($shipmentRecords)
                ->map(function (array $shipment) {
                    $trackingNumber = (string) ($shipment['tracking_number'] ?? 'EZ7000000007');
                    $tracking = $this->resolveTracking($trackingNumber);

                    return array_merge($shipment, [
                        'status' => $tracking['status'],
                        'detail' => $tracking['detail'],
                    ]);
                })
                ->values()
                ->all();

            $primary = $resolved[0];

            return [
                'tracking_number' => $primary['tracking_number'] ?? $order->tracking_number,
                'shipping_provider' => $order->shipping_provider ?: $this->provider(),
                'shipping_carrier' => $order->shipping_carrier ?: 'Royal Mail',
                'shipping_service' => $order->shipping_service ?: 'Royal Mail Tracked 48',
                'shipping_status' => $this->aggregateStatus(array_column($resolved, 'status')),
                'shipping_metadata' => array_merge($order->shipping_metadata ?? [], [
                    'mode' => 'mock',
                    'gateway' => 'easypost',
                    'tracking_detail' => $primary['detail'] ?? null,
                    'last_checked_at' => now()->toIso8601String(),
                    'supported_magic_codes' => array_keys(self::MAGIC_TRACKING_CODES),
                    'shipments' => $resolved,
                ]),
            ];
        }

        $trackingNumber = trim((string) ($order->tracking_number ?: 'EZ7000000007'));
        $tracking = $this->resolveTracking($trackingNumber);

        return [
            'tracking_number' => $trackingNumber,
            'shipping_provider' => $order->shipping_provider ?: $this->provider(),
            'shipping_carrier' => $order->shipping_carrier ?: 'Royal Mail',
            'shipping_service' => $order->shipping_service ?: 'Royal Mail Tracked 48',
            'shipping_status' => $tracking['status'],
            'shipping_metadata' => array_merge($order->shipping_metadata ?? [], [
                'mode' => 'mock',
                'gateway' => 'easypost',
                'mock_tracking_code' => $trackingNumber,
                'tracking_detail' => $tracking['detail'],
                'last_checked_at' => now()->toIso8601String(),
                'supported_magic_codes' => array_keys(self::MAGIC_TRACKING_CODES),
            ]),
        ];
    }

    public function voidShipment(Order $order): array
    {
        return [
            'shipping_status' => 'voided',
            'shipping_metadata' => array_merge($order->shipping_metadata ?? [], [
                'voided_at' => now()->toIso8601String(),
                'void_results' => [[
                    'shipment_id' => $order->shipping_shipment_id ?: 'mock',
                    'status' => 'submitted',
                    'refund_status' => 'submitted',
                ]],
            ]),
        ];
    }

    public function validateAddress(array $address): array
    {
        return [
            'valid' => true,
            'messages' => [],
            'verified_address' => null,
        ];
    }

    /**
     * @return array{status: string, detail: string}
     */
    public function resolveTracking(string $trackingNumber): array
    {
        return self::MAGIC_TRACKING_CODES[$trackingNumber] ?? self::MAGIC_TRACKING_CODES['EZ7000000007'];
    }

    private function writeLabel(Order $order, string $shipmentId, string $trackingNumber): string
    {
        $filename = sprintf(
            'shipping-labels/%s-%s.html',
            Str::slug($order->order_number),
            Str::after($shipmentId, 'mock_easypost_')
        );

        $html = view('shipping.mock-label', [
            'provider' => 'EasyPost',
            'order' => $order,
            'shipmentId' => $shipmentId,
            'trackingNumber' => $trackingNumber,
            'carrier' => 'Royal Mail',
            'service' => data_get($order->shipping_metadata, 'selected_delivery_option.service', 'Royal Mail Tracked 48'),
            'fromAddress' => [
                config('services.shipping.from_company'),
                config('services.shipping.from_address_line1'),
                config('services.shipping.from_address_line2'),
                trim(config('services.shipping.from_city') . ' ' . config('services.shipping.from_postcode')),
                config('services.shipping.from_county'),
            ],
            'toAddress' => [
                $order->customer_name,
                $order->shipping_address_line1 ?: $order->shipping_address,
                $order->shipping_address_line2,
                trim(($order->shipping_city ?: '') . ' ' . ($order->shipping_postcode ?: '')),
                $order->shipping_county ?: '',
            ],
        ])->render();

        Storage::disk('public')->put($filename, $html);

        return $filename;
    }

    /**
     * @param  array<string, mixed>  $toAddress
     * @return array{tracked_48_days:int,tracked_24_days:int,rate_surcharge:float,premium_surcharge:float}
     */
    private function resolveDeliveryProfile(array $toAddress): array
    {
        $postcode = strtoupper(trim((string) ($toAddress['postcode'] ?? '')));
        $city = strtoupper(trim((string) ($toAddress['city'] ?? '')));

        $isRemote = $this->matchesPrefix($postcode, ['AB', 'HS', 'IV', 'KW', 'PA', 'PH', 'ZE', 'IM']);
        $isNorthernIreland = $this->matchesPrefix($postcode, ['BT']);
        $isScotland = $this->matchesPrefix($postcode, ['DD', 'DG', 'EH', 'FK', 'G', 'KA', 'KY', 'ML', 'TD']) || str_contains($city, 'GLASGOW') || str_contains($city, 'EDINBURGH');
        $isLondon = $this->matchesPrefix($postcode, ['E', 'EC', 'N', 'NW', 'SE', 'SW', 'W', 'WC']) || str_contains($city, 'LONDON');

        if ($isNorthernIreland) {
            return [
                'tracked_48_days' => 3,
                'tracked_24_days' => 2,
                'rate_surcharge' => 4.50,
                'premium_surcharge' => 2.00,
            ];
        }

        if ($isRemote) {
            return [
                'tracked_48_days' => 4,
                'tracked_24_days' => 3,
                'rate_surcharge' => 7.00,
                'premium_surcharge' => 3.50,
            ];
        }

        if ($isScotland) {
            return [
                'tracked_48_days' => 3,
                'tracked_24_days' => 2,
                'rate_surcharge' => 2.00,
                'premium_surcharge' => 1.50,
            ];
        }

        if ($isLondon) {
            return [
                'tracked_48_days' => 2,
                'tracked_24_days' => 1,
                'rate_surcharge' => 0.00,
                'premium_surcharge' => 0.00,
            ];
        }

        // Default UK mainland
        return [
            'tracked_48_days' => 3,
            'tracked_24_days' => 1,
            'rate_surcharge' => 1.00,
            'premium_surcharge' => 0.50,
        ];
    }

    /**
     * @param  array<int, string>  $prefixes
     */
    private function matchesPrefix(string $postcode, array $prefixes): bool
    {
        $clean = preg_replace('/\s+/', '', strtoupper($postcode));
        if (!$clean) {
            return false;
        }

        preg_match('/^([A-Z]{1,2})/', $clean, $matches);
        $area = $matches[1] ?? '';
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
     * @param  array<int, string>  $statuses
     */
    private function aggregateStatus(array $statuses): string
    {
        if (count($statuses) === 0) {
            return 'unknown';
        }

        if (count(array_unique($statuses)) === 1) {
            return (string) $statuses[0];
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

        return (string) $statuses[0];
    }
}
