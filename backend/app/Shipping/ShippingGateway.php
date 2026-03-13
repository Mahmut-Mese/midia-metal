<?php

namespace App\Shipping;

use App\Models\Order;

interface ShippingGateway
{
    public function provider(): string;

    /**
     * @return array<string, mixed>
     */
    public function createLabel(Order $order): array;

    /**
     * @return array<string, mixed>
     */
    public function track(Order $order): array;
}
