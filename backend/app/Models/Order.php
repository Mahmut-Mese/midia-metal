<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'order_number',
        'customer_name',
        'customer_email',
        'customer_phone',
        'shipping_address',
        'billing_address',
        'status',
        'subtotal',
        'shipping',
        'total',
        'payment_method',
        'payment_status',
        'stripe_payment_intent_id',
        'notes',
        'tracking_number',
        'coupon_code',
        'discount_amount',
        'tax_amount',
        'is_business',
        'company_name',
        'company_vat_number',
        'customer_id',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }
}
