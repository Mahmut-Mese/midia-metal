/**
 * AdminApp — React SPA island that mounts the entire admin panel.
 * Used with client:only="react" in the catch-all admin Astro route.
 *
 * This component preserves the full React Router tree for all /admin/* routes.
 * No SSR — admin doesn't need SEO.
 *
 * Wraps with:
 * - QueryClientProvider (react-query for admin data fetching)
 * - TooltipProvider, Sonner (shadcn/ui)
 * - BrowserRouter (React Router for admin sub-routes)
 * - Suspense (lazy-loaded admin pages)
 */
import { Suspense, lazy } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const AdminLogin = lazy(() => import("@/pages-react/admin/AdminLogin"));
const AdminForgotPasswordPage = lazy(() => import("@/pages-react/admin/AdminForgotPasswordPage"));
const AdminResetPasswordPage = lazy(() => import("@/pages-react/admin/AdminResetPasswordPage"));
const AdminLayout = lazy(() => import("@/pages-react/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("@/pages-react/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("@/pages-react/admin/AdminProducts"));
const AdminBlog = lazy(() => import("@/pages-react/admin/AdminBlog"));
const AdminOrders = lazy(() => import("@/pages-react/admin/AdminOrders"));
const AdminServices = lazy(() => import("@/pages-react/admin/AdminServices"));
const AdminSettings = lazy(() => import("@/pages-react/admin/AdminSettings"));
const AdminProductCategories = lazy(() => import("@/pages-react/admin/AdminProductCategories"));
const AdminPortfolio = lazy(() => import("@/pages-react/admin/AdminPortfolio"));
const AdminPortfolioCategories = lazy(() => import("@/pages-react/admin/AdminPortfolioCategories"));
const AdminMessages = lazy(() => import("@/pages-react/admin/AdminMessages"));
const AdminProductReviews = lazy(() => import("@/pages-react/admin/AdminProductReviews"));
const AdminQuotes = lazy(() => import("@/pages-react/admin/AdminQuotes"));
const AdminCoupons = lazy(() => import("@/pages-react/admin/AdminCoupons"));
const AdminCustomers = lazy(() => import("@/pages-react/admin/AdminCustomers"));
const AdminFaq = lazy(() => import("@/pages-react/admin/AdminFaq"));

const RouteLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#f4f5f7]">
    <Loader2 className="h-8 w-8 animate-spin text-[#22a3e6]" />
  </div>
);

export default function AdminApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<RouteLoader />}>
            <Routes>
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
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
