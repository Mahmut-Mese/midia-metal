<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PortfolioCategory;
use App\Models\PortfolioProject;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PortfolioController extends Controller
{
    public function index(Request $request)
    {
        $query = PortfolioProject::with('portfolioCategory');
        if ($request->search) {
            $query->where('title', 'like', "%{$request->search}%");
        }
        if ($request->category_id) {
            $query->where('portfolio_category_id', $request->category_id);
        }

        return response()->json($query->orderBy('order')->latest()->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'image' => 'nullable|string',
            'description' => 'nullable|string',
            'location' => 'nullable|string',
            'client' => 'nullable|string',
            'customer_number' => 'nullable|string|max:255',
            'year' => 'nullable|string',
            'portfolio_category_id' => 'nullable|integer|exists:portfolio_categories,id',
            'services_list' => 'nullable|array',
            'gallery' => 'nullable|array',
            'active' => 'boolean',
            'order' => 'integer',
        ]);
        $validated['slug'] = Str::slug($validated['title']).'-'.Str::random(4);

        return response()->json(PortfolioProject::create($validated)->load('portfolioCategory'), 201);
    }

    public function show(PortfolioProject $portfolio)
    {
        return response()->json($portfolio->load('portfolioCategory'));
    }

    public function update(Request $request, PortfolioProject $portfolio)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'image' => 'nullable|string',
            'description' => 'nullable|string',
            'location' => 'nullable|string',
            'client' => 'nullable|string',
            'customer_number' => 'nullable|string|max:255',
            'year' => 'nullable|string',
            'portfolio_category_id' => 'nullable|integer|exists:portfolio_categories,id',
            'services_list' => 'nullable|array',
            'gallery' => 'nullable|array',
            'active' => 'boolean',
            'order' => 'integer',
        ]);
        $portfolio->update($validated);

        return response()->json($portfolio->load('portfolioCategory'));
    }

    public function destroy(PortfolioProject $portfolio)
    {
        $portfolio->delete();

        return response()->json(['message' => 'Project deleted']);
    }

    public function categories()
    {
        return response()->json(PortfolioCategory::withCount('projects')->get());
    }

    public function storeCategory(Request $request)
    {
        $validated = $request->validate(['name' => 'required|string|max:255']);
        $validated['slug'] = Str::slug($validated['name']);

        return response()->json(PortfolioCategory::create($validated), 201);
    }

    public function updateCategory(Request $request, PortfolioCategory $portfolioCategory)
    {
        $validated = $request->validate(['name' => 'required|string|max:255']);
        $validated['slug'] = Str::slug($validated['name']);
        $portfolioCategory->update($validated);

        return response()->json($portfolioCategory);
    }

    public function destroyCategory(PortfolioCategory $portfolioCategory)
    {
        $portfolioCategory->delete();

        return response()->json(['message' => 'Category deleted']);
    }
}
