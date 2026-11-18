<?php

namespace Tests\Feature;

use App\Services\StripeGateway;
use Stripe\ApiRequestor;
use Stripe\Exception\AuthenticationException;
use Stripe\HttpClient\ClientInterface;
use Tests\TestCase;

class StripeCustomerLookupTest extends TestCase
{
    public function test_customer_lookup_distinguishes_missing_deleted_and_existing_customers(): void
    {
        config(['services.stripe.secret' => 'sk_test_lookup_fixture']);
        foreach ([
            [200, ['id' => 'cus_test', 'object' => 'customer'], true],
            [200, ['id' => 'cus_test', 'object' => 'customer', 'deleted' => true], false],
            [404, ['error' => ['type' => 'invalid_request_error', 'code' => 'resource_missing', 'param' => 'id', 'message' => 'No such customer']], false],
        ] as [$status, $body, $exists]) {
            $http = \Mockery::mock(ClientInterface::class);
            $http->shouldReceive('request')->once()->andReturn([json_encode($body), $status, []]);
            ApiRequestor::setHttpClient($http);
            try {
                $this->assertSame($exists, (new StripeGateway)->customerExists('cus_test'));
            } finally {
                ApiRequestor::setHttpClient(null);
            }
        }
    }

    public function test_invalid_api_credentials_are_not_treated_as_a_missing_customer(): void
    {
        config(['services.stripe.secret' => 'sk_test_lookup_fixture']);
        $http = \Mockery::mock(ClientInterface::class);
        $http->shouldReceive('request')->once()->andReturn([
            json_encode(['error' => ['type' => 'invalid_request_error', 'message' => 'Invalid API key']]), 401, [],
        ]);
        ApiRequestor::setHttpClient($http);
        try {
            $this->expectException(AuthenticationException::class);
            (new StripeGateway)->customerExists('cus_test');
        } finally {
            ApiRequestor::setHttpClient(null);
        }
    }
}
