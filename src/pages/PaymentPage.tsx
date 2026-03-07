import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, CreditCard, Building2, Wallet, Lock } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CheckoutSteps from "@/components/CheckoutSteps";
import FloatingSidebar from "@/components/FloatingSidebar";
import { useCart } from "@/context/CartContext";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

// Stripe
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY as string);

// ─── Inner form (wrapped in <Elements>) ──────────────────────────────────────
interface StripeFormProps {
  totalFormatted: string;
  saveCard: boolean;
  setSaveCard: (val: boolean) => void;
  showSaveCheckbox: boolean;
  onSuccess: (paymentIntentId: string) => Promise<void>;
}

function StripeCardForm({ totalFormatted, saveCard, setSaveCard, showSaveCheckbox, onSuccess }: StripeFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });
      if (error) {
        toast.error(error.message || "Payment failed. Please try again.");
        setPaying(false);
        return;
      }
      if (paymentIntent && paymentIntent.status === "succeeded") {
        await onSuccess(paymentIntent.id);
      }
    } catch {
      toast.error("Unexpected error. Please try again.");
      setPaying(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-5">
      <PaymentElement
        options={{
          layout: "tabs",
          fields: { billingDetails: { email: "auto" } },
          wallets: { link: "never" },
        }}
      />
      {showSaveCheckbox && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            id="saveCard"
            checked={saveCard}
            onChange={(e) => setSaveCard(e.target.checked)}
            className="w-4 h-4 accent-orange cursor-pointer"
          />
          <label htmlFor="saveCard" className="text-[13px] font-semibold text-primary cursor-pointer">
            Save this card for future purchases
          </label>
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || paying}
        className="w-full h-14 bg-orange text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-orange-hover transition-colors disabled:opacity-50"
      >
        <Lock className="w-4 h-4" />
        {paying ? "Processing Payment…" : `Pay ${totalFormatted} Securely`}
      </button>
      <p className="text-[11px] text-[#7f8aa2] text-center flex items-center justify-center gap-1">
        <Lock className="w-3 h-3" /> Secured by Stripe · Your card details are never stored on our servers
      </p>
    </form>
  );
}

