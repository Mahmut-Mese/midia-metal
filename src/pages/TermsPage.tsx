import { ChevronDown } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const TermsPage = () => (
    <div className="min-h-screen bg-[#eaf0f3]">
        <Header />
        <section className="pt-16 md:pt-24 pb-8 text-center">
            <h1 className="font-sans text-[46px] md:text-[64px] leading-none font-semibold text-[#10275c]">Terms of Service</h1>
            <p className="mt-3 text-[#6e7a92]">Last updated: March 2024</p>
            <ChevronDown className="w-5 h-5 mx-auto mt-6 text-primary" />
        </section>
        <section className="container mx-auto px-4 lg:px-8 pb-20 md:pb-28 max-w-3xl">
            <div className="bg-white border border-[#cad4e4] p-8 md:p-12 prose prose-slate max-w-none">
                <h2>1. Acceptance</h2>
                <p>By accessing our website or placing an order with Midia M Metal, you agree to these Terms of Service. If you do not agree, please do not use our site.</p>

                <h2>2. Services & Products</h2>
                <p>We provide custom metal fabrication services and sell fabricated products online. All products and services are subject to availability. We reserve the right to modify or discontinue any product or service without prior notice.</p>

                <h2>3. Orders & Pricing</h2>
                <p>All prices are displayed in GBP (£) and are inclusive of VAT where applicable. We reserve the right to refuse or cancel any order at our discretion. In the event of a pricing error, we will notify you before processing your order.</p>

                <h2>4. Payment</h2>
                <p>Payment must be made in full before orders are dispatched. We accept credit/debit cards, bank transfers, and cash on delivery (for eligible orders). For custom fabrication work, a 50% deposit may be required.</p>

                <h2>5. Delivery</h2>
                <p>Delivery times are estimates only and are not guaranteed. We are not responsible for delays caused by third-party couriers or circumstances beyond our control. Risk of loss passes to you upon delivery.</p>

                <h2>6. Custom Fabrication</h2>
                <p>Custom-fabricated items are made to order based on your specifications. Once production has commenced, orders cannot be cancelled. It is your responsibility to ensure specifications provided are accurate.</p>

                <h2>7. Liability</h2>
                <p>To the maximum extent permitted by law, Midia M Metal shall not be liable for any indirect, incidental, or consequential damages arising from the use of our products or services.</p>

                <h2>8. Governing Law</h2>
                <p>These terms are governed by the laws of England and Wales. Disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>

                <h2>9. Contact</h2>
                <p>For any questions regarding these terms, please contact us at <a href="mailto:info@midiametal.co.uk" className="text-orange">info@midiametal.co.uk</a>.</p>
            </div>
        </section>
        <Footer />
    </div>
);

export default TermsPage;
