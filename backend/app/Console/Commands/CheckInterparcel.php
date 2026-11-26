<?php

namespace App\Console\Commands;

use App\Shipping\InterparcelGateway;
use App\Shipping\ShippingException;
use Illuminate\Console\Command;

class CheckInterparcel extends Command
{
    protected $signature = 'interparcel:check {--city=Birmingham} {--postcode=B1 1BB}
        {--weight=2} {--length=30} {--width=20} {--height=10} {--pallet}';

    protected $description = 'Check real Interparcel quote access only; never book, pay or arrange a collection';

    public function handle(InterparcelGateway $gateway): int
    {
        $parcel = ['mass_unit' => 'kg', 'distance_unit' => 'cm'];
        foreach (['weight', 'length', 'width', 'height'] as $field) {
            $value = $this->option($field);
            if (! is_numeric($value) || (float) $value <= 0) {
                $this->error('Weight and dimensions must be positive numbers.');

                return self::FAILURE;
            }
            $parcel[$field] = (float) $value;
        }
        $parcel['shipping_class'] = $this->option('pallet') ? 'freight' : 'standard';
        try {
            $options = $gateway->quote([
                'city' => $this->option('city'), 'postcode' => $this->option('postcode'), 'country' => 'GB',
            ], [], [$this->option('pallet') ? 'pallets' : 'parcels' => [$parcel]]);
        } catch (ShippingException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }
        if ($options === []) {
            $this->warn('Interparcel accepted the request but returned no eligible collection services. Check service filters, dimensions and account access.');

            return self::FAILURE;
        }
        $this->table(['Service code', 'Service', 'GBP (incl. configured VAT)'], array_map(fn ($option) => [
            $option['service_code'], $option['service'], number_format($option['rate'], 2),
        ], $options));
        $this->info('Quote API verified. No booking or payment was made. Booking and label access still require separate verification.');

        return self::SUCCESS;
    }
}
