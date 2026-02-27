import { useState } from "react";
import { Link } from "react-router-dom";
import { X, Minus, Plus, Tag } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CheckoutSteps from "@/components/CheckoutSteps";
import FloatingSidebar from "@/components/FloatingSidebar";

const CartPage = () => {
  const [items, setItems] = useState([
    { id: 1, name: "Baffle Grease Filters", price: 1000, qty: 1, image: "/images/baffle-filter.jpg" },
  ]);

  const updateQty = (id: number, qty: number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, qty: Math.max(1, qty) } : item)));
  };

  const removeItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="py-14 text-center md:py-16">
        <h1 className="page-title">Cart</h1>
        <svg className="w-6 h-6 mx-auto mt-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </section>

      {/* Steps */}
      <section className="container mx-auto px-4 lg:px-8 pb-2 md:pb-4">
        <CheckoutSteps currentStep={1} />
      </section>

      <section className="container mx-auto px-4 lg:px-8 py-6 md:py-8">
        {/* Mobile cart cards */}
        <div className="space-y-4 md:hidden mb-8">
          {items.map((item) => (
            <div key={item.id} className="border border-border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary leading-snug">{item.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">£{item.price.toFixed(2)} each</p>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-muted-foreground hover:text-destructive p-1"
                  aria-label={`Remove ${item.name}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex items-center border border-border rounded">
                  <button onClick={() => updateQty(item.id, item.qty - 1)} className="px-2.5 py-1.5 text-primary">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="px-4 text-sm font-medium text-primary">{item.qty}</span>
                  <button onClick={() => updateQty(item.id, item.qty + 1)} className="px-2.5 py-1.5 text-primary">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Subtotal</p>
                  <p className="text-sm font-semibold text-primary">£{(item.price * item.qty).toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block border border-border rounded-lg overflow-hidden mb-8">
          <div className="grid grid-cols-5 gap-4 p-4 bg-secondary text-xs font-bold uppercase text-primary">
            <span>Product</span>
            <span>Price</span>
            <span>Quantity</span>
            <span>Subtotal</span>
            <span>Remove</span>
          </div>
          {items.map((item) => (
            <div key={item.id} className="grid grid-cols-5 gap-4 p-4 items-center border-t border-border">
              <div className="flex items-center gap-3">
                <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                <span className="text-sm font-semibold text-primary">{item.name}</span>
              </div>
              <span className="text-sm text-muted-foreground">£{item.price.toFixed(2)}</span>
              <div className="flex items-center border border-border rounded w-fit">
                <button onClick={() => updateQty(item.id, item.qty - 1)} className="px-2 py-1"><Minus className="w-3 h-3" /></button>
                <span className="px-3 text-sm">{item.qty}</span>
                <button onClick={() => updateQty(item.id, item.qty + 1)} className="px-2 py-1"><Plus className="w-3 h-3" /></button>
              </div>
              <span className="text-sm font-semibold text-primary">£{(item.price * item.qty).toFixed(2)}</span>
              <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Actions row */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-10 md:mb-12">
          <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full md:w-auto">
            <div className="flex items-center gap-2 border border-border rounded px-3 py-2 w-full sm:w-64">
              <Tag className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input type="text" placeholder="Coupon Code" className="bg-transparent text-sm outline-none w-full min-w-0" />
            </div>
            <button className="btn-outline-dark text-xs px-4 py-2 w-full sm:w-auto">Apply Coupon</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto md:flex md:gap-3">
            <Link to="/shop" className="btn-outline-dark text-xs px-4 py-2 text-center">Continue Shopping</Link>
            <button className="btn-primary text-xs px-4 py-2">Update Cart</button>
          </div>
        </div>

        {/* Cart Totals */}
        <div className="w-full max-w-md ml-auto">
          <h3 className="font-serif font-bold text-2xl text-primary mb-6">Cart totals</h3>
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-2 p-4 border-b border-border">
              <span className="font-semibold text-sm text-primary">Subtotal</span>
              <span className="text-sm text-muted-foreground text-right">£{subtotal.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 p-4 border-b border-border gap-4">
              <span className="font-semibold text-sm text-primary">Shipping</span>
              <div className="text-right text-sm text-muted-foreground">
                <p>Flat rate</p>
                <p>Shipping to <strong className="text-primary">London</strong>.</p>
                <button className="text-orange text-xs underline mt-1">Change address</button>
              </div>
            </div>
            <div className="grid grid-cols-2 p-4">
              <span className="font-bold text-sm text-primary">Total</span>
              <span className="font-bold text-sm text-primary text-right">£{subtotal.toFixed(2)}</span>
            </div>
          </div>
          <Link to="/checkout" className="btn-primary w-full mt-6 py-4 text-base text-center">Proceed to checkout</Link>
        </div>
      </section>

      <Footer />
      <div className="hidden md:block">
        <FloatingSidebar />
      </div>
    </div>
  );
};

export default CartPage;
