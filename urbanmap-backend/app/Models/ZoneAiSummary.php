<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class ZoneAiSummary extends Model
{
    public $timestamps = false;

    protected $fillable = ['zone_id', 'summary_text', 'generated_at'];

    protected function casts(): array
    {
        return [
            'generated_at' => 'datetime',
        ];
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }
}
