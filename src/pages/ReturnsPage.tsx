import { ChevronDown } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const ReturnsPage = () => (
    <div className="min-h-screen bg-[#eaf0f3]">
        <Header />
        <section className="pt-16 md:pt-24 pb-8 text-center">
            <h1 className="font-sans text-[46px] md:text-[64px] leading-none font-semibold text-[#10275c]">Returns & Refunds</h1>
            <p className="mt-3 text-[#6e7a92]">Last updated: March 2024</p>
            <ChevronDown className="w-5 h-5 mx-auto mt-6 text-primary" />
        </section>
        <section className="container mx-auto px-4 lg:px-8 pb-20 md:pb-28 max-w-3xl">
            <div className="bg-white border border-[#cad4e4] p-8 md:p-12 prose prose-slate max-w-none">
                <h2>1. Standard Products</h2>
                <p>We accept returns of standard (non-custom) products within <strong>14 days</strong> of delivery, provided they are unused, in original condition, and in original packaging. To initiate a return, contact us at <a href="mailto:info@midiametal.co.uk" className="text-orange">info@midiametal.co.uk</a> with your order number.</p>

                <h2>2. Custom Fabricated Items</h2>
                <p>Custom-fabricated items are made to your specific requirements and are <strong>non-returnable</strong> unless they are defective or do not match the agreed specifications. If you believe you have received a defective custom item, please contact us within 7 days of receipt with photographic evidence.</p>

                <h2>3. Damaged or Defective Items</h2>
                <p>If your item arrives damaged, please photograph the damage immediately upon delivery and contact us within <strong>48 hours</strong>. We will arrange a replacement or full refund at no cost to you.</p>

                <h2>4. Return Shipping</h2>
                <p>For standard returns, customers are responsible for return shipping costs unless the item was defective or incorrectly sent. We recommend using a tracked service, as we cannot be held responsible for items lost in return transit.</p>

                <h2>5. Refunds</h2>
                <p>Once your return is received and inspected, we will notify you of the approval status. Approved refunds are processed within <strong>5–10 business days</strong> to your original payment method.</p>

                <h2>6. Exceptions</h2>
                <p>We cannot accept returns on items that have been installed, used, or altered in any way. Consumable items and special-order parts are also non-returnable.</p>

                <h2>7. Contact Us</h2>
                <p>To begin a return or refund request, please contact us at <a href="mailto:info@midiametal.co.uk" className="text-orange">info@midiametal.co.uk</a> or call us directly. Our team aims to respond within 1 business day.</p>
            </div>
        </section>
        <Footer />
    </div>
);

export default ReturnsPage;
