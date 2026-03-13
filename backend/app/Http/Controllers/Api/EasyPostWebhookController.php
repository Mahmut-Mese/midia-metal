<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use DateTime;
use DateTimeInterface;
use Illuminate\Http\Request;

class EasyPostWebhookController extends Controller
{
    public function handle(Request $request)
    {
        $secret = config('services.easypost.webhook_secret') ?: env('EASYPOST_WEBHOOK_SECRET');
        if ($secret && !$this->verifySignature($request, (string) $secret)) {
            return response()->json(['message' => 'Invalid webhook signature'], 401);
        }

        $payload = $request->json()->all();
        if (empty($payload)) {
            $payload = json_decode((string) $request->getContent(), true) ?: [];
        }

        $eventType = data_get($payload, 'description') ?? data_get($payload, 'type');
        $result = data_get($payload, 'result') ?? data_get($payload, 'data.result');

        if (!is_array($result)) {
            return response()->json(['received' => true, 'event' => $eventType]);
        }

        $trackingCode = data_get($result, 'tracking_code') ?? data_get($result, 'tracking_code');
        $status = data_get($result, 'status');
        $carrier = data_get($result, 'carrier');
        $shipmentId = data_get($result, 'shipment_id');
        $publicUrl = data_get($result, 'public_url');
        $statusDetail = data_get($result, 'status_detail');
        $trackerId = data_get($result, 'id');

        $order = null;
        if ($trackingCode) {
            $order = Order::where('tracking_number', $trackingCode)->latest()->first();
        }
        if (!$order && $shipmentId) {
            $order = Order::where('shipping_shipment_id', $shipmentId)->latest()->first();
        }

        if (!$order) {
            return response()->json(['received' => true, 'event' => $eventType]);
        }

        $shippingStatus = is_string($status) && $status !== '' ? $status : $order->shipping_status;
        $nextOrderStatus = $this->mapTrackingStatusToOrderStatus((string) $shippingStatus, (string) $order->status);

        $order->update(array_filter([
            'tracking_number' => $trackingCode ?: $order->tracking_number,
            'shipping_provider' => 'easypost',
            'shipping_carrier' => $carrier ?: $order->shipping_carrier,
            'shipping_status' => $shippingStatus,
            'shipping_shipment_id' => $shipmentId ?: $order->shipping_shipment_id,
            'shipping_tracking_url' => $publicUrl ?: $order->shipping_tracking_url,
            'shipping_metadata' => array_merge($order->shipping_metadata ?? [], [
                'webhook_event' => $eventType,
                'webhook_received_at' => now()->toIso8601String(),
                'tracker_id' => $trackerId,
                'status_detail' => $statusDetail,
            ]),
            'status' => $nextOrderStatus,
        ], static fn ($value) => $value !== null));

        return response()->json(['received' => true, 'event' => $eventType]);
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

    private function verifySignature(Request $request, string $secret): bool
    {
        $timestamp = $request->header('x-timestamp');
        $signature = $request->header('x-hmac-signature-v2') ?? $request->header('x-hmac-signature');
        $path = $request->header('x-path');

        if (!$timestamp || !$signature || !$path) {
            return false;
        }

        $timestampDate = $this->parseTimestamp($timestamp);
        if (!$timestampDate) {
            return false;
        }

        $toleranceMinutes = (int) (env('EASYPOST_WEBHOOK_TOLERANCE_MINUTES') ?: 5);
        $now = now();
        if (abs($now->diffInSeconds($timestampDate)) > ($toleranceMinutes * 60)) {
            return false;
        }

        $method = strtoupper($request->getMethod());
        $body = (string) $request->getContent();
        $stringToSign = $timestamp . $method . $path . $body;

        $computed = hash_hmac('sha256', $stringToSign, $secret);
        $provided = preg_replace('/^hmac-sha256-hex=/i', '', (string) $signature);

        return hash_equals($computed, (string) $provided);
    }

    private function parseTimestamp(string $timestamp): ?DateTimeInterface
    {
        $formats = [
            DateTime::RFC2822,
            DateTime::RFC7231,
            'D, d M Y H:i:s T',
        ];

        foreach ($formats as $format) {
            $date = DateTime::createFromFormat($format, $timestamp);
            if ($date instanceof DateTime) {
                return $date;
            }
        }

        return null;
    }
}
