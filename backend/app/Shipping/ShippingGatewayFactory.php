<?php

namespace App\Shipping;

class ShippingGatewayFactory
{
    public function make(?string $provider = null, ?bool $mock = null): ShippingGateway
    {
        $provider ??= config('services.shipping.provider', 'easypost');
        $mock ??= (bool) config('services.shipping.mock', true);

        return match ($provider) {
            'easypost' => app($mock ? MockEasyPostGateway::class : EasyPostGateway::class),
            'interparcel' => app(InterparcelGateway::class),
            default => throw new ShippingException('Unknown shipping provider. Check SHIPPING_PROVIDER.'),
        };
    }
}
