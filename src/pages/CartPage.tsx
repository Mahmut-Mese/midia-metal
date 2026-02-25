import { useState } from "react";
import { Link } from "react-router-dom";
import { X, Minus, Plus, ArrowRight, Tag } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const CartPage = () => {
  const [items, setItems] = useState([
    { id: 1, name: "Baffle Grease Filters", price: 1000, qty: 1, image: "/images/baffle-filter.jpg" },
  ]);

  const updateQty = (id: number, qty: number) => {
    setItems(items.map((item) => item.id === id ? { ...item, qty: Math.max(1, qty) } : item));
  };

  const removeItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="py-16 text-center">
        <h1 className="page-title">Cart</h1>
        <svg className="w-6 h-6 mx-auto mt-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </section>

      {/* Steps */}
      <section className="container mx-auto px-4 lg:px-8 pb-4">
        <div className="flex items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 bg-orange text-accent-foreground text-xs flex items-center justify-center rounded font-bold">1</span>
            <span className="font-semibold text-primary">Shopping Cart</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 bg-primary text-primary-foreground text-xs flex items-center justify-center rounded font-bold">2</span>
            <span className="text-muted-foreground">Payment & Delivery Options</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 bg-primary text-primary-foreground text-xs flex items-center justify-center rounded font-bold">3</span>
            <span className="text-muted-foreground">Order Received</span>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 py-8">
        {/* Table */}
        <div className="border border-border rounded-lg overflow-hidden mb-8">
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
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-12">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 border border-border rounded px-3 py-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Coupon Code" className="bg-transparent text-sm outline-none w-32" />
            </div>
            <button className="btn-outline-dark text-xs px-4 py-2">Apply Coupon</button>
          </div>
          <div className="flex gap-3">
            <Link to="/shop" className="btn-outline-dark text-xs px-4 py-2">Continue Shopping</Link>
            <button className="btn-primary text-xs px-4 py-2">Update Cart</button>
          </div>
        </div>

        {/* Cart Totals */}
        <div className="max-w-md mx-auto">
          <h3 className="font-serif font-bold text-xl text-primary text-center mb-4">Cart totals</h3>
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-2 p-4 border-b border-border">
              <span className="font-semibold text-sm text-primary">Subtotal</span>
              <span className="text-sm text-muted-foreground text-right">£{subtotal.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 p-4 border-b border-border">
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
          <button className="btn-primary w-full mt-6 py-4 text-base">Proceed to checkout</button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CartPage;
