<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProductReview;

class ProductReviewController extends Controller
{
    public function index()
    {
        $reviews = ProductReview::with(['product', 'customer'])->latest()->get();

        return response()->json($reviews);
    }

    public function destroy(ProductReview $productReview)
    {
        $productReview->delete();

        return response()->json(['message' => 'Review deleted successfully']);
    }
}
