<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Remarque;
use App\Models\User;
use App\Models\Zone;

class DashboardController extends Controller
{
    public function stats()
    {
        $totalRemarques    = Remarque::count();
        $totalZones        = Zone::count();
        $totalUsers        = User::count();
        $pendingUsers      = User::where('statut', 'pending')->count();

        $remarquesParStatut = Remarque::selectRaw('statut, count(*) as total')
            ->groupBy('statut')
            ->pluck('total', 'statut');

        $remarquesParZone = Remarque::with('zone')
            ->selectRaw('zone_id, count(*) as total')
            ->groupBy('zone_id')
            ->get()
            ->map(fn ($r) => [
                'zone'  => $r->zone?->nom ?? 'Inconnue',
                'total' => $r->total,
            ]);

        $remarquesParCategorie = Remarque::selectRaw('categorie, count(*) as total')
            ->groupBy('categorie')
            ->pluck('total', 'categorie');

        return response()->json([
            'data' => [
                'total_remarques'          => $totalRemarques,
                'total_zones'              => $totalZones,
                'total_users'              => $totalUsers,
                'pending_users'            => $pendingUsers,
                'remarques_par_statut'     => $remarquesParStatut,
                'remarques_par_zone'       => $remarquesParZone,
                'remarques_par_categorie'  => $remarquesParCategorie,
            ],
        ]);
    }
}
