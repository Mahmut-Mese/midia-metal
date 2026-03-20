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
            'show_variant_in_title' => 'boolean',
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
            'shipping_weight_kg' => 'nullable|numeric|min:0.01|max:999.999',
            'shipping_length_cm' => 'nullable|numeric|min:1|max:999.99',
            'shipping_width_cm' => 'nullable|numeric|min:1|max:999.99',
            'shipping_height_cm' => 'nullable|numeric|min:1|max:999.99',
            'shipping_class' => 'nullable|string|in:standard,bulky,oversized',
            'ships_separately' => 'nullable|boolean',
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
            'show_variant_in_title' => 'boolean',
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
            'shipping_weight_kg' => 'nullable|numeric|min:0.01|max:999.999',
            'shipping_length_cm' => 'nullable|numeric|min:1|max:999.99',
            'shipping_width_cm' => 'nullable|numeric|min:1|max:999.99',
            'shipping_height_cm' => 'nullable|numeric|min:1|max:999.99',
            'shipping_class' => 'nullable|string|in:standard,bulky,oversized',
            'ships_separately' => 'nullable|boolean',
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
            $price = trim((string) ($variant['price'] ?? ''));
            if ($price === '') {
                $price = $productPrice;
            }

            $shippingWeight = $this->normalizeVariantNumeric($variant['shipping_weight_kg'] ?? null, 0.01, 999.999, 3);
            $shippingLength = $this->normalizeVariantNumeric($variant['shipping_length_cm'] ?? null, 1, 999.99, 2);
            $shippingWidth = $this->normalizeVariantNumeric($variant['shipping_width_cm'] ?? null, 1, 999.99, 2);
            $shippingHeight = $this->normalizeVariantNumeric($variant['shipping_height_cm'] ?? null, 1, 999.99, 2);
            $shippingClass = trim((string) ($variant['shipping_class'] ?? ''));
            if (!in_array($shippingClass, ['standard', 'bulky', 'oversized'], true)) {
                $shippingClass = null;
            }

            $normalized[] = [
                'option' => $option,
                'value' => $value,
                'price' => $price,
                'stock' => $stock,
                'shipping_weight_kg' => $shippingWeight,
                'shipping_length_cm' => $shippingLength,
                'shipping_width_cm' => $shippingWidth,
                'shipping_height_cm' => $shippingHeight,
                'shipping_class' => $shippingClass,
                'ships_separately' => filter_var($variant['ships_separately'] ?? false, FILTER_VALIDATE_BOOL),
            ];
        }

        return count($normalized) > 0 ? $normalized : null;
    }

    private function normalizeVariantNumeric(mixed $value, float $min, float $max, int $precision): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (!is_numeric($value)) {
            return null;
        }

        $numeric = (float) $value;
        if ($numeric < $min || $numeric > $max) {
            return null;
        }

        return round($numeric, $precision);
    }
}
