<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_citoyen_can_register(): void
    {
        $response = $this->postJson('/api/register', [
            'nom' => 'Test Citoyen',
            'email' => 'citoyen@test.ma',
            'password' => 'password123',
            'role' => 'citoyen',
            'city' => 'Marrakech',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['user', 'token']]);

        $this->assertDatabaseHas('users', [
            'email' => 'citoyen@test.ma',
            'role' => 'citoyen',
            'statut' => 'active',
        ]);
    }

    public function test_urbaniste_registers_as_pending(): void
    {
        $response = $this->postJson('/api/register', [
            'nom' => 'Test Urbaniste',
            'email' => 'urbaniste@test.ma',
            'password' => 'password123',
            'role' => 'urbaniste',
            'company_name' => 'UrbaConseil',
            'city' => 'Rabat',
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('users', [
            'email' => 'urbaniste@test.ma',
            'role' => 'urbaniste',
            'statut' => 'pending',
        ]);
    }

    public function test_citoyen_can_login(): void
    {
        User::factory()->create([
            'email' => 'login@test.ma',
            'password' => bcrypt('secret123'),
            'role' => 'citoyen',
            'statut' => 'active',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'login@test.ma',
            'password' => 'secret123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['data' => ['user', 'token']]);
    }

    public function test_pending_user_cannot_login(): void
    {
        User::factory()->create([
            'email' => 'pending@test.ma',
            'password' => bcrypt('secret123'),
            'role' => 'urbaniste',
            'statut' => 'pending',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'pending@test.ma',
            'password' => 'secret123',
        ]);

        $response->assertStatus(403)
            ->assertJson(['message' => 'Compte en attente de validation']);
    }

    public function test_invalid_credentials_return_401(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'nobody@test.ma',
            'password' => 'wrongpass',
        ]);

        $response->assertStatus(401)
            ->assertJson(['message' => 'Identifiants invalides']);
    }
}
