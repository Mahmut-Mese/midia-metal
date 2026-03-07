<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    public function index(Request $request)
    {
        $query = ContactMessage::query();
        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%")
                ->orWhere('email', 'like', "%{$request->search}%")
                ->orWhere('subject', 'like', "%{$request->search}%");
        }
        if ($request->unread_only) {
            $query->where('read', false);
        }
        return response()->json($query->latest()->paginate(15));
    }

    public function show(ContactMessage $contactMessage)
    {
        $contactMessage->update(['read' => true]);
        return response()->json($contactMessage);
    }

    public function markRead(ContactMessage $contactMessage)
    {
        $contactMessage->update(['read' => true]);
        return response()->json($contactMessage);
    }

    public function destroy(ContactMessage $contactMessage)
    {
        $contactMessage->delete();
        return response()->json(['message' => 'Message deleted']);
    }
}
