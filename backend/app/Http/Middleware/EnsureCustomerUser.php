<?php

namespace App\Http\Middleware;

use App\Models\Customer;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCustomerUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof Customer) {
            abort(403, 'Customer access is required.');
        }

        if ($user->currentAccessToken() && ! $user->tokenCan('customer')) {
            abort(403, 'Customer access is required.');
        }

        return $next($request);
    }
}
