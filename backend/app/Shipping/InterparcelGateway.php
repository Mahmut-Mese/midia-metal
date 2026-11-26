<?php

namespace App\Shipping;

use App\Models\InterparcelBooking;
use App\Models\Order;
use App\Support\ProductVariantResolver;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class InterparcelGateway implements ShippingGateway
{
    public function __construct(private InterparcelClient $client) {}

    public function provider(): string
    {
        return 'interparcel';
    }

    public function quote(array $toAddress, array $items = [], array $context = []): array
    {
        $collection = $this->quoteAddress($this->sender());
        $delivery = $this->quoteAddress($toAddress);
        $groups = [];
        foreach (['parcel' => $context['parcels'] ?? [], 'pallet' => $context['pallets'] ?? []] as $type => $parcels) {
            if ($parcels === []) {
                continue;
            }
            $allowed = config('services.interparcel.'.$type.'_services', []);
            $filter = [
                'serviceLevel' => $type === 'pallet' ? ['pallet'] : ['standard', 'express', 'timed'],
                'pickupType' => ['collection'],
            ];
            if ($allowed !== []) {
                $filter['services'] = $allowed;
            }
            $body = $this->client->json('POST', '/quote', 3, [
                'collection' => $collection, 'delivery' => $delivery,
                'filter' => $filter, 'parcels' => $this->apiParcels($parcels),
            ]);
            if (! is_array($body['services'] ?? null)) {
                throw new ShippingException('Interparcel returned an incomplete quote. Please try again.');
            }
            $options = [];
            foreach ($body['services'] as $service) {
                if (! is_array($service) || ($service['currency'] ?? '') !== 'GBP'
                    || ($service['pickupType'] ?? '') !== 'collection'
                    || empty($service['id']) || ! is_numeric($service['price'] ?? null) || $service['price'] <= 0
                    || ! is_bool($service['taxable'] ?? null)
                    || (($service['serviceLevel'] ?? '') === 'pallet') !== ($type === 'pallet')
                    || ($allowed !== [] && ! in_array($service['id'], $allowed, true))) {
                    continue;
                }
                $price = (float) $service['price'];
                if ($service['taxable'] && ! config('services.interparcel.quote_prices_include_vat')) {
                    $price *= 1 + (float) config('services.interparcel.vat_rate', 20) / 100;
                }
                $options[] = [
                    'type' => $type, 'service_code' => (string) $service['id'],
                    'service' => (string) ($service['service'] ?? $service['name'] ?? $service['id']),
                    'carrier' => (string) ($service['carrier'] ?? 'Interparcel'),
                    'rate' => round($price, 2), 'currency' => 'GBP',
                    'days_from' => max(0, (int) data_get($service, 'delivery.daysFrom', 0)),
                    'days_to' => max(0, (int) data_get($service, 'delivery.daysTo', 0)),
                    'printer_needed' => (bool) ($service['printerNeeded'] ?? true),
                    'parcels' => $parcels,
                ];
            }
            if ($options === []) {
                return []; // Every group must be deliverable; never quote only part of the basket.
            }
            $groups[] = collect($options)->sortBy('rate')->take(10)->values()->all();
        }
        if ($groups === []) {
            throw new ShippingException('Add measured products before requesting delivery.');
        }

        $combinations = [[]];
        foreach ($groups as $options) {
            $next = [];
            foreach ($combinations as $combination) {
                foreach ($options as $option) {
                    $next[] = [...$combination, $option];
                }
            }
            $combinations = $next;
        }

        return collect($combinations)->map(function (array $consignments) {
            $parcels = collect($consignments)->flatMap(fn ($c) => $c['parcels']);
            $days = max(array_column($consignments, 'days_to'));

            return [
                'provider' => $this->provider(), 'mode' => 'live',
                'rate' => round(array_sum(array_column($consignments, 'rate')), 2), 'currency' => 'GBP',
                'carrier' => implode(' + ', array_unique(array_column($consignments, 'carrier'))),
                'service' => implode(' + ', array_column($consignments, 'service')),
                'service_code' => implode('+', array_column($consignments, 'service_code')),
                'delivery_days' => $days ?: null,
                'estimated_delivery_date' => $days ? now()->addWeekdays($days + 1)->toDateString() : null,
                'consignments' => $consignments,
                'parcel_summary' => [
                    'parcel_count' => $parcels->count(), 'total_weight_kg' => round($parcels->sum('weight'), 3),
                    'pallet_count' => $parcels->where('shipping_class', 'freight')->count(),
                ],
            ];
        })->sortBy('rate')->take(20)->values()->all();
    }

    public function createLabel(Order $order, array $context = []): array
    {
        if (! config('services.interparcel.booking_enabled')) {
            throw new ShippingException('Interparcel paid bookings are disabled. Enable INTERPARCEL_BOOKING_ENABLED only when ready to arrange real collections.');
        }
        if (! ($context['confirm_booking'] ?? false)) {
            throw new ShippingException('Confirm the paid Interparcel booking before continuing.');
        }
        if ($order->payment_status !== 'paid' || in_array($order->status, ['cancelled', 'delivered', 'collected'], true)) {
            throw new ShippingException('Only paid, unfulfilled orders can be booked with Interparcel.');
        }

        $lock = Cache::lock('interparcel-booking:'.$order->id, 120);
        if (! $lock->get()) {
            throw new ShippingException('This order is already being booked. Wait, then refresh tracking.');
        }
        try {
            $booking = InterparcelBooking::where('order_id', $order->id)->first();
            if (! $booking) {
                $key = (string) Str::uuid();
                $request = $this->bookingRequest($order, $context, $key);
                // Save before contacting Interparcel. Ambiguous failures MUST reuse this exact request and key.
                $booking = InterparcelBooking::firstOrCreate(['order_id' => $order->id], [
                    'idempotency_key' => $key, 'request' => $request,
                ]);
            }
            if (! $booking->shipments) {
                $response = $this->client->json('POST', '/orders', 2, $booking->request);
                $orders = $response['orders'] ?? [];
                if (($response['bookingStatus'] ?? '') !== 'accepted' || ! is_array($orders)
                    || count($orders) !== count($booking->request['orders'])) {
                    throw new ShippingException('Interparcel returned an incomplete booking. Retry this same order; do not book it separately.');
                }
                $shipments = [];
                foreach ($orders as $remote) {
                    if (! ctype_digit((string) ($remote['orderId'] ?? ''))) {
                        throw new ShippingException('Interparcel returned an invalid booking reference. Retry this same order.');
                    }
                    $shipments[] = $this->shipment($remote);
                }
                $booking->update(['shipments' => $shipments]);
            }

            return $this->payload($order, $booking->shipments);
        } finally {
            $lock->release();
        }
    }

    public function track(Order $order): array
    {
        $booking = InterparcelBooking::where('order_id', $order->id)->first();
        if (! $booking?->shipments) {
            throw new ShippingException('No confirmed Interparcel booking yet. Retry the original booking if its response was interrupted.');
        }
        $shipments = [];
        foreach ($booking->shipments as $existing) {
            $body = $this->client->json('GET', '/orders/'.$existing['order_id'], 2);
            $remote = $body['order'] ?? [];
            if ((string) ($remote['orderId'] ?? '') !== $existing['order_id']) {
                throw new ShippingException('Interparcel returned an unexpected order reference.');
            }
            $shipment = $this->shipment($remote, $existing);
            if ($shipment['booking_status'] === 'booked' && preg_match('/^GB\d{10}$/', $shipment['tracking_number'])) {
                $tracking = $this->client->json('GET', '/tracking/'.$shipment['tracking_number'], 1);
                $shipment['tracking_status'] = match ($tracking['currentStatus'] ?? '') {
                    'B' => 'pre_transit', 'T' => 'in_transit', 'O' => 'out_for_delivery', 'D' => 'delivered',
                    default => $existing['tracking_status'] ?? 'unknown',
                };
                $shipment['tracking_detail'] = (string) data_get($tracking, 'events.0.event', '');
            }
            $shipments[] = $shipment;
        }
        $booking->update(['shipments' => $shipments]);

        return $this->payload($order, $shipments);
    }

    public function downloadLabel(Order $order, int $index = 0): string
    {
        $booking = InterparcelBooking::where('order_id', $order->id)->first();
        $id = $booking?->shipments[$index]['order_id'] ?? null;
        if (! $id) {
            throw new ShippingException('No Interparcel shipment exists for this label.');
        }

        return $this->client->label($id);
    }

    public function voidShipment(Order $order): array
    {
        throw new ShippingException('Cancel this booking in your Interparcel account or with Interparcel support. Their documented API does not provide cancellation.');
    }

    public function validateAddress(array $address): array
    {
        try {
            $this->quoteAddress($address);
        } catch (ShippingException $e) {
            return ['valid' => false, 'messages' => [$e->getMessage()], 'verified_address' => null];
        }

        return ['valid' => true, 'messages' => ['Address format checked only; Interparcel has not verified deliverability.'], 'verified_address' => null];
    }

    private function bookingRequest(Order $order, array $context, string $key): array
    {
        Validator::make($context, [
            'pickup.date' => 'required|date_format:Y-m-d|after:today',
            'pickup.earliest' => 'required|date_format:H:i',
            'pickup.latest' => 'required|date_format:H:i|after:pickup.earliest',
            'max_cost' => 'required|numeric|min:0.01',
        ])->validate();
        $selected = data_get($order->shipping_metadata, 'selected_delivery_option', []);
        if (($selected['provider'] ?? '') !== $this->provider() || empty($selected['consignments'])) {
            throw new ShippingException('This order has no Interparcel delivery quote. Obtain an Interparcel quote before booking.');
        }
        $delivery = [
            'name' => $order->customer_name, 'company' => '', 'add1' => $order->shipping_address_line1,
            'add2' => $order->shipping_address_line2 ?? '', 'city' => $order->shipping_city,
            'postcode' => $order->shipping_postcode, 'state' => $order->shipping_county ?? '',
            'country' => 'GB', 'telephone' => $order->customer_phone, 'email' => $order->customer_email,
        ];
        $this->country((string) $order->shipping_country);
        $sender = $this->sender();
        $this->validateBookingAddress($sender, 'Collection');
        $this->validateBookingAddress($delivery, 'Delivery');
        $parcelPlan = ['parcels' => [], 'pallets' => []];
        foreach ($selected['consignments'] as $consignment) {
            $parcelPlan[$consignment['type'] === 'pallet' ? 'pallets' : 'parcels'] = $consignment['parcels'];
        }
        $fresh = collect($this->quote($delivery, [], $parcelPlan))->firstWhere('service_code', $selected['service_code']);
        if (! $fresh || $fresh['rate'] > (float) $context['max_cost'] + 0.001) {
            throw new ShippingException('The selected service is unavailable or its current quote exceeds your booking budget. Check rates before booking.');
        }
        $paymentMethod = config('services.interparcel.payment_method');
        if (! in_array($paymentMethod, ['prepay', 'account'], true)) {
            throw new ShippingException('Choose an enabled Interparcel prepay or account payment method.');
        }
        $order->loadMissing('items');
        $orders = [];
        foreach ($selected['consignments'] as $index => $consignment) {
            $packedItems = collect($consignment['parcels'])->flatMap(fn ($p) => $p['items'] ?? []);
            $lines = $order->items->filter(fn ($line) => $packedItems->contains(fn ($packed) => (int) $packed['product_id'] === (int) $line->product_id
                && ($packed['variant_selection'] ?? []) == ProductVariantResolver::normalizeSelections($line->variant_details)));
            $value = $lines->sum(fn ($item) => (float) preg_replace('/[^0-9.]/', '', $item->product_price) * $item->quantity);
            if ($lines->isEmpty() || $value <= 0) {
                throw new ShippingException('Shipment contents or declared value are missing. Check the order items.');
            }
            $orders[] = [
                'reference' => $order->order_number.'-'.($index + 1),
                'collection' => $sender, 'delivery' => $delivery,
                'parcels' => $this->apiParcels($consignment['parcels']),
                'contents' => Str::limit($lines->pluck('product_name')->unique()->implode(', '), 200, ''),
                'value' => round($value, 2), 'service' => $consignment['service_code'],
                'pickup' => $context['pickup'], 'transitCover' => false,
            ];
        }

        return ['idempotencyKey' => $key, 'orders' => $orders, 'payment' => ['method' => $paymentMethod]];
    }

    private function shipment(array $remote, array $existing = []): array
    {
        return [
            'order_id' => (string) $remote['orderId'],
            'tracking_number' => (string) ($remote['interparcelTrackingNumber'] ?? $existing['tracking_number'] ?? ''),
            'booking_status' => (string) ($remote['status'] ?? 'processing'),
            'label_status' => (string) ($remote['labelStatus'] ?? data_get($remote, 'label.status', 'pending')),
            'tracking_status' => $existing['tracking_status'] ?? 'pre_transit',
            'tracking_detail' => $existing['tracking_detail'] ?? '',
        ];
    }

    private function payload(Order $order, array $shipments): array
    {
        $statuses = array_column($shipments, 'tracking_status');
        // A mixed basket is delivered only after every consignment is delivered.
        $status = count(array_unique($statuses)) === 1 ? $statuses[0] : (count(array_intersect($statuses, ['in_transit', 'out_for_delivery', 'delivered'])) ? 'in_transit' : 'pre_transit');
        $first = $shipments[0];
        $selected = data_get($order->shipping_metadata, 'selected_delivery_option', []);

        return [
            'shipping_provider' => $this->provider(), 'shipping_shipment_id' => $first['order_id'],
            'shipping_carrier' => $selected['carrier'] ?? 'Interparcel', 'shipping_service' => $selected['service'] ?? 'Interparcel',
            'shipping_status' => $status, 'tracking_number' => $first['tracking_number'],
            'shipping_label_url' => $first['label_status'] === 'ready' ? '/api/admin/orders/'.$order->id.'/shipping/label/download' : null,
            'shipping_tracking_url' => preg_match('/^GB\d{10}$/', $first['tracking_number']) ? 'https://uk.interparcel.com/tracking/'.$first['tracking_number'] : null,
            'shipping_metadata' => [
                'mode' => 'live', 'interparcel_shipments' => $shipments,
                'tracking_detail' => collect($shipments)->map(fn ($s) => $s['tracking_detail'] ?: 'Booking: '.$s['booking_status'].'; label: '.$s['label_status'])->implode(' | '),
            ],
        ];
    }

    private function apiParcels(array $parcels): array
    {
        return array_map(function ($parcel) {
            if (($parcel['distance_unit'] ?? 'cm') !== 'cm' || ($parcel['mass_unit'] ?? 'kg') !== 'kg') {
                throw new ShippingException('Interparcel requires centimetres and kilograms. Check the shipping configuration.');
            }
            $result = [];
            foreach (['weight', 'length', 'width', 'height'] as $field) {
                $value = $parcel[$field] ?? 0;
                if (! is_numeric($value) || ! is_finite((float) $value) || $value <= 0) {
                    throw new ShippingException('Every parcel or pallet needs a positive weight and all three dimensions.');
                }
                $result[$field] = $field === 'weight' ? ceil($value * 1000) / 1000 : (int) ceil($value);
            }

            return $result;
        }, $parcels);
    }

    private function quoteAddress(array $address): array
    {
        $result = [
            'city' => trim((string) ($address['city'] ?? '')),
            'postcode' => strtoupper(trim((string) ($address['postcode'] ?? ''))),
            'country' => $this->country((string) ($address['country'] ?? 'GB')),
        ];
        if ($result['city'] === '' || ! preg_match('/^(GIR\s?0AA|[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2})$/', $result['postcode'])) {
            throw new ShippingException('Enter a UK town/city and a valid postcode to get delivery rates.');
        }

        return $result;
    }

    private function country(string $country): string
    {
        if (! in_array(strtoupper(trim($country)), ['GB', 'UK', 'UNITED KINGDOM'], true)) {
            throw new ShippingException('This Interparcel integration currently supports UK-to-UK deliveries only.');
        }

        return 'GB';
    }

    private function validateBookingAddress(array $address, string $label): void
    {
        $rules = [
            'name' => 'required|string|max:30', 'company' => 'nullable|string|max:30',
            'add1' => 'required|string|max:30', 'add2' => 'nullable|string|max:30',
            'city' => 'required|string|max:30', 'postcode' => 'required|string|max:20',
            'telephone' => 'required|string|max:30', 'email' => 'required|email|max:255',
        ];
        if (Validator::make($address, $rules)->fails()) {
            throw new ShippingException($label.' contact/address is incomplete or too long for Interparcel (address lines: 30 characters). Check name, email and phone.');
        }
    }

    private function sender(): array
    {
        return [
            'name' => (string) config('services.shipping.from_name'), 'company' => (string) config('services.shipping.from_company'),
            'add1' => (string) config('services.shipping.from_address_line1'), 'add2' => (string) config('services.shipping.from_address_line2'),
            'city' => (string) config('services.shipping.from_city'), 'state' => (string) config('services.shipping.from_county'),
            'postcode' => (string) config('services.shipping.from_postcode'), 'country' => (string) config('services.shipping.from_country'),
            'telephone' => (string) config('services.shipping.from_phone'), 'email' => (string) config('services.shipping.from_email'),
        ];
    }
}
