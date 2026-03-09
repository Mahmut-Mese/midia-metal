<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\QuoteRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use App\Mail\AdminNotification;
use Illuminate\Support\Str;
use Stripe\Stripe;
use Stripe\PaymentIntent;
use Stripe\PaymentMethod as StripePaymentMethod;

class FormController extends Controller
{
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

        Mail::to('mahmutmese.uk@gmail.com')->send(new AdminNotification(
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

        $customerId = $request->user('customer')?->id ?? null;
        QuoteRequest::create(array_merge($validated, [
            'customer_id' => $customerId,
            'files' => $storedFiles,
        ]));

        Mail::to('mahmutmese.uk@gmail.com')->send(new AdminNotification(
            'New Quote Request',
            "You have received a new quote request from {$validated['name']} ({$validated['email']}).\n\nService: " . ($validated['service'] ?? 'N/A') . "\n\nDescription:\n{$validated['description']}"
        ));

        return response()->json(['message' => 'Quote request submitted successfully'], 201);
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
        $validated = $request->validate([
            'customer_name' => 'required|string',
            'customer_email' => 'required|email',
            'customer_phone' => 'nullable|string',
            'shipping_address' => 'required|string',
            'billing_address' => 'required|string',
            'payment_method' => 'nullable|string',
            'notes' => 'nullable|string',
            'coupon_code' => 'nullable|string',
            'discount_amount' => 'nullable|numeric',
            'shipping_amount' => 'nullable|numeric',
            'tax_amount' => 'nullable|numeric',
            'is_business' => 'nullable|boolean',
            'company_name' => 'nullable|string',
            'company_vat_number' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|integer',
            'items.*.product_name' => 'required|string',
            'items.*.product_price' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.selected_variants' => 'nullable|array',
            'stripe_payment_intent_id' => 'nullable|string',
            'save_card' => 'nullable|boolean',
        ]);

        // Calculate subtotal
        $subtotal = collect($validated['items'])->sum(function ($item) {
            $price = floatval(preg_replace('/[^0-9.]/', '', $item['product_price']));
            return $price * $item['quantity'];
        });

        $shipping = floatval($validated['shipping_amount'] ?? 0);
        $discountAmount = floatval($validated['discount_amount'] ?? 0);
        $taxAmount = floatval($validated['tax_amount'] ?? 0);
        $total = $subtotal + $shipping + $taxAmount - $discountAmount;
        $paymentStatus = 'pending';

        if (!empty($validated['stripe_payment_intent_id'])) {
            try {
                Stripe::setApiKey(config('services.stripe.secret'));
                $intent = PaymentIntent::retrieve($validated['stripe_payment_intent_id']);

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
            } catch (\Exception $e) {
                return response()->json([
                    'message' => 'We could not verify the payment for this order.',
                ], 422);
            }
        }

        // Validate coupon if provided
        if (!empty($validated['coupon_code'])) {
            $coupon = Coupon::where('code', strtoupper($validated['coupon_code']))->first();
            if ($coupon && $coupon->isValid($subtotal)) {
                $coupon->increment('used_count');
            }
        }

        $order = Order::create([
            'order_number' => 'ORD-' . strtoupper(Str::random(8)),
            'customer_name' => $validated['customer_name'],
            'customer_email' => $validated['customer_email'],
            'customer_phone' => $validated['customer_phone'] ?? null,
            'shipping_address' => $validated['shipping_address'],
            'billing_address' => $validated['billing_address'],
            'payment_method' => $validated['payment_method'] ?? 'bank_transfer',
            'notes' => $validated['notes'] ?? null,
            'subtotal' => $subtotal,
            'shipping' => $shipping,
            'discount_amount' => $discountAmount,
            'tax_amount' => $taxAmount,
            'total' => $total,
            'coupon_code' => $validated['coupon_code'] ?? null,
            'is_business' => $validated['is_business'] ?? false,
            'company_name' => $validated['company_name'] ?? null,
            'company_vat_number' => $validated['company_vat_number'] ?? null,
            'customer_id' => $request->user('customer')?->id ?? null,
            'status' => 'pending',
            'payment_status' => $paymentStatus,
            'stripe_payment_intent_id' => $validated['stripe_payment_intent_id'] ?? null,
        ]);

        Mail::to('mahmutmese.uk@gmail.com')->send(new AdminNotification(
            'New Order Received: ' . $order->order_number,
            "A new order has been placed by {$order->customer_name} ({$order->customer_email}).\n\nOrder Number: {$order->order_number}\nTotal: £" . number_format($order->total, 2) . "\n\nCheck the admin panel for more details."
        ));

        foreach ($validated['items'] as $item) {
            OrderItem::create([
                'order_id' => $order->id,
                'product_id' => $item['product_id'] ?? null,
                'product_name' => $item['product_name'],
                'product_price' => $item['product_price'],
                'quantity' => $item['quantity'],
                'variant_details' => $item['selected_variants'] ?? null,
            ]);

            // Decrement stock if tracked
            if (!empty($item['product_id'])) {
                Product::where('id', $item['product_id'])
                    ->where('track_stock', true)
                    ->decrement('stock_quantity', $item['quantity']);
            }
        }

        // Handle saving the card to Stripe if requested
        $customer = $request->user('customer');
        \Log::info("Order Save Card Check for intent {$validated['stripe_payment_intent_id']}", [
            'has_customer' => !!$customer,
            'stripe_customer_id' => $customer ? $customer->stripe_customer_id : null,
            'has_intent' => !empty($validated['stripe_payment_intent_id']),
            'wants_save' => !empty($validated['save_card'])
        ]);

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
                            \Log::info("PaymentMethod {$pm->id} detached successfully because save_card was false");
                        } else {
                            \Log::info("PaymentMethod {$intent->payment_method} was already saved. Skipping detachment.");
                        }
                    } else {
                        $pm = StripePaymentMethod::retrieve($intent->payment_method);
                        // Also save locally so it shows immediately in the dashboard without needing to run the sync endpoint
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
                        \Log::info("PaymentMethod {$pm->id} synced locally to customer {$customer->stripe_customer_id}");
                    }
                }
            } catch (\Exception $e) {
                // Silently log or ignore since order succeeds anyway
                \Log::error("Failed to save or detach card: " . $e->getMessage() . " at " . $e->getFile() . ':' . $e->getLine());
            }
        }

        return response()->json([
            'message' => 'Order placed successfully',
            'order_number' => $order->order_number,
        ], 201);
    }
}
