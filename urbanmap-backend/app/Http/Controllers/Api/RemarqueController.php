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

    public function myRemarks()
    {
        $user = request()->user();
        $query = Remarque::with(['user', 'zone'])
            ->where('user_id', $user->id)
            ->latest();

        return response()->json(['data' => $query->get()]);
    }

    public function store(StoreRemarqueRequest $request)
    {
        try {
            $payload = $request->validated();
            $user = $request->user();
            $payload['user_id'] = $user->id;

            // Ensure both fields are set and synced
            if (empty($payload['building_type']) && !empty($payload['categorie'])) {
                $payload['building_type'] = $payload['categorie'];
            }
            if (empty($payload['categorie']) && !empty($payload['building_type'])) {
                $payload['categorie'] = $payload['building_type'];
            }

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

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'errors' => $e->errors(),
            ], 422);

        } catch (\Exception $e) {
            Log::error('Remarque store failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function update(UpdateRemarqueRequest $request, Remarque $remarque)
    {
        $payload = $request->validated();
        if (isset($payload['categorie']) || isset($payload['building_type'])) {
            $val = $payload['categorie'] ?? $payload['building_type'] ?? $remarque->categorie ?? $remarque->building_type;
            $payload['categorie'] = $val;
            $payload['building_type'] = $val;
        }
        $remarque->update($payload);

        return response()->json(['data' => $remarque->fresh(['user', 'zone'])]);
    }
}
