<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Shipping\ShippingManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class OrderShippingController extends Controller
{
    public function __construct(private ShippingManager $shippingManager)
    {
    }

    public function createLabel(Request $request, Order $order)
    {
        if ($this->isClickCollectOrder($order)) {
            return response()->json([
                'message' => 'Shipping labels are not available for click & collect orders.',
            ], 422);
        }

        $trackingNumber = trim((string) $request->input('tracking_number', ''));
        if ($trackingNumber !== '') {
            $order->update(['tracking_number' => $trackingNumber]);
            $order->refresh();
        }

        $updatedOrder = $this->shippingManager->createLabel($order);

        return response()->json($updatedOrder);
    }

    public function refreshTracking(Request $request, Order $order)
    {
        if ($this->isClickCollectOrder($order)) {
            return response()->json([
                'message' => 'Tracking refresh is not available for click & collect orders.',
            ], 422);
        }

        $trackingNumber = trim((string) $request->input('tracking_number', ''));
        if ($trackingNumber !== '') {
            $order->update(['tracking_number' => $trackingNumber]);
            $order->refresh();
        }

        $updatedOrder = $this->shippingManager->refreshTracking($order);

        return response()->json($updatedOrder);
    }

    public function downloadLabel(Order $order)
    {
        $path = $this->resolveLabelPath($order);
        if ($path && Storage::disk('public')->exists($path)) {
            $filename = basename($path);

            return Storage::disk('public')->download($path, $filename);
        }

        $externalUrl = (string) ($order->shipping_label_url ?? '');
        if ($externalUrl !== '' && preg_match('/^https?:\/\//i', $externalUrl)) {
            return redirect()->away($externalUrl);
        }

        return response()->json(['message' => 'Shipping label not found'], 404);
    }

    private function resolveLabelPath(Order $order): ?string
    {
        $metaPath = data_get($order->shipping_metadata, 'label_path');
        if (is_string($metaPath) && $metaPath !== '') {
            return $metaPath;
        }

        $url = (string) ($order->shipping_label_url ?? '');
        if ($url === '') {
            return null;
        }

        $path = parse_url($url, PHP_URL_PATH);
        if (!$path || !is_string($path)) {
            return null;
        }

        $storagePrefix = '/storage/';
        $pos = strpos($path, $storagePrefix);
        if ($pos === false) {
            return null;
        }

        $relative = substr($path, $pos + strlen($storagePrefix));

        return $relative !== '' ? $relative : null;
    }

    private function isClickCollectOrder(Order $order): bool
    {
        return data_get($order->shipping_metadata, 'fulfilment_method') === 'click_collect';
    }
}
