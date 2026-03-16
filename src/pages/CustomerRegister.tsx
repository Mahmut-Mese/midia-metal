import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingSidebar from "@/components/FloatingSidebar";
import { ChevronDown } from "lucide-react";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { apiFetch } from "@/lib/api";
import Seo from "@/components/Seo";

export default function CustomerRegister() {
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
        phone: "",
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useCustomerAuth();

    const update = (field: string, value: string) => setForm({ ...form, [field]: value });

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.password !== form.password_confirmation) {
            return toast.error("Passwords do not match");
        }
        setLoading(true);
        try {
            const data = await apiFetch("/v1/customer/register", {
                method: "POST",
                body: JSON.stringify(form)
            });

            login(data.customer);
            toast.success("Account created successfully!");
            navigate("/account");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#eaf0f3]">
            <Seo title="Create Account" description="Register for a customer account." canonicalPath="/register" noindex />
            <Header />

            <section className="container mx-auto px-4 lg:px-8 pt-16 md:pt-24 pb-20 md:pb-28">
                <div className="max-w-md mx-auto bg-white p-8 border border-[#cad4e4]">
                    <h2 className="font-sans text-[32px] md:text-[42px] leading-none font-semibold text-primary mb-7">Create Account</h2>
                    <form onSubmit={handleRegister} className="space-y-5">
                        <div>
                            <label className="block text-[13px] font-semibold text-primary mb-2">Full Name *</label>
                            <input
                                type="text"
                                required
                                value={form.name}
                                onChange={(e) => update("name", e.target.value)}
                                className="w-full h-12 border border-[#cad4e4] bg-[#eaf0f3] px-4 text-[14px] outline-none focus:border-orange"
                            />
                        </div>
                        <div>
                            <label className="block text-[13px] font-semibold text-primary mb-2">Email address *</label>
                            <input
                                type="email"
                                required
                                value={form.email}
                                onChange={(e) => update("email", e.target.value)}
                                className="w-full h-12 border border-[#cad4e4] bg-[#eaf0f3] px-4 text-[14px] outline-none focus:border-orange"
                            />
                        </div>
                        <div>
                            <label className="block text-[13px] font-semibold text-primary mb-2">Phone</label>
                            <input
                                type="text"
                                value={form.phone}
                                onChange={(e) => update("phone", e.target.value)}
                                className="w-full h-12 border border-[#cad4e4] bg-[#eaf0f3] px-4 text-[14px] outline-none focus:border-orange"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[13px] font-semibold text-primary mb-2">Password *</label>
                                <input
                                    type="password"
                                    required
                                    value={form.password}
                                    onChange={(e) => update("password", e.target.value)}
                                    className="w-full h-12 border border-[#cad4e4] bg-[#eaf0f3] px-4 text-[14px] outline-none focus:border-orange"
                                />
                            </div>
                            <div>
                                <label className="block text-[13px] font-semibold text-primary mb-2">Confirm *</label>
                                <input
                                    type="password"
                                    required
                                    value={form.password_confirmation}
                                    onChange={(e) => update("password_confirmation", e.target.value)}
                                    className="w-full h-12 border border-[#cad4e4] bg-[#eaf0f3] px-4 text-[14px] outline-none focus:border-orange"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-orange text-white text-[14px] font-semibold hover:bg-orange-hover transition-colors mt-6 disabled:opacity-50"
                        >
                            {loading ? "Registering..." : "Register"}
                        </button>
                        <div className="mt-4 text-center text-sm text-[#6e7a92]">
                            Already have an account? <Link to="/login" className="text-orange hover:underline">Log in</Link>
                        </div>
                    </form>
                </div>
            </section>

            <Footer />
            <FloatingSidebar />
        </div>
    );
}
