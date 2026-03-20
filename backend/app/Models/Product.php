<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'name',
        'show_variant_in_title',
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
        'shipping_weight_kg',
        'shipping_length_cm',
        'shipping_width_cm',
        'shipping_height_cm',
        'shipping_class',
        'ships_separately',
        'specifications',
        'variants'
    ];
    protected $casts = [
        'show_variant_in_title' => 'boolean',
        'gallery' => 'array',
        'tags' => 'array',
        'featured' => 'boolean',
        'active' => 'boolean',
        'track_stock' => 'boolean',
        'shipping_weight_kg' => 'float',
        'shipping_length_cm' => 'float',
        'shipping_width_cm' => 'float',
        'shipping_height_cm' => 'float',
        'ships_separately' => 'boolean',
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
