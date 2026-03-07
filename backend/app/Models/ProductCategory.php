<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductCategory extends Model
{
    protected $fillable = ['name', 'slug', 'image', 'description', 'order', 'active'];
    protected $casts = ['active' => 'boolean'];

    public function products()
    {
        return $this->hasMany(Product::class);
    }
}
