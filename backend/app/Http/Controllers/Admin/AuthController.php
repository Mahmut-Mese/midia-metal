<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Cookie;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = AdminUser::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user->tokens()->delete();
        $token = $user->createToken('admin-token', ['admin'], now()->addHours(8))->plainTextToken;

        return response()->json([
            'user' => $user->only(['id', 'name', 'email', 'role']),
        ])->cookie($this->adminTokenCookie($request, $token));
    }

    public function logout(Request $request)
    {
        if ($request->user()?->currentAccessToken()) {
            $request->user()->currentAccessToken()->delete();
        }

        return response()->json(['message' => 'Logged out successfully'])
            ->withoutCookie('admin_token', '/');
    }

    public function me(Request $request)
    {
        return response()->json($request->user()->only(['id', 'name', 'email', 'role']));
    }

    private function adminTokenCookie(Request $request, string $token): Cookie
    {
        return cookie(
            'admin_token',
            $token,
            60 * 8,
            '/',
            null,
            $request->isSecure(),
            true,
            false,
            'lax'
        );
    }
}
