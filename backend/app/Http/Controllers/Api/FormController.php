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
        return response()->json(['message' => 'Message sent successfully'], 201);
    }

    public function quote(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email',
            'phone' => 'nullable|string',
            'service' => 'nullable|string',
            'description' => 'required|string',
            'files' => 'nullable|array',
            'files.*' => 'nullable|string',
        ]);

        $customerId = $request->user('customer')?->id ?? null;
        QuoteRequest::create(array_merge($validated, ['customer_id' => $customerId]));
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
            'payment_status' => 'pending',
        ]);

        foreach ($validated['items'] as $item) {
            OrderItem::create([
                'order_id' => $order->id,
                'product_id' => $item['product_id'] ?? null,
                'product_name' => $item['product_name'],
                'product_price' => $item['product_price'],
                'quantity' => $item['quantity'],
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

        if ($customer && $customer->stripe_customer_id && !empty($validated['stripe_payment_intent_id']) && !empty($validated['save_card'])) {
            try {
                Stripe::setApiKey(config('services.stripe.secret'));
                $intent = PaymentIntent::retrieve($validated['stripe_payment_intent_id']);
                \Log::info("Retrieved PaymentIntent for saving: status={$intent->status}, pm={$intent->payment_method}");

                if ($intent->payment_method) {
                    $pm = StripePaymentMethod::retrieve($intent->payment_method);
                    $pm->attach(['customer' => $customer->stripe_customer_id]);
                    \Log::info("PaymentMethod {$pm->id} attached successfully to customer {$customer->stripe_customer_id}");

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
                } else {
                    \Log::warning("PaymentIntent has no payment_method attached. Cannot save card.");
                }
            } catch (\Exception $e) {
                // Silently log or ignore since order succeeds anyway
                \Log::error("Failed to save card: " . $e->getMessage() . " at " . $e->getFile() . ':' . $e->getLine());
            }
        }

        return response()->json([
            'message' => 'Order placed successfully',
            'order_number' => $order->order_number,
        ], 201);
    }
}
