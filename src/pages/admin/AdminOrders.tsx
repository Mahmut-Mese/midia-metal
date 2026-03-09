import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Eye, Trash2, X } from "lucide-react";

export default function AdminOrders() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [viewingOrder, setViewingOrder] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            const res = await apiFetch("/admin/orders");
            setOrders(res.data);
        } catch (e) {
            toast.error("Failed to load orders");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id: number, status: string) => {
        try {
            await apiFetch(`/admin/orders/${id}`, {
                method: "PUT",
                body: JSON.stringify({ status }),
            });
            toast.success("Order status updated");
            if (viewingOrder) {
                setViewingOrder({ ...viewingOrder, status });
            }
            loadOrders();
        } catch (e) {
            toast.error("Failed to update status");
        }
    };

    const filteredOrders = orders
        .filter((order) => {
            const matchesSearch =
                order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.customer_email.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === "all" || order.status === statusFilter;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
        });

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold font-sans text-[#10275c]">Orders</h1>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 mb-4">
                <input
                    type="text"
                    placeholder="Search by ID, name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary w-full lg:w-80 text-sm"
                />
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white flex-1 sm:flex-none"
                    >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                        className="h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white flex-1 sm:flex-none"
                    >
                        <option value="desc">Newest First</option>
                        <option value="asc">Oldest First</option>
                    </select>
                </div>
            </div>

            <div className="rounded-lg bg-white shadow overflow-x-auto text-sm md:text-base">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">No orders found.</td>
                            </tr>
                        ) : (
                            filteredOrders.map((order) => (
                                <tr key={order.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {order.order_number}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                                        <div className="text-sm text-gray-500">{order.customer_email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(order.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        £{order.total}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                                order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${order.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                                                order.payment_status === 'refunded' ? 'bg-slate-100 text-slate-700' :
                                                    order.payment_status === 'failed' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'}`}>
                                            {order.payment_status || "pending"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => setViewingOrder(order)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                                            <Eye className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Viewing Modal */}
            {viewingOrder && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mt-20 md:mt-0 max-h-[90vh] overflow-y-auto flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10 flex-shrink-0">
                            <h2 className="text-xl font-bold font-sans text-[#10275c]">Order #{viewingOrder.order_number}</h2>
                            <button onClick={() => setViewingOrder(null)} className="text-gray-400 hover:text-gray-500">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Customer Details</h3>
                                    <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                        <div className="sm:col-span-1">
                                            <dt className="text-sm font-medium text-gray-500">Name</dt>
                                            <dd className="mt-1 text-sm text-gray-900">{viewingOrder.customer_name}</dd>
                                        </div>
                                        <div className="sm:col-span-1">
                                            <dt className="text-sm font-medium text-gray-500">Email</dt>
                                            <dd className="mt-1 text-sm text-gray-900">{viewingOrder.customer_email}</dd>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <dt className="text-sm font-medium text-gray-500">Address</dt>
                                            <dd className="mt-1 text-sm text-gray-900">{viewingOrder.shipping_address}</dd>
                                        </div>
                                        {viewingOrder.billing_address && (
                                            <div className="sm:col-span-2">
                                                <dt className="text-sm font-medium text-gray-500">Billing Address</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{viewingOrder.billing_address}</dd>
                                            </div>
                                        )}
                                        {viewingOrder.notes && (
                                            <div className="sm:col-span-2">
                                                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{viewingOrder.notes}</dd>
                                            </div>
                                        )}
                                    </dl>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Order Update</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Order Status</label>
                                            <select
                                                value={viewingOrder.status}
                                                onChange={(e) => handleUpdateStatus(viewingOrder.id, e.target.value)}
                                                className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm border"
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="processing">Processing</option>
                                                <option value="shipped">Shipped</option>
                                                <option value="delivered">Delivered</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                                            <select
                                                value={viewingOrder.payment_status ?? "pending"}
                                                onChange={async (e) => {
                                                    const payment_status = e.target.value;
                                                    try {
                                                        await apiFetch(`/admin/orders/${viewingOrder.id}`, {
                                                            method: "PUT",
                                                            body: JSON.stringify({ payment_status }),
                                                        });
                                                        setViewingOrder({ ...viewingOrder, payment_status });
                                                        toast.success("Payment status updated");
                                                        loadOrders();
                                                    } catch {
                                                        toast.error("Failed to update payment status");
                                                    }
                                                }}
                                                className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm border"
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="paid">Paid</option>
                                                <option value="failed">Failed</option>
                                                <option value="refunded">Refunded</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number</label>
                                            <input
                                                type="text"
                                                defaultValue={viewingOrder.tracking_number ?? ""}
                                                placeholder="e.g. RM123456789GB"
                                                onBlur={async (e) => {
                                                    const val = e.target.value.trim();
                                                    if (val !== (viewingOrder.tracking_number ?? "")) {
                                                        await handleUpdateStatus(viewingOrder.id, viewingOrder.status);
                                                        try {
                                                            await apiFetch(`/admin/orders/${viewingOrder.id}`, {
                                                                method: "PUT",
                                                                body: JSON.stringify({ tracking_number: val }),
                                                            });
                                                            setViewingOrder({ ...viewingOrder, tracking_number: val });
                                                            toast.success("Tracking number saved");
                                                            loadOrders();
                                                        } catch { toast.error("Failed to save tracking number"); }
                                                    }
                                                }}
                                                className="block w-full rounded-md border-gray-300 py-2 px-3 text-sm border focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8">
                                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Order Items</h3>
                                <div className="rounded-lg bg-gray-50 p-6 border">
                                    {viewingOrder.items?.map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center py-4 border-b last:border-0">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{item.quantity}x {item.product_name}</p>
                                                {item.variant_details && (
                                                    <div className="mt-1 space-y-1">
                                                        {Object.entries(item.variant_details).map(([opt, value]: [string, any]) => (
                                                            <p key={opt} className="text-xs text-[#eb5c10] font-bold uppercase tracking-wider">
                                                                {opt}: {value?.value ?? value}
                                                            </p>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-900">{item.product_price}</p>
                                        </div>
                                    ))}
                                    <div className="mt-4 flex justify-between items-center pt-4 border-t font-semibold">
                                        <p className="text-gray-900">Total</p>
                                        <p className="text-gray-900">£{viewingOrder.total}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
