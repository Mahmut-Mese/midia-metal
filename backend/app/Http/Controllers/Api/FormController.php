<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\QuoteRequest;
use App\Models\SiteSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use App\Mail\AdminNotification;
use App\Support\CheckoutCalculator;
use Illuminate\Support\Str;
use Stripe\Stripe;
use Stripe\PaymentIntent;
use Stripe\PaymentMethod as StripePaymentMethod;

class FormController extends Controller
{
    public function __construct(private CheckoutCalculator $checkoutCalculator)
    {
    }

    protected function getAdminNotificationEmail(): string
    {
        return (string) (SiteSetting::where('key', 'contact_email')->value('value')
            ?: config('mail.from.address')
            ?: 'mahmutmese.uk@gmail.com');
    }

    public function contact(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email',
            'phone' => 'nullable|string',
            'subject' => 'nullable|string',
            'message' => 'required|string',
        ]);

        ContactMessage::create($validated);

        Mail::to($this->getAdminNotificationEmail())->send(new AdminNotification(
            'New Contact Message',
            "You have received a new message from {$validated['name']} ({$validated['email']}).\n\nSubject: " . ($validated['subject'] ?? 'No Subject') . "\n\nMessage:\n{$validated['message']}"
        ));

        return response()->json(['message' => 'Message sent successfully'], 201);
    }

    public function quote(Request $request)
    {
        $rules = [
            'name' => 'required|string|max:255',
            'email' => 'required|email',
            'phone' => 'nullable|string',
            'service' => 'nullable|string',
            'description' => 'required|string',
        ];

        if ($request->hasFile('files')) {
            $rules['files'] = 'nullable|array';
            $rules['files.*'] = 'file|mimes:jpeg,png,jpg,gif,svg,webp,pdf,dwg,dxf|max:10240';
        } else {
            $rules['files'] = 'nullable|array';
            $rules['files.*'] = 'nullable|string';
        }

        $validated = $request->validate($rules);

        $storedFiles = $validated['files'] ?? [];
        if ($request->hasFile('files')) {
            $storedFiles = collect($request->file('files'))
                ->map(function ($file) {
                    $filename = time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
                    $path = $file->storeAs('quote-attachments', $filename, 'public');

                    return asset('storage/' . $path);
                })
                ->values()
                ->all();
        }

        $authenticatedCustomer = auth('sanctum')->user();
        if (!$authenticatedCustomer instanceof Customer) {
            $authenticatedCustomer = null;
        }
        $customerId = $authenticatedCustomer?->id ?? null;
        QuoteRequest::create(array_merge($validated, [
            'customer_id' => $customerId,
            'files' => $storedFiles,
        ]));

        Mail::to($this->getAdminNotificationEmail())->send(new AdminNotification(
            'New Quote Request',
            "You have received a new quote request from {$validated['name']} ({$validated['email']}).\n\nService: " . ($validated['service'] ?? 'N/A') . "\n\nDescription:\n{$validated['description']}"
        ));

        return response()->json(['message' => 'Quote request submitted successfully'], 201);
    }

    public function refundRequest(Request $request)
    {
        $authenticatedCustomer = auth('sanctum')->user();
        if (!$authenticatedCustomer instanceof Customer) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $validated = $request->validate([
            'order_id' => 'required|integer',
            'reason' => 'required|string|max:255',
            'details' => 'required|string|max:5000',
            'request_type' => 'nullable|in:cancel,cancel_refund',
        ]);

        $order = Order::query()
            ->whereKey($validated['order_id'])
            ->where('customer_id', $authenticatedCustomer->id)
            ->first();

        if (!$order) {
            return response()->json([
                'message' => 'We could not find that order on your account.',
            ], 404);
        }

        $requestType = $validated['request_type'] ?? 'cancel_refund';
        $subject = ($requestType === 'cancel' ? 'Order Cancellation Request - ' : 'Cancellation & Refund Request - ') . $order->order_number;
        $message = implode("\n\n", [
            "Order Number: {$order->order_number}",
            "Customer: {$authenticatedCustomer->name} ({$authenticatedCustomer->email})",
            "Payment Method: {$order->payment_method}",
            "Request Type: " . ($requestType === 'cancel' ? 'Cancel Order' : 'Cancel and Refund'),
            "Reason: {$validated['reason']}",
            "Details:\n{$validated['details']}",
        ]);

        ContactMessage::create([
            'name' => $authenticatedCustomer->name,
            'email' => $authenticatedCustomer->email,
            'phone' => $authenticatedCustomer->phone,
            'order_id' => $order->id,
            'subject' => $subject,
            'message_type' => 'order_request',
            'request_type' => $requestType,
            'request_status' => 'pending',
            'reason' => $validated['reason'],
            'details' => $validated['details'],
            'message' => $message,
        ]);

        Mail::to($this->getAdminNotificationEmail())->send(new AdminNotification(
            $subject,
            $message
        ));

        return response()->json([
            'message' => $requestType === 'cancel'
                ? 'Your cancellation request has been sent. We will review it and contact you shortly.'
                : 'Your cancellation and refund request has been sent. We will review it and contact you shortly.',
        ], 201);
    }

    public function applyCoupon(Request $request)
    {
        $request->validate([
            'code' => 'required|string',
            'order_amount' => 'required|numeric|min:0',
        ]);

        $coupon = Coupon::where('code', strtoupper($request->code))->first();

        if (!$coupon) {
            return response()->json(['message' => 'Coupon code not found'], 404);
        }

        if (!$coupon->isValid($request->order_amount)) {
            return response()->json(['message' => 'This coupon is expired, inactive, or your order does not meet the minimum amount'], 422);
        }

        $discount = $coupon->calculateDiscount($request->order_amount);

        return response()->json([
            'valid' => true,
            'code' => $coupon->code,
            'type' => $coupon->type,
            'value' => $coupon->value,
            'discount' => $discount,
            'message' => $coupon->type === 'percentage'
                ? "{$coupon->value}% discount applied!"
                : "£{$coupon->value} discount applied!",
        ]);
    }

    public function order(Request $request)
    {
        $authenticatedCustomer = auth('sanctum')->user();
        if (!$authenticatedCustomer instanceof Customer) {
            $authenticatedCustomer = null;
        }

        $validated = $request->validate([
            'customer_name' => 'required|string',
            'customer_email' => 'required|email',
            'customer_phone' => 'nullable|string',
            'shipping_address' => 'required|string',
            'shipping_address_line1' => 'nullable|string|max:255',
            'shipping_address_line2' => 'nullable|string|max:255',
            'shipping_city' => 'nullable|string|max:255',
            'shipping_postcode' => 'nullable|string|max:255',
            'shipping_county' => 'nullable|string|max:255',
            'shipping_country' => 'nullable|string|max:255',
            'billing_address' => 'required|string',
            'billing_address_line1' => 'nullable|string|max:255',
            'billing_address_line2' => 'nullable|string|max:255',
            'billing_city' => 'nullable|string|max:255',
            'billing_postcode' => 'nullable|string|max:255',
            'billing_county' => 'nullable|string|max:255',
            'billing_country' => 'nullable|string|max:255',
            'payment_method' => 'nullable|string',
            'fulfilment_method' => 'nullable|in:delivery,click_collect',
            'shipping_option_token' => 'nullable|string',
            'notes' => 'nullable|string',
            'coupon_code' => 'nullable|string',
            'is_business' => 'nullable|boolean',
            'company_name' => 'nullable|string',
            'company_vat_number' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.selected_variants' => 'nullable|array',
            'stripe_payment_intent_id' => 'nullable|string',
            'save_card' => 'nullable|boolean',
        ]);

        $totals = $this->checkoutCalculator->calculate(
            $validated['items'],
            $validated['coupon_code'] ?? null,
            $validated['fulfilment_method'] ?? 'delivery',
            $validated['shipping_option_token'] ?? null,
        );

        $subtotal = $totals['subtotal'];
        $shipping = $totals['shipping'];
        $discountAmount = $totals['discount_amount'];
        $taxAmount = $totals['tax_amount'];
        $total = $totals['total'];
        $paymentStatus = 'pending';
        $receiptUrl = null;

        if (!empty($validated['stripe_payment_intent_id'])) {
            try {
                $stripe = new \Stripe\StripeClient(config('services.stripe.secret'));
                $intent = $stripe->paymentIntents->retrieve(
                    $validated['stripe_payment_intent_id'],
                    ['expand' => ['latest_charge']]
                );

                if ($intent->status !== 'succeeded') {
                    return response()->json([
                        'message' => 'Payment has not completed successfully.',
                    ], 422);
                }

                if ((int) $intent->amount !== (int) round($total * 100)) {
                    return response()->json([
                        'message' => 'Payment amount does not match the order total.',
                    ], 422);
                }

                $paymentStatus = 'paid';
                if ($intent->latest_charge) {
                    $receiptUrl = $intent->latest_charge->receipt_url;
                }
            } catch (\Exception $e) {
                \Log::error('Payment Intent Verification Failed: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
                return response()->json([
                    'message' => 'We could not verify the payment for this order.',
                ], 422);
            }
        }

        // Generate a unique order number with retry
        $orderNumber = null;
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $candidate = 'ORD-' . strtoupper(Str::random(8));
            if (!Order::where('order_number', $candidate)->exists()) {
                $orderNumber = $candidate;
                break;
            }
        }
        if (!$orderNumber) {
            $orderNumber = 'ORD-' . strtoupper(Str::random(12));
        }

        $order = \Illuminate\Support\Facades\DB::transaction(function () use (
            $validated, $totals, $orderNumber, $subtotal, $shipping,
            $discountAmount, $taxAmount, $total, $paymentStatus, $authenticatedCustomer, $receiptUrl
        ) {
            if ($totals['coupon']) {
                $totals['coupon']->increment('used_count');
            }

            $order = Order::create([
                'order_number' => $orderNumber,
                'customer_name' => $validated['customer_name'],
                'customer_email' => $validated['customer_email'],
                'customer_phone' => $validated['customer_phone'] ?? null,
                'shipping_address' => $validated['shipping_address'],
                'shipping_address_line1' => $validated['shipping_address_line1'] ?? null,
                'shipping_address_line2' => $validated['shipping_address_line2'] ?? null,
                'shipping_city' => $validated['shipping_city'] ?? null,
                'shipping_postcode' => $validated['shipping_postcode'] ?? null,
                'shipping_county' => $validated['shipping_county'] ?? null,
                'shipping_country' => $validated['shipping_country'] ?? 'United Kingdom',
                'billing_address' => $validated['billing_address'],
                'billing_address_line1' => $validated['billing_address_line1'] ?? null,
                'billing_address_line2' => $validated['billing_address_line2'] ?? null,
                'billing_city' => $validated['billing_city'] ?? null,
                'billing_postcode' => $validated['billing_postcode'] ?? null,
                'billing_county' => $validated['billing_county'] ?? null,
                'billing_country' => $validated['billing_country'] ?? null,
                'payment_method' => $validated['payment_method'] ?? 'bank_transfer',
                'notes' => $validated['notes'] ?? null,
                'shipping_metadata' => [
                    'fulfilment_method' => $validated['fulfilment_method'] ?? 'delivery',
                    'selected_delivery_option' => $totals['shipping_option'],
                ],
                'shipping_provider' => $totals['shipping_option']['provider'] ?? null,
                'shipping_carrier' => $totals['shipping_option']['carrier'] ?? null,
                'shipping_service' => $totals['shipping_option']['service'] ?? null,
                'subtotal' => $subtotal,
                'shipping' => $shipping,
                'discount_amount' => $discountAmount,
                'tax_amount' => $taxAmount,
                'total' => $total,
                'coupon_code' => $validated['coupon_code'] ?? null,
                'is_business' => $validated['is_business'] ?? false,
                'company_name' => $validated['company_name'] ?? null,
                'company_vat_number' => $validated['company_vat_number'] ?? null,
                'customer_id' => $authenticatedCustomer?->id ?? null,
                'status' => 'pending',
                'payment_status' => $paymentStatus,
                'stripe_payment_intent_id' => $validated['stripe_payment_intent_id'] ?? null,
                'stripe_receipt_url' => $receiptUrl,
            ]);

            foreach ($totals['items'] as $item) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $item['product_id'],
                    'product_name' => $item['product_name'],
                    'product_price' => $item['product_price'],
                    'quantity' => $item['quantity'],
                    'variant_details' => $item['variant_details'],
                ]);

                // Decrement stock if tracked
                Product::where('id', $item['product_id'])
                    ->where('track_stock', true)
                    ->decrement('stock_quantity', $item['quantity']);
            }

            return $order;
        });

        // Send admin notification email
        Mail::to($this->getAdminNotificationEmail())->send(new AdminNotification(
            'New Order Received: ' . $order->order_number,
            "A new order has been placed by {$order->customer_name} ({$order->customer_email}).\n\nOrder Number: {$order->order_number}\nTotal: £" . number_format($order->total, 2) . "\n\nCheck the admin panel for more details."
        ));

        // Send customer confirmation email
        try {
            Mail::to($order->customer_email)->send(new \App\Mail\CustomerOrderConfirmation($order));
        } catch (\Exception $e) {
            \Log::error("Failed to send order confirmation email: " . $e->getMessage());
        }

        // Handle saving the card to Stripe if requested
        $customer = $authenticatedCustomer;

        if ($customer && $customer->stripe_customer_id && !empty($validated['stripe_payment_intent_id'])) {
            try {
                Stripe::setApiKey(config('services.stripe.secret'));
                $intent = PaymentIntent::retrieve($validated['stripe_payment_intent_id']);

                if ($intent->payment_method) {
                    if (empty($validated['save_card'])) {
                        $isAlreadySaved = \App\Models\CustomerPaymentMethod::where('stripe_payment_method_id', $intent->payment_method)
                            ->where('customer_id', $customer->id)
                            ->exists();

                        if (!$isAlreadySaved) {
                            $pm = StripePaymentMethod::retrieve($intent->payment_method);
                            if ($pm->customer) {
                                $pm->detach();
                            }
                        }
                    } else {
                        $pm = StripePaymentMethod::retrieve($intent->payment_method);
                        // Save locally so it shows immediately in the dashboard
                        \App\Models\CustomerPaymentMethod::updateOrCreate(
                            ['stripe_payment_method_id' => $pm->id],
                            [
                                'customer_id' => $customer->id,
                                'brand' => $pm->card->brand ?? 'card',
                                'last4' => $pm->card->last4 ?? '****',
                                'exp_month' => str_pad($pm->card->exp_month ?? '01', 2, '0', STR_PAD_LEFT),
                                'exp_year' => $pm->card->exp_year ?? '2099',
                            ]
                        );
                    }
                }
            } catch (\Exception $e) {
                \Log::error("Failed to save or detach card: " . $e->getMessage());
            }
        }

        return response()->json([
            'message' => 'Order placed successfully',
            'order_number' => $order->order_number,
        ], 201);
    }
}
