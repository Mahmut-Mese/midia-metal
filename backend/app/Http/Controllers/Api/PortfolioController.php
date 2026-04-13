<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PortfolioCategory;
use App\Models\PortfolioProject;
use Illuminate\Http\Request;

class PortfolioController extends Controller
{
    public function index(Request $request)
    {
        $query = PortfolioProject::with('portfolioCategory')->where('active', true);
        if ($request->category) {
            $query->whereHas('portfolioCategory', fn ($q) => $q->where('slug', $request->category));
        }

        return response()->json($query->orderBy('order')->get());
    }

    public function show($slug)
    {
        $project = PortfolioProject::with('portfolioCategory')->where('active', true)
            ->where(fn ($q) => $q->where('slug', $slug)->orWhere('id', $slug))
            ->firstOrFail();

        return response()->json($project);
    }

    public function categories()
    {
        return response()->json(PortfolioCategory::withCount(['projects' => fn ($q) => $q->where('active', true)])->get());
    }
}
