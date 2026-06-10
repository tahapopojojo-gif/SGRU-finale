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

        User::updateOrCreate([
            'email' => 'mohammed.benali@urbanmap.ma',
        ], [
            'nom' => 'Mohammed Benali',
            'password' => Hash::make('admin123'),
            'role' => 'admin',
            'statut' => 'active',
            'company_name' => 'UrbanMap',
            'city' => 'Marrakesh',
        ]);

        User::updateOrCreate([
            'email' => 'urbaniste@urbanmap.ma',
        ], [
            'nom' => 'Urbaniste User',
            'password' => Hash::make('admin123'),
            'role' => 'urbaniste',
            'statut' => 'active',
            'company_name' => 'UrbanMap',
            'city' => 'Marrakesh',
        ]);

        User::updateOrCreate([
            'email' => 'citoyen@urbanmap.ma',
        ], [
            'nom' => 'Citoyen User',
            'password' => Hash::make('citoyen123'),
            'role' => 'citoyen',
            'statut' => 'active',
        ]);

        Category::insert([
            ['nom' => 'Voirie', 'couleur' => '#3b82f6', 'icone' => 'road'],
            ['nom' => 'Patrimoine', 'couleur' => '#ef4444', 'icone' => 'landmark'],
            ['nom' => 'Espaces Verts', 'couleur' => '#10b981', 'icone' => 'tree'],
        ]);

        Zone::updateOrCreate(['nom' => 'Guéliz', 'ville' => 'Marrakesh'], [
            'couleur' => '#C1440E',
            'coordonnees_geojson' => [[31.6350, -8.0175], [31.6375, -8.0120], [31.6380, -8.0065], [31.6345, -8.0025], [31.6300, -8.0035], [31.6265, -8.0075], [31.6255, -8.0130], [31.6285, -8.0170]],
            'centre_lat' => 31.6319,
            'centre_lng' => -8.0099,
            'notes' => 'Suivi Boulevard Mohammed VI, Rue Moulay el-Hassan, Avenue Hassan II',
        ]);
        Zone::updateOrCreate(['nom' => 'Médina', 'ville' => 'Marrakesh'], [
            'couleur' => '#1A5276',
            'coordonnees_geojson' => [[31.6330, -7.9945], [31.6375, -7.9895], [31.6395, -7.9840], [31.6380, -7.9790], [31.6335, -7.9765], [31.6285, -7.9775], [31.6235, -7.9795], [31.6200, -7.9835], [31.6195, -7.9885], [31.6215, -7.9930], [31.6255, -7.9960], [31.6295, -7.9965]],
            'centre_lat' => 31.6292,
            'centre_lng' => -7.9862,
            'notes' => 'Suivi des remparts de la Médina',
        ]);
        Zone::updateOrCreate(['nom' => 'Syba (Hay Salam)', 'ville' => 'Marrakesh'], [
            'couleur' => '#52BE80',
            'coordonnees_geojson' => [[31.6160, -8.0240], [31.6170, -8.0175], [31.6145, -8.0135], [31.6100, -8.0135], [31.6070, -8.0145], [31.6055, -8.0175], [31.6055, -8.0220], [31.6085, -8.0250], [31.6125, -8.0255]],
            'centre_lat' => 31.6107,
            'centre_lng' => -8.0191,
            'notes' => 'Suivi du quadrillage résidentiel Hay Salam',
        ]);

        $this->call(UnassignedReportsSeeder::class);
    }
}
