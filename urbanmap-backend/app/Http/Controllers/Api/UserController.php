<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Validation\Rule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use App\Mail\GroupEmailMailable;

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

    public function sendGroupEmail(Request $request)
    {
        $data = $request->validate([
            'group' => ['required', 'string', 'in:citoyen,urbaniste,admin,all'],
            'subject' => ['required', 'string'],
            'message' => ['required', 'string'],
        ]);

        $query = User::query();

        if ($data['group'] === 'all') {
            $query->where('statut', 'active');
        } else {
            $query->where('role', $data['group']);
        }

        $users = $query->get();

        foreach ($users as $user) {
            Mail::to($user->email)->queue(new GroupEmailMailable($data['subject'], $data['message'], $user->nom));
        }

        return response()->json([
            'success' => true,
            'sent_to' => $users->count()
        ]);
    }
}
