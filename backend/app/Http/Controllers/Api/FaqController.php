<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Faq;

class FaqController extends Controller
{
    public function index()
    {
        return response()->json(Faq::where('active', true)->orderBy('order')->get());
    }
}
