import { useLocation, Link } from "react-router-dom";
import { CheckCircle, ChevronDown } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CheckoutSteps from "@/components/CheckoutSteps";
import FloatingSidebar from "@/components/FloatingSidebar";

const ThankYouPage = () => {
  const location = useLocation();
  const orderDetails = location.state?.orderDetails;

  const orderNumber = orderDetails?.orderNumber || `#${Math.floor(10000 + Math.random() * 90000)} `;
  const paymentMethod = orderDetails?.method || "Credit / Debit Card";
  const total = orderDetails?.total || "£0.00";
  const items = orderDetails?.items || [];

  return (
    <div className="min-h-screen bg-[#eaf0f3]">
      <Header />

      <section className="pt-16 md:pt-24 pb-8 text-center">
        <h1 className="font-sans text-[46px] md:text-[64px] leading-none font-semibold text-[#10275c]">Order Received</h1>
        <ChevronDown className="w-5 h-5 mx-auto mt-6 text-primary" />
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-4 md:pb-6">
        <CheckoutSteps currentStep={3} />
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-20 md:pb-28 max-w-[920px]">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 border border-[#cad4e4] bg-[#f4f5f7] grid place-items-center">
            <CheckCircle className="w-10 h-10 text-orange" />
          </div>
        </div>
        <h2 className="text-center font-sans text-[40px] md:text-[56px] leading-none font-semibold text-primary mb-4">Thank You</h2>
        <p className="text-center text-[15px] text-[#6f7c95] leading-8 mb-10 max-w-[700px] mx-auto">
          Your order has been placed successfully. We'll send you a confirmation email with your order details shortly.
        </p>

        <div className="border border-[#cad4e4] overflow-hidden text-left mb-10">
          <div className="grid grid-cols-[42%_58%] border-b border-[#cad4e4]">
            <span className="font-semibold text-sm md:text-lg text-primary bg-[#f4f5f7] p-4 md:p-6">Order Number</span>
            <span className="text-sm md:text-base text-primary p-4 md:p-6">{orderNumber}</span>
          </div>
          <div className="grid grid-cols-[42%_58%] border-b border-[#cad4e4]">
            <span className="font-semibold text-sm md:text-lg text-primary bg-[#f4f5f7] p-4 md:p-6">Date</span>
            <span className="text-sm md:text-base text-primary p-4 md:p-6">
              {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
          <div className="grid grid-cols-[42%_58%] border-b border-[#cad4e4]">
            <span className="font-semibold text-sm md:text-lg text-primary bg-[#f4f5f7] p-4 md:p-6">Payment Method</span>
            <span className="text-sm md:text-base text-primary p-4 md:p-6">{paymentMethod}</span>
          </div>
          <div className="grid grid-cols-[42%_58%] border-b border-[#cad4e4]">
            <span className="font-semibold text-sm md:text-lg text-primary bg-[#f4f5f7] p-4 md:p-6">Product</span>
            <div className="text-sm md:text-base text-primary p-4 md:p-6 flex flex-col gap-1">
              {items.length > 0 ? items.map((item, idx) => (
                <span key={idx}>{item.name} x {item.qty}</span>
              )) : <span>Order Processing</span>}
            </div>
          </div>
          <div className="grid grid-cols-[42%_58%]">
            <span className="font-semibold text-sm md:text-lg text-primary bg-[#f4f5f7] p-4 md:p-6">Total</span>
            <span className="font-semibold text-base md:text-2xl text-primary p-4 md:p-6">{total}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center px-8 h-14 bg-orange text-white text-sm font-semibold hover:bg-orange-hover transition-colors"
          >
            Back to Home
          </Link>
          <Link
            to="/shop"
            className="inline-flex items-center justify-center px-8 h-14 bg-white text-primary text-sm font-semibold border border-[#cad4e4] hover:bg-[#f6f8fb] transition-colors"
          >
            Continue Shopping
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

export default ThankYouPage;
