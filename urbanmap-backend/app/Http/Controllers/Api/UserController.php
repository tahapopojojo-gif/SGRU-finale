<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index()
    {
        return response()->json(['data' => User::latest()->get()]);
    }

    public function pending()
    {
        return response()->json(['data' => User::where('statut', 'pending')->latest()->get()]);
    }

    public function update(User $user)
    {
        $payload = request()->validate([
            'statut' => ['sometimes', Rule::in(['pending', 'active', 'rejected'])],
            'role' => ['sometimes', Rule::in(['super_admin', 'admin', 'urbaniste', 'citoyen'])],
            'company_name' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
        ]);

        $user->update($payload);

        return response()->json(['data' => $user->fresh()]);
    }
}
