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
}
