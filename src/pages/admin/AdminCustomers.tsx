import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Users, Search, Trash2, Eye, X, ShoppingBag } from "lucide-react";

export default function AdminCustomers() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

    const [sortBy, setSortBy] = useState("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    useEffect(() => {
        loadCustomers();
    }, [search]);

    const loadCustomers = async () => {
        try {
            const res = await apiFetch(`/admin/customers?search=${search}`);
            setCustomers(res.data);
        } catch (e) {
            toast.error("Failed to load customers");
        } finally {
            setLoading(false);
        }
    };

    const sortedCustomers = [...customers].sort((a, b) => {
        let valA, valB;
        if (sortBy === "name") {
            valA = a.name.toLowerCase();
            valB = b.name.toLowerCase();
        } else if (sortBy === "orders") {
            valA = a.orders_count || 0;
            valB = b.orders_count || 0;
        } else if (sortBy === "spent") {
            valA = parseFloat(a.orders_sum_total || 0);
            valB = parseFloat(b.orders_sum_total || 0);
        }

        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
    });

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this customer? This will NOT delete their orders but will remove their account access.")) return;
        try {
            await apiFetch(`/admin/customers/${id}`, { method: "DELETE" });
            toast.success("Customer deleted");
            loadCustomers();
        } catch (e) {
            toast.error("Failed to delete customer");
        }
    };

    const viewDetails = async (customer: any) => {
        try {
            const res = await apiFetch(`/admin/customers/${customer.id}`);
            setSelectedCustomer(res);
        } catch (e) {
            toast.error("Failed to load customer details");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold font-sans text-[#10275c]">Customers</h1>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Sort:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white"
                        >
                            <option value="name">Name</option>
                            <option value="orders">Orders</option>
                            <option value="spent">Total Spent</option>
                        </select>
                        <button
                            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                            className="h-10 px-3 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                        >
                            {sortOrder === "asc" ? "↑" : "↓"}
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search customers..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#eb5c10] border-gray-300"
                        />
                    </div>
                </div>
            </div>

            <div className="rounded-lg bg-white shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
                        ) : sortedCustomers.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-4 text-center">No customers found.</td></tr>
                        ) : sortedCustomers.map((customer) => (
                            <tr key={customer.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.orders_count || 0}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">£{parseFloat(customer.orders_sum_total || 0).toFixed(2)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => viewDetails(customer)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                                        <Eye className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleDelete(customer.id)} className="text-red-600 hover:text-red-900">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Customer Details Modal */}
            {selectedCustomer && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white">
                            <h2 className="text-xl font-bold font-sans text-[#10275c]">Customer Details</h2>
                            <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-gray-500">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><p className="text-gray-500">Full Name</p><p className="font-semibold">{selectedCustomer.name}</p></div>
                                <div><p className="text-gray-500">Email Address</p><p className="font-semibold">{selectedCustomer.email}</p></div>
                                <div><p className="text-gray-500">Phone</p><p className="font-semibold">{selectedCustomer.phone || 'N/A'}</p></div>
                                <div><p className="text-gray-500">Joined Date</p><p className="font-semibold">{new Date(selectedCustomer.created_at).toLocaleDateString()}</p></div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="font-bold text-[#10275c] border-b pb-1 flex items-center gap-2">
                                    <ShoppingBag className="w-4 h-4" /> Order History
                                </h3>
                                {(selectedCustomer.orders || []).length === 0 ? (
                                    <p className="text-xs text-gray-500">No orders placed yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedCustomer.orders.map((order: any) => (
                                            <div key={order.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md border border-gray-100">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{order.order_number}</p>
                                                    <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()} • {order.status}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-[#eb5c10]">£{parseFloat(order.total).toFixed(2)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
