<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'price',
        'old_price',
        'image',
        'description',
        'product_category_id',
        'tags',
        'badge',
        'featured',
        'active',
        'order',
        'stock_quantity',
        'track_stock'
    ];
    protected $casts = ['tags' => 'array', 'featured' => 'boolean', 'active' => 'boolean', 'track_stock' => 'boolean'];

    public function category()
    {
        return $this->belongsTo(ProductCategory::class, 'product_category_id');
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }
}
