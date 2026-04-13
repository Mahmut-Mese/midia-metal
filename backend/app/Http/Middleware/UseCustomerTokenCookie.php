<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class UseCustomerTokenCookie
{
    public function handle(Request $request, Closure $next): Response
    {
        if (
            ! $request->bearerToken()
            && $request->is('api/v1/*')
            && $request->cookie('customer_token')
        ) {
            $request->headers->set('Authorization', 'Bearer '.urldecode((string) $request->cookie('customer_token')));
        }

        return $next($request);
    }
}
