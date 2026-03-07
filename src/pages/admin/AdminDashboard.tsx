import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Copy, Users, ShoppingCart, DollarSign, Activity, Package } from "lucide-react";

export default function AdminDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            try {
                const res = await apiFetch("/admin/dashboard");
                setData(res);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        loadStats();
    }, []);

    if (loading) return <div className="text-center py-20">Loading dashboard...</div>;
    if (!data) return <div className="text-center py-20 text-red-500">Failed to load data</div>;

    const stats = [
        { name: "Total Revenue", value: `£${data.stats.monthly_revenue || 0}`, icon: DollarSign },
        { name: "Total Products", value: data.stats.total_products, icon: Package },
        { name: "Pending Orders", value: data.stats.pending_orders, icon: ShoppingCart },
        { name: "Unread Messages", value: data.stats.unread_messages, icon: Activity },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-[#10275c] font-sans">Dashboard</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, idx) => {
                    const Icon = stat.icon || Users;
                    return (
                        <div key={idx} className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6 flex items-center gap-4">
                            <div className="rounded-md bg-[#22a3e6]/10 p-3">
                                <Icon className="h-6 w-6 text-[#22a3e6]" />
                            </div>
                            <div>
                                <dt className="truncate text-sm font-medium text-gray-500">{stat.name}</dt>
                                <dd className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">{stat.value}</dd>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Recent Orders */}
                <div className="rounded-lg bg-white shadow">
                    <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
                        <h3 className="text-base font-semibold leading-6 text-gray-900">Recent Orders</h3>
                    </div>
                    <ul role="list" className="divide-y divide-gray-100 px-4 sm:px-6">
                        {data.recent_orders?.length === 0 ? (
                            <li className="py-4 text-sm text-gray-500">No recent orders found.</li>
                        ) : (
                            data.recent_orders?.map((order: any) => (
                                <li key={order.id} className="flex justify-between gap-x-6 py-5">
                                    <div className="flex min-w-0 gap-x-4">
                                        <div className="min-w-0 flex-auto">
                                            <p className="text-sm font-semibold leading-6 text-gray-900">
                                                {order.order_number} <span className="text-gray-400 font-normal ml-2">{order.customer_name}</span>
                                            </p>
                                            <p className="mt-1 truncate text-xs leading-5 text-gray-500">${order.total}</p>
                                        </div>
                                    </div>
                                    <div className="hidden sm:flex sm:flex-col sm:items-end">
                                        <p className="text-sm leading-6 text-gray-900 capitalize">{order.status}</p>
                                        <p className="mt-1 text-xs leading-5 text-gray-500">
                                            {new Date(order.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>

                {/* Recent Messages */}
                <div className="rounded-lg bg-white shadow">
                    <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
                        <h3 className="text-base font-semibold leading-6 text-gray-900">Recent Messages</h3>
                    </div>
                    <ul role="list" className="divide-y divide-gray-100 px-4 sm:px-6">
                        {data.recent_messages?.length === 0 ? (
                            <li className="py-4 text-sm text-gray-500">No recent messages found.</li>
                        ) : (
                            data.recent_messages?.map((msg: any) => (
                                <li key={msg.id} className="flex justify-between gap-x-6 py-5">
                                    <div className="min-w-0 flex-auto">
                                        <p className="text-sm font-semibold leading-6 text-gray-900">
                                            {msg.name} {!msg.read && <span className="inline-block w-2 h-2 ml-1 bg-[#eb5c10] rounded-full"></span>}
                                        </p>
                                        <p className="mt-1 truncate text-xs leading-5 text-gray-500">{msg.subject || msg.email}</p>
                                    </div>
                                    <div className="hidden sm:flex sm:flex-col sm:items-end">
                                        <p className="mt-1 text-xs leading-5 text-gray-500">
                                            {new Date(msg.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
}
