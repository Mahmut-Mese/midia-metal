<?php

namespace App\Shipping;

use App\Models\Order;
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

    public function createLabel(Order $order): array
    {
        $trackingNumber = trim((string) ($order->tracking_number ?: 'EZ1000000001'));
        $tracking = $this->resolveTracking($trackingNumber);
        $shipmentId = $order->shipping_shipment_id ?: 'mock_easypost_' . Str::lower(Str::random(18));
        $labelPath = $this->writeLabel($order, $shipmentId, $trackingNumber);

        return [
            'tracking_number' => $trackingNumber,
            'shipping_provider' => $this->provider(),
            'shipping_carrier' => config('services.easypost.default_carrier', 'Royal Mail'),
            'shipping_service' => config('services.easypost.default_service', 'Tracked 48'),
            'shipping_status' => $tracking['status'],
            'shipping_shipment_id' => $shipmentId,
            'shipping_label_url' => url(Storage::url($labelPath)),
            'shipping_tracking_url' => null,
            'shipping_metadata' => [
                'mode' => 'mock',
                'gateway' => 'easypost',
                'mock_tracking_code' => $trackingNumber,
                'tracking_detail' => $tracking['detail'],
                'label_path' => $labelPath,
                'supported_magic_codes' => array_keys(self::MAGIC_TRACKING_CODES),
                'parcel' => config('services.shipping.default_parcel', []),
            ],
        ];
    }

    public function track(Order $order): array
    {
        $trackingNumber = trim((string) ($order->tracking_number ?: 'EZ7000000007'));
        $tracking = $this->resolveTracking($trackingNumber);

        return [
            'tracking_number' => $trackingNumber,
            'shipping_provider' => $order->shipping_provider ?: $this->provider(),
            'shipping_carrier' => $order->shipping_carrier ?: config('services.easypost.default_carrier', 'Royal Mail'),
            'shipping_service' => $order->shipping_service ?: config('services.easypost.default_service', 'Tracked 48'),
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
            'carrier' => config('services.easypost.default_carrier', 'Royal Mail'),
            'service' => config('services.easypost.default_service', 'Tracked 48'),
            'fromAddress' => [
                config('services.shipping.from_company'),
                config('services.shipping.from_address_line1'),
                config('services.shipping.from_address_line2'),
                trim(config('services.shipping.from_city') . ' ' . config('services.shipping.from_postcode')),
                config('services.shipping.from_country'),
            ],
            'toAddress' => [
                $order->customer_name,
                $order->shipping_address_line1 ?: $order->shipping_address,
                $order->shipping_address_line2,
                trim(($order->shipping_city ?: '') . ' ' . ($order->shipping_postcode ?: '')),
                $order->shipping_country ?: '',
            ],
        ])->render();

        Storage::disk('public')->put($filename, $html);

        return $filename;
    }
}
