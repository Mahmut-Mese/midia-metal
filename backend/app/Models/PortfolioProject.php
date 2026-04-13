<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PortfolioProject extends Model
{
    protected $fillable = [
        'title',
        'slug',
        'image',
        'description',
        'location',
        'client',
        'customer_number',
        'year',
        'portfolio_category_id',
        'services_list',
        'gallery',
        'active',
        'order',
    ];

    protected $casts = ['services_list' => 'array', 'gallery' => 'array', 'active' => 'boolean'];

    public function portfolioCategory()
    {
        return $this->belongsTo(PortfolioCategory::class, 'portfolio_category_id');
    }
}
