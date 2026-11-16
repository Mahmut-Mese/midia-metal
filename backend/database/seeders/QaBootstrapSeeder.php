<?php

namespace Database\Seeders;

use App\Models\AdminUser;
use App\Models\BlogPost;
use App\Models\HeroSlide;
use App\Models\PortfolioCategory;
use App\Models\PortfolioProject;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Service;
use App\Models\SiteSetting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Throwable;

/** Explicit first-time bootstrap; never called by routine deployments. */
class QaBootstrapSeeder extends Seeder
{
    public function run(): void
    {
        $this->verifyQaIdentity();

        DB::transaction(function () {
            if (SiteSetting::where('key', 'qa_bootstrap_version')->value('value') === '1') {
                $this->command?->info('QA bootstrap already completed; existing data was preserved.');

                return;
            }

            foreach (['users', 'admin_users', 'customers', 'customer_payment_methods', 'orders', 'order_items', 'products', 'product_categories',
                'services', 'blog_posts', 'portfolio_projects', 'portfolio_categories', 'hero_slides',
                'contact_messages', 'quote_requests', 'personal_access_tokens', 'coupons', 'product_reviews', 'audit_logs'] as $table) {
                if (DB::table($table)->exists()) {
                    throw new RuntimeException('QA bootstrap requires a new empty business database. Existing data was not changed.');
                }
            }

            ['email' => $email, 'password' => $password] = $this->readAdminCredentials();
            if (! filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 255
                || ! is_string($password) || strlen($password) < 20
                || strlen($password) > 72 || preg_match('/^(.)(\1)+$/sD', $password)
                || str_contains(strtolower($password), 'password')
                || in_array(strtolower($email), ['admin@midiametal.com', 'asd@asd.com'], true)) {
                throw new RuntimeException('Supply a unique QA administrator email and a strong 20–72 character bootstrap password.');
            }

            AdminUser::create([
                'name' => 'QA Administrator',
                'email' => $email,
                'password' => Hash::make($password),
                'role' => 'admin',
            ]);

            foreach ([
                ['key' => 'site_name', 'value' => 'Midia Metal QA', 'type' => 'text', 'group' => 'general'],
                ['key' => 'contact_email', 'value' => 'qa@example.test', 'type' => 'text', 'group' => 'general'],
                ['key' => 'meta_title', 'value' => 'Midia Metal QA', 'type' => 'text', 'group' => 'seo'],
                ['key' => 'meta_description', 'value' => 'QA environment with sample catalogue content.', 'type' => 'textarea', 'group' => 'seo'],
                ['key' => 'footer_text', 'value' => 'QA environment — sample content.', 'type' => 'text', 'group' => 'general'],
            ] as $setting) {
                SiteSetting::firstOrCreate(['key' => $setting['key']], $setting);
            }

            $category = ProductCategory::create([
                'name' => 'QA Sample Equipment', 'slug' => 'qa-sample-equipment',
                'description' => 'Sample products for QA checks, not a live sales catalogue.',
                'image' => '/images/canopy.jpg', 'active' => true, 'order' => 1,
            ]);
            foreach ([
                ['name' => 'QA Sample Canopy', 'slug' => 'qa-sample-canopy', 'image' => '/images/canopy.jpg', 'price' => '£100.00'],
                ['name' => 'QA Sample Baffle Filter', 'slug' => 'qa-sample-baffle-filter', 'image' => '/images/baffle-filter.jpg', 'price' => '£25.00'],
            ] as $index => $product) {
                Product::create($product + [
                    'product_category_id' => $category->id,
                    'description' => '<p>Sample catalogue item for QA verification.</p>',
                    'active' => true, 'featured' => true, 'order' => $index + 1,
                    'track_stock' => false, 'tags' => ['QA sample'],
                ]);
            }

            HeroSlide::create([
                'image' => '/images/hero-kitchen.jpg', 'alt' => 'QA sample kitchen', 'order' => 1, 'active' => true,
            ]);
            Service::create([
                'title' => 'QA Sample Installation', 'slug' => 'qa-sample-installation', 'icon' => 'Wrench',
                'image' => '/images/canopy.jpg', 'excerpt' => 'Sample service for QA verification.',
                'content' => '<p>Sample installation content for the QA environment.</p>',
                'features' => ['Sample survey', 'Sample installation'], 'active' => true, 'order' => 1,
            ]);
            BlogPost::create([
                'title' => 'QA Sample Article', 'slug' => 'qa-sample-article', 'image' => '/images/hero-kitchen.jpg',
                'excerpt' => 'Sample article for QA verification.', 'content' => '<p>This is QA sample content.</p>',
                'author' => 'QA', 'category' => 'QA', 'active' => true, 'published_at' => now(),
            ]);
            $portfolioCategory = PortfolioCategory::create(['name' => 'QA Samples', 'slug' => 'qa-samples']);
            PortfolioProject::create([
                'title' => 'QA Sample Kitchen', 'slug' => 'qa-sample-kitchen', 'image' => '/images/hero-kitchen.jpg',
                'description' => 'Sample project for QA verification.', 'portfolio_category_id' => $portfolioCategory->id,
                'gallery' => ['/images/hero-kitchen.jpg'], 'services_list' => ['Sample installation'],
                'active' => true, 'order' => 1,
            ]);

            SiteSetting::create([
                'key' => 'qa_bootstrap_version', 'value' => '1', 'type' => 'text', 'group' => 'internal-qa',
            ]);
            $this->command?->info('QA sample content and a unique administrator were created.');
        });
    }

    protected function verifyQaIdentity(): void
    {
        try {
            require_once base_path('../.github/deploy/qa/verify-backend.php');
            \Midia\QaDeploy\verifyBootstrappedBackend(base_path(), (string) env('QA_DEPLOY_TARGET_FILE', ''));
        } catch (Throwable) {
            throw new RuntimeException('QA identity verification failed; bootstrap was refused.');
        }
    }

    protected function readAdminCredentials(): array
    {
        return [
            'email' => trim((string) env('QA_BOOTSTRAP_ADMIN_EMAIL', '')),
            'password' => (string) env('QA_BOOTSTRAP_ADMIN_PASSWORD', ''),
        ];
    }
}
