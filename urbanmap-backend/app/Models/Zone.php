<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Model;

class Zone extends Model
{
    protected $fillable = [
        'nom',
        'ville',
        'couleur',
        'coordonnees_geojson',
        'centre_lat',
        'centre_lng',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'coordonnees_geojson' => 'array',
            'centre_lat' => 'float',
            'centre_lng' => 'float',
        ];
    }

    public function remarques(): HasMany
    {
        return $this->hasMany(Remarque::class);
    }

    public static function findContainingPoint(float $lat, float $lng): ?self
    {
        return static::all()->first(function ($zone) use ($lat, $lng) {
            return self::pointInPolygon($lat, $lng, $zone->coordonnees_geojson);
        });
    }

    public static function pointInPolygon(float $lat, float $lng, array $polygon): bool
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
