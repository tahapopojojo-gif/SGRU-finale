<?php

namespace Tests\Feature;

use App\Models\Remarque;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RolePermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_citoyen_cannot_update_remarque_status(): void
    {
        $citoyen = User::factory()->create(['role' => 'citoyen']);
        $remarque = Remarque::create([
            'user_id' => $citoyen->id,
            'categorie' => 'Voirie',
            'reasons' => ['nid_de_poule'],
            'problems' => ['securite'],
            'urgency' => 3,
            'opinion' => 'À réparer.',
            'latitude' => 31.6295,
            'longitude' => -7.9811,
            'statut' => 'en_cours',
        ]);

        Sanctum::actingAs($citoyen);

        $response = $this->patchJson("/api/remarques/{$remarque->id}", [
            'statut' => 'resolu',
        ]);

        $response->assertStatus(403);
    }

    public function test_urbaniste_can_update_remarque_status(): void
    {
        $citoyen = User::factory()->create(['role' => 'citoyen']);
        $urbaniste = User::factory()->create(['role' => 'urbaniste', 'statut' => 'active']);

        $remarque = Remarque::create([
            'user_id' => $citoyen->id,
            'categorie' => 'Voirie',
            'reasons' => ['nid_de_poule'],
            'problems' => ['securite'],
            'urgency' => 3,
            'opinion' => 'À réparer.',
            'latitude' => 31.6295,
            'longitude' => -7.9811,
            'statut' => 'en_cours',
        ]);

        Sanctum::actingAs($urbaniste);

        $response = $this->patchJson("/api/remarques/{$remarque->id}", [
            'statut' => 'resolu',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.statut', 'resolu');
    }

    public function test_admin_can_update_remarque_status(): void
    {
        $citoyen = User::factory()->create(['role' => 'citoyen']);
        $admin = User::factory()->create(['role' => 'admin', 'statut' => 'active']);

        $remarque = Remarque::create([
            'user_id' => $citoyen->id,
            'categorie' => 'Voirie',
            'reasons' => ['nid_de_poule'],
            'problems' => ['securite'],
            'urgency' => 3,
            'opinion' => 'À réparer.',
            'latitude' => 31.6295,
            'longitude' => -7.9811,
            'statut' => 'en_cours',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->patchJson("/api/remarques/{$remarque->id}", [
            'statut' => 'resolu',
        ]);

        $response->assertStatus(200);
    }

    public function test_unauthenticated_user_cannot_update_remarque(): void
    {
        $user = User::factory()->create(['role' => 'citoyen']);

        $remarque = Remarque::create([
            'user_id' => $user->id,
            'categorie' => 'Voirie',
            'reasons' => ['nid_de_poule'],
            'problems' => ['securite'],
            'urgency' => 3,
            'opinion' => 'À réparer.',
            'latitude' => 31.6295,
            'longitude' => -7.9811,
            'statut' => 'en_cours',
        ]);

        $response = $this->patchJson("/api/remarques/{$remarque->id}", [
            'statut' => 'resolu',
        ]);

        $response->assertStatus(401);
    }
}
