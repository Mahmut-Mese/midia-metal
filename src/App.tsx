import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ServicesPage from "./pages/ServicesPage";
import ServiceDetailPage from "./pages/ServiceDetailPage";
import ShopPage from "./pages/ShopPage";
import CategoryPage from "./pages/CategoryPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import CartPage from "./pages/CartPage";
import PortfolioPage from "./pages/PortfolioPage";
import PortfolioDetailPage from "./pages/PortfolioDetailPage";
import BlogPage from "./pages/BlogPage";
import BlogDetailPage from "./pages/BlogDetailPage";
import CheckoutPage from "./pages/CheckoutPage";
import PaymentPage from "./pages/PaymentPage";
import ThankYouPage from "./pages/ThankYouPage";
import NotFound from "./pages/NotFound";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminBlog from "./pages/admin/AdminBlog";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminServices from "./pages/admin/AdminServices";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminProductCategories from "./pages/admin/AdminProductCategories";
import AdminPortfolio from "./pages/admin/AdminPortfolio";
import AdminPortfolioCategories from "./pages/admin/AdminPortfolioCategories";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminProductReviews from "./pages/admin/AdminProductReviews";
import AdminQuotes from "./pages/admin/AdminQuotes";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminCustomers from "./pages/admin/AdminCustomers";
import QuoteRequestPage from "./pages/QuoteRequestPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsPage from "./pages/TermsPage";
import ReturnsPage from "./pages/ReturnsPage";
import CookieBanner from "./components/CookieBanner";

import CustomerLogin from "./pages/CustomerLogin";
import CustomerRegister from "./pages/CustomerRegister";
import CustomerPortal from "./pages/CustomerPortal";

import { CartProvider } from "./context/CartContext";
import { CustomerAuthProvider } from "./context/CustomerAuthContext";
import { WishlistProvider } from "./context/WishlistContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CustomerAuthProvider>
        <WishlistProvider>
          <CartProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/services" element={<ServicesPage />} />
                <Route path="/services/:slug" element={<ServiceDetailPage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/shop/category/:slug" element={<CategoryPage />} />
                <Route path="/shop/:id" element={<ProductDetailPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/payment" element={<PaymentPage />} />
                <Route path="/thank-you" element={<ThankYouPage />} />
                <Route path="/portfolio" element={<PortfolioPage />} />
                <Route path="/portfolio/:slug" element={<PortfolioDetailPage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:slug" element={<BlogDetailPage />} />
                <Route path="/get-a-quote" element={<QuoteRequestPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/terms-of-service" element={<TermsPage />} />
                <Route path="/returns-policy" element={<ReturnsPage />} />

                {/* Customer Routes */}
                <Route path="/login" element={<CustomerLogin />} />
                <Route path="/register" element={<CustomerRegister />} />
                <Route path="/account" element={<CustomerPortal />} />

                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="product-categories" element={<AdminProductCategories />} />
                  <Route path="blog" element={<AdminBlog />} />
                  <Route path="portfolio" element={<AdminPortfolio />} />
                  <Route path="portfolio-categories" element={<AdminPortfolioCategories />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="quotes" element={<AdminQuotes />} />
                  <Route path="coupons" element={<AdminCoupons />} />
                  <Route path="messages" element={<AdminMessages />} />
                  <Route path="product-reviews" element={<AdminProductReviews />} />
                  <Route path="customers" element={<AdminCustomers />} />
                  <Route path="services" element={<AdminServices />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="*" element={<div className="p-8 text-xl font-semibold text-[#10275c]">Coming Soon</div>} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
              <CookieBanner />
            </BrowserRouter>
          </CartProvider>
        </WishlistProvider>
      </CustomerAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
