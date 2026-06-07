<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Validation\Rule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use App\Mail\GroupEmailMailable;
use Illuminate\Support\Facades\Log;

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
            'group'   => ['required', 'string', 'in:citoyen,urbaniste,admin,all,zone'],
            'subject' => ['required', 'string'],
            'message' => ['required', 'string'],
            'zone_id' => ['nullable', 'integer', 'exists:zones,id'],
        ]);

        if ($data['group'] === 'zone') {
            // Find distinct citizens who submitted at least one remarque in this zone
            $userIds = \App\Models\Remarque::where('zone_id', $data['zone_id'])
                ->whereNotNull('user_id')
                ->pluck('user_id')
                ->unique();

            $users = User::whereIn('id', $userIds)
                ->where('role', 'citoyen')
                ->where('statut', 'active')
                ->get();
        } else {
            $query = User::query();

            if ($data['group'] === 'all') {
                $query->where('statut', 'active');
            } else {
                $query->where('role', $data['group']);
            }

            $users = $query->get();
        }

        $queued = 0;
        foreach ($users as $user) {
            try {
                Mail::to($user->email)->queue(new GroupEmailMailable($data['subject'], $data['message'], $user->nom));
                $queued++;
            } catch (\Exception $e) {
                Log::error("Failed to queue group email to {$user->email}: " . $e->getMessage());
            }
        }

        return response()->json([
            'success'  => true,
            'sent_to'  => $queued,
        ]);
    }
}
