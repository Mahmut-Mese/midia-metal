<?php

namespace App\Shipping;

use App\Models\Order;
use RuntimeException;

class ShippingManager
{
    public function gateway(): ShippingGateway
    {
        $provider = (string) config('services.shipping.provider', 'easypost');
        $mock = (bool) config('services.shipping.mock', true);

        if ($mock) {
            return match ($provider) {
                'easypost' => new MockEasyPostGateway(),
                default => throw new RuntimeException("Unsupported mock shipping provider [{$provider}]."),
            };
        }

        return match ($provider) {
            'easypost' => new EasyPostGateway(),
            default => throw new RuntimeException("Unsupported shipping provider [{$provider}]."),
        };
    }

    public function createLabel(Order $order): Order
    {
        $payload = $this->gateway()->createLabel($order);

        return $this->persist($order, $payload);
    }

    public function refreshTracking(Order $order): Order
    {
        $payload = $this->gateway()->track($order);

        return $this->persist($order, $payload);
    }

    private function persist(Order $order, array $payload): Order
    {
        $trackingStatus = $payload['shipping_status'] ?? $order->shipping_status;
        $nextOrderStatus = $this->mapTrackingStatusToOrderStatus((string) $trackingStatus, (string) $order->status);

        $order->update(array_filter([
            'tracking_number' => $payload['tracking_number'] ?? $order->tracking_number,
            'shipping_provider' => $payload['shipping_provider'] ?? $order->shipping_provider,
            'shipping_carrier' => $payload['shipping_carrier'] ?? $order->shipping_carrier,
            'shipping_service' => $payload['shipping_service'] ?? $order->shipping_service,
            'shipping_status' => $trackingStatus,
            'shipping_shipment_id' => $payload['shipping_shipment_id'] ?? $order->shipping_shipment_id,
            'shipping_label_url' => $payload['shipping_label_url'] ?? $order->shipping_label_url,
            'shipping_tracking_url' => $payload['shipping_tracking_url'] ?? $order->shipping_tracking_url,
            'shipping_metadata' => $payload['shipping_metadata'] ?? $order->shipping_metadata,
            'status' => $nextOrderStatus,
        ], static fn ($value) => $value !== null));

        return $order->fresh('items');
    }

    private function mapTrackingStatusToOrderStatus(string $shippingStatus, string $currentOrderStatus): string
    {
        if ($currentOrderStatus === 'cancelled') {
            return $currentOrderStatus;
        }

        return match ($shippingStatus) {
            'pre_transit' => in_array($currentOrderStatus, ['pending', 'processing'], true) ? 'processing' : $currentOrderStatus,
            'in_transit', 'out_for_delivery' => 'shipped',
            'delivered' => 'delivered',
            default => $currentOrderStatus,
        };
    }
}
