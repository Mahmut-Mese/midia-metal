<?php

use Illuminate\Support\Facades\Route;

Route::get('/{path?}', function () {
    $indexFile = public_path('index.html');

    if (file_exists($indexFile)) {
        return response()->file($indexFile);
    }

    return view('welcome');
})->where('path', '^(?!api).*$');
