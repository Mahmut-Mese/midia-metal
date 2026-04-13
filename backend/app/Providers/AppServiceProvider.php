<?php

namespace App\Providers;

use App\Shipping\EasyPostGateway;
use App\Shipping\FreightZoneResolver;
use App\Shipping\MockEasyPostGateway;
use App\Shipping\ShippingGateway;
use App\Shipping\ShippingManager;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Freight zone resolver — singleton so surcharges are only loaded once per request
        $this->app->singleton(FreightZoneResolver::class);

        // Shipping gateway — resolved from config (mock vs live)
        $this->app->bind(ShippingGateway::class, function ($app) {
            $mock = (bool) config('services.shipping.mock', true);

            return $mock
                ? $app->make(MockEasyPostGateway::class)
                : $app->make(EasyPostGateway::class);
        });

        // Shipping manager — uses gateway from the container
        $this->app->singleton(ShippingManager::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
