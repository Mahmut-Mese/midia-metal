<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\HeroSlide;
use App\Models\SiteSetting;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with('category')->where('active', true);

        if ($request->category) {
            $query->whereHas('category', fn($q) => $q->where('slug', $request->category));
        }
        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }
        if ($request->tag) {
            $query->whereJsonContains('tags', $request->tag);
        }
        if ($request->featured) {
            $query->where('featured', true);
        }

        return response()->json($query->orderBy('order')->paginate(18));
    }

    public function show($id)
    {
        $product = Product::with(['category', 'reviews.customer'])->where('active', true)
            ->where(fn($q) => $q->where('id', $id)->orWhere('slug', $id))
            ->firstOrFail();
        return response()->json($product);
    }

    public function categories()
    {
        return response()->json(
            ProductCategory::where('active', true)
                ->withCount(['products' => fn($q) => $q->where('active', true)])
                ->orderBy('order')
                ->get()
        );
    }

    public function categoryDetail($slug)
    {
        return response()->json(
            ProductCategory::where('active', true)
                ->where('slug', $slug)
                ->firstOrFail()
        );
    }

    public function tags()
    {
        // Fetch all product tags and flatten them
        $tags = Product::where('active', true)
            ->whereNotNull('tags')
            ->pluck('tags')
            ->flatten()
            ->unique()
            ->values();

        return response()->json($tags);
    }

    public function featured()
    {
        return response()->json(
            Product::with('category')
                ->where('active', true)
                ->where('featured', true)
                ->orderBy('order')
                ->take(8)
                ->get()
        );
    }

    public function heroSlides()
    {
        return response()->json(HeroSlide::where('active', true)->orderBy('order')->get());
    }
}
