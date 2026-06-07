<?php

namespace Database\Seeders;

use App\Models\Remarque;
use App\Models\User;
use Illuminate\Database\Seeder;

class UnassignedReportsSeeder extends Seeder
{
    public function run(): void
    {
        Remarque::whereNull('zone_id')->delete();

        $citizen = User::where('email', 'citoyen@urbanmap.ma')->first();
        if (!$citizen) {
            $citizen = User::create([
                'nom' => 'Citoyen User',
                'email' => 'citoyen@urbanmap.ma',
                'password' => bcrypt('citoyen123'),
                'role' => 'citoyen',
                'statut' => 'active',
            ]);
        }

        $reports = json_decode(file_get_contents(__DIR__ . '/data/unassigned_reports.json'), true);

        foreach ($reports as $r) {
            Remarque::create([
                'user_id' => $citizen->id,
                'zone_id' => null,
                'categorie' => $r['category'],
                'building_type' => $r['category'],
                'statut' => 'validee',
                'reasons' => ['Signalement citoyen'],
                'problems' => $r['affected_groups'],
                'urgency' => $r['urgency'],
                'profile' => $r['reporter_profile'],
                'residence_duration' => $r['duration'],
                'opinion' => $r['description'],
                'opinion_ai_validated' => true,
                'latitude' => $r['latitude'],
                'longitude' => $r['longitude'],
                'created_at' => $r['created_at'],
                'updated_at' => $r['created_at'],
            ]);
        }
    }
}
