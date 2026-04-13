<?php

namespace App\Services;

use RuntimeException;

/**
 * Thrown when Stripe PaymentIntent verification fails during checkout.
 */
class PaymentVerificationException extends RuntimeException
{
    private string $reason;

    public function __construct(string $message, string $reason, ?\Throwable $previous = null)
    {
        $this->reason = $reason;
        parent::__construct($message, 0, $previous);
    }

    public function getReason(): string
    {
        return $this->reason;
    }

    public static function notSucceeded(string $status): self
    {
        return new self(
            'Payment has not completed successfully.',
            "intent_status_{$status}"
        );
    }

    public static function amountMismatch(int $intentAmountCents, int $expectedAmountCents): self
    {
        return new self(
            'Payment amount does not match the order total.',
            "amount_mismatch: intent={$intentAmountCents} expected={$expectedAmountCents}"
        );
    }

    public static function verificationFailed(\Throwable $previous): self
    {
        return new self(
            'We could not verify the payment for this order.',
            'verification_exception',
            $previous
        );
    }
}
