<?php

namespace App\Http\Middleware;

use App\Models\AdminUser;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof AdminUser) {
            abort(403, 'Admin access is required.');
        }

        if ($user->currentAccessToken() && ! $user->tokenCan('admin')) {
            abort(403, 'Admin access is required.');
        }

        return $next($request);
    }
}
