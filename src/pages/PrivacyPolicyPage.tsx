import { ChevronDown } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const PrivacyPolicyPage = () => (
    <div className="min-h-screen bg-[#eaf0f3]">
        <Header />
        <section className="pt-16 md:pt-24 pb-8 text-center">
            <h1 className="font-sans text-[46px] md:text-[64px] leading-none font-semibold text-[#10275c]">Privacy Policy</h1>
            <p className="mt-3 text-[#6e7a92]">Last updated: March 2024</p>
            <ChevronDown className="w-5 h-5 mx-auto mt-6 text-primary" />
        </section>
        <section className="container mx-auto px-4 lg:px-8 pb-20 md:pb-28 max-w-3xl">
            <div className="bg-white border border-[#cad4e4] p-8 md:p-12 prose prose-slate max-w-none">
                <h2>1. Who We Are</h2>
                <p>Midia M Metal ("we", "our", "us") is committed to protecting and respecting your privacy. This policy explains how we collect, use, and store your personal data when you use our website or contact us regarding our fabrication services.</p>

                <h2>2. Data We Collect</h2>
                <p>We may collect the following information:</p>
                <ul>
                    <li>Name, email address, phone number when you submit a contact or quote form</li>
                    <li>Billing and shipping address when you place an order</li>
                    <li>Payment information (processed securely — we do not store card details)</li>
                    <li>Browser type, IP address, and pages visited (via cookies)</li>
                </ul>

                <h2>3. How We Use Your Data</h2>
                <p>We use your data to:</p>
                <ul>
                    <li>Process and fulfil your orders</li>
                    <li>Respond to enquiries and quote requests</li>
                    <li>Improve our website and services</li>
                    <li>Comply with legal obligations</li>
                </ul>

                <h2>4. Cookies</h2>
                <p>We use cookies to enhance your browsing experience and to remember your cart. You may accept or decline non-essential cookies via the cookie banner displayed on your first visit. Essential cookies required for site functionality cannot be disabled.</p>

                <h2>5. Data Sharing</h2>
                <p>We do not sell, trade, or rent your personal data to third parties. We may share data with trusted service providers (e.g. payment processors) solely to fulfil your orders, under strict confidentiality agreements.</p>

                <h2>6. Data Retention</h2>
                <p>We retain your personal data only as long as necessary to provide our services and comply with legal obligations. Order data is kept for 7 years in accordance with UK tax law.</p>

                <h2>7. Your Rights (UK GDPR)</h2>
                <p>Under UK GDPR you have the right to: access your data, request correction or deletion, object to processing, and request portability. To exercise any of these rights, please contact us at <a href="mailto:info@midiametal.co.uk" className="text-orange">info@midiametal.co.uk</a>.</p>

                <h2>8. Contact</h2>
                <p>For any privacy-related questions, please contact us at <a href="mailto:info@midiametal.co.uk" className="text-orange">info@midiametal.co.uk</a>.</p>
            </div>
        </section>
        <Footer />
    </div>
);

export default PrivacyPolicyPage;
