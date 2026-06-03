<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRemarqueRequest;
use App\Http\Requests\UpdateRemarqueRequest;
use App\Models\Remarque;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use App\Mail\RemarqueConfirmationMailable;

class RemarqueController extends Controller
{
    public function index()
    {
        $query = Remarque::with(['user', 'zone'])->latest();

        if ($statut = request('statut')) {
            $query->where('statut', $statut);
        }

        if ($zoneId = request('zone_id')) {
            $query->where('zone_id', $zoneId);
        }

        if ($categorie = request('categorie')) {
            $query->where('categorie', $categorie);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(StoreRemarqueRequest $request)
    {
        $payload = $request->validated();
        $user = $request->user();
        $payload['user_id'] = $user->id;

        if ($request->hasFile('photo')) {
            $payload['photo_path'] = $request->file('photo')->store('remarques', 'public');
        }

        $remarque = Remarque::create($payload);
        $remarque->load('zone');

        try {
            Mail::to($user->email)->queue(new RemarqueConfirmationMailable($remarque, $user));
        } catch (\Exception $e) {
            Log::error("Failed to queue remark confirmation email: " . $e->getMessage());
        }

        return response()->json(['data' => $remarque->load(['user', 'zone'])], 201);
    }

    public function update(UpdateRemarqueRequest $request, Remarque $remarque)
    {
        $remarque->update($request->validated());

        return response()->json(['data' => $remarque->fresh(['user', 'zone'])]);
    }
}
