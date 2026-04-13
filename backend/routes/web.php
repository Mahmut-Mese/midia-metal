<?php

use App\Http\Controllers\SitemapController;
use App\Http\Controllers\SpaController;
use App\Services\SeoMetaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/sitemap.xml', [SitemapController::class, 'index']);

Route::get('/robots.txt', function (Request $request) {
    $seoMeta = app(SeoMetaService::class);
    $baseUrl = $seoMeta->resolveBaseUrl($request);

    $content = implode("\n", [
        'User-agent: *',
        'Allow: /',
        'Sitemap: '.$baseUrl.'/sitemap.xml',
        '',
    ]);

    return response($content, 200)->header('Content-Type', 'text/plain; charset=UTF-8');
});

Route::fallback([SpaController::class, 'serve']);
