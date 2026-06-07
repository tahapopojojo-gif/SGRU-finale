<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class Remarque extends Model
{
    protected $fillable = [
        'user_id',
        'zone_id',
        'categorie',
        'statut',
        'building_type',
        'reasons',
        'problems',
        'urgency',
        'duration',
        'profile',
        'residence_duration',
        'opinion',
        'opinion_ai_validated',
        'opinion_ai_summary',
        'commentaire_admin',
        'photo_path',
        'latitude',
        'longitude',
    ];

    protected function casts(): array
    {
        return [
            'reasons' => 'array',
            'problems' => 'array',
            'urgency' => 'integer',
            'opinion_ai_validated' => 'boolean',
            'latitude' => 'float',
            'longitude' => 'float',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }
}
