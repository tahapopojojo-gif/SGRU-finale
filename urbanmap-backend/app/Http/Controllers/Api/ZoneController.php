<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreZoneRequest;
use App\Mail\ZoneCreatedMailable;
use App\Models\Remarque;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

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
        $payload = $request->validated();
        $remarkIds = $payload['remark_ids'] ?? [];
        unset($payload['remark_ids']);

        $zone = Zone::create($payload);

        if ($remarkIds !== []) {
            Remarque::whereIn('id', $remarkIds)->update(['zone_id' => $zone->id]);
        }

        // Notify all admins and urbanistes
        $admins = User::whereIn('role', ['super_admin', 'admin', 'urbaniste'])
            ->where('statut', 'active')
            ->get();

        $notified = 0;
        foreach ($admins as $admin) {
            try {
                Mail::to($admin->email)->queue(new ZoneCreatedMailable($zone, $admin));
                $notified++;
            } catch (\Exception $e) {
                Log::error("Failed to queue zone notification to {$admin->email}: " . $e->getMessage());
            }
        }

        return response()->json([
            'data' => $zone->loadCount('remarques'),
            'notified_admins' => $notified,
        ], 201);
    }

    public function update(StoreZoneRequest $request, Zone $zone)
    {
        $payload = $request->validated();
        unset($payload['remark_ids']);

        $zone->update($payload);

        return response()->json(['data' => $zone->fresh()]);
    }

    public function destroy(Zone $zone)
    {
        $zone->delete();

        return response()->json(['message' => 'Zone supprimée']);
    }
}
