import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CreditCard, Building2, Wallet } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const PaymentPage = () => {
  const navigate = useNavigate();
  const [method, setMethod] = useState<"card" | "bank" | "cod">("card");
  const [cardForm, setCardForm] = useState({ number: "", name: "", expiry: "", cvv: "" });

  const updateCard = (field: string, value: string) => setCardForm({ ...cardForm, [field]: value });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/thank-you");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="py-16 text-center">
        <h1 className="page-title">Payment</h1>
        <svg className="w-6 h-6 mx-auto mt-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </section>

      {/* Steps */}
      <section className="container mx-auto px-4 lg:px-8 pb-4">
        <div className="flex items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 bg-secondary text-primary text-xs flex items-center justify-center rounded font-bold">1</span>
            <span className="text-muted-foreground">Shopping Cart</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 bg-orange text-accent-foreground text-xs flex items-center justify-center rounded font-bold">2</span>
            <span className="font-semibold text-primary">Payment & Delivery Options</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 bg-primary text-primary-foreground text-xs flex items-center justify-center rounded font-bold">3</span>
            <span className="text-muted-foreground">Order Received</span>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 py-8 max-w-2xl">
        <form onSubmit={handleSubmit}>
          {/* Payment Methods */}
          <div className="space-y-3 mb-8">
            {[
              { id: "card" as const, icon: CreditCard, label: "Credit / Debit Card", desc: "Pay securely with your card" },
              { id: "bank" as const, icon: Building2, label: "Direct Bank Transfer", desc: "Make payment directly from your bank account" },
              { id: "cod" as const, icon: Wallet, label: "Cash on Delivery", desc: "Pay when you receive your order" },
            ].map((m) => (
              <label
                key={m.id}
                className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                  method === m.id ? "border-orange bg-orange-light" : "border-border hover:border-orange/50"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={method === m.id}
                  onChange={() => setMethod(m.id)}
                  className="accent-orange"
                />
                <m.icon className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-primary">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Card Details */}
          {method === "card" && (
            <div className="border border-border rounded-lg p-6 mb-8">
              <h3 className="font-serif text-lg font-bold text-primary mb-4">Card Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-primary mb-1">Card Number</label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={cardForm.number}
                    onChange={(e) => updateCard("number", e.target.value)}
                    className="w-full border border-border rounded px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-primary mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={cardForm.name}
                    onChange={(e) => updateCard("name", e.target.value)}
                    className="w-full border border-border rounded px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange bg-background"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-1">Expiry Date</label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={cardForm.expiry}
                      onChange={(e) => updateCard("expiry", e.target.value)}
                      className="w-full border border-border rounded px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-1">CVV</label>
                    <input
                      type="text"
                      placeholder="123"
                      value={cardForm.cvv}
                      onChange={(e) => updateCard("cvv", e.target.value)}
                      className="w-full border border-border rounded px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange bg-background"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="border border-border rounded-lg overflow-hidden mb-6">
            <div className="grid grid-cols-2 p-4 bg-secondary text-xs font-bold uppercase text-primary">
              <span>Order Summary</span>
              <span className="text-right">Amount</span>
            </div>
            <div className="grid grid-cols-2 p-4 border-t border-border text-sm">
              <span className="text-muted-foreground">Baffle Grease Filters × 1</span>
              <span className="text-right text-primary">£1,000.00</span>
            </div>
            <div className="grid grid-cols-2 p-4 border-t border-border text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span className="text-right text-primary">Flat rate</span>
            </div>
            <div className="grid grid-cols-2 p-4 border-t border-border text-sm font-bold">
              <span className="text-primary">Total</span>
              <span className="text-right text-primary">£1,000.00</span>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full py-4 text-base">
            Place Order
          </button>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Your personal data will be used to process your order and support your experience on this website.
          </p>
        </form>
      </section>

      <Footer />
    </div>
  );
};

export default PaymentPage;
