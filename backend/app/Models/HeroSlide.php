<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HeroSlide extends Model
{
    protected $fillable = ['image', 'alt', 'order', 'active'];
    protected $casts = ['active' => 'boolean'];
}
