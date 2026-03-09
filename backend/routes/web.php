<?php

use App\Http\Controllers\SitemapController;
use App\Models\BlogPost;
use App\Models\PortfolioProject;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\SiteSetting;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

Route::get('/sitemap.xml', [SitemapController::class, 'index']);

Route::get('/robots.txt', function (Request $request) {
    $configuredFrontendUrl = rtrim((string) config('app.frontend_url'), '/');
    $baseUrl = $configuredFrontendUrl !== '' && !preg_match('/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i', $configuredFrontendUrl)
        ? $configuredFrontendUrl
        : rtrim($request->getSchemeAndHttpHost(), '/');

    $content = implode("\n", [
        'User-agent: *',
        'Allow: /',
        'Sitemap: ' . $baseUrl . '/sitemap.xml',
        '',
    ]);

    return response($content, 200)->header('Content-Type', 'text/plain; charset=UTF-8');
});

$resolveBaseUrl = function (Request $request): string {
    $configuredFrontendUrl = rtrim((string) config('app.frontend_url'), '/');

    return $configuredFrontendUrl !== '' && !preg_match('/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i', $configuredFrontendUrl)
        ? $configuredFrontendUrl
        : rtrim($request->getSchemeAndHttpHost(), '/');
};

$normalizeText = function (?string $text, int $limit = 160): string {
    return Str::limit(trim(preg_replace('/\s+/', ' ', strip_tags((string) $text))), $limit, '...');
};

$absoluteUrl = function (string $baseUrl, ?string $path = null): string {
    if (!$path) {
        return $baseUrl . '/';
    }

    if (preg_match('/^https?:\/\//i', $path)) {
        return $path;
    }

    return $baseUrl . '/' . ltrim($path, '/');
};

$breadcrumbJsonLd = function (array $items): array {
    return [
        '@context' => 'https://schema.org',
        '@type' => 'BreadcrumbList',
        'itemListElement' => array_map(function ($item, $index) {
            return [
                '@type' => 'ListItem',
                'position' => $index + 1,
                'name' => $item['name'],
                'item' => $item['url'],
            ];
        }, $items, array_keys($items)),
    ];
};

