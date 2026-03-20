<?php

namespace App\Shipping;

use App\Models\Order;

interface ShippingGateway
{
    public function provider(): string;

    /**
     * @param  array<string, mixed>  $toAddress
     * @param  array<int, array<string, mixed>>  $items
     * @param  array<string, mixed>  $context
     * @return array<int, array<string, mixed>>
     */
    public function quote(array $toAddress, array $items = [], array $context = []): array;

    /**
     * @return array<string, mixed>
     */
    public function createLabel(Order $order, array $context = []): array;

    /**
     * @return array<string, mixed>
     */
    public function track(Order $order): array;
}
