<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with('category');

        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }
        if ($request->category_id) {
            $query->where('product_category_id', $request->category_id);
        }
        if ($request->active !== null && $request->active !== '') {
            $query->where('active', $request->active);
        }

        return response()->json($query->orderBy('order')->orderBy('created_at', 'desc')->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|string',
            'image' => 'nullable|string',
            'gallery' => 'nullable|array',
            'description' => 'nullable|string',
            'product_category_id' => 'nullable|integer|exists:product_categories,id',
            'tags' => 'nullable|array',
            'badge' => 'nullable|string',
            'old_price' => 'nullable|string',
            'featured' => 'boolean',
            'active' => 'boolean',
            'order' => 'integer',
            'track_stock' => 'boolean',
            'stock_quantity' => 'nullable|integer',
            'specifications' => 'nullable|array',
            'variants' => 'nullable|array',
        ]);

        $validated['description'] = $this->sanitizeDescription($validated['description'] ?? null);
        $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(4);

        $product = Product::create($validated);
        return response()->json($product->load('category'), 201);
    }

    public function show(Product $product)
    {
        return response()->json($product->load('category'));
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|string',
            'image' => 'nullable|string',
            'gallery' => 'nullable|array',
            'description' => 'nullable|string',
            'product_category_id' => 'nullable|integer|exists:product_categories,id',
            'tags' => 'nullable|array',
            'badge' => 'nullable|string',
            'old_price' => 'nullable|string',
            'featured' => 'boolean',
            'active' => 'boolean',
            'order' => 'integer',
            'track_stock' => 'boolean',
            'stock_quantity' => 'nullable|integer',
            'specifications' => 'nullable|array',
            'variants' => 'nullable|array',
        ]);

        $validated['description'] = $this->sanitizeDescription($validated['description'] ?? null);

        if ($validated['name'] !== $product->name) {
            $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(4);
        }

        $product->update($validated);
        return response()->json($product->load('category'));
    }

    public function destroy(Product $product)
    {
        $product->delete();
        return response()->json(['message' => 'Product deleted']);
    }

    public function categories()
    {
        return response()->json(ProductCategory::orderBy('order')->get());
    }

    private function sanitizeDescription(?string $description): ?string
    {
        if ($description === null) {
            return null;
        }

        $description = trim($description);
        if ($description === '') {
            return '';
        }

        // Remove script/style blocks and disallow risky inline handlers.
        $description = preg_replace('/<script\b[^>]*>.*?<\/script>/is', '', $description) ?? '';
        $description = preg_replace('/<style\b[^>]*>.*?<\/style>/is', '', $description) ?? '';
        $description = preg_replace('/\s+on[a-z]+\s*=\s*"[^"]*"/i', '', $description) ?? '';
        $description = preg_replace("/\s+on[a-z]+\s*=\s*'[^']*'/i", '', $description) ?? '';
        $description = preg_replace('/\s+on[a-z]+\s*=\s*[^\s>]+/i', '', $description) ?? '';
        $description = preg_replace('/<(\/?)div\b[^>]*>/i', '<$1p>', $description) ?? '';
        $description = preg_replace_callback('/<font\b([^>]*)>/i', function ($matches) {
            $attributes = $matches[1] ?? '';
            if (preg_match('/color\s*=\s*"([^"]+)"/i', $attributes, $colorMatch) ||
                preg_match("/color\s*=\s*'([^']+)'/i", $attributes, $colorMatch) ||
                preg_match('/color\s*=\s*([^\s>]+)/i', $attributes, $colorMatch)) {
                return '<span style="color:' . e(trim($colorMatch[1])) . '">';
            }
            return '<span>';
        }, $description) ?? '';
        $description = preg_replace('/<\/font>/i', '</span>', $description) ?? '';

        // Keep only formatting tags supported by the admin editor.
        $description = strip_tags(
            $description,
            '<p><br><strong><b><em><i><u><ul><ol><li><h2><h3><h4><blockquote><a><span>'
        );

        // Normalize links to avoid javascript: payloads.
        $description = preg_replace_callback('/<a\b([^>]*)>/i', function ($matches) {
            $attributes = $matches[1] ?? '';
            if (!preg_match('/href\s*=\s*"([^"]+)"/i', $attributes, $hrefMatch) &&
                !preg_match("/href\s*=\s*'([^']+)'/i", $attributes, $hrefMatch)) {
                return '<a>';
            }

            $href = trim($hrefMatch[1]);
            if (preg_match('/^\s*javascript:/i', $href)) {
                return '<a>';
            }

            return '<a href="' . e($href) . '" target="_blank" rel="noopener noreferrer">';
        }, $description) ?? '';

        // Allow only safe color styles on span tags.
        $description = preg_replace_callback('/<span\b([^>]*)>/i', function ($matches) {
            $attributes = $matches[1] ?? '';
            if (!preg_match('/style\s*=\s*"([^"]*)"/i', $attributes, $styleMatch) &&
                !preg_match("/style\s*=\s*'([^']*)'/i", $attributes, $styleMatch)) {
                return '<span>';
            }

            $style = $styleMatch[1] ?? '';
            if (!preg_match('/(?:^|;)\s*color\s*:\s*([^;]+)/i', $style, $colorMatch)) {
                return '<span>';
            }

            $color = trim($colorMatch[1]);
            if (!preg_match('/^(#[0-9a-fA-F]{3,8}|rgb(a)?\([^)]+\)|hsl(a)?\([^)]+\)|[a-zA-Z]+)$/', $color)) {
                return '<span>';
            }

            return '<span style="color:' . e($color) . '">';
        }, $description) ?? '';

        return $description;
    }
}
