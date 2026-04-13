<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveBlogPostRequest;
use App\Models\BlogPost;
use App\Support\HtmlSanitizer;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BlogController extends Controller
{
    public function index(Request $request)
    {
        $query = BlogPost::query();
        if ($request->search) {
            $query->where('title', 'like', "%{$request->search}%");
        }
        if ($request->category) {
            $query->where('category', $request->category);
        }

        return response()->json($query->latest()->paginate(15));
    }

    public function store(SaveBlogPostRequest $request)
    {
        $validated = $request->validated();
        $validated['content'] = HtmlSanitizer::richText($validated['content'] ?? null);
        $validated['slug'] = Str::slug($validated['title']).'-'.Str::random(4);
        if (empty($validated['published_at'])) {
            $validated['published_at'] = now();
        }

        return response()->json(BlogPost::create($validated), 201);
    }

    public function show(BlogPost $blog)
    {
        return response()->json($blog);
    }

    public function update(SaveBlogPostRequest $request, BlogPost $blog)
    {
        $validated = $request->validated();
        $validated['content'] = HtmlSanitizer::richText($validated['content'] ?? null);
        $blog->update($validated);

        return response()->json($blog);
    }

    public function destroy(BlogPost $blog)
    {
        $blog->delete();

        return response()->json(['message' => 'Blog post deleted']);
    }
}
