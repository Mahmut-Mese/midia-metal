import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CheckoutSteps from "@/components/CheckoutSteps";
import FloatingSidebar from "@/components/FloatingSidebar";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    company: "",
    country: "United Kingdom",
    address: "",
    city: "",
    postcode: "",
    phone: "",
    email: "",
    notes: "",
  });

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/payment");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="py-16 text-center">
        <h1 className="page-title">Checkout</h1>
        <svg className="w-6 h-6 mx-auto mt-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </section>

      {/* Steps */}
      <section className="container mx-auto px-4 lg:px-8 pb-4">
        <CheckoutSteps currentStep={2} />
      </section>

      <section className="container mx-auto px-4 lg:px-8 py-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Billing Details */}
            <div className="lg:col-span-2">
              <h2 className="font-serif text-2xl font-bold text-primary mb-6">Billing Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-primary mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => update("firstName", e.target.value)}
                    className="w-full border border-border rounded px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-primary mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) => update("lastName", e.target.value)}
                    className="w-full border border-border rounded px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange bg-background"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold text-primary mb-1">Company Name (optional)</label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => update("company", e.target.value)}
                  className="w-full border border-border rounded px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange bg-background"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold text-primary mb-1">Country / Region *</label>
                <select
                  value={form.country}
                  onChange={(e) => update("country", e.target.value)}
                  className="w-full border border-border rounded px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange bg-background"
                >
                  <option>United Kingdom</option>
                  <option>United States</option>
                  <option>Ireland</option>
                </select>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold text-primary mb-1">Street Address *</label>
                <input
                  type="text"
                  required
                  placeholder="House number and street name"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  className="w-full border border-border rounded px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange bg-background"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-semibold text-primary mb-1">Town / City *</label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    className="w-full border border-border rounded px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-primary mb-1">Postcode *</label>
                  <input
                    type="text"
                    required
                    value={form.postcode}
                    onChange={(e) => update("postcode", e.target.value)}
                    className="w-full border border-border rounded px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-semibold text-primary mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    className="w-full border border-border rounded px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-primary mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className="w-full border border-border rounded px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange bg-background"
                  />
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-serif text-lg font-bold text-primary mb-3">Additional Information</h3>
                <label className="block text-sm font-semibold text-primary mb-1">Order Notes (optional)</label>
                <textarea
                  rows={4}
                  placeholder="Notes about your order, e.g. special notes for delivery."
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  className="w-full border border-border rounded px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange bg-background resize-none"
                />
              </div>
            </div>

            {/* Order Summary */}
            <div>
              <h2 className="font-serif text-2xl font-bold text-primary mb-6">Your Order</h2>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="grid grid-cols-2 p-4 bg-secondary text-xs font-bold uppercase text-primary">
                  <span>Product</span>
                  <span className="text-right">Subtotal</span>
                </div>
                <div className="grid grid-cols-2 p-4 border-t border-border text-sm">
                  <span className="text-muted-foreground">Baffle Grease Filters × 1</span>
                  <span className="text-right text-primary font-semibold">£1,000.00</span>
                </div>
                <div className="grid grid-cols-2 p-4 border-t border-border text-sm">
                  <span className="font-semibold text-primary">Subtotal</span>
                  <span className="text-right text-muted-foreground">£1,000.00</span>
                </div>
                <div className="grid grid-cols-2 p-4 border-t border-border text-sm">
                  <span className="font-semibold text-primary">Shipping</span>
                  <span className="text-right text-muted-foreground">Flat rate</span>
                </div>
                <div className="grid grid-cols-2 p-4 border-t border-border text-sm">
                  <span className="font-bold text-primary">Total</span>
                  <span className="text-right font-bold text-primary">£1,000.00</span>
                </div>
              </div>

              <button type="submit" className="btn-primary w-full mt-6 py-4 text-base">
                Proceed to Payment
              </button>
            </div>
          </div>
        </form>
      </section>

      <Footer />
      <FloatingSidebar />
    </div>
  );
};

export default CheckoutPage;
