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
        'gallery',
        'description',
        'product_category_id',
        'tags',
        'badge',
        'featured',
        'active',
        'order',
        'stock_quantity',
        'track_stock',
        'specifications',
        'variants'
    ];
    protected $casts = [
        'gallery' => 'array',
        'tags' => 'array',
        'featured' => 'boolean',
        'active' => 'boolean',
        'track_stock' => 'boolean',
        'specifications' => 'array',
        'variants' => 'array'
    ];

    public function category()
    {
        return $this->belongsTo(ProductCategory::class, 'product_category_id');
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function reviews()
    {
        return $this->hasMany(ProductReview::class);
    }
}
