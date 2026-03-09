import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    Package,
    FileText,
    Image,
    Briefcase,
    LogOut,
    Menu,
    Settings,
    Mail,
    ShoppingCart,
    MessageSquare,
    Tag,
    Users,
    Star,
    HelpCircle
} from "lucide-react";
import { removeAuthToken, apiFetch } from "@/lib/api";

const navigation = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Products", href: "/admin/products", icon: Package },
    { name: "Product Categories", href: "/admin/product-categories", icon: FileText },
    { name: "Services", href: "/admin/services", icon: Briefcase },
    { name: "Portfolio", href: "/admin/portfolio", icon: Image },
    { name: "Portfolio Categories", href: "/admin/portfolio-categories", icon: FileText },
    { name: "Blog", href: "/admin/blog", icon: FileText },
    { name: "Orders", href: "/admin/orders", icon: ShoppingCart },
    { name: "Quotes", href: "/admin/quotes", icon: MessageSquare },
    { name: "Coupons", href: "/admin/coupons", icon: Tag },
    { name: "Messages", href: "/admin/messages", icon: Mail },
    { name: "Product Reviews", href: "/admin/product-reviews", icon: Star },
    { name: "Customers", href: "/admin/customers", icon: Users },
    { name: "FAQs", href: "/admin/faq", icon: HelpCircle },
    { name: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await apiFetch("/admin/logout", { method: "POST" });
        } catch (e) {
            // ignore
        }
        removeAuthToken();
        navigate("/admin/login");
    };

    return (
        <div className="flex bg-[#f4f5f7] min-h-screen">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#10275c] text-white transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                    } lg:static`}
            >
                <div className="flex h-16 items-center flex-shrink-0 px-6 font-bold text-xl border-b border-white/10">
                    Midia Admin
                </div>
                <div className="h-full overflow-y-auto px-4 py-6">
                    <ul className="space-y-1">
                        {navigation.map((item) => {
                            const isActive = location.pathname === item.href || (location.pathname.startsWith(item.href) && item.href !== "/admin");
                            return (
                                <li key={item.name}>
                                    <Link
                                        to={item.href}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                                            }`}
                                    >
                                        <item.icon className={`h-5 w-5 ${isActive ? "text-[#22a3e6]" : "text-white/50 group-hover:text-white/70"}`} />
                                        {item.name}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
                <div className="p-4 border-t border-white/10 absolute bottom-0 w-full bg-[#10275c]">
                    <button
                        onClick={handleLogout}
                        className="group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                    >
                        <LogOut className="h-5 w-5 text-white/50 group-hover:text-white/70" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="flex h-16 items-center border-b border-[#e1e5eb] bg-white px-4 md:px-6">
                    <button
                        type="button"
                        className="text-[#6b7280] focus:outline-none lg:hidden"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <div className="ml-4 lg:ml-0 flex-1 flex justify-end">
                        <span className="text-sm font-medium text-[#4b5563]">Admin Panel</span>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto bg-[#f8f9fa] p-4 md:p-8">
                    <Outlet />
                </main>
            </div>

            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}
        </div>
    );
}
