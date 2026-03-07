import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingSidebar from "@/components/FloatingSidebar";
import { ChevronDown } from "lucide-react";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { API_URL } from "@/lib/api";

export default function CustomerLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useCustomerAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/v1/customer/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Failed to log in");

            login(data.token, data.customer);
            toast.success("Logged in successfully!");
            navigate("/account");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#eaf0f3]">
            <Header />

            <section className="pt-16 md:pt-24 pb-8 text-center">
                <h1 className="font-sans text-[46px] md:text-[64px] leading-none font-semibold text-[#10275c]">My Account</h1>
                <ChevronDown className="w-5 h-5 mx-auto mt-6 text-primary" />
            </section>

            <section className="container mx-auto px-4 lg:px-8 pb-20 md:pb-28">
                <div className="max-w-md mx-auto bg-white p-8 border border-[#cad4e4]">
                    <h2 className="font-sans text-[32px] md:text-[42px] leading-none font-semibold text-primary mb-7">Login</h2>
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-[13px] font-semibold text-primary mb-2">Email address *</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-12 border border-[#cad4e4] bg-[#eaf0f3] px-4 text-[14px] outline-none focus:border-orange"
                            />
                        </div>
                        <div>
                            <label className="block text-[13px] font-semibold text-primary mb-2">Password *</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full h-12 border border-[#cad4e4] bg-[#eaf0f3] px-4 text-[14px] outline-none focus:border-orange"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-orange text-white text-[14px] font-semibold hover:bg-orange-hover transition-colors disabled:opacity-50"
                        >
                            {loading ? "Logging in..." : "Log in"}
                        </button>
                        <div className="mt-4 text-center text-sm text-[#6e7a92]">
                            Don't have an account? <Link to="/register" className="text-orange hover:underline">Register</Link>
                        </div>
                    </form>
                </div>
            </section>

            <Footer />
            <FloatingSidebar />
        </div>
    );
}
