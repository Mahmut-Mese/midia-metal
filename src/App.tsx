import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CookieBanner from "./components/CookieBanner";
import { CartProvider } from "./context/CartContext";
import { CustomerAuthProvider } from "./context/CustomerAuthContext";
import { WishlistProvider } from "./context/WishlistContext";

const queryClient = new QueryClient();

const Index = lazy(() => import("./pages/Index"));
const ServicesPage = lazy(() => import("./pages/ServicesPage"));
const ServiceDetailPage = lazy(() => import("./pages/ServiceDetailPage"));
const ShopPage = lazy(() => import("./pages/ShopPage"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const PortfolioPage = lazy(() => import("./pages/PortfolioPage"));
const PortfolioDetailPage = lazy(() => import("./pages/PortfolioDetailPage"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const BlogDetailPage = lazy(() => import("./pages/BlogDetailPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
const ThankYouPage = lazy(() => import("./pages/ThankYouPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const QuoteRequestPage = lazy(() => import("./pages/QuoteRequestPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const ReturnsPage = lazy(() => import("./pages/ReturnsPage"));
const CookiesPage = lazy(() => import("./pages/CookiesPage"));
const FaqPage = lazy(() => import("./pages/FaqPage"));
const CustomerLogin = lazy(() => import("./pages/CustomerLogin"));
const CustomerRegister = lazy(() => import("./pages/CustomerRegister"));
const CustomerPortal = lazy(() => import("./pages/CustomerPortal"));
const ForgotPasswordPage = lazy(() => import("./pages/customer/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/customer/ResetPasswordPage"));

const AdminForgotPasswordPage = lazy(() => import("./pages/admin/AdminForgotPasswordPage"));
const AdminResetPasswordPage = lazy(() => import("./pages/admin/AdminResetPasswordPage"));

const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminServices = lazy(() => import("./pages/admin/AdminServices"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminProductCategories = lazy(() => import("./pages/admin/AdminProductCategories"));
const AdminPortfolio = lazy(() => import("./pages/admin/AdminPortfolio"));
const AdminPortfolioCategories = lazy(() => import("./pages/admin/AdminPortfolioCategories"));
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages"));
const AdminProductReviews = lazy(() => import("./pages/admin/AdminProductReviews"));
const AdminQuotes = lazy(() => import("./pages/admin/AdminQuotes"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers"));
const AdminFaq = lazy(() => import("./pages/admin/AdminFaq"));

const RouteLoader = () => <div className="min-h-screen bg-[#eaf0f3]" aria-hidden="true" />;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CustomerAuthProvider>
        <WishlistProvider>
          <CartProvider>
            <BrowserRouter>
              <Suspense fallback={<RouteLoader />}>
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
                  <Route path="/cookies" element={<CookiesPage />} />
                  <Route path="/faq" element={<FaqPage />} />

                  <Route path="/login" element={<CustomerLogin />} />
                  <Route path="/register" element={<CustomerRegister />} />
                  <Route path="/account" element={<CustomerPortal />} />

                  <Route path="/forgot-password" element={
                    <div className="bg-[#eaf0f3] min-h-screen">
                      <ForgotPasswordPage />
                    </div>
                  } />
                  <Route path="/reset-password" element={
                    <div className="bg-[#eaf0f3] min-h-screen">
                      <ResetPasswordPage />
                    </div>
                  } />

                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin/forgot-password" element={<AdminForgotPasswordPage />} />
                  <Route path="/admin/reset-password" element={<AdminResetPasswordPage />} />
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
                    <Route path="faq" element={<AdminFaq />} />
                    <Route path="services" element={<AdminServices />} />
                    <Route path="settings" element={<AdminSettings />} />
                    <Route path="*" element={<div className="p-8 text-xl font-semibold text-[#10275c]">Coming Soon</div>} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <CookieBanner />
            </BrowserRouter>
          </CartProvider>
        </WishlistProvider>
      </CustomerAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
