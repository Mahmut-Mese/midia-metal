<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Shipping\InterparcelGateway;
use App\Shipping\ShippingManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class OrderShippingController extends Controller
{
    public function __construct(private ShippingManager $shippingManager) {}

    public function createLabel(Request $request, Order $order)
    {
        if ($this->isClickCollectOrder($order)) {
            return response()->json([
                'message' => 'Shipping labels are not available for click & collect orders.',
            ], 422);
        }

        $context = $request->validate([
            'confirm_booking' => 'sometimes|boolean',
            'pickup' => 'sometimes|array:date,earliest,latest',
            'pickup.date' => 'sometimes|date_format:Y-m-d',
            'pickup.earliest' => 'sometimes|date_format:H:i',
            'pickup.latest' => 'sometimes|date_format:H:i',
            'max_cost' => 'sometimes|numeric|min:0.01',
        ]);
        $updatedOrder = $this->shippingManager->createLabel($order, $context);

        return response()->json($updatedOrder);
    }

    public function refreshTracking(Request $request, Order $order)
    {
        if ($this->isClickCollectOrder($order)) {
            return response()->json([
                'message' => 'Tracking refresh is not available for click & collect orders.',
            ], 422);
        }

        $updatedOrder = $this->shippingManager->refreshTracking($order);

        return response()->json($updatedOrder);
    }

    public function voidShipment(Request $request, Order $order)
    {
        if ($this->isClickCollectOrder($order)) {
            return response()->json([
                'message' => 'Void is not available for click & collect orders.',
            ], 422);
        }

        if (! $order->shipping_shipment_id && empty(data_get($order->shipping_metadata, 'shipments'))) {
            return response()->json([
                'message' => 'No shipping label has been created for this order.',
            ], 422);
        }

        $updatedOrder = $this->shippingManager->voidShipment($order);

        return response()->json($updatedOrder);
    }

    public function downloadLabel(Request $request, Order $order)
    {
        if ($order->shipping_provider === 'interparcel') {
            $validated = $request->validate(['shipment' => 'sometimes|integer|min:0|max:19']);
            $index = (int) ($validated['shipment'] ?? 0);
            $pdf = app(InterparcelGateway::class)->downloadLabel($order, $index);

            return response($pdf, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="interparcel-'.$order->id.'-'.($index + 1).'.pdf"',
                'Cache-Control' => 'private, no-store',
            ]);
        }
        $path = $this->resolveLabelPath($order);
        if ($path && Storage::disk('public')->exists($path)) {
            $filename = basename($path);

            return Storage::disk('public')->download($path, $filename);
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
        if (! $path || ! is_string($path)) {
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
