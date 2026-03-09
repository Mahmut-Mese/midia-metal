<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class UseAdminTokenCookie
{
    public function handle(Request $request, Closure $next): Response
    {
        if (
            !$request->bearerToken()
            && $request->is('api/admin/*')
            && $request->cookie('admin_token')
        ) {
            $request->headers->set('Authorization', 'Bearer ' . urldecode((string) $request->cookie('admin_token')));
        }

        return $next($request);
    }
}
