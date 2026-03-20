import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CreditCard, Building2, Wallet, Lock, Plus } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CheckoutSteps from "@/components/CheckoutSteps";
import FloatingSidebar from "@/components/FloatingSidebar";
import { apiFetch } from "@/lib/api";
import Seo from "@/components/Seo";
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
        confirmParams: {
          return_url: window.location.origin + "/payment",
        },
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
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Unexpected error. Please try again.");
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
  const { cart, subtotal: subtotalRaw, vatEnabled, vatRate, coupon, clearCart, isBusiness } = useCart();
  const { customer } = useCustomerAuth();

  const [method, setMethod] = useState<"card" | "bank" | "cod">("card");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveCard, setSaveCard] = useState(false);
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>("new");

  const fulfilmentMethod = checkoutForm?.fulfillmentMethod === "click_collect" ? "click_collect" : "delivery";
  const selectedShippingOption = checkoutForm?.selectedShippingOption ?? null;
  const shippingOptionToken = checkoutForm?.shippingOptionToken ?? "";
  const shippingForOrder = fulfilmentMethod === "click_collect" ? 0 : Number(selectedShippingOption?.rate ?? 0);
  const discountAmount = coupon?.discount ?? 0;
  const taxableAmount = Math.max(0, subtotalRaw + shippingForOrder - discountAmount);
  const vatAmountForOrder = vatEnabled ? Math.round(taxableAmount * (vatRate / 100) * 100) / 100 : 0;
  const totalForOrder = cart.length > 0 ? Math.max(0, taxableAmount + vatAmountForOrder) : 0;
  const totalFormatted = `£${totalForOrder.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatEtaDate = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  };

  useEffect(() => {
    if (customer) {
      apiFetch("/v1/customer/payment-methods")
        .then(data => {
          if (Array.isArray(data)) {
            setSavedCards(data);
            if (data.length > 0) {
              setSelectedCardId(data[0].stripe_payment_method_id);
            }
          }
        })
        .catch(() => { });
      return;
    }

    setSavedCards([]);
    setSelectedCardId("new");
  }, [customer]);

  // Create PaymentIntent whenever card method is selected and amount > 0
  useEffect(() => {
    if (method !== "card" || totalForOrder <= 0 || (fulfilmentMethod === "delivery" && !shippingOptionToken)) { setClientSecret(null); return; }
    let cancelled = false;
    const fetchIntent = async () => {
      setLoadingIntent(true);
      try {
        const data = await apiFetch("/v1/payment/intent", {
          method: "POST",
          body: JSON.stringify({
            items: cart.map((item) => ({
              product_id: Number(item.product_id),
              quantity: item.qty,
              selected_variants: item.selected_variants ?? null,
            })),
            coupon_code: coupon?.code ?? null,
            fulfilment_method: fulfilmentMethod,
            shipping_option_token: shippingOptionToken || null,
            currency: "gbp",
          }),
        });
        if (!cancelled) setClientSecret(data.client_secret ?? null);
      } catch (error: any) {
        if (!cancelled) {
          setClientSecret(null);
          toast.error(error.message || "Could not initialize payment. Please refresh.");
        }
      } finally {
        if (!cancelled) setLoadingIntent(false);
      }
    };
    fetchIntent();
    return () => { cancelled = true; };
  }, [method, totalForOrder, cart, coupon?.code, fulfilmentMethod, shippingOptionToken]);

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

      const shippingAddress = `${checkoutForm.shipping_address}, ${checkoutForm.shipping_city}, ${checkoutForm.shipping_county ? checkoutForm.shipping_county + ', ' : ''}${checkoutForm.shipping_postcode}, ${checkoutForm.shipping_country}`;

      const orderData = await apiFetch("/v1/orders", {
        method: "POST",
        body: JSON.stringify({
          customer_name: `${checkoutForm.firstName} ${checkoutForm.lastName}`,
          customer_email: checkoutForm.email,
          customer_phone: checkoutForm.phone,
          shipping_address: shippingAddress,
          shipping_address_line1: checkoutForm.shipping_address,
          shipping_city: checkoutForm.shipping_city,
          shipping_postcode: checkoutForm.shipping_postcode,
          shipping_county: checkoutForm.shipping_county || null,
          shipping_country: checkoutForm.shipping_country,
          billing_address: billingAddress,
          billing_address_line1: checkoutForm.billingSameAsShipping ? checkoutForm.shipping_address : checkoutForm.address,
          billing_city: checkoutForm.billingSameAsShipping ? checkoutForm.shipping_city : checkoutForm.city,
          billing_postcode: checkoutForm.billingSameAsShipping ? checkoutForm.shipping_postcode : checkoutForm.postcode,
          billing_county: checkoutForm.billingSameAsShipping ? (checkoutForm.shipping_county || null) : (checkoutForm.county || null),
          billing_country: checkoutForm.billingSameAsShipping ? checkoutForm.shipping_country : checkoutForm.country,
          notes: checkoutForm.notes,
          coupon_code: coupon?.code ?? null,
          fulfilment_method: fulfilmentMethod,
          shipping_option_token: shippingOptionToken || null,
          is_business: isBusiness,
          company_name: checkoutForm.company,
          company_vat_number: checkoutForm.companyVat,
          stripe_payment_intent_id: paymentIntentId,
          save_card: method === "card" && selectedCardId === "new" ? saveCard : false,
          items: cart.map(item => ({
            product_id: Number(item.product_id),
            quantity: item.qty,
            selected_variants: item.selected_variants ?? null,
          })),
          payment_method: method === "card"
            ? "Credit / Debit Card"
            : method === "bank"
              ? "Direct Bank Transfer"
              : "Cash on Delivery",
        }),
      });

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
    if (fulfilmentMethod === "delivery" && !shippingOptionToken) {
      toast.error("Missing delivery option. Please return to checkout and reselect.");
      return;
    }
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
      <Seo title="Payment" description="Secure payment page." canonicalPath="/payment" noindex />
      <Header />

      <section className="container mx-auto px-4 lg:px-8 pt-16 md:pt-24 pb-4 md:pb-6">
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

                {savedCards.length > 0 && (
                  <div className="mb-6 space-y-3">
                    {savedCards.map(card => (
                      <label key={card.id} className={`flex items-center gap-3 p-4 border cursor-pointer transition-colors bg-white ${selectedCardId === card.stripe_payment_method_id ? "border-orange ring-1 ring-orange/50" : "border-[#cad4e4] hover:border-orange/60"}`}>
                        <input type="radio" name="savedCard" checked={selectedCardId === card.stripe_payment_method_id} onChange={() => setSelectedCardId(card.stripe_payment_method_id)} className="accent-orange" />
                        <div className="flex-1">
                          <p className="font-semibold text-primary text-sm">•••• •••• •••• {card.last4}</p>
                          <p className="text-[#6e7a92] text-xs">Expires {card.exp_month}/{card.exp_year}</p>
                        </div>
                        <div className="w-10 h-6 bg-[#f4f7f9] border border-[#cad4e4] rounded flex items-center justify-center font-bold text-primary text-[10px] uppercase">
                          {card.brand}
                        </div>
                      </label>
                    ))}
                    <label className={`flex items-center gap-3 p-4 border cursor-pointer transition-colors bg-white ${selectedCardId === "new" ? "border-orange ring-1 ring-orange/50" : "border-[#cad4e4] hover:border-orange/60"}`}>
                      <input type="radio" name="savedCard" checked={selectedCardId === "new"} onChange={() => setSelectedCardId("new")} className="accent-orange" />
                      <div className="w-10 h-6 flex items-center justify-center">
                        <Plus className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-semibold text-primary text-sm">Add a new card</span>
                    </label>
                  </div>
                )}

                {selectedCardId === "new" ? (
                  loadingIntent ? (
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
                        showSaveCheckbox={!!customer}
                        onSuccess={(id) => createOrder(id)}
                      />
                    </Elements>
                  ) : fulfilmentMethod === "delivery" && !shippingOptionToken ? (
                    <p className="text-[#6e7a92] text-sm">Please return to checkout and select a delivery option.</p>
                  ) : (
                    <p className="text-[#6e7a92] text-sm">Unable to load payment form. Please refresh the page.</p>
                  )
                ) : (
                  <button
                    onClick={async () => {
                      if (!clientSecret) return;
                      setIsSubmitting(true);
                      try {
                        const stripe = await stripePromise;
                        if (!stripe) throw new Error("Stripe not loaded");
                        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                          payment_method: selectedCardId
                        });
                        if (error) {
                          toast.error(error.message || "Payment failed");
                        } else if (paymentIntent && paymentIntent.status === "succeeded") {
                          await createOrder(paymentIntent.id);
                        } else {
                          toast.error("Payment was not successful. Please try again.");
                        }
                      } catch (err: any) {
                        toast.error(err.message || "An error occurred");
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting || !clientSecret}
                    className="w-full h-14 bg-orange text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-orange-hover transition-colors disabled:opacity-50 mt-4"
                  >
                    <Lock className="w-4 h-4" />
                    {isSubmitting ? "Processing Payment…" : `Pay ${totalFormatted} Securely`}
                  </button>
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
                <span className="text-sm md:text-base text-primary p-4 md:p-6">£{subtotalRaw.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="grid grid-cols-[42%_58%] border-b border-[#cad4e4]">
                <span className="font-semibold text-sm md:text-lg text-primary bg-[#f4f5f7] p-4 md:p-6">Shipping</span>
                <div className="text-sm md:text-base text-primary p-4 md:p-6">
                  {fulfilmentMethod === "click_collect" ? (
                    <span>Click & Collect: £0.00</span>
                  ) : (
                    <>
                      <p>{selectedShippingOption?.service || "Delivery"}: £{shippingForOrder.toFixed(2)}</p>
                      {selectedShippingOption?.estimated_delivery_date && (
                        <p className="mt-1 text-[#6e7a92]">
                          ETA: {formatEtaDate(selectedShippingOption.estimated_delivery_date)}
                          {selectedShippingOption?.parcel_summary?.parcel_count > 1
                            ? ` · ${selectedShippingOption.parcel_summary.parcel_count} parcels`
                            : ""}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
              {coupon && (
                <div className="grid grid-cols-[42%_58%] border-b border-[#cad4e4]">
                  <span className="font-semibold text-sm md:text-lg text-green-700 bg-[#f4f5f7] p-4 md:p-6">Discount ({coupon.code})</span>
                  <span className="text-sm md:text-base text-green-700 p-4 md:p-6">−£{coupon.discount.toFixed(2)}</span>
                </div>
              )}
              {vatEnabled && vatAmountForOrder > 0 && (
                <div className="grid grid-cols-[42%_58%] border-b border-[#cad4e4]">
                  <span className="font-semibold text-sm md:text-lg text-primary bg-[#f4f5f7] p-4 md:p-6">VAT ({vatRate}%)</span>
                  <span className="text-sm md:text-base text-primary p-4 md:p-6">£{vatAmountForOrder.toFixed(2)}</span>
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
