<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Testimonial extends Model
{
    protected $fillable = ['name', 'company', 'avatar', 'content', 'rating', 'active', 'order'];
    protected $casts = ['active' => 'boolean'];
}
