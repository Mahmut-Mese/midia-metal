<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuoteRequest extends Model
{
    protected $fillable = [
        'customer_id',
        'name',
        'email',
        'phone',
        'service',
        'description',
        'files',
        'status',
        'response_message',
        'quoted_valid_until',
    ];

    protected $casts = [
        'files' => 'array',
        'quoted_valid_until' => 'date',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
