<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRemarqueRequest;
use App\Http\Requests\UpdateRemarqueRequest;
use App\Models\Remarque;

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
        $payload['user_id'] = request()->user()->id;

        if ($request->hasFile('photo')) {
            $payload['photo_path'] = $request->file('photo')->store('remarques', 'public');
        }

        $remarque = Remarque::create($payload);

        return response()->json(['data' => $remarque->load(['user', 'zone'])], 201);
    }

    public function update(UpdateRemarqueRequest $request, Remarque $remarque)
    {
        $remarque->update($request->validated());

        return response()->json(['data' => $remarque->fresh(['user', 'zone'])]);
    }
}
