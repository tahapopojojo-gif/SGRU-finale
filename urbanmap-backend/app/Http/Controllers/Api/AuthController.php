<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\User;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(RegisterRequest $request)
    {
        $payload = $request->validated();
        $role = $payload['role'];
        $status = in_array($role, ['admin', 'urbaniste'], true) ? 'pending' : 'active';

        $user = User::create([
            'nom' => $payload['nom'],
            'email' => $payload['email'],
            'password' => Hash::make($payload['password']),
            'role' => $role,
            'statut' => $status,
            'company_name' => $payload['company_name'] ?? null,
            'city' => $payload['city'] ?? null,
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'data' => [
                'user' => $user,
                'token' => $token,
            ],
        ], 201);
    }

    public function login(LoginRequest $request)
    {
        $payload = $request->validated();
        $user = User::where('email', $payload['email'])->first();

        if (! $user || ! Hash::check($payload['password'], $user->password)) {
            return response()->json(['message' => 'Identifiants invalides'], 401);
        }

        if ($user->statut === 'pending') {
            return response()->json(['message' => 'Compte en attente de validation'], 403);
        }

        if ($user->statut === 'rejected') {
            return response()->json(['message' => 'Compte refusé'], 403);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'data' => [
                'user' => $user,
                'token' => $token,
            ],
        ]);
    }

    public function logout()
    {
        request()->user()?->currentAccessToken()?->delete();

        return response()->json(['message' => 'Déconnexion réussie']);
    }

    public function me()
    {
        return response()->json(['data' => request()->user()]);
    }
}
