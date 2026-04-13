<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerPaymentMethod;
use App\Support\CheckoutCalculator;
use Illuminate\Http\Request;
use Stripe\Customer as StripeCustomer;
use Stripe\PaymentIntent;
use Stripe\PaymentMethod as StripePaymentMethod;
use Stripe\Stripe;

class PaymentController extends Controller
{
    public function __construct(private CheckoutCalculator $checkoutCalculator) {}

    /**
     * Create a Stripe PaymentIntent for the given amount.
     */
    public function createIntent(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.selected_variants' => 'nullable|array',
            'coupon_code' => 'nullable|string',
            'fulfilment_method' => 'nullable|in:delivery,click_collect',
            'shipping_option_token' => 'nullable|string',
            'currency' => 'nullable|string',
        ]);

        $totals = $this->checkoutCalculator->calculate(
            $validated['items'],
            $validated['coupon_code'] ?? null,
            $validated['fulfilment_method'] ?? 'delivery',
            $validated['shipping_option_token'] ?? null,
        );

        Stripe::setApiKey(config('services.stripe.secret'));
        $amountInPence = (int) round($totals['total'] * 100);

        $intentData = [
            'amount' => $amountInPence,
            'currency' => $validated['currency'] ?? 'gbp',
            'payment_method_types' => ['card'],
        ];

        // If user is logged in, attach to a Stripe Customer
        $customer = auth('sanctum')->user();
        if (! $customer instanceof Customer) {
            $customer = null;
        }
        if ($customer) {
            if (! $customer->stripe_customer_id) {
                // Create new Stripe Customer
                $stripeCust = StripeCustomer::create([
                    'email' => $customer->email,
                    'name' => $customer->name,
                ]);
                $customer->update(['stripe_customer_id' => $stripeCust->id]);
            }
            $intentData['customer'] = $customer->stripe_customer_id;
            $intentData['setup_future_usage'] = 'off_session';
        }

        $intent = PaymentIntent::create($intentData);

        return response()->json([
            'client_secret' => $intent->client_secret,
            'amount' => $totals['total'],
        ]);
    }

    /**
     * Sync and List Saved Cards
     */
    public function listSavedCards(Request $request)
    {
        $customer = auth('sanctum')->user();
        if (! $customer instanceof Customer) {
            return response()->json([]);
        }

        if (! $customer || ! $customer->stripe_customer_id) {
            return response()->json([]);
        }

        Stripe::setApiKey(config('services.stripe.secret'));

        // Fetch from Stripe
        $stripeMethods = StripePaymentMethod::all([
            'customer' => $customer->stripe_customer_id,
            'type' => 'card',
        ]);

        $activeIds = [];
        foreach ($stripeMethods->data as $pm) {
            $activeIds[] = $pm->id;
            CustomerPaymentMethod::updateOrCreate(
                ['stripe_payment_method_id' => $pm->id],
                [
                    'customer_id' => $customer->id,
                    'brand' => $pm->card->brand,
                    'last4' => $pm->card->last4,
                    'exp_month' => str_pad($pm->card->exp_month, 2, '0', STR_PAD_LEFT),
                    'exp_year' => $pm->card->exp_year,
                ]
            );
        }

        // Clean up detached methods locally
        CustomerPaymentMethod::where('customer_id', $customer->id)
            ->whereNotIn('stripe_payment_method_id', $activeIds)
            ->delete();

        return response()->json($customer->paymentMethods()->latest()->get());
    }

    /**
     * Delete a saved card
     */
    public function deleteSavedCard(Request $request, $id)
    {
        $customer = auth('sanctum')->user();
        if (! $customer instanceof Customer) {
            abort(403);
        }

        $method = CustomerPaymentMethod::where('customer_id', $customer->id)
            ->where('id', $id)
            ->firstOrFail();

        Stripe::setApiKey(config('services.stripe.secret'));
        try {
            $stripeMethod = StripePaymentMethod::retrieve($method->stripe_payment_method_id);
            $stripeMethod->detach();
        } catch (\Exception $e) {
            // Might already be detached
        }

        $method->delete();

        return response()->json(['message' => 'Card removed successfully']);
    }
}
