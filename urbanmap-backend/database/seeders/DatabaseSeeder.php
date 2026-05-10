<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::updateOrCreate([
            'email' => 'superadmin@urbanmap.ma',
        ], [
            'nom' => 'Super Admin',
            'password' => Hash::make('super123'),
            'role' => 'super_admin',
            'statut' => 'active',
            'company_name' => 'UrbanMap',
            'city' => 'Marrakesh',
        ]);

        Category::insert([
            ['nom' => 'Voirie', 'couleur' => '#3b82f6', 'icone' => 'road'],
            ['nom' => 'Patrimoine', 'couleur' => '#ef4444', 'icone' => 'landmark'],
            ['nom' => 'Espaces Verts', 'couleur' => '#10b981', 'icone' => 'tree'],
        ]);

        Zone::insert([
            [
                'nom' => 'Gueliz',
                'ville' => 'Marrakesh',
                'couleur' => '#3b82f6',
                'coordonnees_geojson' => json_encode([[31.635, -8.01], [31.635, -8.00], [31.625, -8.00], [31.625, -8.01]]),
                'centre_lat' => 31.6300000,
                'centre_lng' => -8.0050000,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nom' => 'Medina',
                'ville' => 'Marrakesh',
                'couleur' => '#ef4444',
                'coordonnees_geojson' => json_encode([[31.635, -7.995], [31.635, -7.98], [31.625, -7.98], [31.625, -7.995]]),
                'centre_lat' => 31.6300000,
                'centre_lng' => -7.9870000,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
