<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomerPaymentMethod;
use Illuminate\Http\Request;
use Stripe\Stripe;
use Stripe\PaymentIntent;
use Stripe\Customer as StripeCustomer;
use Stripe\PaymentMethod as StripePaymentMethod;

class PaymentController extends Controller
{
    /**
     * Create a Stripe PaymentIntent for the given amount.
     */
    public function createIntent(Request $request)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.5',
            'currency' => 'nullable|string',
        ]);

        Stripe::setApiKey(config('services.stripe.secret'));
        $amountInPence = (int) round($validated['amount'] * 100);

        $intentData = [
            'amount' => $amountInPence,
            'currency' => $validated['currency'] ?? 'gbp',
            'payment_method_types' => ['card'],
        ];

        // If user is logged in, attach to a Stripe Customer
        $customer = $request->user('customer');
        if ($customer) {
            if (!$customer->stripe_customer_id) {
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
        ]);
    }

    /**
     * Sync and List Saved Cards
     */
    public function listSavedCards(Request $request)
    {
        $customer = $request->user('customer');
        if (!$customer || !$customer->stripe_customer_id) {
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
        $customer = $request->user('customer');
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
