<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Remarque;
use App\Models\Zone;

class AssignRemarquesToZones extends Command
{
    protected $signature = 'remarques:assign-zones';
    protected $description = 'Retroactively assign unassigned remarks to zones based on coordinates';

    public function handle()
    {
        $zones = Zone::all(['id', 'nom', 'coordonnees_geojson']);
        $unassigned = Remarque::whereNull('zone_id')
                              ->get(['id', 'latitude', 'longitude']);

        $this->info("Found {$unassigned->count()} unassigned remarks.");

        $assigned = 0;
        $notFound = 0;

        foreach ($unassigned as $remarque) {
            $matched = false;

            foreach ($zones as $zone) {
                if ($this->isPointInPolygon(
                    $remarque->latitude,
                    $remarque->longitude,
                    $zone->coordonnees_geojson
                )) {
                    $remarque->update(['zone_id' => $zone->id]);
                    $this->line("  ✓ Remarque #{$remarque->id} → {$zone->nom}");
                    $assigned++;
                    $matched = true;
                    break;
                }
            }

            if (!$matched) {
                $this->line("  – Remarque #{$remarque->id} → outside all zones");
                $notFound++;
            }
        }

        $this->info("Done. Assigned: {$assigned} | Outside all zones: {$notFound}");
        return Command::SUCCESS;
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
}
