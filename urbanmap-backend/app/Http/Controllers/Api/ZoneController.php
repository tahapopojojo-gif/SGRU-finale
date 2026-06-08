<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreZoneRequest;
use App\Mail\IssueResolvedMailable;
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

        // Auto-assign unassigned remarks by coordinate containment
        $autoAssignIds = $this->autoAssignUnassignedToZone($zone);

        // Resolve all en_cours remarks within this zone polygon
        $resolvedCount = $this->resolveRemarksInZone($zone);

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
            'auto_assigned_count' => count($autoAssignIds),
            'resolved_count' => $resolvedCount,
        ], 201);
    }

    public function update(StoreZoneRequest $request, Zone $zone)
    {
        $payload = $request->validated();
        unset($payload['remark_ids']);

        $zone->update($payload);

        // Re-scan unassigned remarks against the updated polygon
        $this->autoAssignUnassignedToZone($zone);

        return response()->json(['data' => $zone->fresh()]);
    }

    private function autoAssignUnassignedToZone(Zone $zone): array
    {
        $unassigned = Remarque::whereNull('zone_id')->get(['id', 'latitude', 'longitude']);
        $coordonnees = $zone->coordonnees_geojson;
        $autoAssignIds = [];

        foreach ($unassigned as $remarque) {
            if ($this->isPointInPolygon($remarque->latitude, $remarque->longitude, $coordonnees)) {
                $autoAssignIds[] = $remarque->id;
            }
        }

        if (!empty($autoAssignIds)) {
            Remarque::whereIn('id', $autoAssignIds)->update(['zone_id' => $zone->id]);
        }

        return $autoAssignIds;
    }

    private function resolveRemarksInZone(Zone $zone): int
    {
        $coordonnees = $zone->coordonnees_geojson;
        $enCours = Remarque::with('user')
            ->where('statut', 'en_cours')
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->get();

        $resolvedIds = [];
        $notified = 0;

        foreach ($enCours as $remarque) {
            if ($this->isPointInPolygon($remarque->latitude, $remarque->longitude, $coordonnees)) {
                $resolvedIds[] = $remarque->id;

                if ($remarque->user) {
                    try {
                        Mail::to($remarque->user->email)->queue(new IssueResolvedMailable($remarque, $remarque->user, $zone));
                        $notified++;
                    } catch (\Exception $e) {
                        Log::error("Failed to queue issue resolved email to {$remarque->user->email}: " . $e->getMessage());
                    }
                }
            }
        }

        if (!empty($resolvedIds)) {
            Remarque::whereIn('id', $resolvedIds)->update(['statut' => 'resolu', 'zone_id' => $zone->id]);
        }

        return count($resolvedIds);
    }

    private function isPointInPolygon(float $lat, float $lng, array $polygon): bool
    {
        $inside = false;
        $n = count($polygon);
        $j = $n - 1;

        for ($i = 0; $i < $n; $i++) {
            $xi = $polygon[$i][0];
            $yi = $polygon[$i][1];
            $xj = $polygon[$j][0];
            $yj = $polygon[$j][1];

            $intersect = (($yi > $lng) !== ($yj > $lng))
                && ($lat < ($xj - $xi) * ($lng - $yi) / ($yj - $yi) + $xi);

            if ($intersect) {
                $inside = !$inside;
            }

            $j = $i;
        }

        return $inside;
    }

    public function destroy(Zone $zone)
    {
        $zone->delete();

        return response()->json(['message' => 'Zone supprimée']);
    }
}
