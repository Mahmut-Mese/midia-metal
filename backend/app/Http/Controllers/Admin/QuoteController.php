<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\CustomerQuoteResponse;
use App\Models\QuoteRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

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
            'response_message' => 'nullable|string',
            'quoted_valid_until' => 'nullable|date',
        ]);
        $quote->update($validated);
        return response()->json($quote->fresh());
    }

    public function destroy(QuoteRequest $quote)
    {
        $quote->delete();
        return response()->json(['message' => 'Quote request deleted']);
    }

    public function sendResponse(QuoteRequest $quote)
    {
        if (!$quote->response_message && !$quote->quoted_valid_until) {
            return response()->json([
                'message' => 'Add a response message or valid-until date before sending.',
            ], 422);
        }

        Mail::to($quote->email)->send(new CustomerQuoteResponse($quote));

        if ($quote->status === 'new') {
            $quote->update(['status' => 'replied']);
        }

        return response()->json($quote->fresh());
    }
}