// ─── Main PaymentPage ─────────────────────────────────────────────────────────
const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const checkoutForm = location.state?.form;
  const { cart, subtotal: subtotalRaw, shippingRate, vatEnabled, vatRate, vatAmount, coupon, total: totalRaw, clearCart, isBusiness } = useCart();
  const { token } = useCustomerAuth();

  const [method, setMethod] = useState<"card" | "bank" | "cod">("card");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveCard, setSaveCard] = useState(false);

  const totalFormatted = `£${totalRaw.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Create PaymentIntent whenever card method is selected and amount > 0
  useEffect(() => {
    if (method !== "card" || totalRaw <= 0) { setClientSecret(null); return; }
    let cancelled = false;
    const fetchIntent = async () => {
      setLoadingIntent(true);
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch("http://127.0.0.1:8000/api/v1/payment/intent", {
          method: "POST",
          headers,
          body: JSON.stringify({ amount: totalRaw, currency: "gbp" }),
        });
        const data = await res.json();
        if (!cancelled) setClientSecret(data.client_secret ?? null);
      } catch {
        if (!cancelled) toast.error("Could not initialize payment. Please refresh.");
      } finally {
        if (!cancelled) setLoadingIntent(false);
      }
    };
    fetchIntent();
    return () => { cancelled = true; };
  }, [method, totalRaw, token]);

  /** Called after:
   *  - Stripe payment succeeds (paymentIntentId provided)
   *  - Bank / COD (paymentIntentId = null)
   */
  const createOrder = async (paymentIntentId: string | null) => {
    if (!checkoutForm) { toast.error("Missing checkout details."); return; }
    setIsSubmitting(true);
    try {
      // Resolve billing address
      const billingAddress = checkoutForm.billingSameAsShipping
        ? `${checkoutForm.shipping_address}, ${checkoutForm.shipping_city}, ${checkoutForm.shipping_postcode}, ${checkoutForm.shipping_country}`
        : `${checkoutForm.address}, ${checkoutForm.city}, ${checkoutForm.postcode}, ${checkoutForm.country}`;

      const shippingAddress = `${checkoutForm.shipping_address}, ${checkoutForm.shipping_city}, ${checkoutForm.shipping_postcode}, ${checkoutForm.shipping_country}`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const orderResponse = await fetch("http://127.0.0.1:8000/api/v1/orders", {
        method: "POST",
        headers,
        body: JSON.stringify({
          customer_name: `${checkoutForm.firstName} ${checkoutForm.lastName}`,
          customer_email: checkoutForm.email,
          customer_phone: checkoutForm.phone,
          shipping_address: shippingAddress,
          billing_address: billingAddress,
          notes: checkoutForm.notes,
          shipping_amount: shippingRate,
          tax_amount: vatAmount,
          discount_amount: coupon?.discount ?? 0,
          coupon_code: coupon?.code ?? null,
          is_business: isBusiness,
          company_name: checkoutForm.company,
          company_vat_number: checkoutForm.companyVat,
          stripe_payment_intent_id: paymentIntentId,
          save_card: saveCard,
          items: cart.map(item => ({
            product_id: item.id,
            product_name: item.name,
            product_price: item.price.toString(),
            quantity: item.qty,
          })),
          payment_method: method === "card"
            ? "Credit / Debit Card"
            : method === "bank"
              ? "Direct Bank Transfer"
              : "Cash on Delivery",
        }),
      });
      const orderData = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(orderData.message ?? "Order failed");

      clearCart();
      toast.success("Order placed successfully!");
      navigate("/thank-you", {
        state: {
          orderDetails: {
            items: [...cart],
            total: totalFormatted,
            method: method === "card" ? "Credit / Debit Card" : method === "bank" ? "Direct Bank Transfer" : "Cash on Delivery",
            orderNumber: orderData.order_number,
          },
        },
      });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to place order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bank / COD submit
  const handleNonCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) { toast.error("Your cart is empty"); return; }
    await createOrder(null);
  };

  const stripeOptions = clientSecret
    ? {
      clientSecret,
      appearance: {
        theme: "flat" as const,
        variables: {
          colorPrimary: "#e85c0d",
          colorBackground: "#eaf0f3",
          colorText: "#10275c",
          borderRadius: "0px",
          fontFamily: "Inter, sans-serif",
        },
        rules: {
          ".Input": { border: "1px solid #cad4e4", padding: "12px 16px", fontSize: "14px" },
          ".Input:focus": { borderColor: "#e85c0d", boxShadow: "none" },
          ".Label": { fontSize: "13px", fontWeight: "600", color: "#10275c" },
        },
      },
    }
    : undefined;

  return (
    <div className="min-h-screen bg-[#eaf0f3]">
      <Header />

      <section className="pt-16 md:pt-24 pb-8 text-center">
        <h1 className="font-sans text-[46px] md:text-[64px] leading-none font-semibold text-[#10275c]">Payment</h1>
        <ChevronDown className="w-5 h-5 mx-auto mt-6 text-primary" />
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-4 md:pb-6">
        <CheckoutSteps currentStep={3} />
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-20 md:pb-28">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_430px] gap-10 md:gap-12 items-start">
          {/* LEFT: Payment method selector + card form */}
          <div>
            <h2 className="font-sans text-[32px] md:text-[42px] leading-none font-semibold text-primary mb-7">Payment Method</h2>

            {/* Method selector */}
            <div className="space-y-4 mb-8">
              {[
                { id: "card" as const, icon: CreditCard, label: "Credit / Debit Card", desc: "Pay securely with Stripe — Visa, Mastercard, Amex and more." },
                { id: "bank" as const, icon: Building2, label: "Direct Bank Transfer", desc: "Transfer to our account and we'll confirm payment manually." },
                { id: "cod" as const, icon: Wallet, label: "Cash on Delivery", desc: "Pay when your order arrives." },
              ].map((m) => (
                <label
                  key={m.id}
                  className={`flex items-start gap-4 p-5 border cursor-pointer transition-colors ${method === m.id ? "border-orange bg-[#fff3e9]" : "border-[#cad4e4] bg-[#f0f3f7] hover:border-orange/60"}`}
                >
                  <input type="radio" name="payment" checked={method === m.id} onChange={() => setMethod(m.id)} className="accent-orange mt-1" />
                  <m.icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[16px] font-semibold text-primary leading-none">{m.label}</p>
                    <p className="text-[13px] text-[#7f8aa2] mt-2">{m.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Card: Stripe Elements */}
            {method === "card" && (
              <div className="border border-[#cad4e4] bg-[#f0f3f7] p-6 md:p-8">
                <h3 className="font-sans text-[24px] md:text-[30px] leading-none font-semibold text-primary mb-6 flex items-center gap-3">
                  <Lock className="w-5 h-5 text-orange" /> Card Details
                </h3>
                {loadingIntent ? (
                  <div className="text-center py-8 text-[#6e7a92]">
                    <div className="w-6 h-6 border-2 border-orange border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    Initialising secure payment…
                  </div>
                ) : clientSecret && stripeOptions ? (
                  <Elements stripe={stripePromise} options={stripeOptions}>
                    <StripeCardForm
                      totalFormatted={totalFormatted}
                      saveCard={saveCard}
                      setSaveCard={setSaveCard}
                      showSaveCheckbox={!!token}
                      onSuccess={(id) => createOrder(id)}
                    />
                  </Elements>
                ) : (
                  <p className="text-[#6e7a92] text-sm">Unable to load payment form. Please refresh the page.</p>
                )}
              </div>
            )}

            {/* Bank / COD */}
            {method !== "card" && (
              <form onSubmit={handleNonCardSubmit}>
                {method === "bank" && (
                  <div className="border border-[#cad4e4] bg-[#f0f3f7] p-6 mb-6">
                    <h3 className="font-semibold text-primary mb-3">Bank Transfer Details</h3>
                    <div className="text-sm text-primary space-y-1">
                      <p><span className="text-[#6e7a92]">Account Name:</span> Midia Metal Ltd</p>
                      <p><span className="text-[#6e7a92]">Sort Code:</span> 20-00-00</p>
                      <p><span className="text-[#6e7a92]">Account Number:</span> 12345678</p>
                      <p className="mt-2 text-[#7f8aa2] text-xs">Please use your order number as reference once you receive your confirmation email.</p>
                    </div>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting || cart.length === 0}
                  className="w-full h-14 bg-orange text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-orange-hover transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Placing Order…" : "Place Order"}
                </button>
              </form>
            )}
          </div>

          {/* RIGHT: Order summary */}
          <div>
            <h3 className="font-sans font-semibold text-[28px] md:text-[40px] leading-none text-primary mb-6">Order totals</h3>
            <div className="border border-[#cad4e4] overflow-hidden">
              <div className="grid grid-cols-[42%_58%] border-b border-[#cad4e4]">
                <span className="font-semibold text-sm md:text-lg text-primary bg-[#f4f5f7] p-4 md:p-6">Product</span>
                <span className="font-semibold text-sm md:text-lg text-primary bg-[#f4f5f7] p-4 md:p-6">Subtotal</span>
              </div>
              {cart.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[42%_58%] border-b border-[#cad4e4]">
                  <span className="text-sm md:text-base text-primary p-4 md:p-6">{item.name} x {item.qty}</span>
                  <span className="text-sm md:text-base text-primary p-4 md:p-6">{typeof item.price === "string" ? item.price : `£${item.price}`}</span>
                </div>
              ))}
              <div className="grid grid-cols-[42%_58%] border-b border-[#cad4e4]">
                <span className="font-semibold text-sm md:text-lg text-primary bg-[#f4f5f7] p-4 md:p-6">Subtotal</span>
                <span className="text-sm md:text-base text-primary p-4 md:p-6">£{subtotalRaw.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="grid grid-cols-[42%_58%] border-b border-[#cad4e4]">
                <span className="font-semibold text-sm md:text-lg text-primary bg-[#f4f5f7] p-4 md:p-6">Shipping</span>
                <span className="text-sm md:text-base text-primary p-4 md:p-6">£{shippingRate.toFixed(2)}</span>
              </div>
              {coupon && (
                <div className="grid grid-cols-[42%_58%] border-b border-[#cad4e4]">
                  <span className="font-semibold text-sm md:text-lg text-green-700 bg-[#f4f5f7] p-4 md:p-6">Discount ({coupon.code})</span>
                  <span className="text-sm md:text-base text-green-700 p-4 md:p-6">−£{coupon.discount.toFixed(2)}</span>
                </div>
              )}
              {vatEnabled && isBusiness && (
                <div className="grid grid-cols-[42%_58%] border-b border-[#cad4e4]">
                  <span className="font-semibold text-sm md:text-lg text-primary bg-[#f4f5f7] p-4 md:p-6">VAT ({vatRate}%)</span>
                  <span className="text-sm md:text-base text-primary p-4 md:p-6">£{vatAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="grid grid-cols-[42%_58%]">
                <span className="font-semibold text-sm md:text-lg text-primary bg-[#f4f5f7] p-4 md:p-6">Total</span>
                <span className="font-semibold text-base md:text-2xl text-primary p-4 md:p-6">{totalFormatted}</span>
              </div>
            </div>

            <p className="text-[12px] text-[#7f8aa2] mt-6">
              Your personal data will be used to process your order in accordance with our privacy policy.
            </p>
          </div>
        </div>
      </section>

      <Footer />
      <div className="hidden md:block">
        <FloatingSidebar />
      </div>
    </div>
  );
};

export default PaymentPage;
