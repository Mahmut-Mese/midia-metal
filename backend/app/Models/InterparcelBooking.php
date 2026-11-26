<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InterparcelBooking extends Model
{
    protected $fillable = ['order_id', 'idempotency_key', 'request', 'shipments'];

    protected $hidden = ['request', 'idempotency_key'];

    protected function casts(): array
    {
        return ['request' => 'encrypted:array', 'shipments' => 'array'];
    }
}
