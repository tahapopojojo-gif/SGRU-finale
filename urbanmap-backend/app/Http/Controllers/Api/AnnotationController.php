<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAnnotationRequest;
use App\Http\Requests\UpdateAnnotationRequest;
use App\Models\AnnotationUrbaniste;
use App\Models\User;
use App\Models\Zone;

class AnnotationController extends Controller
{
    public function byZone(Zone $zone)
    {
        return response()->json([
            'data' => AnnotationUrbaniste::where('zone_id', $zone->id)->latest()->get(),
        ]);
    }

    public function byUrbaniste(User $urbaniste)
    {
        return response()->json([
            'data' => AnnotationUrbaniste::where('urbaniste_id', $urbaniste->id)->latest()->get(),
        ]);
    }

    public function store(StoreAnnotationRequest $request)
    {
        $annotation = AnnotationUrbaniste::create($request->validated());

        return response()->json(['data' => $annotation], 201);
    }

    public function update(UpdateAnnotationRequest $request, AnnotationUrbaniste $annotation)
    {
        $annotation->update($request->validated());

        return response()->json(['data' => $annotation->fresh()]);
    }

    public function destroy(AnnotationUrbaniste $annotation)
    {
        $annotation->delete();

        return response()->json(['message' => 'Annotation supprimée']);
    }
}
