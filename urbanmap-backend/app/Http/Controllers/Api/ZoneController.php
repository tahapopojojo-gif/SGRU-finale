<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreZoneRequest;
use App\Models\Zone;

class ZoneController extends Controller
{
    public function index()
    {
        $ville = request('ville');
        $query = Zone::query()->latest();

        if ($ville) {
            $query->whereRaw('LOWER(ville) = ?', [mb_strtolower($ville)]);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(StoreZoneRequest $request)
    {
        $zone = Zone::create($request->validated());

        return response()->json(['data' => $zone], 201);
    }

    public function update(StoreZoneRequest $request, Zone $zone)
    {
        $zone->update($request->validated());

        return response()->json(['data' => $zone->fresh()]);
    }

    public function destroy(Zone $zone)
    {
        $zone->delete();

        return response()->json(['message' => 'Zone supprimée']);
    }
}
