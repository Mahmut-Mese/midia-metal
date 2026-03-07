<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\QuoteRequest;
use Illuminate\Http\Request;

class QuoteController extends Controller
{
    public function index()
    {
        return response()->json(QuoteRequest::latest()->get());
    }

    public function show(QuoteRequest $quote)
    {
        return response()->json($quote);
    }

    public function update(Request $request, QuoteRequest $quote)
    {
        $validated = $request->validate([
            'status' => 'nullable|in:new,reviewing,replied',
            'admin_notes' => 'nullable|string',
        ]);
        $quote->update($validated);
        return response()->json($quote);
    }

    public function destroy(QuoteRequest $quote)
    {
        $quote->delete();
        return response()->json(['message' => 'Quote request deleted']);
    }
}
