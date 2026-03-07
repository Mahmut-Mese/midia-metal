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
        'admin_notes'
    ];
    protected $casts = ['files' => 'array'];
}
