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
            $setting = SiteSetting::where('key', $key)->first();
            if (!$setting) {
                continue;
            }

            $setting->update([
                'value' => $setting->type === 'richtext'
                    ? $this->sanitizeRichText($value)
                    : $value,
            ]);
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

    private function sanitizeRichText(?string $content): string
    {
        $content = trim((string) $content);
        if ($content === '') {
            return '';
        }

        $content = preg_replace('/<script\b[^>]*>.*?<\/script>/is', '', $content) ?? '';
        $content = preg_replace('/<style\b[^>]*>.*?<\/style>/is', '', $content) ?? '';
        $content = preg_replace('/\s+on[a-z]+\s*=\s*"[^"]*"/i', '', $content) ?? '';
        $content = preg_replace("/\s+on[a-z]+\s*=\s*'[^']*'/i", '', $content) ?? '';
        $content = preg_replace('/\s+on[a-z]+\s*=\s*[^\s>]+/i', '', $content) ?? '';
        $content = preg_replace('/<(\/?)div\b[^>]*>/i', '<$1p>', $content) ?? '';
        $content = preg_replace_callback('/<font\b([^>]*)>/i', function ($matches) {
            $attributes = $matches[1] ?? '';
            if (preg_match('/color\s*=\s*"([^"]+)"/i', $attributes, $colorMatch) ||
                preg_match("/color\s*=\s*'([^']+)'/i", $attributes, $colorMatch) ||
                preg_match('/color\s*=\s*([^\s>]+)/i', $attributes, $colorMatch)) {
                return '<span style="color:' . e(trim($colorMatch[1])) . '">';
            }

            return '<span>';
        }, $content) ?? '';
        $content = preg_replace('/<\/font>/i', '</span>', $content) ?? '';

        $content = strip_tags(
            $content,
            '<p><br><strong><b><em><i><u><ul><ol><li><h1><h2><h3><h4><blockquote><a><span>'
        );

        $content = preg_replace_callback('/<a\b([^>]*)>/i', function ($matches) {
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
        }, $content) ?? '';

        $content = preg_replace_callback('/<span\b([^>]*)>/i', function ($matches) {
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
        }, $content) ?? '';

        return $content;
    }
}
