<?php

namespace App\Providers;

use App\Shipping\InterparcelGateway;
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
        // A legacy SHIPPING_PROVIDER setting must not reactivate the retired integration.
        $this->app->bind(ShippingGateway::class, InterparcelGateway::class);

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
