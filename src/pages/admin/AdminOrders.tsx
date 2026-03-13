import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Download, Eye, RefreshCcw, Truck, X } from "lucide-react";
import { API_URL } from "@/lib/api";

const MOCK_TRACKING_CODES = [
  "EZ1000000001",
  "EZ2000000002",
  "EZ3000000003",
  "EZ4000000004",
  "EZ5000000005",
  "EZ6000000006",
  "EZ7000000007",
];

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [shippingBusy, setShippingBusy] = useState<"label" | "track" | null>(null);
  const [savingTracking, setSavingTracking] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const res = await apiFetch("/admin/orders");
      setOrders(res.data);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const openOrder = async (orderId: number) => {
    try {
      const order = await apiFetch(`/admin/orders/${orderId}`);
      setViewingOrder(order);
    } catch {
      toast.error("Failed to load order details");
    }
  };

  const updateOrder = async (id: number, payload: Record<string, any>, successMessage: string, errorMessage: string) => {
    try {
      const updated = await apiFetch(`/admin/orders/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setViewingOrder(updated);
      await loadOrders();
      toast.success(successMessage);
    } catch {
      toast.error(errorMessage);
    }
  };

  const handleCreateShippingLabel = async () => {
    if (!viewingOrder) return;

    setShippingBusy("label");
    try {
      const updated = await apiFetch(`/admin/orders/${viewingOrder.id}/shipping/label`, {
        method: "POST",
        body: JSON.stringify({ tracking_number: (viewingOrder.tracking_number || "").trim() || undefined }),
      });
      setViewingOrder(updated);
      await loadOrders();
      toast.success("Shipping label created");
    } catch (error: any) {
      toast.error(error?.message || "Failed to create shipping label");
    } finally {
      setShippingBusy(null);
    }
  };

  const handleRefreshTracking = async () => {
    if (!viewingOrder) return;

    setShippingBusy("track");
    try {
      const updated = await apiFetch(`/admin/orders/${viewingOrder.id}/shipping/track`, {
        method: "POST",
        body: JSON.stringify({ tracking_number: (viewingOrder.tracking_number || "").trim() || undefined }),
      });
      setViewingOrder(updated);
      await loadOrders();
      toast.success("Tracking updated");
    } catch (error: any) {
      toast.error(error?.message || "Failed to refresh tracking");
    } finally {
      setShippingBusy(null);
    }
  };

  const handleSaveTracking = async () => {
    if (!viewingOrder) return;

    setSavingTracking(true);
    try {
      const updated = await apiFetch(`/admin/orders/${viewingOrder.id}`, {
        method: "PUT",
        body: JSON.stringify({ tracking_number: (viewingOrder.tracking_number || "").trim() }),
      });
      setViewingOrder(updated);
      await loadOrders();
      toast.success("Tracking number saved");
    } catch {
      toast.error("Failed to save tracking number");
    } finally {
      setSavingTracking(false);
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.order_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                    <div className="text-sm text-gray-500">{order.customer_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">£{order.total}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === "delivered" ? "bg-green-100 text-green-800" : order.status === "shipped" ? "bg-blue-100 text-blue-800" : order.status === "cancelled" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.payment_status === "paid" ? "bg-green-100 text-green-800" : order.payment_status === "refunded" ? "bg-slate-100 text-slate-700" : order.payment_status === "failed" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>
                      {order.payment_status || "pending"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => openOrder(order.id)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {viewingOrder && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mt-20 md:mt-0 max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10 flex-shrink-0">
              <h2 className="text-xl font-bold font-sans text-[#10275c]">Order #{viewingOrder.order_number}</h2>
              <button onClick={() => setViewingOrder(null)} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-8">
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
                      <dt className="text-sm font-medium text-gray-500">Shipping Address</dt>
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
                        onChange={(e) => updateOrder(viewingOrder.id, { status: e.target.value }, "Order status updated", "Failed to update status")}
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
                        onChange={(e) => updateOrder(viewingOrder.id, { payment_status: e.target.value }, "Payment status updated", "Failed to update payment status")}
                        className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm border"
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <section className="rounded-xl border border-[#cad4e4] bg-[#f8fafc] p-6 space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[#10275c] flex items-center gap-2">
                      <Truck className="w-5 h-5 text-[#eb5c10]" />
                      Shipping Integration
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Provider: <strong>{viewingOrder.shipping_provider || "easypost"}</strong>
                      {viewingOrder.shipping_metadata?.mode ? ` (${viewingOrder.shipping_metadata.mode})` : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleCreateShippingLabel}
                      disabled={shippingBusy !== null}
                      className="inline-flex items-center gap-2 rounded-md bg-[#eb5c10] px-4 py-2 text-sm font-semibold text-white hover:bg-[#cf4d08] disabled:opacity-60"
                    >
                      <Truck className="w-4 h-4" />
                      {viewingOrder.shipping_label_url ? "Regenerate Label" : "Create Label"}
                    </button>

                    <button
                      type="button"
                      onClick={handleRefreshTracking}
                      disabled={shippingBusy !== null}
                      className="inline-flex items-center gap-2 rounded-md border border-[#cad4e4] bg-white px-4 py-2 text-sm font-semibold text-[#10275c] hover:bg-[#f4f7f9] disabled:opacity-60"
                    >
                      <RefreshCcw className={`w-4 h-4 ${shippingBusy === "track" ? "animate-spin" : ""}`} />
                      Refresh Tracking
                    </button>

                    {viewingOrder.shipping_label_url && (
                      <a
                        href={`${API_URL}/admin/orders/${viewingOrder.id}/shipping/label/download`}
                        download
                        className="inline-flex items-center gap-2 rounded-md border border-[#cad4e4] bg-white px-4 py-2 text-sm font-semibold text-[#10275c] hover:bg-[#f4f7f9]"
                      >
                        <Download className="w-4 h-4" />
                        Download Label
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="rounded-lg border border-white bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#6e7a92]">Carrier</p>
                    <p className="mt-2 text-sm font-semibold text-[#10275c]">{viewingOrder.shipping_carrier || "-"}</p>
                  </div>
                  <div className="rounded-lg border border-white bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#6e7a92]">Service</p>
                    <p className="mt-2 text-sm font-semibold text-[#10275c]">{viewingOrder.shipping_service || "-"}</p>
                  </div>
                  <div className="rounded-lg border border-white bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#6e7a92]">Shipping Status</p>
                    <p className="mt-2 text-sm font-semibold text-[#10275c]">{viewingOrder.shipping_status || "-"}</p>
                  </div>
                  <div className="rounded-lg border border-white bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#6e7a92]">Shipment ID</p>
                    <p className="mt-2 text-sm font-semibold text-[#10275c] break-all">{viewingOrder.shipping_shipment_id || "-"}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={viewingOrder.tracking_number ?? ""}
                      placeholder="e.g. EZ2000000002 or real carrier tracking"
                      onChange={(e) => setViewingOrder({ ...viewingOrder, tracking_number: e.target.value })}
                      className="block w-full rounded-md border-gray-300 py-2 px-3 text-sm border focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveTracking}
                      disabled={savingTracking}
                      className="inline-flex items-center justify-center rounded-md border border-[#cad4e4] bg-white px-4 py-2 text-sm font-semibold text-[#10275c] hover:bg-[#f4f7f9] disabled:opacity-60"
                    >
                      Save Tracking
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-[#6e7a92]">
                    EasyPost test tracking codes: {MOCK_TRACKING_CODES.join(", ")}.
                  </p>
                  {viewingOrder.shipping_metadata?.tracking_detail && (
                    <p className="mt-2 text-sm text-[#10275c]">
                      Latest carrier detail: {viewingOrder.shipping_metadata.tracking_detail}
                    </p>
                  )}
                </div>
              </section>

              <div>
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
