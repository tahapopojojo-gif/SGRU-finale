<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RemarqueValidationTest extends TestCase
{
    use RefreshDatabase;

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'categorie' => 'Voirie',
            'reasons' => ['nid_de_poule'],
            'problems' => ['securite'],
            'urgency' => 3,
            'opinion' => 'Un nid de poule dangereux sur la chaussée.',
            'latitude' => 31.6295,
            'longitude' => -7.9811,
        ], $overrides);
    }

    public function test_store_remarque_succeeds_with_valid_data(): void
    {
        $user = User::factory()->create(['role' => 'citoyen']);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/remarques', $this->validPayload());

        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['id', 'categorie', 'statut']]);
    }

    public function test_store_remarque_fails_when_opinion_missing_for_autre(): void
    {
        $user = User::factory()->create(['role' => 'citoyen']);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/remarques', $this->validPayload([
            'categorie' => 'Autre',
            'opinion' => '',
        ]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['opinion']);
    }

    public function test_store_remarque_fails_when_opinion_too_short_for_autre(): void
    {
        $user = User::factory()->create(['role' => 'citoyen']);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/remarques', $this->validPayload([
            'categorie' => 'Autre',
            'opinion' => 'Court',
        ]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['opinion']);
    }

    public function test_store_remarque_succeeds_with_short_opinion_for_non_autre(): void
    {
        $user = User::factory()->create(['role' => 'citoyen']);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/remarques', $this->validPayload([
            'categorie' => 'Voirie',
            'opinion' => 'OK',
        ]));

        $response->assertStatus(201);
    }

    public function test_store_remarque_fails_with_missing_required_fields(): void
    {
        $user = User::factory()->create(['role' => 'citoyen']);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/remarques', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'categorie', 'reasons', 'problems', 'urgency',
                'opinion', 'latitude', 'longitude',
            ]);
    }
}
