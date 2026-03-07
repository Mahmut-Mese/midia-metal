<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class CustomerOrderController extends Controller
{
    public function index(Request $request)
    {
        $orders = Order::with('items')
            ->where('customer_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($orders);
    }

    public function show(Request $request, $id)
    {
        $order = Order::with('items')
            ->where('customer_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();

        return response()->json($order);
    }

    public function invoice(Request $request, $id)
    {
        $order = Order::with('items')
            ->where('customer_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();

        // Build a simple HTML invoice and return it
        $html = view('invoice', compact('order'))->render();

        return response($html)
            ->header('Content-Type', 'text/html')
            ->header('Content-Disposition', "inline; filename=\"invoice-{$order->order_number}.html\"");
    }
}
