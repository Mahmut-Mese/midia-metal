<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;

class ContactMessage extends Model
{
    use Auditable;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'order_id',
        'subject',
        'message_type',
        'request_type',
        'request_status',
        'reason',
        'details',
        'reviewed_at',
        'message',
        'read',
    ];

    protected $casts = [
        'read' => 'boolean',
        'reviewed_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
