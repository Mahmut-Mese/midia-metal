<?php

use App\Models\SiteSetting;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $settings = [
            [
                'key' => 'privacy_policy_title',
                'value' => 'Privacy Policy',
                'type' => 'text',
                'group' => 'legal',
            ],
            [
                'key' => 'privacy_policy_content',
                'value' => <<<'HTML'
<h2>1. Who We Are</h2>
<p>Midia M Metal ("we", "our", "us") is committed to protecting and respecting your privacy. This policy explains how we collect, use, and store your personal data when you use our website or contact us regarding our fabrication services.</p>
<h2>2. Data We Collect</h2>
<p>We may collect the following information:</p>
<ul>
  <li>Name, email address, phone number when you submit a contact or quote form</li>
  <li>Billing and shipping address when you place an order</li>
  <li>Payment information (processed securely; we do not store card details)</li>
  <li>Browser type, IP address, and pages visited via cookies</li>
</ul>
<h2>3. How We Use Your Data</h2>
<p>We use your data to process and fulfil orders, respond to enquiries and quote requests, improve our website and services, and comply with legal obligations.</p>
<h2>4. Cookies</h2>
<p>We use cookies to enhance your browsing experience and to remember your cart. Essential cookies required for site functionality cannot be disabled.</p>
<h2>5. Data Sharing</h2>
<p>We do not sell, trade, or rent your personal data to third parties. We may share data with trusted service providers only to fulfil your orders.</p>
<h2>6. Data Retention</h2>
<p>We retain personal data only as long as necessary to provide our services and comply with legal obligations.</p>
<h2>7. Your Rights</h2>
<p>You may request access, correction, deletion, objection, or portability of your personal data. Contact us at <a href="mailto:info@midiametal.co.uk">info@midiametal.co.uk</a>.</p>
<h2>8. Contact</h2>
<p>For privacy-related questions, contact <a href="mailto:info@midiametal.co.uk">info@midiametal.co.uk</a>.</p>
HTML,
                'type' => 'richtext',
                'group' => 'legal',
            ],
            [
                'key' => 'terms_conditions_title',
                'value' => 'Terms & Conditions',
                'type' => 'text',
                'group' => 'legal',
            ],
            [
                'key' => 'terms_conditions_content',
                'value' => <<<'HTML'
<h2>1. Acceptance</h2>
<p>By accessing our website or placing an order with Midia M Metal, you agree to these terms. If you do not agree, please do not use our site.</p>
<h2>2. Services & Products</h2>
<p>We provide custom metal fabrication services and sell fabricated products online. All products and services are subject to availability.</p>
<h2>3. Orders & Pricing</h2>
<p>All prices are displayed in GBP and are inclusive of VAT where applicable. We reserve the right to refuse or cancel any order at our discretion.</p>
<h2>4. Payment</h2>
<p>Payment must be made in full before dispatch unless otherwise agreed for custom work.</p>
<h2>5. Delivery</h2>
<p>Delivery times are estimates only and are not guaranteed. We are not responsible for delays caused by third-party couriers.</p>
<h2>6. Custom Fabrication</h2>
<p>Custom-fabricated items are made to order based on your specifications and cannot usually be cancelled once production has started.</p>
<h2>7. Liability</h2>
<p>To the maximum extent permitted by law, Midia M Metal shall not be liable for indirect, incidental, or consequential damages.</p>
<h2>8. Governing Law</h2>
<p>These terms are governed by the laws of England and Wales.</p>
<h2>9. Contact</h2>
<p>For questions about these terms, contact <a href="mailto:info@midiametal.co.uk">info@midiametal.co.uk</a>.</p>
HTML,
                'type' => 'richtext',
                'group' => 'legal',
            ],
            [
                'key' => 'cookies_page_title',
                'value' => 'Cookies Page',
                'type' => 'text',
                'group' => 'legal',
            ],
            [
                'key' => 'cookies_page_content',
                'value' => <<<'HTML'
<h2>1. What Are Cookies?</h2>
<p>Cookies are small text files placed on your computer or mobile device by websites that you visit.</p>
<h2>2. How We Use Cookies</h2>
<p>We use cookies for several reasons:</p>
<ul>
  <li><strong>Essential Cookies:</strong> Required for the operation of our website, including shopping cart functionality.</li>
  <li><strong>Performance Cookies:</strong> Help us understand how visitors use the site so we can improve it.</li>
  <li><strong>Functionality Cookies:</strong> Remember your preferences and improve your browsing experience.</li>
</ul>
<h2>3. Managing Cookies</h2>
<p>Most browsers allow control of cookies through browser settings. You can also review and change your cookie preferences on our site where available.</p>
<h2>4. Consent</h2>
<p>By using our website, you consent to our use of cookies as described in this policy.</p>
<h2>5. Contact Us</h2>
<p>If you have questions about our use of cookies, contact <a href="mailto:info@midiametal.co.uk">info@midiametal.co.uk</a>.</p>
HTML,
                'type' => 'richtext',
                'group' => 'legal',
            ],
            [
                'key' => 'returns_refunds_title',
                'value' => 'Returns & Refunds',
                'type' => 'text',
                'group' => 'legal',
            ],
            [
                'key' => 'returns_refunds_content',
                'value' => <<<'HTML'
<h2>1. Standard Products</h2>
<p>We accept returns of standard non-custom products within <strong>14 days</strong> of delivery, provided they are unused and in original condition.</p>
<h2>2. Custom Fabricated Items</h2>
<p>Custom-fabricated items are made to your specific requirements and are non-returnable unless defective or not as agreed.</p>
<h2>3. Damaged or Defective Items</h2>
<p>If an item arrives damaged, contact us within <strong>48 hours</strong> with photographs and order details.</p>
<h2>4. Return Shipping</h2>
<p>For standard returns, customers are responsible for return shipping unless the item was defective or incorrectly sent.</p>
<h2>5. Refunds</h2>
<p>Approved refunds are processed within <strong>5 to 10 business days</strong> to the original payment method.</p>
<h2>6. Exceptions</h2>
<p>We cannot accept returns on installed, used, altered, or special-order items unless faulty.</p>
<h2>7. Contact Us</h2>
<p>To begin a return or refund request, contact <a href="mailto:info@midiametal.co.uk">info@midiametal.co.uk</a>.</p>
HTML,
                'type' => 'richtext',
                'group' => 'legal',
            ],
        ];

        foreach ($settings as $setting) {
            SiteSetting::updateOrCreate(['key' => $setting['key']], $setting);
        }
    }

    public function down(): void
    {
        SiteSetting::whereIn('key', [
            'privacy_policy_title',
            'privacy_policy_content',
            'terms_conditions_title',
            'terms_conditions_content',
            'cookies_page_title',
            'cookies_page_content',
            'returns_refunds_title',
            'returns_refunds_content',
        ])->delete();
    }
};
