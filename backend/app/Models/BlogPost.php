<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BlogPost extends Model
{
    protected $fillable = ['title', 'slug', 'image', 'excerpt', 'content', 'author', 'category', 'active', 'published_at'];

    protected $casts = ['active' => 'boolean', 'published_at' => 'datetime'];
}
