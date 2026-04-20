<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class FrontendContentDeployTrigger
{
    public function trigger(string $reason, array $context = []): bool
    {
        if (! config('services.frontend_deploy.enabled')) {
            return false;
        }

        $token = trim((string) config('services.frontend_deploy.token'));
        $repository = trim((string) config('services.frontend_deploy.repository'));
        $workflow = trim((string) config('services.frontend_deploy.workflow'));
        $ref = trim((string) config('services.frontend_deploy.ref'));

        if ($token === '' || $repository === '' || $workflow === '' || $ref === '') {
            Log::warning('Frontend content deploy trigger is enabled but missing required GitHub configuration.');

            return false;
        }

        $debounceSeconds = max(0, (int) config('services.frontend_deploy.debounce_seconds', 60));
        $debounceKey = sprintf('frontend-content-deploy:%s:%s', $workflow, $ref);

        if ($debounceSeconds > 0 && ! Cache::add($debounceKey, now()->timestamp, now()->addSeconds($debounceSeconds))) {
            return false;
        }

        $endpoint = rtrim((string) config('services.frontend_deploy.api_base', 'https://api.github.com'), '/')."/repos/{$repository}/actions/workflows/{$workflow}/dispatches";

        try {
            $response = Http::acceptJson()
                ->withToken($token)
                ->withHeaders([
                    'Accept' => 'application/vnd.github+json',
                    'User-Agent' => config('app.name', 'Midia Metal'),
                ])
                ->asJson()
                ->timeout(15)
                ->retry(2, 1000)
                ->post($endpoint, [
                    'ref' => $ref,
                    'inputs' => [
                        'trigger_reason' => $reason,
                        'resource_context' => json_encode($context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                    ],
                ]);
        } catch (Throwable $exception) {
            if ($debounceSeconds > 0) {
                Cache::forget($debounceKey);
            }

            Log::warning('Failed to trigger frontend content deploy workflow.', [
                'reason' => $reason,
                'context' => $context,
                'error' => $exception->getMessage(),
            ]);

            return false;
        }

        if ($response->failed()) {
            if ($debounceSeconds > 0) {
                Cache::forget($debounceKey);
            }

            Log::warning('GitHub rejected the frontend content deploy workflow dispatch.', [
                'reason' => $reason,
                'context' => $context,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return false;
        }

        return true;
    }
}
