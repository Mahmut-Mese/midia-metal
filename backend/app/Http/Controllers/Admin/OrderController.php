<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $query = Order::with('items')->withCount([
            'customerRequests',
            'customerRequests as unread_customer_requests_count' => fn ($customerRequestsQuery) => $customerRequestsQuery->where('read', false),
        ]);

        if ($request->search) {
            $query->where('order_number', 'like', "%{$request->search}%")
                ->orWhere('customer_name', 'like', "%{$request->search}%")
                ->orWhere('customer_email', 'like', "%{$request->search}%");
        }
        if ($request->status) {
            $query->where('status', $request->status);
        }
        return response()->json($query->latest()->paginate(15));
    }

    public function show(Order $order)
    {
        return response()->json($order->load(['items', 'customerRequests']));
    }

    public function update(Request $request, Order $order)
    {
        $validated = $request->validate([
            'status' => 'nullable|in:pending,processing,shipped,delivered,cancelled',
            'payment_status' => 'nullable|in:pending,paid,failed,refund_pending,refunded,refund_failed',
            'notes' => 'nullable|string',
            'tracking_number' => 'nullable|string|max:255',
        ]);
        $order->update($validated);
        return response()->json($order->load(['items', 'customerRequests']));
    }

    public function destroy(Order $order)
    {
        $order->delete();
        return response()->json(['message' => 'Order deleted']);
    }
}
