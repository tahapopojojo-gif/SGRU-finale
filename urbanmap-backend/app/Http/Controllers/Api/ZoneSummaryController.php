<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Zone;
use App\Models\ZoneAiSummary;

class ZoneSummaryController extends Controller
{
    public function show(Zone $zone)
    {
        $summary = ZoneAiSummary::where('zone_id', $zone->id)->first();

        return response()->json(['data' => $summary]);
    }

    public function generate(Zone $zone)
    {
        $summaryText = (string) request('summary_text', 'Résumé IA non fourni');

        $summary = ZoneAiSummary::updateOrCreate(
            ['zone_id' => $zone->id],
            ['summary_text' => $summaryText, 'generated_at' => now()]
        );

        return response()->json(['data' => $summary]);
    }
}
