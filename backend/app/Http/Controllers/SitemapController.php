<?php

namespace App\Http\Controllers;

use App\Models\BlogPost;
use App\Models\PortfolioProject;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Service;
use Illuminate\Http\Request;

class SitemapController extends Controller
{
    public function index(Request $request)
    {
        $configuredFrontendUrl = rtrim((string) config('app.frontend_url'), '/');
        $baseUrl = $configuredFrontendUrl !== '' && ! preg_match('/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i', $configuredFrontendUrl)
            ? $configuredFrontendUrl
            : rtrim($request->getSchemeAndHttpHost(), '/');

        $urls = [
            ['loc' => $baseUrl.'/', 'lastmod' => now()->toDateString(), 'changefreq' => 'weekly', 'priority' => '1.0'],
            ['loc' => $baseUrl.'/shop', 'lastmod' => now()->toDateString(), 'changefreq' => 'daily', 'priority' => '0.9'],
            ['loc' => $baseUrl.'/services', 'lastmod' => now()->toDateString(), 'changefreq' => 'weekly', 'priority' => '0.9'],
            ['loc' => $baseUrl.'/portfolio', 'lastmod' => now()->toDateString(), 'changefreq' => 'weekly', 'priority' => '0.8'],
            ['loc' => $baseUrl.'/blog', 'lastmod' => now()->toDateString(), 'changefreq' => 'weekly', 'priority' => '0.8'],
            ['loc' => $baseUrl.'/about', 'lastmod' => now()->toDateString(), 'changefreq' => 'monthly', 'priority' => '0.7'],
            ['loc' => $baseUrl.'/contact', 'lastmod' => now()->toDateString(), 'changefreq' => 'monthly', 'priority' => '0.7'],
            ['loc' => $baseUrl.'/get-a-quote', 'lastmod' => now()->toDateString(), 'changefreq' => 'monthly', 'priority' => '0.7'],
            ['loc' => $baseUrl.'/faq', 'lastmod' => now()->toDateString(), 'changefreq' => 'monthly', 'priority' => '0.6'],
            ['loc' => $baseUrl.'/privacy-policy', 'lastmod' => now()->toDateString(), 'changefreq' => 'yearly', 'priority' => '0.3'],
            ['loc' => $baseUrl.'/terms-of-service', 'lastmod' => now()->toDateString(), 'changefreq' => 'yearly', 'priority' => '0.3'],
            ['loc' => $baseUrl.'/returns-policy', 'lastmod' => now()->toDateString(), 'changefreq' => 'yearly', 'priority' => '0.3'],
            ['loc' => $baseUrl.'/cookies', 'lastmod' => now()->toDateString(), 'changefreq' => 'yearly', 'priority' => '0.3'],
        ];

        ProductCategory::where('active', true)->get()->each(function ($category) use (&$urls, $baseUrl) {
            $urls[] = [
                'loc' => $baseUrl.'/shop/category/'.$category->slug,
                'lastmod' => optional($category->updated_at)->toDateString() ?: now()->toDateString(),
                'changefreq' => 'weekly',
                'priority' => '0.7',
            ];
        });

        Product::where('active', true)->get()->each(function ($product) use (&$urls, $baseUrl) {
            $urls[] = [
                'loc' => $baseUrl.'/shop/'.($product->slug ?: $product->id),
                'lastmod' => optional($product->updated_at)->toDateString() ?: now()->toDateString(),
                'changefreq' => 'weekly',
                'priority' => '0.8',
            ];
        });

        Service::where('active', true)->get()->each(function ($service) use (&$urls, $baseUrl) {
            $urls[] = [
                'loc' => $baseUrl.'/services/'.$service->slug,
                'lastmod' => optional($service->updated_at)->toDateString() ?: now()->toDateString(),
                'changefreq' => 'monthly',
                'priority' => '0.8',
            ];
        });

        PortfolioProject::where('active', true)->get()->each(function ($project) use (&$urls, $baseUrl) {
            $urls[] = [
                'loc' => $baseUrl.'/portfolio/'.$project->slug,
                'lastmod' => optional($project->updated_at)->toDateString() ?: now()->toDateString(),
                'changefreq' => 'monthly',
                'priority' => '0.7',
            ];
        });

        BlogPost::where('active', true)->get()->each(function ($post) use (&$urls, $baseUrl) {
            $urls[] = [
                'loc' => $baseUrl.'/blog/'.$post->slug,
                'lastmod' => optional($post->updated_at)->toDateString() ?: optional($post->published_at)->toDateString() ?: now()->toDateString(),
                'changefreq' => 'monthly',
                'priority' => '0.7',
            ];
        });

        $xml = view('sitemap', ['urls' => $urls])->render();

        return response($xml, 200)->header('Content-Type', 'application/xml');
    }
}
