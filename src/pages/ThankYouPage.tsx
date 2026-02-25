import { Link } from "react-router-dom";
import { CheckCircle, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const ThankYouPage = () => {
  const orderNumber = `#${Math.floor(10000 + Math.random() * 90000)}`;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Steps */}
      <section className="container mx-auto px-4 lg:px-8 pt-12 pb-4">
        <div className="flex items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 bg-secondary text-primary text-xs flex items-center justify-center rounded font-bold">1</span>
            <span className="text-muted-foreground">Shopping Cart</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 bg-secondary text-primary text-xs flex items-center justify-center rounded font-bold">2</span>
            <span className="text-muted-foreground">Payment & Delivery</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 bg-orange text-accent-foreground text-xs flex items-center justify-center rounded font-bold">3</span>
            <span className="font-semibold text-primary">Order Received</span>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 py-16 max-w-2xl text-center">
        <div className="flex justify-center mb-6">
          <CheckCircle className="w-20 h-20 text-orange" />
        </div>
        <h1 className="page-title mb-4">Thank You!</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Your order has been placed successfully. We'll send you a confirmation email with your order details shortly.
        </p>

        {/* Order Info */}
        <div className="border border-border rounded-lg overflow-hidden text-left mb-10">
          <div className="p-4 bg-secondary">
            <h3 className="font-serif font-bold text-primary">Order Details</h3>
          </div>
          <div className="divide-y divide-border">
            <div className="grid grid-cols-2 p-4 text-sm">
              <span className="font-semibold text-primary">Order Number</span>
              <span className="text-right text-muted-foreground">{orderNumber}</span>
            </div>
            <div className="grid grid-cols-2 p-4 text-sm">
              <span className="font-semibold text-primary">Date</span>
              <span className="text-right text-muted-foreground">{new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
            <div className="grid grid-cols-2 p-4 text-sm">
              <span className="font-semibold text-primary">Payment Method</span>
              <span className="text-right text-muted-foreground">Credit / Debit Card</span>
            </div>
            <div className="grid grid-cols-2 p-4 text-sm">
              <span className="font-semibold text-primary">Product</span>
              <span className="text-right text-muted-foreground">Baffle Grease Filters × 1</span>
            </div>
            <div className="grid grid-cols-2 p-4 text-sm font-bold">
              <span className="text-primary">Total</span>
              <span className="text-right text-primary">£1,000.00</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/" className="btn-primary">
            Back to Home
          </Link>
          <Link to="/shop" className="btn-outline-dark">
            Continue Shopping
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ThankYouPage;
