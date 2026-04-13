<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;

class SettingsController extends Controller
{
    public function index()
    {
        return response()->json(SiteSetting::all());
    }
}
