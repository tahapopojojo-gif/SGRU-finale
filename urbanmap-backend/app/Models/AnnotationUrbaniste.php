<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class AnnotationUrbaniste extends Model
{
    protected $fillable = ['zone_id', 'urbaniste_id', 'texte'];

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }

    public function urbaniste(): BelongsTo
    {
        return $this->belongsTo(User::class, 'urbaniste_id');
    }
}
