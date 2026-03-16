<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Support\HtmlSanitizer;
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

        $validated['description'] = HtmlSanitizer::richText($validated['description'] ?? null);
        $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(4);
        $validated['variants'] = $this->normalizeVariants($validated['variants'] ?? null, (string) $validated['price']);

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

        $validated['description'] = HtmlSanitizer::richText($validated['description'] ?? null);
        $validated['variants'] = $this->normalizeVariants($validated['variants'] ?? null, (string) $validated['price']);

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

    private function normalizeVariants(mixed $variants, string $productPrice): ?array
    {
        if (!is_array($variants) || count($variants) === 0) {
            return null;
        }

        $normalized = [];
        foreach ($variants as $variant) {
            if (!is_array($variant)) {
                continue;
            }

            $option = trim((string) ($variant['option'] ?? ''));
            $value = trim((string) ($variant['value'] ?? ''));
            if ($option === '' || $value === '') {
                continue;
            }

            $stock = $variant['stock'] ?? null;
            $stock = is_numeric($stock) ? max(0, (int) $stock) : null;

            $normalized[] = [
                'option' => $option,
                'value' => $value,
                'price' => $productPrice,
                'stock' => $stock,
            ];
        }

        return count($normalized) > 0 ? $normalized : null;
    }
}
