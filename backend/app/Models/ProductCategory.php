<?php

namespace App\Models;

use App\Models\Concerns\NormalizesMediaUrls;
use Illuminate\Database\Eloquent\Model;

class ProductCategory extends Model
{
    use NormalizesMediaUrls;

    protected $fillable = ['name', 'slug', 'image', 'description', 'order', 'active'];
    protected $casts = ['active' => 'boolean'];

    public function getImageAttribute($value)
    {
        return $this->normalizeMediaUrl($value);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }
}
