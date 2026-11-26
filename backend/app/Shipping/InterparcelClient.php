<?php

namespace App\Shipping;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class InterparcelClient
{
    public const IP_NOT_AUTHORISED = 403002;

    private const BASE_URL = 'https://api.interparcel.com';

    public function json(string $method, string $path, int $version, array $data = []): array
    {
        $response = $this->request($method, $path, $version, $data);
        $body = $response->json();

        if (! $response->successful() || ! is_array($body) || ($body['status'] ?? null) !== 0) {
            // Provider errors can echo names, addresses or credentials. Do not relay them to customers/logs.
            if ($response->status() === 403 && is_array($body)
                && (string) ($body['errorCode'] ?? '') === (string) self::IP_NOT_AUTHORISED) {
                throw new ShippingException('Delivery quotes are temporarily unavailable. Please try again later.', self::IP_NOT_AUTHORISED);
            }
            throw new ShippingException($response->status() === 401 || $response->status() === 403
                ? 'Interparcel rejected the API credentials. Check that API access is enabled for this account.'
                : 'Interparcel could not complete this request. Check the shipment details and account in Interparcel before retrying.');
        }

        return $body;
    }

    public function label(string $orderId): string
    {
        if (! ctype_digit($orderId)) {
            throw new ShippingException('Invalid Interparcel order reference.');
        }
        $response = $this->request('GET', '/orders/'.$orderId.'/label', 1, ['format' => 'A4'], 'application/pdf');
        if ($response->status() === 202) {
            throw new ShippingException('Interparcel is still preparing this label. Refresh tracking and try again shortly.');
        }
        if (! $response->ok() || ! str_starts_with($response->body(), '%PDF-')) {
            throw new ShippingException('Interparcel has not returned a PDF label. Check the booking in Interparcel.');
        }

        return $response->body();
    }

    private function request(string $method, string $path, int $version, array $data, string $accept = 'application/json'): Response
    {
        if (config('services.shipping.mock')) {
            throw new ShippingException('Interparcel has no configured sandbox. Set SHIPPING_MOCK=false to request real quotes; bookings remain separately disabled.');
        }
        $key = trim((string) config('services.interparcel.api_key'));
        if ($key === '') {
            throw new ShippingException('Interparcel API access is not configured. Add INTERPARCEL_API_KEY on the server.');
        }

        try {
            // Fixed HTTPS destination, no redirects, no automatic retry of a chargeable request.
            return Http::withHeaders([
                'X-Interparcel-Auth' => $key,
                'X-Interparcel-API-Version' => (string) $version,
            ])->accept($accept)->asJson()->connectTimeout(10)->timeout(40)
                ->withOptions(['allow_redirects' => false])
                ->send($method, self::BASE_URL.$path, [strtoupper($method) === 'GET' ? 'query' : 'json' => $data]);
        } catch (ConnectionException) {
            throw new ShippingException($path === '/orders'
                ? 'Interparcel did not respond. A booking may already have been accepted; retry this same order to recover it safely.'
                : 'Interparcel did not respond. Please try again shortly.');
        }
    }
}
