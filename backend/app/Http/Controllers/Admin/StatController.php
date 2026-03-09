<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Support\Facades\DB;

class StatController extends Controller
{
    public function salesOverview()
    {
        $sales = Order::select(
            DB::raw('SUM(total) as revenue'),
            DB::raw('COUNT(*) as orders'),
            DB::raw("DATE_FORMAT(created_at, '%Y-%m') as month")
        )
            ->groupBy('month')
            ->orderBy('month', 'desc')
            ->take(12)
            ->get();

        return response()->json($sales);
    }

    public function topProducts()
    {
        $products = OrderItem::select(
            'product_name',
            DB::raw("SUM(CAST(REPLACE(REPLACE(product_price, '£', ''), ',', '') AS DECIMAL(10,2)) * quantity) as total_revenue"),
            DB::raw('SUM(quantity) as total_sold')
        )
            ->groupBy('product_name')
            ->orderBy('total_sold', 'desc')
            ->take(5)
            ->get();

        return response()->json($products);
    }
}
