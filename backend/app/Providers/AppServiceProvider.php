<?php

namespace App\Providers;

use App\Shipping\FreightZoneResolver;
use App\Shipping\ShippingGateway;
use App\Shipping\ShippingGatewayFactory;
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
            return $app->make(ShippingGatewayFactory::class)->make();
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
