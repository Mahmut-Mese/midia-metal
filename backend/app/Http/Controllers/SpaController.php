<?php

namespace App\Http\Controllers;

use App\Models\BlogPost;
use App\Models\PortfolioProject;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Service;
use App\Services\BotContentService;
use App\Services\SeoMetaService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SpaController extends Controller
{
    public function __construct(
        private SeoMetaService $seoMeta,
        private BotContentService $botContent,
    ) {}

    /**
     * Serve the SPA index.html with server-injected SEO meta, noscript content,
     * and bot-aware HTML for search engine crawlers.
     */
    public function serve(Request $request)
    {
        $path = trim($request->path(), '/');

        $staticPaths = [
            '',
            'services',
            'shop',
            'about',
            'contact',
            'cart',
            'checkout',
            'payment',
            'thank-you',
            'portfolio',
            'blog',
            'get-a-quote',
            'privacy-policy',
            'terms-of-service',
            'returns-policy',
            'cookies',
            'faq',
            'login',
            'register',
            'account',
            'forgot-password',
            'reset-password',
            'admin/forgot-password',
            'admin/reset-password',
        ];

        if ($path === '' || in_array($path, $staticPaths, true) || Str::startsWith($path, 'admin')) {
            return $this->serveSpaIndex($request);
        }

        $isValid = false;

        if (preg_match('#^shop/category/([^/]+)$#', $path, $matches)) {
            $isValid = ProductCategory::where('active', true)->where('slug', $matches[1])->exists();
        } elseif (preg_match('#^shop/([^/]+)$#', $path, $matches)) {
            $identifier = $matches[1];
            $isValid = Product::where('active', true)
                ->where(fn ($query) => $query->where('slug', $identifier)->orWhere('id', $identifier))
                ->exists();
        } elseif (preg_match('#^services/([^/]+)$#', $path, $matches)) {
            $isValid = Service::where('active', true)->where('slug', $matches[1])->exists();
        } elseif (preg_match('#^portfolio/([^/]+)$#', $path, $matches)) {
            $isValid = PortfolioProject::where('active', true)->where('slug', $matches[1])->exists();
        } elseif (preg_match('#^blog/([^/]+)$#', $path, $matches)) {
            $isValid = BlogPost::where('active', true)
                ->where(fn ($query) => $query->where('slug', $matches[1])->orWhere('id', $matches[1]))
                ->exists();
        }

        return $this->serveSpaIndex($request, $isValid ? 200 : 404);
    }

    /**
     * Build and serve the SPA index page with injected SEO meta.
     */
    private function serveSpaIndex(Request $request, int $status = 200, ?array $meta = null)
    {
        $meta = $meta ?: $this->seoMeta->buildSeoMeta($request, $status);

        // buildSeoMeta may return a RedirectResponse (for slug canonicalization)
        if ($meta instanceof RedirectResponse) {
            return $meta;
        }

        $indexFile = public_path('index.html');

        if (file_exists($indexFile)) {
            $html = file_get_contents($indexFile);
        } else {
            $html = view('welcome')->render();
        }

        $html = $this->seoMeta->injectSpaMeta($html, $meta);
        $html = $this->seoMeta->injectNoscriptContent($html, $meta);

        if ($this->botContent->isBot($request)) {
            $html = $this->botContent->injectBotContent(
                $html,
                $this->botContent->buildBotHtml($request, $meta)
            );
        }

        return response($html, $status)->header('Content-Type', 'text/html; charset=UTF-8');
    }
}
