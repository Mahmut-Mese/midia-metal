<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\RefundStripePayment;
use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    public function index(Request $request)
    {
        $query = ContactMessage::query()->with('order:id,order_number');

        if ($request->search) {
            $search = $request->search;
            $query->where(function ($innerQuery) use ($search) {
                $innerQuery->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('subject', 'like', "%{$search}%")
                    ->orWhereHas('order', function ($orderQuery) use ($search) {
                        $orderQuery->where('order_number', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('message_type') && $request->message_type !== 'all') {
            $query->where('message_type', $request->message_type);
        }

        if ($request->unread_only) {
            $query->where('read', false);
        }

        return response()->json($query->latest()->paginate(15));
    }

    public function show(ContactMessage $contactMessage)
    {
        $contactMessage->update(['read' => true]);

        return response()->json($contactMessage->load('order:id,order_number'));
    }

    public function markRead(ContactMessage $contactMessage)
    {
        $contactMessage->update(['read' => true]);

        return response()->json($contactMessage->load('order:id,order_number'));
    }

    public function destroy(ContactMessage $contactMessage)
    {
        $contactMessage->delete();

        return response()->json(['message' => 'Message deleted']);
    }

    public function updateRequestStatus(Request $request, ContactMessage $contactMessage): JsonResponse
    {
        $validated = $request->validate([
            'request_status' => 'required|in:pending,approved,rejected',
        ]);

        if ($contactMessage->message_type !== 'order_request') {
            return response()->json(['message' => 'Only order requests can be reviewed.'], 422);
        }

        $order = $contactMessage->order;
        if (
            $order &&
            $validated['request_status'] === 'approved' &&
            $contactMessage->request_type === 'cancel_refund' &&
            $order->payment_status === 'paid' &&
            ! $order->stripe_payment_intent_id
        ) {
            return response()->json([
                'message' => 'This paid order has no Stripe payment attached, so an automatic refund cannot be started.',
            ], 422);
        }

        $contactMessage->update([
            'request_status' => $validated['request_status'],
            'read' => true,
            'reviewed_at' => now(),
        ]);

        if ($order && $validated['request_status'] === 'approved') {
            $order->status = 'cancelled';

            if ($contactMessage->request_type === 'cancel_refund' && $order->payment_status === 'paid') {
                $order->payment_status = 'refund_pending';
            }

            $order->save();

            if (
                $contactMessage->request_type === 'cancel_refund' &&
                $order->payment_status === 'refund_pending'
            ) {
                RefundStripePayment::dispatchAfterResponse($contactMessage->id);
            }
        }

        return response()->json($contactMessage->load('order:id,order_number,status,payment_status'));
    }
}