$buildSeoMeta = function (Request $request, int $status = 200) use ($resolveBaseUrl, $normalizeText, $absoluteUrl, $breadcrumbJsonLd) {
    $path = trim($request->path(), '/');
    $baseUrl = $resolveBaseUrl($request);
    $settings = Schema::hasTable('site_settings')
        ? SiteSetting::pluck('value', 'key')
        : collect();
    $siteName = $settings->get('site_name', 'Midia M Metal');
    $defaultImage = $absoluteUrl($baseUrl, $settings->get('site_logo') ?: '/logo.png');
    $contactPhone = $settings->get('contact_phone') ?: $settings->get('company_phone');
    $contactEmail = $settings->get('contact_email') ?: $settings->get('company_email');
    $contactAddress = $settings->get('contact_address') ?: $settings->get('company_address');
    $twitterHandle = trim((string) $settings->get('social_twitter', '@midiametal'));
    if ($twitterHandle !== '' && !Str::startsWith($twitterHandle, '@')) {
        $twitterHandle = preg_match('~twitter\.com/([^/?#]+)~i', $twitterHandle, $matches) ? '@' . $matches[1] : '@midiametal';
    }

    $meta = [
        'title' => $settings->get('meta_title', $siteName . ' | Commercial Kitchen Ventilation & Fabrication'),
        'description' => $normalizeText($settings->get('meta_description', 'Commercial kitchen ventilation, stainless steel fabrication, canopy systems, and custom metalwork across the UK.')),
        'canonical' => $path === '' ? $baseUrl . '/' : $absoluteUrl($baseUrl, $path),
        'type' => 'website',
        'image' => $defaultImage,
        'robots' => $status === 404 ? 'noindex, nofollow' : 'index, follow',
        'siteName' => $siteName,
        'twitterSite' => $twitterHandle !== '' ? $twitterHandle : '@midiametal',
        'jsonLd' => [$breadcrumbJsonLd([
            ['name' => 'Home', 'url' => $baseUrl . '/'],
        ])],
    ];

    if ($path === '') {
        $organization = [
            '@context' => 'https://schema.org',
            '@type' => 'LocalBusiness',
            'name' => $siteName,
            'url' => $baseUrl . '/',
            'image' => $defaultImage,
        ];

        if ($contactPhone) {
            $organization['telephone'] = $contactPhone;
        }

        if ($contactEmail) {
            $organization['email'] = $contactEmail;
        }

        if ($contactAddress) {
            $organization['address'] = [
                '@type' => 'PostalAddress',
                'streetAddress' => $contactAddress,
            ];
        }

        $meta['jsonLd'] = array_values(array_filter([
            $breadcrumbJsonLd([
                ['name' => 'Home', 'url' => $baseUrl . '/'],
            ]),
            $organization,
            [
                '@context' => 'https://schema.org',
                '@type' => 'WebSite',
                'name' => $siteName,
                'url' => $baseUrl . '/',
            ],
        ]));
    }

    if ($path === 'admin' || $path === 'admin/login' || Str::startsWith($path, 'admin/')) {
        $meta['title'] = 'Admin | ' . $siteName;
        $meta['description'] = 'Admin dashboard access.';
        $meta['robots'] = 'noindex, nofollow';
        $meta['jsonLd'] = [];

        return $meta;
    }

    $staticMeta = [
        'about' => [
            'title' => 'About Us | ' . $siteName,
            'description' => $normalizeText($settings->get('about_subtitle') ?: $settings->get('about_content_1')),
        ],
        'contact' => [
            'title' => 'Contact | ' . $siteName,
            'description' => $normalizeText($settings->get('contact_welcome', 'Get in touch with Midia M Metal for custom metal fabrication and ventilation enquiries.')),
        ],
        'shop' => [
            'title' => 'Shop | ' . $siteName,
            'description' => 'Browse commercial kitchen products, grease filters, canopies, ventilation parts, and stainless steel fabrication items.',
        ],
        'services' => [
            'title' => 'Services | ' . $siteName,
            'description' => $normalizeText($settings->get('services_hero_desc', 'Commercial kitchen ventilation, stainless steel welding, custom fabrication, and canopy installation services.')),
        ],
        'portfolio' => [
            'title' => 'Portfolio | ' . $siteName,
            'description' => 'View recent commercial kitchen ventilation, stainless steel fabrication, canopy installation, and custom metalwork projects.',
        ],
        'blog' => [
            'title' => 'Blog | ' . $siteName,
            'description' => 'Read insights on commercial kitchen ventilation, stainless steel fabrication, hygiene, and maintenance.',
        ],
        'get-a-quote' => [
            'title' => 'Request a Quote | ' . $siteName,
            'description' => 'Request a quote for canopies, ventilation systems, custom fabrication, and stainless steel catering equipment.',
        ],
        'faq' => [
            'title' => ($settings->get('faq_page_title') ?: 'Frequently Asked Questions') . ' | ' . $siteName,
            'description' => $normalizeText($settings->get('faq_page_content')),
        ],
        'privacy-policy' => [
            'title' => ($settings->get('privacy_policy_title') ?: 'Privacy Policy') . ' | ' . $siteName,
            'description' => $normalizeText($settings->get('privacy_policy_content')),
        ],
        'terms-of-service' => [
            'title' => ($settings->get('terms_conditions_title') ?: 'Terms & Conditions') . ' | ' . $siteName,
            'description' => $normalizeText($settings->get('terms_conditions_content')),
        ],
        'returns-policy' => [
            'title' => ($settings->get('returns_refunds_title') ?: 'Returns & Refunds') . ' | ' . $siteName,
            'description' => $normalizeText($settings->get('returns_refunds_content')),
        ],
        'cookies' => [
            'title' => ($settings->get('cookies_page_title') ?: 'Cookies Page') . ' | ' . $siteName,
            'description' => $normalizeText($settings->get('cookies_page_content')),
        ],
        'cart' => [
            'title' => 'Basket | ' . $siteName,
            'description' => 'Review the products in your basket before checkout.',
            'robots' => 'noindex, nofollow',
        ],
        'checkout' => [
            'title' => 'Checkout | ' . $siteName,
            'description' => 'Complete your checkout securely.',
            'robots' => 'noindex, nofollow',
        ],
        'payment' => [
            'title' => 'Payment | ' . $siteName,
            'description' => 'Secure payment page.',
            'robots' => 'noindex, nofollow',
        ],
        'thank-you' => [
            'title' => 'Order Confirmation | ' . $siteName,
            'description' => 'Your order confirmation page.',
            'robots' => 'noindex, nofollow',
        ],
        'login' => [
            'title' => 'Customer Login | ' . $siteName,
            'description' => 'Log in to your customer account.',
            'robots' => 'noindex, nofollow',
        ],
        'register' => [
            'title' => 'Create Account | ' . $siteName,
            'description' => 'Register for a customer account.',
            'robots' => 'noindex, nofollow',
        ],
        'account' => [
            'title' => 'My Account | ' . $siteName,
            'description' => 'Manage your orders, quotes, and saved details.',
            'robots' => 'noindex, nofollow',
        ],
    ];

    if (array_key_exists($path, $staticMeta)) {
        $meta = array_merge($meta, $staticMeta[$path]);

        if ($path === 'shop' && (
            $request->filled('search') ||
            $request->filled('category') ||
            $request->filled('tag') ||
            $request->boolean('stock') ||
            $request->boolean('in_stock') ||
            $request->filled('min_price') ||
            $request->filled('max_price') ||
            $request->filled('sort')
        )) {
            $meta['robots'] = 'noindex, follow';
        }

        if ($path !== '') {
            $pageName = Str::before($meta['title'], ' | ' . $siteName);
            $meta['jsonLd'] = [$breadcrumbJsonLd([
                ['name' => 'Home', 'url' => $baseUrl . '/'],
                ['name' => $pageName !== '' ? $pageName : $meta['title'], 'url' => $meta['canonical']],
            ])];
        }
        return $meta;
    }

    if (preg_match('#^shop/category/([^/]+)$#', $path, $matches)) {
        $category = ProductCategory::where('active', true)->where('slug', $matches[1])->first();
        if ($category) {
            $meta['title'] = $category->name . ' Products | ' . $siteName;
            $meta['description'] = $normalizeText($category->description ?: ('Browse ' . $category->name . ' products from ' . $siteName . '.'));
            $meta['image'] = $absoluteUrl($baseUrl, $category->image);
            $meta['jsonLd'] = [$breadcrumbJsonLd([
                ['name' => 'Home', 'url' => $baseUrl . '/'],
                ['name' => 'Shop', 'url' => $absoluteUrl($baseUrl, 'shop')],
                ['name' => $category->name, 'url' => $meta['canonical']],
            ])];
        }
        return $meta;
    }

    if (preg_match('#^shop/([^/]+)$#', $path, $matches)) {
        $product = Product::with('category')
            ->where('active', true)
            ->where(fn($query) => $query->where('slug', $matches[1])->orWhere('id', $matches[1]))
            ->first();
        if ($product) {
            $meta['title'] = $product->name . ' | ' . $siteName;
            $meta['description'] = $normalizeText($product->description ?: ($product->category->description ?? $product->name));
            $meta['type'] = 'product';
            $meta['image'] = $absoluteUrl($baseUrl, $product->image);
            $meta['jsonLd'] = [
                $breadcrumbJsonLd(array_values(array_filter([
                    ['name' => 'Home', 'url' => $baseUrl . '/'],
                    ['name' => 'Shop', 'url' => $absoluteUrl($baseUrl, 'shop')],
                    $product->category ? ['name' => $product->category->name, 'url' => $absoluteUrl($baseUrl, 'shop/category/' . $product->category->slug)] : null,
                    ['name' => $product->name, 'url' => $meta['canonical']],
                ]))),
                [
                    '@context' => 'https://schema.org',
                    '@type' => 'Product',
                    'name' => $product->name,
                    'description' => $normalizeText($product->description ?: $product->name, 500),
                    'image' => [$absoluteUrl($baseUrl, $product->image)],
                    'sku' => (string) $product->id,
                    'offers' => [
                        '@type' => 'Offer',
                        'url' => $meta['canonical'],
                        'priceCurrency' => 'GBP',
                        'price' => preg_replace('/[^\d.]/', '', (string) $product->price),
                    ],
                ],
            ];
        }
        return $meta;
    }

    if (preg_match('#^services/([^/]+)$#', $path, $matches)) {
        $service = Service::where('active', true)->where('slug', $matches[1])->first();
        if ($service) {
            $meta['title'] = $service->title . ' | ' . $siteName;
            $meta['description'] = $normalizeText($service->excerpt ?: $service->content ?: $service->title);
            $meta['image'] = $service->image ? $absoluteUrl($baseUrl, $service->image) : $defaultImage;
            $meta['jsonLd'] = [
                $breadcrumbJsonLd([
                    ['name' => 'Home', 'url' => $baseUrl . '/'],
                    ['name' => 'Services', 'url' => $absoluteUrl($baseUrl, 'services')],
                    ['name' => $service->title, 'url' => $meta['canonical']],
                ]),
                [
                    '@context' => 'https://schema.org',
                    '@type' => 'Service',
                    'name' => $service->title,
                    'description' => $normalizeText($service->excerpt ?: $service->content ?: $service->title, 500),
                    'provider' => [
                        '@type' => 'Organization',
                        'name' => $siteName,
                        'url' => $baseUrl . '/',
                    ],
                ],
            ];
        }
        return $meta;
    }

    if (preg_match('#^portfolio/([^/]+)$#', $path, $matches)) {
        $project = PortfolioProject::where('active', true)->where('slug', $matches[1])->first();
        if ($project) {
            $meta['title'] = $project->title . ' | ' . $siteName;
            $meta['description'] = $normalizeText($project->description ?: $project->title);
            $meta['image'] = $project->image ? $absoluteUrl($baseUrl, $project->image) : $defaultImage;
            $meta['jsonLd'] = [$breadcrumbJsonLd([
                ['name' => 'Home', 'url' => $baseUrl . '/'],
                ['name' => 'Portfolio', 'url' => $absoluteUrl($baseUrl, 'portfolio')],
                ['name' => $project->title, 'url' => $meta['canonical']],
            ])];
        }
        return $meta;
    }

    if (preg_match('#^blog/([^/]+)$#', $path, $matches)) {
        $post = BlogPost::where('active', true)
            ->where(fn($query) => $query->where('slug', $matches[1])->orWhere('id', $matches[1]))
            ->first();
        if ($post) {
            $meta['title'] = $post->title . ' | ' . $siteName;
            $meta['description'] = $normalizeText($post->excerpt ?: $post->content ?: $post->title);
            $meta['type'] = 'article';
            $meta['image'] = $post->image ? $absoluteUrl($baseUrl, $post->image) : $defaultImage;
            $meta['jsonLd'] = [
                $breadcrumbJsonLd([
                    ['name' => 'Home', 'url' => $baseUrl . '/'],
                    ['name' => 'Blog', 'url' => $absoluteUrl($baseUrl, 'blog')],
                    ['name' => $post->title, 'url' => $meta['canonical']],
                ]),
                [
                    '@context' => 'https://schema.org',
                    '@type' => 'Article',
                    'headline' => $post->title,
                    'description' => $normalizeText($post->excerpt ?: $post->content ?: $post->title),
                    'image' => [$meta['image']],
                    'author' => [
                        '@type' => 'Person',
                        'name' => $post->author ?: 'Admin',
                    ],
                    'datePublished' => optional($post->published_at)->toAtomString(),
                    'dateModified' => optional($post->updated_at)->toAtomString(),
                ],
            ];
        }
        return $meta;
    }

    if ($status === 404) {
        $meta['title'] = '404 Not Found | ' . $siteName;
        $meta['description'] = 'The page you requested could not be found.';
        $meta['robots'] = 'noindex, nofollow';
    }

    return $meta;
};

