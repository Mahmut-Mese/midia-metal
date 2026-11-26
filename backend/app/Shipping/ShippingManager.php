<?php

namespace App\Shipping;

use App\Models\Order;
use App\Services\CustomerOrderStatusNotificationService;

class ShippingManager
{
    public function __construct(
        private ParcelBuilder $parcelBuilder,
        private ShippingGateway $gateway,
        private CustomerOrderStatusNotificationService $orderStatusNotifications,
    ) {}

    public function gateway(?Order $order = null): ShippingGateway
    {
        if ($order && $order->shipping_provider !== 'interparcel') {
            throw new ShippingException('This order was not booked with Interparcel. Its saved shipping details cannot be updated through Interparcel.');
        }

        return $this->gateway;
    }

    public function createLabel(Order $order, array $context = []): Order
    {
        // Interparcel uses the exact consignment plan saved with the chosen checkout quote.
        $payload = $this->gateway($order)->createLabel($order, $context);

        return $this->persist($order, $payload);
    }

    /**
     * @param  array<string, mixed>  $toAddress
     * @param  array<int, array<string, mixed>>  $items
     * @param  array<string, mixed>  $context
     * @return array<int, array<string, mixed>>
     */
    public function quoteOptions(array $toAddress, array $items = [], array $context = []): array
    {
        $parcelPlan = $this->parcelBuilder->buildForCheckoutItems($items, true);

        return $this->gateway()->quote($toAddress, $items, array_merge($context, $parcelPlan));
    }

    public function refreshTracking(Order $order): Order
    {
        $payload = $this->gateway($order)->track($order);

        return $this->persist($order, $payload);
    }

    /**
     * Void / refund an unused shipment label.
     */
    public function voidShipment(Order $order): Order
    {
        $payload = $this->gateway($order)->voidShipment($order);

        return $this->persist($order, $payload);
    }

    /**
     * Validate a shipping address via the courier.
     *
     * @param  array<string, mixed>  $address
     * @return array{valid: bool, messages: array<int, string>, verified_address: array<string, mixed>|null}
     */
    public function validateAddress(array $address): array
    {
        return $this->gateway()->validateAddress($address);
    }

    private function persist(Order $order, array $payload): Order
    {
        $previousOrderStatus = $order->status;
        $trackingStatus = $payload['shipping_status'] ?? $order->shipping_status;
        $nextOrderStatus = $this->mapTrackingStatusToOrderStatus((string) $trackingStatus, (string) $order->status);
        $existingMetadata = is_array($order->shipping_metadata) ? $order->shipping_metadata : [];
        $payloadMetadata = is_array($payload['shipping_metadata'] ?? null) ? $payload['shipping_metadata'] : [];
        $mergedMetadata = array_merge($existingMetadata, $payloadMetadata);

        $order->update(array_filter([
            'tracking_number' => $payload['tracking_number'] ?? $order->tracking_number,
            'shipping_provider' => $payload['shipping_provider'] ?? $order->shipping_provider,
            'shipping_carrier' => $payload['shipping_carrier'] ?? $order->shipping_carrier,
            'shipping_service' => $payload['shipping_service'] ?? $order->shipping_service,
            'shipping_status' => $trackingStatus,
            'shipping_shipment_id' => $payload['shipping_shipment_id'] ?? $order->shipping_shipment_id,
            'shipping_label_url' => $payload['shipping_label_url'] ?? $order->shipping_label_url,
            'shipping_tracking_url' => $payload['shipping_tracking_url'] ?? $order->shipping_tracking_url,
            'shipping_metadata' => $mergedMetadata,
            'status' => $nextOrderStatus,
        ], static fn ($value) => $value !== null));

        $updatedOrder = $order->fresh('items');
        if ($updatedOrder && $updatedOrder->status !== $previousOrderStatus) {
            $this->orderStatusNotifications->send($updatedOrder, $previousOrderStatus);
        }

        return $updatedOrder;
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
            'voided' => $currentOrderStatus,
            default => $currentOrderStatus,
        };
    }
}
