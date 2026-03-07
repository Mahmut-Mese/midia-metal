<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\AdminUser;
use App\Models\HeroSlide;
use App\Models\ProductCategory;
use App\Models\Product;
use App\Models\Service;
use App\Models\PortfolioCategory;
use App\Models\PortfolioProject;
use App\Models\BlogPost;
use App\Models\SiteSetting;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Admin User
        AdminUser::create([
            'name' => 'Admin',
            'email' => 'admin@midiaematal.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]);

        // Hero Slides
        HeroSlide::create(['image' => '/images/portfolio-banner-kitchen.png', 'alt' => 'Commercial kitchen', 'order' => 1, 'active' => true]);
        HeroSlide::create(['image' => '/images/hero-kitchen.jpg', 'alt' => 'Kitchen ventilation installation', 'order' => 2, 'active' => true]);

        // Product Categories
        $categories = [
            ['name' => 'Baffle Filters', 'slug' => 'baffle-filters', 'image' => '/images/baffle-filter.jpg', 'description' => 'High-quality baffle grease filters for commercial kitchens.', 'order' => 1],
            ['name' => 'Canopies', 'slug' => 'canopies', 'image' => '/images/canopy.jpg', 'description' => 'Commercial canopy solutions for extraction and heat management.', 'order' => 2],
            ['name' => 'Cutting Disks', 'slug' => 'cutting-disks', 'image' => '/images/cutting-disk.jpg', 'description' => 'Precision cutting products for fabrication projects.', 'order' => 3],
            ['name' => 'LED Lights', 'slug' => 'led-lights', 'image' => '/images/mesh-filter.jpg', 'description' => 'Commercial LED lighting solutions.', 'order' => 4],
            ['name' => 'Mesh Filters', 'slug' => 'mesh-filters', 'image' => '/images/mesh-filter.jpg', 'description' => 'Stainless steel mesh grease filters.', 'order' => 5],
            ['name' => 'Stainless Steel Sheets', 'slug' => 'stainless-steel-sheets', 'image' => '/images/wall-cladding.jpg', 'description' => 'Premium stainless steel sheets for commercial use.', 'order' => 6],
        ];
        foreach ($categories as $cat) {
            ProductCategory::create(array_merge($cat, ['active' => true]));
        }

        // Products
        $products = [
            ['name' => 'Baffle Grease Filters', 'price' => '£1,000.00', 'image' => '/images/baffle-filter.jpg', 'product_category_id' => 1, 'tags' => ['New', 'Stock'], 'featured' => true],
            ['name' => 'Canopy', 'price' => '£800.00', 'image' => '/images/canopy.jpg', 'product_category_id' => 2, 'tags' => ['Sale', 'Stock'], 'featured' => true],
            ['name' => 'Air Conditioner', 'price' => '£700.00', 'image' => '/images/air-conditioner.jpg', 'product_category_id' => 5, 'tags' => ['Available'], 'featured' => false],
            ['name' => 'Centrifugal Fan', 'price' => '£830.00', 'image' => '/images/centrifugal-fan-square.png', 'product_category_id' => 5, 'tags' => ['Simple', 'Smart'], 'featured' => true],
            ['name' => 'Aluminium Conveyor Feet Commercial Kitchens', 'price' => '£900.00', 'image' => '/images/conveyor-feet.png', 'product_category_id' => 6, 'tags' => ['Variable', 'Discount'], 'featured' => false],
            ['name' => 'Ventilation Fan', 'price' => '£700.00', 'image' => '/images/ventilation-fan-circular.png', 'product_category_id' => 5, 'tags' => ['Item', 'Simple'], 'featured' => false],
            ['name' => 'Stainless Steel Gridmesh Style Grease Filters', 'price' => '£800.00', 'image' => '/images/mesh-filter.jpg', 'product_category_id' => 1, 'tags' => ['Simple', 'Stock'], 'featured' => true],
            ['name' => 'Canopy Grease Filter Cleaning Tank and Crystals', 'price' => '£700.00', 'image' => '/images/centrifugal-fan.jpg', 'product_category_id' => 1, 'tags' => ['Available', 'Item'], 'featured' => false],
            ['name' => 'Commercial Canopy Hood', 'price' => '£920.00', 'image' => '/images/canopy.jpg', 'product_category_id' => 2, 'tags' => ['New', 'Smart'], 'featured' => true],
            ['name' => 'Stainless Extraction Canopy', 'price' => '£860.00', 'image' => '/images/hero-kitchen.jpg', 'product_category_id' => 2, 'tags' => ['Simple', 'Sale'], 'featured' => false],
            ['name' => 'Cutting Disk Pro 200', 'price' => '£540.00', 'image' => '/images/cutting-disk.jpg', 'product_category_id' => 3, 'tags' => ['Stock', 'Available'], 'featured' => false],
            ['name' => 'Cutting Disk Pro 250', 'price' => '£610.00', 'image' => '/images/cutting-disk.jpg', 'product_category_id' => 3, 'tags' => ['Stock', 'New'], 'featured' => false],
            ['name' => 'Precision Cutting Disk Set', 'price' => '£680.00', 'image' => '/images/cutting-disk.jpg', 'product_category_id' => 3, 'tags' => ['Item', 'Simple'], 'featured' => false],
            ['name' => 'LED Canopy Light Bar', 'price' => '£430.00', 'image' => '/images/mesh-filter.jpg', 'product_category_id' => 4, 'tags' => ['Available', 'Smart'], 'featured' => true],
            ['name' => 'Waterproof LED Unit', 'price' => '£470.00', 'image' => '/images/air-conditioner.jpg', 'product_category_id' => 4, 'tags' => ['New', 'Stock'], 'featured' => false],
            ['name' => 'Commercial LED Light Pack', 'price' => '£520.00', 'image' => '/images/control-panel.jpg', 'product_category_id' => 4, 'tags' => ['Sale', 'Variable'], 'featured' => false],
            ['name' => 'Wall Cladding Sheets', 'price' => '£900.00', 'image' => '/images/wall-cladding.jpg', 'product_category_id' => 6, 'tags' => ['Item', 'Stock'], 'featured' => true],
            ['name' => 'Brushed Stainless Panel', 'price' => '£830.00', 'image' => '/images/wall-cladding.jpg', 'product_category_id' => 6, 'tags' => ['Available', 'Simple'], 'featured' => false],
        ];
        foreach ($products as $i => $p) {
            Product::create(array_merge($p, ['slug' => \Illuminate\Support\Str::slug($p['name']) . '-' . ($i + 1), 'active' => true, 'order' => $i + 1]));
        }

        // Services
        $services = [
            ['title' => 'Ventilation Systems', 'slug' => 'ventilation-systems', 'icon' => 'Wind', 'image' => '/images/hero-kitchen.jpg', 'excerpt' => 'Complete commercial kitchen ventilation design and installation.', 'features' => ['Site Survey', 'Ducting Design', 'Fan Installation', 'Commissioning'], 'order' => 1],
            ['title' => 'Canopy Installation', 'slug' => 'canopy-installation', 'icon' => 'Building', 'image' => '/images/canopy.jpg', 'excerpt' => 'Professional canopy installation for commercial and industrial kitchens.', 'features' => ['Supply', 'Install', 'Balancing', 'Testing'], 'order' => 2],
            ['title' => 'Wall Cladding', 'slug' => 'wall-cladding', 'icon' => 'Layers', 'image' => '/images/wall-cladding.jpg', 'excerpt' => 'Hygienic stainless steel wall cladding for food areas.', 'features' => ['Panel Fabrication', 'On-site Installation', 'Finishing'], 'order' => 3],
            ['title' => 'Custom Fabrication', 'slug' => 'custom-fabrication', 'icon' => 'Wrench', 'image' => '/images/welding.jpg', 'excerpt' => 'Bespoke stainless steel fabrication and welding services.', 'features' => ['Design Support', 'Welding', 'Quality Check', 'Delivery'], 'order' => 4],
            ['title' => 'Maintenance & Cleaning', 'slug' => 'maintenance-cleaning', 'icon' => 'Settings', 'image' => '/images/baffle-filter.jpg', 'excerpt' => 'Regular maintenance and deep cleaning for kitchen equipment.', 'features' => ['Filter Cleaning', 'Fan Servicing', 'Compliance Checks'], 'order' => 5],
            ['title' => 'Air Conditioning', 'slug' => 'air-conditioning', 'icon' => 'Thermometer', 'image' => '/images/air-conditioner.jpg', 'excerpt' => 'Commercial air conditioning supply, installation and maintenance.', 'features' => ['System Design', 'Installation', 'Maintenance Plans'], 'order' => 6],
        ];
        foreach ($services as $s) {
            Service::create(array_merge($s, ['active' => true]));
        }

        // Portfolio Categories
        $pCats = [
            ['name' => 'Ventilation', 'slug' => 'ventilation'],
            ['name' => 'Cladding', 'slug' => 'cladding'],
            ['name' => 'Installation', 'slug' => 'installation'],
            ['name' => 'Custom Work', 'slug' => 'custom-work'],
        ];
        foreach ($pCats as $pc) {
            PortfolioCategory::create($pc);
        }

        // Portfolio Projects
        $projects = [
            ['title' => 'Commercial Kitchen Ventilation', 'slug' => 'commercial-kitchen-ventilation', 'image' => '/images/hero-kitchen.jpg', 'description' => 'Full ventilation system for a restaurant in London.', 'location' => 'London, UK', 'client' => 'Restaurant Group', 'year' => '2025', 'portfolio_category_id' => 1, 'services_list' => ['Site Survey', 'Ducting Design', 'Fan Installation'], 'gallery' => ['/images/hero-kitchen.jpg', '/images/workshop.jpg', '/images/centrifugal-fan.jpg']],
            ['title' => 'Stainless Steel Wall Cladding', 'slug' => 'stainless-steel-wall-cladding', 'image' => '/images/wall-cladding.jpg', 'description' => 'Hygienic wall cladding for a food processing plant.', 'location' => 'Birmingham, UK', 'client' => 'Food Production Site', 'year' => '2024', 'portfolio_category_id' => 2, 'services_list' => ['Panel Fabrication', 'On-site Installation', 'Finishing'], 'gallery' => ['/images/wall-cladding.jpg', '/images/workshop.jpg', '/images/hero-kitchen.jpg']],
            ['title' => 'Industrial Canopy Installation', 'slug' => 'industrial-canopy-installation', 'image' => '/images/canopy.jpg', 'description' => 'Large-scale canopy system for an industrial kitchen.', 'location' => 'Manchester, UK', 'client' => 'Industrial Kitchen', 'year' => '2025', 'portfolio_category_id' => 3, 'services_list' => ['Canopy Install', 'Balancing', 'Commissioning'], 'gallery' => ['/images/canopy.jpg', '/images/hero-kitchen.jpg', '/images/welding.jpg']],
            ['title' => 'Custom Welding Project', 'slug' => 'custom-welding-project', 'image' => '/images/welding.jpg', 'description' => 'Bespoke stainless steel fabrication for a hotel chain.', 'location' => 'Leeds, UK', 'client' => 'Hotel Chain', 'year' => '2026', 'portfolio_category_id' => 4, 'services_list' => ['Design Support', 'Welding', 'Quality Check'], 'gallery' => ['/images/welding.jpg', '/images/workshop.jpg', '/images/installation-service.jpg']],
            ['title' => 'Exhaust Fan System', 'slug' => 'exhaust-fan-system', 'image' => '/images/centrifugal-fan.jpg', 'description' => 'High-capacity exhaust system for a commercial bakery.', 'location' => 'Liverpool, UK', 'client' => 'Bakery', 'year' => '2025', 'portfolio_category_id' => 1, 'services_list' => ['System Upgrade', 'Fan Install', 'Testing'], 'gallery' => ['/images/centrifugal-fan.jpg', '/images/ventilation-fan-circular.png', '/images/workshop.jpg']],
            ['title' => 'Workshop Fit-Out', 'slug' => 'workshop-fit-out', 'image' => '/images/workshop.jpg', 'description' => 'Complete workshop ventilation and equipment setup.', 'location' => 'Bristol, UK', 'client' => 'Engineering Workshop', 'year' => '2024', 'portfolio_category_id' => 3, 'services_list' => ['Planning', 'Install', 'Handover'], 'gallery' => ['/images/workshop.jpg', '/images/control-panel.jpg', '/images/hero-kitchen.jpg']],
            ['title' => 'Baffle Filter Installation', 'slug' => 'baffle-filter-installation', 'image' => '/images/baffle-filter.jpg', 'description' => 'Multi-unit baffle filter system for a restaurant group.', 'location' => 'London, UK', 'client' => 'Restaurant Group', 'year' => '2026', 'portfolio_category_id' => 1, 'services_list' => ['Supply', 'Install', 'Maintenance Plan'], 'gallery' => ['/images/baffle-filter.jpg', '/images/canopy.jpg', '/images/hero-kitchen.jpg']],
            ['title' => 'Control Panel Setup', 'slug' => 'control-panel-setup', 'image' => '/images/control-panel.jpg', 'description' => 'Custom control panels for automated ventilation systems.', 'location' => 'Nottingham, UK', 'client' => 'Factory Site', 'year' => '2025', 'portfolio_category_id' => 4, 'services_list' => ['Panel Design', 'Assembly', 'Configuration'], 'gallery' => ['/images/control-panel.jpg', '/images/workshop.jpg', '/images/ventilation-fan-circular.png']],
        ];
        foreach ($projects as $i => $p) {
            PortfolioProject::create(array_merge($p, ['active' => true, 'order' => $i + 1]));
        }

        // Blog Posts
        $posts = [
            ['title' => 'The Importance of Commercial Kitchen Ventilation', 'slug' => 'importance-of-commercial-ventilation', 'image' => '/images/hero-kitchen.jpg', 'excerpt' => 'A well-designed ventilation system is crucial for safety, compliance, and comfort in any commercial kitchen environment.', 'content' => '<p>Commercial kitchen ventilation is one of the most critical aspects of food service operation. Without proper ventilation, kitchens can become hotbeds for grease fires, heat exhaustion, and poor air quality.</p><p>A well-designed system removes heat, steam, smoke, and grease-laden vapors from the cooking environment, protecting both staff and customers.</p>', 'author' => 'Admin', 'category' => 'Ventilation', 'published_at' => now()->subDays(13)],
            ['title' => 'Choosing the Right Grease Filters for Your Setup', 'slug' => 'choosing-right-grease-filters', 'image' => '/images/baffle-filter.jpg', 'excerpt' => 'Baffle vs mesh filters — which one is best for your kitchen? We break down the pros and cons of each type.', 'content' => '<p>Grease filters are an essential component of any commercial kitchen extraction system. They capture grease droplets before they enter the ductwork, reducing the risk of fire and improving air quality.</p>', 'author' => 'Admin', 'category' => 'Products', 'published_at' => now()->subDays(18)],
            ['title' => 'A Complete Guide to Stainless Steel Wall Cladding', 'slug' => 'stainless-steel-wall-cladding-guide', 'image' => '/images/wall-cladding.jpg', 'excerpt' => 'Discover why stainless steel wall cladding is the gold standard for hygiene in food preparation areas.', 'content' => '<p>Stainless steel wall cladding offers unmatched durability, hygiene, and aesthetics for commercial food preparation areas. Its non-porous surface prevents bacteria growth and is easy to clean and disinfect.</p>', 'author' => 'Admin', 'category' => 'Guides', 'published_at' => now()->subDays(23)],
            ['title' => 'Industrial Welding Techniques for Kitchen Equipment', 'slug' => 'industrial-welding-techniques', 'image' => '/images/welding.jpg', 'excerpt' => 'TIG, MIG, and spot welding — learn which technique is used for different kitchen fabrication projects.', 'content' => '<p>The choice of welding technique significantly impacts the quality and durability of kitchen fabrication projects. TIG welding offers precision and clean welds ideal for stainless steel, while MIG welding is faster for thicker materials.</p>', 'author' => 'Admin', 'category' => 'Fabrication', 'published_at' => now()->subDays(28)],
            ['title' => '5 Tips for a Perfect Canopy Installation', 'slug' => 'canopy-installation-tips', 'image' => '/images/canopy.jpg', 'excerpt' => 'Avoid common mistakes and ensure your kitchen canopy is installed correctly the first time.', 'content' => '<p>Installing a kitchen canopy requires careful planning and execution. Getting it right the first time saves time and money, while ensuring optimal performance of your extraction system.</p>', 'author' => 'Admin', 'category' => 'Installation', 'published_at' => now()->subDays(35)],
            ['title' => 'How to Maintain Your Exhaust Fan System', 'slug' => 'exhaust-fan-maintenance', 'image' => '/images/centrifugal-fan.jpg', 'excerpt' => 'Regular maintenance extends the life of your exhaust fans and keeps your kitchen compliant with regulations.', 'content' => '<p>Exhaust fan maintenance is not just about extending equipment life — it is a legal requirement in many commercial kitchen environments. Regular servicing ensures your system meets building regulations and fire safety standards.</p>', 'author' => 'Admin', 'category' => 'Maintenance', 'published_at' => now()->subDays(43)],
        ];
        foreach ($posts as $p) {
            BlogPost::create(array_merge($p, ['active' => true]));
        }

        // Site Settings
        $settings = [
            ['key' => 'company_name', 'value' => 'Midia Metal', 'type' => 'text', 'group' => 'general'],
            ['key' => 'company_phone', 'value' => '+44 20 1234 5678', 'type' => 'text', 'group' => 'general'],
            ['key' => 'company_email', 'value' => 'info@midiaematal.com', 'type' => 'text', 'group' => 'general'],
            ['key' => 'company_address', 'value' => '123 Industrial Park, London, UK', 'type' => 'text', 'group' => 'general'],
            ['key' => 'meta_title', 'value' => 'Midia Metal - Commercial Kitchen Solutions', 'type' => 'text', 'group' => 'seo'],
            ['key' => 'meta_description', 'value' => 'Specialist in commercial kitchen ventilation, stainless steel fabrication, and canopy installation across the UK.', 'type' => 'text', 'group' => 'seo'],
        ];
        foreach ($settings as $s) {
            SiteSetting::create($s);
        }
    }
}
