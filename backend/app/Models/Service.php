<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    protected $fillable = ['title', 'slug', 'icon', 'image', 'excerpt', 'content', 'features', 'active', 'order'];

    protected $casts = ['features' => 'array', 'active' => 'boolean'];
}
