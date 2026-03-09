import { useState } from "react";
import { Link } from "react-router-dom";
import { X, Minus, Plus, ChevronDown, ChevronUp, Tag } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CheckoutSteps from "@/components/CheckoutSteps";
import FloatingSidebar from "@/components/FloatingSidebar";
import { useCart } from "@/context/CartContext";
import Seo from "@/components/Seo";

const CartPage = () => {
  const {
    cart, removeFromCart, updateQuantity,
    subtotal, shippingRate, vatEnabled, vatAmount, vatRate,
    coupon, applyCoupon, removeCoupon, total, isBusiness
  } = useCart();

  const [couponInput, setCouponInput] = useState(coupon?.code ?? "");
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setApplyingCoupon(true);
    await applyCoupon(couponInput);
    setApplyingCoupon(false);
  };

  return (
    <div className="min-h-screen bg-[#eaf0f3]">
      <Seo title="Basket" description="Review the products in your basket before checkout." canonicalPath="/cart" noindex />
      <Header />

      <section className="container mx-auto px-4 lg:px-8 pt-16 md:pt-24 pb-4 md:pb-6">
        <CheckoutSteps currentStep={1} />
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-20 md:pb-28">
        {/* Mobile cart cards */}
        <div className="space-y-4 md:hidden mb-10">
          {cart.map((item) => (
            <div key={item.id} className="border border-[#cad4e4] bg-[#f0f3f7] p-4">
              <div className="flex items-start gap-3">
                <img src={item.image} alt={item.name} className="w-16 h-16 object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary leading-snug">{item.name}</p>
                  {item.selected_variants && Object.entries(item.selected_variants).map(([opt, v]: [string, any]) => (
                    <p key={opt} className="text-[10px] text-orange mt-0.5 font-bold uppercase tracking-tight">
                      {opt}: {v.value}
                    </p>
                  ))}
                  <p className="text-xs text-muted-foreground mt-1">£{parseFloat(item.price.toString().replace(/[£,]/g, "")).toFixed(2)} each</p>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-muted-foreground hover:text-destructive p-1" aria-label={`Remove ${item.name}`}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex items-center border border-[#cad4e4] h-10">
                  <button onClick={() => updateQuantity(item.id, item.qty - 1)} className="px-2.5 py-1.5 text-primary"><Minus className="w-3 h-3" /></button>
                  <span className="px-4 text-sm font-medium text-primary">{item.qty}</span>
                  <button onClick={() => updateQuantity(item.id, item.qty + 1)} className="px-2.5 py-1.5 text-primary"><Plus className="w-3 h-3" /></button>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Subtotal</p>
                  <p className="text-sm font-semibold text-primary">£{(parseFloat(item.price.toString().replace(/[£,]/g, "")) * item.qty).toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block mb-10">
          <div className="grid grid-cols-5 gap-6 px-6 py-5 bg-[#f4f5f7] text-sm md:text-base leading-none font-semibold text-primary">
            <span>Product</span><span>Price</span><span>Quantity</span><span>Subtotal</span><span>Remove</span>
          </div>
          {cart.length === 0 ? (
            <div className="px-6 py-12 border-b border-[#cad4e4] text-[24px] text-muted-foreground">Your cart is empty.</div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="grid grid-cols-5 gap-6 px-6 py-8 items-center border-b border-[#cad4e4]">
                <div className="flex items-center gap-5 min-w-0">
                  <img src={item.image} alt={item.name} className="w-20 h-20 object-cover flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-base md:text-xl leading-tight font-semibold text-primary truncate">{item.name}</span>
                    {item.selected_variants && Object.entries(item.selected_variants).map(([opt, v]: [string, any]) => (
                      <span key={opt} className="text-xs text-orange font-bold uppercase tracking-widest mt-1 block">
                        {opt}: {v.value}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-lg md:text-xl leading-none text-primary">£{parseFloat(item.price.toString().replace(/[£,]/g, "")).toFixed(2)}</span>
                <div className="w-[124px] h-[56px] border border-[#cad4e4] flex items-center px-5 bg-[#eaf0f3]">
                  <span className="text-base md:text-lg leading-none text-primary">{item.qty}</span>
                  <div className="ml-auto flex flex-col">
                    <button onClick={() => updateQuantity(item.id, item.qty + 1)} className="text-[#8c99b2] hover:text-primary" aria-label={`Increase quantity of ${item.name}`}><ChevronUp className="w-3 h-3" /></button>
                    <button onClick={() => updateQuantity(item.id, item.qty - 1)} className="text-[#8c99b2] hover:text-primary" aria-label={`Decrease quantity of ${item.name}`}><ChevronDown className="w-3 h-3" /></button>
                  </div>
                </div>
                <span className="text-lg md:text-xl leading-none font-semibold text-primary">£{(parseFloat(item.price.toString().replace(/[£,]/g, "")) * item.qty).toFixed(2)}</span>
                <button onClick={() => removeFromCart(item.id)} className="text-[#8f9ab1] hover:text-destructive w-fit"><X className="w-6 h-6" /></button>
              </div>
            ))
          )}
        </div>
        <div className="hidden md:block border-t border-[#cad4e4] mb-14" />

        {/* Coupon Row */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-14 md:mb-20">
          <div className="w-full md:w-[530px] h-14 border border-[#cad4e4] flex items-center bg-[#eaf0f3]">
            <div className="flex items-center gap-2 pl-5 pr-3 flex-1 min-w-0">
              <Tag className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              {coupon ? (
                <span className="text-sm font-semibold text-green-700">{coupon.code} — {coupon.message}</span>
              ) : (
                <input
                  type="text"
                  placeholder="Coupon Code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                  className="bg-transparent text-sm outline-none w-full min-w-0 placeholder:text-[#8f9bb2]"
                />
              )}
            </div>
            {coupon ? (
              <button onClick={removeCoupon} className="h-full px-6 border-l border-[#cad4e4] text-red-500 text-sm font-semibold hover:bg-[#f5f7fa] transition-colors">
                Remove
              </button>
            ) : (
              <button onClick={handleApplyCoupon} disabled={applyingCoupon} className="h-full px-6 border-l border-[#cad4e4] text-primary text-sm font-semibold hover:bg-[#f5f7fa] transition-colors disabled:opacity-50">
                {applyingCoupon ? "Applying..." : "Apply Coupon"}
              </button>
            )}
          </div>
        </div>

        {/* Cart Totals */}
        <div className="w-full max-w-[640px] ml-auto">
          <h3 className="font-sans font-semibold text-[28px] md:text-[40px] leading-none text-primary mb-6">Cart totals</h3>
          <div className="border border-[#cad4e4] overflow-hidden">
            <div className="grid grid-cols-[38%_62%] border-b border-[#cad4e4]">
              <span className="font-semibold text-sm md:text-lg text-primary bg-[#f4f5f7] p-4 md:p-6">Subtotal</span>
              <span className="text-sm md:text-lg text-primary p-4 md:p-6">£{subtotal.toFixed(2)}</span>
            </div>

            {coupon && (
              <div className="grid grid-cols-[38%_62%] border-b border-[#cad4e4]">
                <span className="font-semibold text-sm md:text-lg text-green-700 bg-[#f4f5f7] p-4 md:p-6">Discount ({coupon.code})</span>
                <span className="text-sm md:text-lg text-green-700 p-4 md:p-6">−£{coupon.discount.toFixed(2)}</span>
              </div>
            )}

            {vatEnabled && vatAmount > 0 && (
              <div className="grid grid-cols-[42%_58%] border-b border-[#cad4e4]">
                <span className="font-semibold text-sm md:text-lg text-primary bg-[#f4f5f7] p-4 md:p-6">VAT ({vatRate}%)</span>
                <span className="text-sm md:text-base text-primary p-4 md:p-6">£{vatAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="grid grid-cols-[38%_62%] border-b border-[#cad4e4]">
              <span className="font-semibold text-sm md:text-lg text-primary bg-[#f4f5f7] p-4 md:p-6">Shipping</span>
              <div className="text-sm md:text-lg text-primary p-4 md:p-6">
                <p>Flat rate: £{shippingRate.toFixed(2)}</p>
              </div>
            </div>
            <div className="grid grid-cols-[38%_62%]">
              <span className="font-semibold text-sm md:text-lg text-primary bg-[#f4f5f7] p-4 md:p-6">Total</span>
              <span className="font-semibold text-base md:text-2xl text-primary p-4 md:p-6">£{total.toFixed(2)}</span>
            </div>
          </div>
          <Link to="/checkout" className="w-full mt-8 h-16 bg-orange text-white inline-flex items-center justify-center text-sm font-semibold hover:bg-orange-hover transition-colors">
            Proceed to checkout
          </Link>
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
