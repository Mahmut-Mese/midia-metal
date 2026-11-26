<?php

namespace App\Shipping;

use RuntimeException;

/** A safe, actionable shipping error; never include provider request bodies or credentials. */
class ShippingException extends RuntimeException
{
    public function render()
    {
        return response()->json(['message' => $this->getMessage()], 422);
    }

    public function report(): bool
    {
        return true;
    }
}
