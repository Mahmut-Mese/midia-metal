<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Faq;
use App\Services\FrontendContentDeployTrigger;
use Illuminate\Http\Request;

class FaqController extends Controller
{
    public function index()
    {
        return response()->json(Faq::orderBy('order')->get());
    }

    public function store(Request $request, FrontendContentDeployTrigger $frontendContentDeployTrigger)
    {
        $validated = $request->validate([
            'question' => 'required|string|max:255',
            'answer' => 'required|string',
            'order' => 'integer',
            'active' => 'boolean',
        ]);

        $faq = Faq::create($validated);

        if ($faq->active) {
            $frontendContentDeployTrigger->trigger('faq.created', [
                'id' => $faq->id,
            ]);
        }

        return response()->json($faq, 201);
    }

    public function show(Faq $faq)
    {
        return response()->json($faq);
    }

    public function update(Request $request, Faq $faq, FrontendContentDeployTrigger $frontendContentDeployTrigger)
    {
        $wasPublic = $faq->active;
        $validated = $request->validate([
            'question' => 'required|string|max:255',
            'answer' => 'required|string',
            'order' => 'integer',
            'active' => 'boolean',
        ]);

        $faq->update($validated);

        if ($wasPublic || $faq->active) {
            $frontendContentDeployTrigger->trigger('faq.updated', [
                'id' => $faq->id,
            ]);
        }

        return response()->json($faq);
    }

    public function destroy(Faq $faq, FrontendContentDeployTrigger $frontendContentDeployTrigger)
    {
        $wasPublic = $faq->active;
        $faqId = $faq->id;
        $faq->delete();

        if ($wasPublic) {
            $frontendContentDeployTrigger->trigger('faq.deleted', [
                'id' => $faqId,
            ]);
        }

        return response()->json(['message' => 'FAQ deleted']);
    }
}
