import LegalContentPage from "@/components/LegalContentPage";

const fallbackContent = `
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
`;

export default function TermsPage() {
  return (
    <LegalContentPage
      titleKey="terms_conditions_title"
      contentKey="terms_conditions_content"
      fallbackTitle="Terms & Conditions"
      fallbackContent={fallbackContent}
      path="/terms-of-service"
    />
  );
}
