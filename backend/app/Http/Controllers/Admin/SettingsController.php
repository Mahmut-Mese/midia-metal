<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use App\Models\HeroSlide;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function index()
    {
        return response()->json(SiteSetting::all());
    }

    public function update(Request $request)
    {
        $settings = $request->input('settings', []);
        foreach ($settings as $key => $value) {
            SiteSetting::where('key', $key)->update(['value' => $value]);
        }
        return response()->json(['message' => 'Settings updated']);
    }

    // Hero Slides
    public function heroSlides()
    {
        return response()->json(HeroSlide::orderBy('order')->get());
    }

    public function storeHeroSlide(Request $request)
    {
        $validated = $request->validate([
            'image' => 'required|string',
            'alt' => 'nullable|string',
            'order' => 'integer',
            'active' => 'boolean',
        ]);
        return response()->json(HeroSlide::create($validated), 201);
    }

    public function updateHeroSlide(Request $request, HeroSlide $heroSlide)
    {
        $validated = $request->validate([
            'image' => 'required|string',
            'alt' => 'nullable|string',
            'order' => 'integer',
            'active' => 'boolean',
        ]);
        $heroSlide->update($validated);
        return response()->json($heroSlide);
    }

    public function destroyHeroSlide(HeroSlide $heroSlide)
    {
        $heroSlide->delete();
        return response()->json(['message' => 'Slide deleted']);
    }
}
