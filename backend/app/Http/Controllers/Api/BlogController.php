<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use Illuminate\Http\Request;

class BlogController extends Controller
{
    public function index(Request $request)
    {
        $query = BlogPost::where('active', true);
        if ($request->category) {
            $query->where('category', $request->category);
        }
        if ($request->search) {
            $query->where('title', 'like', "%{$request->search}%");
        }

        return response()->json($query->latest('published_at')->paginate(9));
    }

    public function show($slug)
    {
        $post = BlogPost::where('active', true)
            ->where(fn ($q) => $q->where('slug', $slug)->orWhere('id', $slug))
            ->firstOrFail();

        return response()->json($post);
    }

    public function categories()
    {
        return response()->json(
            BlogPost::where('active', true)
                ->selectRaw('category, count(*) as count')
                ->groupBy('category')
                ->get()
        );
    }

    public function recent()
    {
        return response()->json(BlogPost::where('active', true)->latest('published_at')->take(3)->get());
    }
}
