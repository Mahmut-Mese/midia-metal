import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CheckoutSteps from "@/components/CheckoutSteps";
import FloatingSidebar from "@/components/FloatingSidebar";
import { apiFetch } from "@/lib/api";

import { useCart } from "@/context/CartContext";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cart, subtotal: subtotalRaw, shippingRate, vatEnabled, vatRate, vatAmount, coupon, total: totalRaw, isBusiness, setIsBusiness } = useCart();
  const { customer } = useCustomerAuth();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    company: "",
    phone: "",
    email: "",
    notes: "",
    companyVat: "",
    // Shipping (primary)
    shipping_address: "",
    shipping_city: "",
    shipping_postcode: "",
    shipping_country: "United Kingdom",
    // Billing (secondary — only needed when billingSameAsShipping = false)
    billingSameAsShipping: true,
    address: "",
    city: "",
    postcode: "",
    country: "United Kingdom",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (customer) {
      const parts = customer.name.split(" ");
      const cust = customer as any;
      const billingAddress = cust.billing_address || cust.address || "";
      const billingCity = cust.billing_city || cust.city || "";
      const billingPostcode = cust.billing_postcode || cust.postcode || "";
      const billingCountry = cust.billing_country || cust.country || "United Kingdom";
      const shippingAddress = cust.shipping_address || billingAddress;
      const shippingCity = cust.shipping_city || billingCity;
      const shippingPostcode = cust.shipping_postcode || billingPostcode;
      const shippingCountry = cust.shipping_country || billingCountry;
      const billingSame = !cust.billing_address || (shippingAddress === billingAddress);

      setForm(prev => ({
        ...prev,
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" ") || "",
        company: cust.company_name || "",
        phone: customer.phone || "",
        email: customer.email || "",
        companyVat: cust.company_vat_number || "",
        shipping_address: shippingAddress,
        shipping_city: shippingCity,
        shipping_postcode: shippingPostcode,
        shipping_country: shippingCountry,
        billingSameAsShipping: billingSame,
        address: billingAddress,
        city: billingCity,
        postcode: billingPostcode,
        country: billingCountry,
      }));
      setIsBusiness(customer.is_business || false);
    }
  }, [customer, setIsBusiness]);

  const update = (field: string, value: string | boolean) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) { toast.error("Your cart is empty"); return; }
    setIsSubmitting(true);
    navigate("/payment", { state: { form } });
  };


  return (
    <div className="min-h-screen bg-[#eaf0f3]">
      <Header />

      <section className="pt-16 md:pt-24 pb-8 text-center">
        <h1 className="font-sans text-[46px] md:text-[64px] leading-none font-semibold text-[#10275c]">Checkout</h1>
        <ChevronDown className="w-5 h-5 mx-auto mt-6 text-primary" />
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-4 md:pb-6">
        <CheckoutSteps currentStep={2} />
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-20 md:pb-28">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_430px] gap-10 md:gap-12 items-start">
            <div className="space-y-8">

              {/* ── Contact ── */}
              <div>
                <h2 className="font-sans text-[32px] md:text-[42px] leading-none font-semibold text-primary mb-7">Contact Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[13px] font-semibold text-primary mb-2">First Name *</label>
                    <input type="text" required value={form.firstName} onChange={(e) => update("firstName", e.target.value)} className="w-full h-12 border border-[#cad4e4] bg-[#eaf0f3] px-4 text-[14px] outline-none focus:border-orange" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-primary mb-2">Last Name *</label>
                    <input type="text" required value={form.lastName} onChange={(e) => update("lastName", e.target.value)} className="w-full h-12 border border-[#cad4e4] bg-[#eaf0f3] px-4 text-[14px] outline-none focus:border-orange" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-primary mb-2">Phone *</label>
                    <input type="tel" required value={form.phone} onChange={(e) => update("phone", e.target.value)} className="w-full h-12 border border-[#cad4e4] bg-[#eaf0f3] px-4 text-[14px] outline-none focus:border-orange" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-primary mb-2">Email Address *</label>
                    <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} className="w-full h-12 border border-[#cad4e4] bg-[#eaf0f3] px-4 text-[14px] outline-none focus:border-orange" />
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2">
                  <input type="checkbox" id="isBusiness" checked={isBusiness} onChange={(e) => setIsBusiness(e.target.checked)} className="w-4 h-4 accent-orange cursor-pointer" />
                  <label htmlFor="isBusiness" className="text-[13px] font-semibold text-primary cursor-pointer">I am purchasing as a business</label>
                </div>

                {isBusiness && (
                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[13px] font-semibold text-primary mb-2">Company Name *</label>
                      <input type="text" required value={form.company} onChange={(e) => update("company", e.target.value)} className="w-full h-12 border border-[#cad4e4] bg-[#eaf0f3] px-4 text-[14px] outline-none focus:border-orange" />
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-primary mb-2">Company VAT Number (optional)</label>
                      <input type="text" value={form.companyVat} onChange={(e) => update("companyVat", e.target.value)} className="w-full h-12 border border-[#cad4e4] bg-[#eaf0f3] px-4 text-[14px] outline-none focus:border-orange" />
                    </div>
                  </div>
                )}
              </div>

              {/* ── Shipping Address ── */}
              <div className="border-t border-[#cad4e4] pt-8">
                <h2 className="font-sans text-[32px] md:text-[42px] leading-none font-semibold text-primary mb-7">Shipping Address</h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-[13px] font-semibold text-primary mb-2">Country / Region *</label>
                    <select value={form.shipping_country} onChange={(e) => update("shipping_country", e.target.value)} className="w-full h-12 border border-[#cad4e4] bg-[#eaf0f3] px-4 text-[14px] outline-none focus:border-orange">
                      <option>United Kingdom</option>
                      <option>United States</option>
                      <option>Ireland</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-primary mb-2">Street Address *</label>
                    <input type="text" required placeholder="House number and street name" value={form.shipping_address} onChange={(e) => update("shipping_address", e.target.value)} className="w-full h-12 border border-[#cad4e4] bg-[#eaf0f3] px-4 text-[14px] outline-none focus:border-orange" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[13px] font-semibold text-primary mb-2">Town / City *</label>
                      <input type="text" required value={form.shipping_city} onChange={(e) => update("shipping_city", e.target.value)} className="w-full h-12 border border-[#cad4e4] bg-[#eaf0f3] px-4 text-[14px] outline-none focus:border-orange" />
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-primary mb-2">Postcode *</label>
                      <input type="text" required value={form.shipping_postcode} onChange={(e) => update("shipping_postcode", e.target.value)} className="w-full h-12 border border-[#cad4e4] bg-[#eaf0f3] px-4 text-[14px] outline-none focus:border-orange" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Billing Same as Shipping checkbox ── */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="billingSame"
                  checked={form.billingSameAsShipping}
                  onChange={(e) => update("billingSameAsShipping", e.target.checked)}
                  className="w-4 h-4 accent-orange cursor-pointer"
                />
                <label htmlFor="billingSame" className="text-[13px] font-semibold text-primary cursor-pointer">
                  Billing address is same as shipping address
                </label>
              </div>

              {/* ── Billing Address (shown only when different) ── */}
              {!form.billingSameAsShipping && (
                <div className="border-t border-[#cad4e4] pt-8">
                  <h2 className="font-sans text-[32px] md:text-[42px] leading-none font-semibold text-primary mb-7">Billing Address</h2>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-[13px] font-semibold text-primary mb-2">Country / Region *</label>
                      <select value={form.country} onChange={(e) => update("country", e.target.value)} className="w-full h-12 border border-[#cad4e4] bg-[#eaf0f3] px-4 text-[14px] outline-none focus:border-orange">
                        <option>United Kingdom</option>
                        <option>United States</option>
                        <option>Ireland</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-primary mb-2">Street Address *</label>
                      <input type="text" required placeholder="House number and street name" value={form.address} onChange={(e) => update("address", e.target.value)} className="w-full h-12 border border-[#cad4e4] bg-[#eaf0f3] px-4 text-[14px] outline-none focus:border-orange" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[13px] font-semibold text-primary mb-2">Town / City *</label>
                        <input type="text" required value={form.city} onChange={(e) => update("city", e.target.value)} className="w-full h-12 border border-[#cad4e4] bg-[#eaf0f3] px-4 text-[14px] outline-none focus:border-orange" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-primary mb-2">Postcode *</label>
                        <input type="text" required value={form.postcode} onChange={(e) => update("postcode", e.target.value)} className="w-full h-12 border border-[#cad4e4] bg-[#eaf0f3] px-4 text-[14px] outline-none focus:border-orange" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Order Notes ── */}
              <div className="border border-[#cad4e4] bg-[#f0f3f7] p-6 md:p-8">
                <h3 className="font-sans text-[24px] md:text-[30px] leading-none font-semibold text-primary mb-5">Additional Information</h3>
                <label className="block text-[13px] font-semibold text-primary mb-2">Order Notes (optional)</label>
                <textarea rows={4} placeholder="Notes about your order, e.g. special notes for delivery." value={form.notes} onChange={(e) => update("notes", e.target.value)} className="w-full border border-[#cad4e4] bg-[#eaf0f3] px-4 py-3 text-[14px] outline-none focus:border-orange resize-none" />
              </div>

            </div>


            <div>
              <h3 className="font-sans font-semibold text-[28px] md:text-[40px] leading-none text-primary mb-6">Your order</h3>
              {cart.length > 0 ? (
                <div className="border border-[#cad4e4] overflow-hidden">
                  <div className="grid grid-cols-[42%_58%] border-b border-[#cad4e4]">
                    <span className="font-semibold text-sm md:text-lg text-primary bg-[#f4f5f7] p-4 md:p-6">Product</span>
                    <span className="font-semibold text-sm md:text-lg text-primary bg-[#f4f5f7] p-4 md:p-6">Subtotal</span>
                  </div>
                  {cart.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[42%_58%] border-b border-[#cad4e4]">
                      <div className="text-sm md:text-base text-primary p-4 md:p-6">
                        {item.name} x {item.qty}
                        {item.selected_variants && Object.entries(item.selected_variants).map(([opt, v]: [string, any]) => (
                          <div key={opt} className="text-[10px] text-orange font-bold uppercase tracking-tight mt-1">
                            {opt}: {v.value}
                          </div>
                        ))}
                      </div>
                      <span className="text-sm md:text-base text-primary p-4 md:p-6">{typeof item.price === "string" ? item.price : `£${item.price}`}</span>
                    </div>
                  ))}
                  <div className="grid grid-cols-[42%_58%] border-b border-[#cad4e4]">
                    <span className="font-semibold text-sm md:text-lg text-primary bg-[#f4f5f7] p-4 md:p-6">Subtotal</span>
                    <span className="text-sm md:text-base text-primary p-4 md:p-6">£{subtotalRaw.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  {coupon && (
                    <div className="grid grid-cols-[42%_58%] border-b border-[#cad4e4]">
                      <span className="font-semibold text-sm md:text-lg text-green-700 bg-[#f4f5f7] p-4 md:p-6">Discount ({coupon.code})</span>
                      <span className="text-sm md:text-base text-green-700 p-4 md:p-6">−£{coupon.discount.toFixed(2)}</span>
                    </div>
                  )}

                  {vatEnabled && vatAmount > 0 && (
                    <div className="grid grid-cols-[42%_58%] border-b border-[#cad4e4]">
                      <span className="font-semibold text-sm md:text-lg text-primary bg-[#f4f5f7] p-4 md:p-6">VAT ({vatRate}%)</span>
                      <span className="text-sm md:text-base text-primary p-4 md:p-6">£{vatAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-[42%_58%] border-b border-[#cad4e4]">
                    <span className="font-semibold text-sm md:text-lg text-primary bg-[#f4f5f7] p-4 md:p-6">Shipping</span>
                    <div className="text-sm md:text-base text-primary p-4 md:p-6">
                      <p>Flat rate: £{shippingRate.toFixed(2)}</p>
                      <p className="mt-1 text-[#6e7a92]">
                        Shipping to <strong className="text-primary">{form.city || "your city"}</strong>.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-[42%_58%]">
                    <span className="font-semibold text-sm md:text-lg text-primary bg-[#f4f5f7] p-4 md:p-6">Total</span>
                    <span className="font-semibold text-base md:text-2xl text-primary p-4 md:p-6">£{totalRaw.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ) : (
                <div className="border border-[#cad4e4] p-4 text-center">Your cart is empty.</div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || cart.length === 0}
                className="w-full mt-8 h-16 bg-orange text-white inline-flex items-center justify-center text-sm font-semibold hover:bg-[#d4500b] disabled:opacity-50 transition-colors"
                aria-label="Proceed to payment"
              >
                {isSubmitting ? "Processing..." : "Place Order"}
              </button>
            </div>
          </div>
        </form>
      </section>

      <Footer />
      <div className="hidden md:block">
        <FloatingSidebar />
      </div>
    </div>
  );
};

export default CheckoutPage;
