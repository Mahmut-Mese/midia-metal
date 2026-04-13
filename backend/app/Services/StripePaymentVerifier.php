<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\CustomerPaymentMethod;
use Illuminate\Support\Facades\Log;
use Stripe\PaymentIntent;
use Stripe\PaymentMethod as StripePaymentMethod;
use Stripe\Stripe;
use Stripe\StripeClient;

/**
 * Verifies Stripe PaymentIntents and manages card save/detach after checkout.
 *
 * Extracted from FormController::order() to keep the controller thin
 * and allow reuse (e.g. from a future webhook reconciliation flow).
 */
class StripePaymentVerifier
{
    /**
     * Verify a PaymentIntent succeeded and its amount matches the order total.
     *
     * @param  string  $paymentIntentId  The Stripe PaymentIntent ID
     * @param  float  $expectedTotal  The order total in GBP (e.g. 150.00)
     * @return array{status: string, receipt_url: string|null}
     *
     * @throws \App\Exceptions\PaymentVerificationException
     */
    public function verify(string $paymentIntentId, float $expectedTotal): array
    {
        try {
            $stripe = new StripeClient(config('services.stripe.secret'));
            $intent = $stripe->paymentIntents->retrieve(
                $paymentIntentId,
                ['expand' => ['latest_charge']]
            );

            if ($intent->status !== 'succeeded') {
                throw PaymentVerificationException::notSucceeded($intent->status);
            }

            if ((int) $intent->amount !== (int) round($expectedTotal * 100)) {
                throw PaymentVerificationException::amountMismatch(
                    (int) $intent->amount,
                    (int) round($expectedTotal * 100)
                );
            }

            $receiptUrl = $intent->latest_charge?->receipt_url;

            return [
                'status' => 'paid',
                'receipt_url' => $receiptUrl,
            ];
        } catch (PaymentVerificationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Payment Intent Verification Failed: '.$e->getMessage()."\n".$e->getTraceAsString());
            throw PaymentVerificationException::verificationFailed($e);
        }
    }

    /**
     * After checkout, either save or detach the payment method depending on the user's choice.
     *
     * @param  bool  $saveCard  Whether the customer opted to save the card
     */
    public function handlePostCheckoutCard(
        Customer $customer,
        string $paymentIntentId,
        bool $saveCard
    ): void {
        if (! $customer->stripe_customer_id) {
            return;
        }

        try {
            Stripe::setApiKey(config('services.stripe.secret'));
            $intent = PaymentIntent::retrieve($paymentIntentId);

            if (! $intent->payment_method) {
                return;
            }

            if (! $saveCard) {
                // Detach the card unless it's already saved locally
                $isAlreadySaved = CustomerPaymentMethod::where('stripe_payment_method_id', $intent->payment_method)
                    ->where('customer_id', $customer->id)
                    ->exists();

                if (! $isAlreadySaved) {
                    $pm = StripePaymentMethod::retrieve($intent->payment_method);
                    if ($pm->customer) {
                        $pm->detach();
                    }
                }
            } else {
                // Save the card locally so it shows immediately in the dashboard
                $pm = StripePaymentMethod::retrieve($intent->payment_method);
                CustomerPaymentMethod::updateOrCreate(
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
        } catch (\Exception $e) {
            Log::error('Failed to save or detach card: '.$e->getMessage());
        }
    }
}
