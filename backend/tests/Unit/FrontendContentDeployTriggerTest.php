<?php

namespace Tests\Unit;

use App\Services\FrontendContentDeployTrigger;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FrontendContentDeployTriggerTest extends TestCase
{
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
            'debounce_seconds' => 60,
            'api_base' => 'https://api.github.com',
        ]);
    }

    public function test_it_dispatches_the_frontend_content_workflow(): void
    {
        Http::fake([
            'https://api.github.com/*' => Http::response('', 204),
        ]);

        $dispatched = app(FrontendContentDeployTrigger::class)->trigger('service.updated', [
            'id' => 7,
            'slug' => 'ventilation-systems',
        ]);

        $this->assertTrue($dispatched);

        Http::assertSent(function ($request) {
            $context = json_decode($request['inputs']['resource_context'], true);

            return $request->url() === 'https://api.github.com/repos/Mahmut-Mese/midia-metal/actions/workflows/frontend-content-deploy.yml/dispatches'
                && $request['ref'] === 'staging'
                && $request['inputs']['trigger_reason'] === 'service.updated'
                && $context['slug'] === 'ventilation-systems';
        });
    }

    public function test_it_skips_dispatch_when_trigger_is_disabled(): void
    {
        Config::set('services.frontend_deploy.enabled', false);

        Http::fake();

        $dispatched = app(FrontendContentDeployTrigger::class)->trigger('blog.updated');

        $this->assertFalse($dispatched);
        Http::assertNothingSent();
    }

    public function test_it_debounces_duplicate_dispatches(): void
    {
        Http::fake([
            'https://api.github.com/*' => Http::response('', 204),
        ]);

        $service = app(FrontendContentDeployTrigger::class);

        $this->assertTrue($service->trigger('portfolio.updated'));
        $this->assertFalse($service->trigger('portfolio.updated'));

        Http::assertSentCount(1);
    }

    public function test_it_clears_the_debounce_lock_when_dispatch_fails(): void
    {
        Http::fake([
            'https://api.github.com/*' => Http::sequence()
                ->push(['message' => 'server error'], 500)
                ->push(['message' => 'server error'], 500)
                ->push(['message' => 'server error'], 500)
                ->push('', 204),
        ]);

        $service = app(FrontendContentDeployTrigger::class);

        $this->assertFalse($service->trigger('blog.updated'));
        $this->assertTrue($service->trigger('blog.updated'));

        Http::assertSentCount(4);
    }
}
