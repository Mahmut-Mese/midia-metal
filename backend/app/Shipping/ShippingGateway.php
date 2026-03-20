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

    /**
     * Void / refund an unused shipment label.
     *
     * @return array<string, mixed>
     */
    public function voidShipment(Order $order): array;

    /**
     * Validate a shipping address before label purchase.
     *
     * @param  array<string, mixed>  $address
     * @return array{valid: bool, messages: array<int, string>, verified_address: array<string, mixed>|null}
     */
    public function validateAddress(array $address): array;
}