$injectSpaMeta = function (string $html, array $meta) {
    $escape = fn(string $value) => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');

    $patterns = [
        '/<title>.*?<\/title>/is',
        '/<meta[^>]+name=["\']description["\'][^>]*>/i',
        '/<meta[^>]+name=["\']robots["\'][^>]*>/i',
        '/<meta[^>]+property=["\']og:title["\'][^>]*>/i',
        '/<meta[^>]+property=["\']og:description["\'][^>]*>/i',
        '/<meta[^>]+property=["\']og:type["\'][^>]*>/i',
        '/<meta[^>]+property=["\']og:url["\'][^>]*>/i',
        '/<meta[^>]+property=["\']og:image["\'][^>]*>/i',
        '/<meta[^>]+property=["\']og:site_name["\'][^>]*>/i',
        '/<meta[^>]+name=["\']twitter:card["\'][^>]*>/i',
        '/<meta[^>]+name=["\']twitter:site["\'][^>]*>/i',
        '/<meta[^>]+name=["\']twitter:title["\'][^>]*>/i',
        '/<meta[^>]+name=["\']twitter:description["\'][^>]*>/i',
        '/<meta[^>]+name=["\']twitter:image["\'][^>]*>/i',
        '/<link[^>]+rel=["\']canonical["\'][^>]*>/i',
        '/<script[^>]+data-server-seo=["\']true["\'][^>]*>.*?<\/script>/is',
    ];

    $html = preg_replace($patterns, '', $html) ?? $html;

    $tags = [
        '<title>' . $escape($meta['title']) . '</title>',
        '<meta name="description" content="' . $escape($meta['description']) . '">',
        '<meta name="robots" content="' . $escape($meta['robots']) . '">',
        '<link rel="canonical" href="' . $escape($meta['canonical']) . '">',
        '<meta property="og:title" content="' . $escape($meta['title']) . '">',
        '<meta property="og:description" content="' . $escape($meta['description']) . '">',
        '<meta property="og:type" content="' . $escape($meta['type']) . '">',
        '<meta property="og:url" content="' . $escape($meta['canonical']) . '">',
        '<meta property="og:image" content="' . $escape($meta['image']) . '">',
        '<meta property="og:site_name" content="' . $escape($meta['siteName'] ?? 'Midia M Metal') . '">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<meta name="twitter:site" content="' . $escape($meta['twitterSite'] ?? '@midiametal') . '">',
        '<meta name="twitter:title" content="' . $escape($meta['title']) . '">',
        '<meta name="twitter:description" content="' . $escape($meta['description']) . '">',
        '<meta name="twitter:image" content="' . $escape($meta['image']) . '">',
    ];

    foreach ($meta['jsonLd'] as $jsonLd) {
        $tags[] = '<script type="application/ld+json" data-server-seo="true">' . json_encode($jsonLd, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>';
    }

    return preg_replace('/<\/head>/i', implode("\n", $tags) . "\n</head>", $html, 1) ?? $html;
};

$serveSpaIndex = function (Request $request, int $status = 200, ?array $meta = null) use ($buildSeoMeta, $injectSpaMeta) {
    $indexFile = public_path('index.html');

    $meta = $meta ?: $buildSeoMeta($request, $status);

    if (file_exists($indexFile)) {
        $html = file_get_contents($indexFile);
        return response($injectSpaMeta($html, $meta), $status)->header('Content-Type', 'text/html; charset=UTF-8');
    }

    $html = view('welcome')->render();

    return response($injectSpaMeta($html, $meta), $status)->header('Content-Type', 'text/html; charset=UTF-8');
};

Route::fallback(function (Request $request) use ($serveSpaIndex) {
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
    ];

    if ($path === '' || in_array($path, $staticPaths, true) || Str::startsWith($path, 'admin')) {
        return $serveSpaIndex($request);
    }

    $isValid = false;

    if (preg_match('#^shop/category/([^/]+)$#', $path, $matches)) {
        $isValid = ProductCategory::where('active', true)->where('slug', $matches[1])->exists();
    } elseif (preg_match('#^shop/([^/]+)$#', $path, $matches)) {
        $identifier = $matches[1];
        $isValid = Product::where('active', true)
            ->where(fn($query) => $query->where('slug', $identifier)->orWhere('id', $identifier))
            ->exists();
    } elseif (preg_match('#^services/([^/]+)$#', $path, $matches)) {
        $isValid = Service::where('active', true)->where('slug', $matches[1])->exists();
    } elseif (preg_match('#^portfolio/([^/]+)$#', $path, $matches)) {
        $isValid = PortfolioProject::where('active', true)->where('slug', $matches[1])->exists();
    } elseif (preg_match('#^blog/([^/]+)$#', $path, $matches)) {
        $isValid = BlogPost::where('active', true)
            ->where(fn($query) => $query->where('slug', $matches[1])->orWhere('id', $matches[1]))
            ->exists();
    }

    return $serveSpaIndex($request, $isValid ? 200 : 404);
});
