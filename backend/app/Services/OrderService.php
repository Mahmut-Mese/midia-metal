<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\SiteSetting;
use App\Support\CheckoutCalculator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use App\Mail\AdminNotification;

/**
 * Orchestrates order placement: calculates totals, creates the order + items
 * in a DB transaction, decrements stock, and dispatches notification emails.
 *
 * Extracted from FormController::order() to keep the controller thin.
 */
class OrderService
{
    public function __construct(
        private CheckoutCalculator $checkoutCalculator,
        private StripePaymentVerifier $stripeVerifier,
    ) {}

    /**
     * Place a new order from validated checkout data.
     *
     * @param  array  $validated  The validated request data from FormController
     * @param  \App\Models\Customer|null  $authenticatedCustomer
     * @return Order  The created order
     *
     * @throws PaymentVerificationException  If Stripe verification fails
     */
    public function place(array $validated, ?\App\Models\Customer $authenticatedCustomer = null): Order
    {
        // 1. Calculate totals via CheckoutCalculator
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

        // 2. Verify Stripe payment if provided
        if (!empty($validated['stripe_payment_intent_id'])) {
            $result = $this->stripeVerifier->verify(
                $validated['stripe_payment_intent_id'],
                $total
            );
            $paymentStatus = $result['status'];
            $receiptUrl = $result['receipt_url'];
        }

        // 3. Generate unique order number
        $orderNumber = $this->generateOrderNumber();

        // 4. Create order + items in a transaction
        $order = DB::transaction(function () use (
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

        // 5. Send notification emails (outside transaction — non-critical)
        $this->sendAdminNotification($order);
        $this->sendCustomerConfirmation($order);

        // 6. Handle card save/detach
        if ($authenticatedCustomer && !empty($validated['stripe_payment_intent_id'])) {
            $this->stripeVerifier->handlePostCheckoutCard(
                $authenticatedCustomer,
                $validated['stripe_payment_intent_id'],
                !empty($validated['save_card'])
            );
        }

        return $order;
    }

    /**
     * Generate a unique order number with collision retry.
     */
    private function generateOrderNumber(): string
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $candidate = 'ORD-' . strtoupper(Str::random(8));
            if (!Order::where('order_number', $candidate)->exists()) {
                return $candidate;
            }
        }

        return 'ORD-' . strtoupper(Str::random(12));
    }

    /**
     * Send admin notification email about the new order.
     */
    private function sendAdminNotification(Order $order): void
    {
        $adminEmail = (string) (SiteSetting::where('key', 'contact_email')->value('value')
            ?: config('mail.from.address')
            ?: 'mahmutmese.uk@gmail.com');

        Mail::to($adminEmail)->send(new AdminNotification(
            'New Order Received: ' . $order->order_number,
            "A new order has been placed by {$order->customer_name} ({$order->customer_email}).\n\nOrder Number: {$order->order_number}\nTotal: £" . number_format($order->total, 2) . "\n\nCheck the admin panel for more details."
        ));
    }

    /**
     * Send order confirmation email to the customer.
     */
    private function sendCustomerConfirmation(Order $order): void
    {
        try {
            Mail::to($order->customer_email)->send(new \App\Mail\CustomerOrderConfirmation($order));
        } catch (\Exception $e) {
            Log::error("Failed to send order confirmation email: " . $e->getMessage());
        }
    }
}
