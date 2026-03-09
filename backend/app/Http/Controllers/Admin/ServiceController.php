<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Support\HtmlSanitizer;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ServiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Service::query();
        if ($request->search) {
            $query->where('title', 'like', "%{$request->search}%");
        }
        return response()->json($query->orderBy('order')->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'icon' => 'nullable|string',
            'image' => 'nullable|string',
            'excerpt' => 'nullable|string',
            'content' => 'nullable|string',
            'features' => 'nullable|array',
            'active' => 'boolean',
            'order' => 'integer',
        ]);
        $validated['content'] = HtmlSanitizer::richText($validated['content'] ?? null);
        $validated['slug'] = Str::slug($validated['title']) . '-' . Str::random(4);
        return response()->json(Service::create($validated), 201);
    }

    public function show(Service $service)
    {
        return response()->json($service);
    }

    public function update(Request $request, Service $service)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'icon' => 'nullable|string',
            'image' => 'nullable|string',
            'excerpt' => 'nullable|string',
            'content' => 'nullable|string',
            'features' => 'nullable|array',
            'active' => 'boolean',
            'order' => 'integer',
        ]);
        $validated['content'] = HtmlSanitizer::richText($validated['content'] ?? null);
        $service->update($validated);
        return response()->json($service);
    }

    public function destroy(Service $service)
    {
        $service->delete();
        return response()->json(['message' => 'Service deleted']);
    }
}
