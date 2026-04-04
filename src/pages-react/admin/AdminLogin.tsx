import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function AdminLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await apiFetch("/admin/login", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            });
            toast.success("Welcome back, Admin!");
            navigate("/admin");
        } catch (error: any) {
            toast.error(error.message || "Invalid credentials. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#f4f5f7] px-4">
            <div className="w-full max-w-md rounded-[18px] bg-white p-10 shadow-xl">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-[#10275c] font-sans sm:text-4xl">Midia Admin</h1>
                    <p className="mt-3 text-sm text-[#6f7e9a] sm:text-base">Sign in to access your dashboard</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-[#10275c] sm:text-[15px]">Email Address</label>
                        <div className="relative mt-3">
                            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <Mail className="h-7 w-7" strokeWidth={1.75} />
                            </div>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block h-14 w-full rounded-xl border border-slate-300 bg-white px-14 text-base leading-none text-slate-400 shadow-sm outline-none transition focus:border-[#22a3e6] focus:ring-2 focus:ring-[#22a3e6]/15"
                                placeholder="admin@midiaematal.com"
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-semibold text-[#10275c] sm:text-[15px]">Password</label>
                            <Link to="/admin/forgot-password" className="text-sm text-orange hover:text-orange-hover font-medium">Forgot password?</Link>
                        </div>
                        <div className="relative mt-3">
                            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <Lock className="h-7 w-7" strokeWidth={1.75} />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block h-14 w-full rounded-xl border border-slate-300 bg-white px-14 pr-14 text-base leading-none text-slate-400 shadow-sm outline-none transition focus:border-[#22a3e6] focus:ring-2 focus:ring-[#22a3e6]/15"
                                placeholder="password"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-7 w-7" strokeWidth={1.75} />
                                ) : (
                                    <Eye className="h-7 w-7" strokeWidth={1.75} />
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex h-14 w-full justify-center rounded-xl bg-orange px-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-orange-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange disabled:opacity-50"
                    >
                        {loading ? "Signing in..." : "Sign in"}
                    </button>
                </form>
            </div>
        </div>
    );
}
