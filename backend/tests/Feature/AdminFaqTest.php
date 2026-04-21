<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\Faq;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AdminFaqTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();

        Config::set('services.frontend_deploy', [
            'enabled' => true,
            'token' => 'github-token',
            'repository' => 'Mahmut-Mese/midia-metal',
            'workflow' => 'frontend-content-deploy.yml',
            'ref' => 'staging',
            'debounce_seconds' => 0,
            'api_base' => 'https://api.github.com',
        ]);
    }

    private function authenticatedAdmin(): AdminUser
    {
        $admin = AdminUser::factory()->create();
        $this->actingAs($admin, 'sanctum');

        return $admin;
    }

    public function test_creating_an_active_faq_triggers_a_frontend_content_deploy(): void
    {
        $this->authenticatedAdmin();
        Http::fake([
            'https://api.github.com/*' => Http::response('', 204),
        ]);

        $response = $this->postJson('/api/admin/faqs', [
            'question' => 'Do you install commercial canopies?',
            'answer' => 'Yes, subject to project scope and scheduling.',
            'order' => 1,
            'active' => true,
        ]);

        $response->assertCreated();
        Http::assertSent(function ($request) use ($response) {
            $context = json_decode($request['inputs']['resource_context'], true);

            return $request['inputs']['trigger_reason'] === 'faq.created'
                && $context['id'] === $response->json('id');
        });
    }

    public function test_updating_a_public_faq_triggers_a_frontend_content_deploy(): void
    {
        $this->authenticatedAdmin();
        Http::fake([
            'https://api.github.com/*' => Http::response('', 204),
        ]);

        $faq = Faq::create([
            'question' => 'Old question',
            'answer' => 'Old answer',
            'order' => 1,
            'active' => true,
        ]);

        $response = $this->putJson("/api/admin/faqs/{$faq->id}", [
            'question' => 'Updated question',
            'answer' => 'Updated answer',
            'order' => 2,
            'active' => true,
        ]);

        $response->assertOk();
        Http::assertSent(function ($request) use ($faq) {
            $context = json_decode($request['inputs']['resource_context'], true);

            return $request['inputs']['trigger_reason'] === 'faq.updated'
                && $context['id'] === $faq->id;
        });
    }

    public function test_deleting_a_public_faq_triggers_a_frontend_content_deploy(): void
    {
        $this->authenticatedAdmin();
        Http::fake([
            'https://api.github.com/*' => Http::response('', 204),
        ]);

        $faq = Faq::create([
            'question' => 'Question',
            'answer' => 'Answer',
            'order' => 1,
            'active' => true,
        ]);

        $response = $this->deleteJson("/api/admin/faqs/{$faq->id}");

        $response->assertOk();
        Http::assertSent(function ($request) use ($faq) {
            $context = json_decode($request['inputs']['resource_context'], true);

            return $request['inputs']['trigger_reason'] === 'faq.deleted'
                && $context['id'] === $faq->id;
        });
    }
}
