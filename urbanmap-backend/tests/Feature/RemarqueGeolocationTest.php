<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RemarqueGeolocationTest extends TestCase
{
    use RefreshDatabase;

    public function test_remarque_inside_zone_gets_auto_assigned(): void
    {
        $zone = Zone::create([
            'nom' => 'Test Zone',
            'ville' => 'Marrakech',
            'couleur' => '#C1440E',
            'coordonnees_geojson' => [
                [31.630, -7.995],
                [31.635, -7.990],
                [31.638, -7.985],
                [31.635, -7.980],
                [31.630, -7.980],
                [31.627, -7.985],
                [31.627, -7.992],
            ],
            'centre_lat' => 31.632,
            'centre_lng' => -7.987,
        ]);

        $user = User::factory()->create(['role' => 'citoyen']);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/remarques', [
            'categorie' => 'Voirie',
            'reasons' => ['nid_de_poule'],
            'problems' => ['securite'],
            'urgency' => 3,
            'opinion' => 'Un nid de poule à réparer.',
            'latitude' => 31.6325,
            'longitude' => -7.9875,
        ]);

        $response->assertStatus(201);

        $remarqueId = $response->json('data.id');
        $this->assertDatabaseHas('remarques', [
            'id' => $remarqueId,
            'zone_id' => $zone->id,
        ]);
    }

    public function test_remarque_outside_any_zone_gets_null_zone_id(): void
    {
        Zone::create([
            'nom' => 'Test Zone',
            'ville' => 'Marrakech',
            'couleur' => '#C1440E',
            'coordonnees_geojson' => [
                [31.630, -7.995],
                [31.635, -7.990],
                [31.638, -7.985],
                [31.635, -7.980],
                [31.630, -7.980],
                [31.627, -7.985],
                [31.627, -7.992],
            ],
            'centre_lat' => 31.632,
            'centre_lng' => -7.987,
        ]);

        $user = User::factory()->create(['role' => 'citoyen']);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/remarques', [
            'categorie' => 'Voirie',
            'reasons' => ['nid_de_poule'],
            'problems' => ['securite'],
            'urgency' => 3,
            'opinion' => 'Un nid de poule à réparer.',
            'latitude' => 31.6000,
            'longitude' => -8.0500,
        ]);

        $response->assertStatus(201);

        $remarqueId = $response->json('data.id');
        $this->assertDatabaseHas('remarques', [
            'id' => $remarqueId,
            'zone_id' => null,
        ]);
    }
}
