<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Shipping\ShippingManager;
use App\Shipping\ShippingQuoteStore;
use Illuminate\Http\Request;
use Throwable;

class ShippingController extends Controller
{
    public function __construct(
        private ShippingManager $shippingManager,
        private ShippingQuoteStore $shippingQuoteStore,
    ) {}

    public function options(Request $request)
    {
        $validated = $request->validate([
            'fulfilment_method' => 'nullable|in:delivery,click_collect',
            'shipping_address_line1' => 'nullable|string|max:255',
            'shipping_address_line2' => 'nullable|string|max:255',
            'shipping_city' => 'nullable|string|max:255',
            'shipping_postcode' => 'nullable|string|max:255',
            'shipping_county' => 'nullable|string|max:255',
            'shipping_country' => 'nullable|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.selected_variants' => 'nullable|array',
        ]);

        $fulfilment = $validated['fulfilment_method'] ?? 'delivery';
        if ($fulfilment === 'click_collect') {
            return response()->json([
                'fulfilment_method' => 'click_collect',
                'options' => [],
            ]);
        }

        try {
            $options = $this->shippingManager->quoteOptions([
                'street1' => $validated['shipping_address_line1'] ?? '',
                'street2' => $validated['shipping_address_line2'] ?? '',
                'city' => $validated['shipping_city'] ?? '',
                'postcode' => $validated['shipping_postcode'] ?? '',
                'county' => $validated['shipping_county'] ?? '',
                'country' => 'GB',
            ], $validated['items']);
        } catch (Throwable $e) {
            return response()->json([
                'message' => $e->getMessage() ?: 'Unable to fetch courier rates right now.',
            ], 422);
        }

        $issued = collect($options)
            ->map(fn (array $option) => $this->shippingQuoteStore->issue($option))
            ->values()
            ->all();

        return response()->json([
            'fulfilment_method' => 'delivery',
            'options' => $issued,
        ]);
    }
}
