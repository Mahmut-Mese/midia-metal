<?php

namespace App\Shipping;

use App\Models\Order;
use RuntimeException;

class EasyPostGateway implements ShippingGateway
{
    public function provider(): string
    {
        return 'easypost';
    }

    public function createLabel(Order $order): array
    {
        throw new RuntimeException('Live EasyPost label purchasing is not enabled yet. Keep SHIPPING_MOCK=true until EasyPost carrier setup is complete.');
    }

    public function track(Order $order): array
    {
        throw new RuntimeException('Live EasyPost tracking is not enabled yet. Keep SHIPPING_MOCK=true until EasyPost carrier setup is complete.');
    }
}
