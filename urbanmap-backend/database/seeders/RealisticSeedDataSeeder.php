<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Zone;
use App\Models\Remarque;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

class RealisticSeedDataSeeder extends Seeder
{
    public function run(): void
    {
        // Disable foreign key constraints during truncate/seed
        Schema::disableForeignKeyConstraints();
        Remarque::truncate();
        Zone::truncate();
        Schema::enableForeignKeyConstraints();

        // Get or create the citizen user
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

        // 1. Create the 3 official zones
        $gueliz = Zone::create([
            'nom' => 'Guéliz',
            'ville' => 'Marrakesh',
            'couleur' => '#C1440E',
            'coordonnees_geojson' => [
                [31.6350, -8.0175],
                [31.6375, -8.0120],
                [31.6380, -8.0065],
                [31.6345, -8.0025],
                [31.6300, -8.0035],
                [31.6265, -8.0075],
                [31.6255, -8.0130],
                [31.6285, -8.0170],
            ],
            'centre_lat' => 31.6319,
            'centre_lng' => -8.0099,
            'notes' => 'Suivi Boulevard Mohammed VI, Rue Moulay el-Hassan, Avenue Hassan II',
        ]);

        $medina = Zone::create([
            'nom' => 'Médina',
            'ville' => 'Marrakesh',
            'couleur' => '#1A5276',
            'coordonnees_geojson' => [
                [31.6330, -7.9945],
                [31.6375, -7.9895],
                [31.6395, -7.9840],
                [31.6380, -7.9790],
                [31.6335, -7.9765],
                [31.6285, -7.9775],
                [31.6235, -7.9795],
                [31.6200, -7.9835],
                [31.6195, -7.9885],
                [31.6215, -7.9930],
                [31.6255, -7.9960],
                [31.6295, -7.9965],
            ],
            'centre_lat' => 31.6292,
            'centre_lng' => -7.9862,
            'notes' => 'Suivi des remparts de la Médina',
        ]);

        $syba = Zone::create([
            'nom' => 'Syba (Hay Salam)',
            'ville' => 'Marrakesh',
            'couleur' => '#52BE80',
            'coordonnees_geojson' => [
                [31.6160, -8.0240],
                [31.6170, -8.0175],
                [31.6145, -8.0135],
                [31.6100, -8.0135],
                [31.6070, -8.0145],
                [31.6055, -8.0175],
                [31.6055, -8.0220],
                [31.6085, -8.0250],
                [31.6125, -8.0255],
            ],
            'centre_lat' => 31.6107,
            'centre_lng' => -8.0191,
            'notes' => 'Suivi du quadrillage résidentiel Hay Salam',
        ]);

        $zoneMap = [
            'Guéliz' => $gueliz->id,
            'Médina' => $medina->id,
            'Syba (Hay Salam)' => $syba->id,
        ];

        // 2. Data array for the 40 reports
        $reports = [
            [
                "reference" => "MRK-2026-00001",
                "latitude" => 31.6288,
                "longitude" => -8.0112,
                "category" => "route",
                "urgency" => 3,
                "duration" => "quelques jours",
                "description" => "Grand nid-de-poule formé près du carrefour de l'Avenue Mohammed V. Risque d'endommager les pneus des voitures.",
                "reporter_profile" => "conducteur",
                "affected_groups" => ["conducteurs", "cyclistes"],
                "zone_name" => "Guéliz",
                "created_at" => "2026-04-15 08:30:00"
            ],
            [
                "reference" => "MRK-2026-00002",
                "latitude" => 31.6312,
                "longitude" => -8.0054,
                "category" => "eclairage",
                "urgency" => 4,
                "duration" => "quelques jours", // mapped to standard
                "description" => "Plusieurs lampadaires sont éteints dans la rue de la Liberté, rendant le passage très sombre et insécurisant le soir.",
                "reporter_profile" => "pieton",
                "affected_groups" => ["pietons", "enfants_personnes_agees"],
                "zone_name" => "Guéliz",
                "created_at" => "2026-04-16 19:45:00"
            ],
            [
                "reference" => "MRK-2026-00003",
                "latitude" => 31.6254,
                "longitude" => -7.9888,
                "category" => "dechets",
                "urgency" => 4,
                "duration" => "quelques mois",
                "description" => "Accumulation de déchets près de l'entrée du souk. L'odeur est insupportable pour les commerces voisin et les passants.",
                "reporter_profile" => "commercant",
                "affected_groups" => ["commerces", "pietons", "residents"],
                "zone_name" => "Médina",
                "created_at" => "2026-04-18 10:15:00"
            ],
            [
                "reference" => "MRK-2026-00004",
                "latitude" => 31.6241,
                "longitude" => -7.9912,
                "category" => "eau",
                "urgency" => 5,
                "duration" => "depuis toujours",
                "description" => "Canalisation bouchée qui déborde à chaque pluie fine, inondant la ruelle étroite et bloquant l'accès aux habitations.",
                "reporter_profile" => "resident",
                "affected_groups" => ["residents", "enfants_personnes_agees", "personnes_handicapees"],
                "zone_name" => "Médina",
                "created_at" => "2026-05-02 14:20:00"
            ],
            [
                "reference" => "MRK-2026-00005",
                "latitude" => 31.6095,
                "longitude" => -8.0132,
                "category" => "parc",
                "urgency" => 3,
                "duration" => "quelques mois",
                "description" => "Les jeux pour enfants dans le square du quartier sont cassés et rouillés, ce qui présente un danger direct.",
                "reporter_profile" => "resident",
                "affected_groups" => ["enfants_personnes_agees", "residents"],
                "zone_name" => "Syba (Hay Salam)",
                "created_at" => "2026-05-04 16:00:00"
            ],
            [
                "reference" => "MRK-2026-00006",
                "latitude" => 31.6072,
                "longitude" => -8.0165,
                "category" => "route",
                "urgency" => 2,
                "duration" => "plus d'un an",
                "description" => "Le marquage au sol de la traversée piétonne devant l'école est complètement effacé.",
                "reporter_profile" => "pieton",
                "affected_groups" => ["pietons", "enfants_personnes_agees"],
                "zone_name" => "Syba (Hay Salam)",
                "created_at" => "2026-05-05 12:00:00"
            ],
            [
                "reference" => "MRK-2026-00007",
                "latitude" => 31.6274,
                "longitude" => -8.0099,
                "category" => "route",
                "urgency" => 4,
                "duration" => "quelques jours",
                "description" => "Plaque d'égout manquante sur le trottoir de l'Avenue Hassan II. Extrêmement dangereux pour les piétons de nuit.",
                "reporter_profile" => "passant",
                "affected_groups" => ["pietons", "personnes_handicapees"],
                "zone_name" => "Guéliz",
                "created_at" => "2026-05-06 21:10:00"
            ],
            [
                "reference" => "MRK-2026-00008",
                "latitude" => 31.6265,
                "longitude" => -7.9865,
                "category" => "dechets",
                "urgency" => 5,
                "duration" => "quelques mois",
                "description" => "Décharge sauvage de gravats et de déchets de construction encombrant un passage historique menant au Mellah.",
                "reporter_profile" => "resident",
                "affected_groups" => ["residents", "pietons"],
                "zone_name" => "Médina",
                "created_at" => "2026-05-07 09:30:00"
            ],
            [
                "reference" => "MRK-2026-00009",
                "latitude" => 31.6099,
                "longitude" => -8.0121,
                "category" => "parc",
                "urgency" => 2,
                "duration" => "plus d'un an",
                "description" => "Manque d'arrosage évident dans le jardin public, la pelouse est sèche et de nombreux arbres dépérissent.",
                "reporter_profile" => "resident",
                "affected_groups" => ["residents"],
                "zone_name" => "Syba (Hay Salam)",
                "created_at" => "2026-05-20 11:45:00"
            ],
            [
                "reference" => "MRK-2026-00010",
                "latitude" => 31.6321,
                "longitude" => -8.0071,
                "category" => "eclairage",
                "urgency" => 3,
                "duration" => "quelques jours",
                "description" => "Clignotement incessant d'un lampadaire public juste devant les fenêtres des appartements, perturbant le sommeil.",
                "reporter_profile" => "resident",
                "affected_groups" => ["residents"],
                "zone_name" => "Guéliz",
                "created_at" => "2026-05-21 22:15:00"
            ],
            [
                "reference" => "MRK-2026-00011",
                "latitude" => 31.6248,
                "longitude" => -7.9934,
                "category" => "eau",
                "urgency" => 4,
                "duration" => "plus d'un an",
                "description" => "Fuite d'eau potable constante au niveau d'un vieux raccordement de quartier. Une mare s'est formée.",
                "reporter_profile" => "passant",
                "affected_groups" => ["pietons", "residents"],
                "zone_name" => "Médina",
                "created_at" => "2026-05-22 10:00:00"
            ],
            [
                "reference" => "MRK-2026-00012",
                "latitude" => 31.6111,
                "longitude" => -8.0178,
                "category" => "transport",
                "urgency" => 3,
                "duration" => "quelques mois",
                "description" => "L'abri de bus de la ligne 2 a été vandalisé, il n'y a plus de toit pour s'abriter du soleil ardent.",
                "reporter_profile" => "pieton",
                "affected_groups" => ["pietons", "enfants_personnes_agees"],
                "zone_name" => "Syba (Hay Salam)",
                "created_at" => "2026-05-23 14:40:00"
            ],
            [
                "reference" => "MRK-2026-00013",
                "latitude" => 31.6291,
                "longitude" => -8.0042,
                "category" => "route",
                "urgency" => 3,
                "duration" => "quelques jours",
                "description" => "Trottoir défoncé par les racines d'un arbre à proximité des commerces, bloquant le passage des fauteuils roulants.",
                "reporter_profile" => "commercant",
                "affected_groups" => ["personnes_handicapees", "commerces", "pietons"],
                "zone_name" => "Guéliz",
                "created_at" => "2026-06-01 16:30:00"
            ],
            [
                "reference" => "MRK-2026-00014",
                "latitude" => 31.6277,
                "longitude" => -7.9902,
                "category" => "dechets",
                "urgency" => 5,
                "duration" => "quelques mois",
                "description" => "Poubelles publiques qui débordent constamment sur la place, attirant les chats errants et les insectes nuisibles.",
                "reporter_profile" => "resident",
                "affected_groups" => ["residents", "commerces", "pietons"],
                "zone_name" => "Médina",
                "created_at" => "2026-06-02 08:15:00"
            ],
            [
                "reference" => "MRK-2026-00015",
                "latitude" => 31.6081,
                "longitude" => -8.0129,
                "category" => "parc",
                "urgency" => 2,
                "duration" => "plus d'un an",
                "description" => "Accumulation de branches mortes et déchets verts non ramassés dans le parc central depuis l'élagage d'il y a un an.",
                "reporter_profile" => "resident",
                "affected_groups" => ["residents", "enfants_personnes_agees"],
                "zone_name" => "Syba (Hay Salam)",
                "created_at" => "2026-06-02 15:20:00"
            ],
            [
                "reference" => "MRK-2026-00016",
                "latitude" => 31.6335,
                "longitude" => -8.0102,
                "category" => "eclairage",
                "urgency" => 4,
                "duration" => "quelques jours",
                "description" => "Court-circuit généralisé après l'orage. Tout le boulevard de la Mecque est plongé dans l'obscurité totale.",
                "reporter_profile" => "conducteur",
                "affected_groups" => ["conducteurs", "pietons"],
                "zone_name" => "Guéliz",
                "created_at" => "2026-06-03 21:40:00"
            ],
            [
                "reference" => "MRK-2026-00017",
                "latitude" => 31.6249,
                "longitude" => -7.9921,
                "category" => "eau",
                "urgency" => 4,
                "duration" => "plus d'un an",
                "description" => "Faible pression d'eau récurrente dans toute la ruelle menant à l'impasse, rendant les douches quotidiennes impossibles.",
                "reporter_profile" => "resident",
                "affected_groups" => ["residents", "enfants_personnes_agees"],
                "zone_name" => "Médina",
                "created_at" => "2026-06-03 07:10:00"
            ],
            [
                "reference" => "MRK-2026-00018",
                "latitude" => 31.6115,
                "longitude" => -8.0156,
                "category" => "route",
                "urgency" => 3,
                "duration" => "quelques mois",
                "description" => "Ralentisseur non conforme et trop haut qui frotte sous les voitures légères et surprend les cyclistes.",
                "reporter_profile" => "conducteur",
                "affected_groups" => ["conducteurs", "cyclistes"],
                "zone_name" => "Syba (Hay Salam)",
                "created_at" => "2026-06-04 13:00:00"
            ],
            [
                "reference" => "MRK-2026-00019",
                "latitude" => 31.6282,
                "longitude" => -8.0069,
                "category" => "route",
                "urgency" => 3,
                "duration" => "quelques jours",
                "description" => "Chantier abandonné laissant des barrières métalliques mal fixées sur la voie publique.",
                "reporter_profile" => "passant",
                "affected_groups" => ["pietons", "cyclistes"],
                "zone_name" => "Guéliz",
                "created_at" => "2026-06-04 17:50:00"
            ],
            [
                "reference" => "MRK-2026-00020",
                "latitude" => 31.6235,
                "longitude" => -7.9877,
                "category" => "dechets",
                "urgency" => 4,
                "duration" => "quelques mois",
                "description" => "Restes de nourriture pour chats abandonnés par terre causant une invasion de fourmis et de mauvaises odeurs devant l'immeuble.",
                "reporter_profile" => "resident",
                "affected_groups" => ["residents", "enfants_personnes_agees"],
                "zone_name" => "Médina",
                "created_at" => "2026-06-05 09:20:00"
            ],
            [
                "reference" => "MRK-2026-00021",
                "latitude" => 31.6091,
                "longitude" => -8.0101,
                "category" => "parc",
                "urgency" => 1,
                "duration" => "plus d'un an",
                "description" => "Le panneau d'information à l'entrée du parc public est complètement tagué et illisible.",
                "reporter_profile" => "passant",
                "affected_groups" => ["pietons"],
                "zone_name" => "Syba (Hay Salam)",
                "created_at" => "2026-06-05 11:00:00"
            ],
            [
                "reference" => "MRK-2026-00022",
                "latitude" => 31.6318,
                "longitude" => -8.0125,
                "category" => "eclairage",
                "urgency" => 4,
                "duration" => "quelques jours",
                "description" => "Plusieurs lampadaires ne s'éteignent plus la journée, gaspillant de l'électricité publique en continu.",
                "reporter_profile" => "resident",
                "affected_groups" => ["residents"],
                "zone_name" => "Guéliz",
                "created_at" => "2026-06-05 12:30:00"
            ],
            [
                "reference" => "MRK-2026-00023",
                "latitude" => 31.6262,
                "longitude" => -7.9941,
                "category" => "eau",
                "urgency" => 5,
                "duration" => "depuis toujours",
                "description" => "Remontées d'égouts fréquentes dans la rue principale, bloquant la devanture des boutiques touristiques.",
                "reporter_profile" => "commercant",
                "affected_groups" => ["commerces", "pietons"],
                "zone_name" => "Médina",
                "created_at" => "2026-06-05 15:10:00"
            ],
            [
                "reference" => "MRK-2026-00024",
                "latitude" => 31.6068,
                "longitude" => -8.0139,
                "category" => "transport",
                "urgency" => 3,
                "duration" => "quelques mois",
                "description" => "Absence de signalisation claire au niveau du terminus de bus, les piétons attendent n'importe où sur la route.",
                "reporter_profile" => "pieton",
                "affected_groups" => ["pietons", "conducteurs"],
                "zone_name" => "Syba (Hay Salam)",
                "created_at" => "2026-06-06 10:45:00"
            ],
            [
                "reference" => "MRK-2026-00025",
                "latitude" => 31.6251,
                "longitude" => -8.0091,
                "category" => "route",
                "urgency" => 3,
                "duration" => "quelques jours",
                "description" => "Bouche d'évacuation d'eau pluviale cassée sur la chaussée, un cycliste risque de tomber dedans.",
                "reporter_profile" => "conducteur",
                "affected_groups" => ["conducteurs", "cyclistes"],
                "zone_name" => "Guéliz",
                "created_at" => "2026-06-06 18:25:00"
            ],
            [
                "reference" => "MRK-2026-00026",
                "latitude" => 31.6272,
                "longitude" => -7.9845,
                "category" => "dechets",
                "urgency" => 4,
                "duration" => "quelques mois",
                "description" => "Poubelle municipale arrachée gisant au milieu du passage, tous les résidus se déversent sur le pavé.",
                "reporter_profile" => "resident",
                "affected_groups" => ["residents", "pietons"],
                "zone_name" => "Médina",
                "created_at" => "2026-06-06 07:40:00"
            ],
            [
                "reference" => "MRK-2026-00027",
                "latitude" => 31.6105,
                "longitude" => -8.0161,
                "category" => "parc",
                "urgency" => 2,
                "duration" => "plus d'un an",
                "description" => "Les bancs du parc sont cassés ou vandalisés, il n'y a plus aucun endroit décent pour s'asseoir.",
                "reporter_profile" => "resident",
                "affected_groups" => ["residents", "enfants_personnes_agees"],
                "zone_name" => "Syba (Hay Salam)",
                "created_at" => "2026-06-06 16:15:00"
            ],
            [
                "reference" => "MRK-2026-00028",
                "latitude" => 31.6329,
                "longitude" => -8.0062,
                "category" => "eclairage",
                "urgency" => 3,
                "duration" => "quelques jours",
                "description" => "Le poteau d'éclairage penche dangereusement vers la route après avoir été heurté par un camion.",
                "reporter_profile" => "passant",
                "affected_groups" => ["conducteurs", "pietons"],
                "zone_name" => "Guéliz",
                "created_at" => "2026-06-06 14:30:00"
            ],
            [
                "reference" => "MRK-2026-00029",
                "latitude" => 31.6222,
                "longitude" => -7.9915,
                "category" => "eau",
                "urgency" => 4,
                "duration" => "plus d'un an",
                "description" => "Infiltrations d'eau régulières sur le mur de la mosquée en raison d'une fuite souterraine non localisée.",
                "reporter_profile" => "resident",
                "affected_groups" => ["residents", "pietons"],
                "zone_name" => "Médina",
                "created_at" => "2026-06-06 11:20:00"
            ],
            [
                "reference" => "MRK-2026-00030",
                "latitude" => 31.6097,
                "longitude" => -8.0118,
                "category" => "route",
                "urgency" => 3,
                "duration" => "quelques mois",
                "description" => "Nid-de-poule important juste à la sortie du parking résidentiel, difficile à éviter aux heures de pointe.",
                "reporter_profile" => "conducteur",
                "affected_groups" => ["conducteurs", "residents"],
                "zone_name" => "Syba (Hay Salam)",
                "created_at" => "2026-06-06 08:05:00"
            ],
            [
                "reference" => "MRK-2026-00031",
                "latitude" => 31.6299,
                "longitude" => -8.0121,
                "category" => "route",
                "urgency" => 2,
                "duration" => "quelques jours",
                "description" => "Un grand trou dans la chaussée ralentit fortement le trafic devant l'hôtel.",
                "reporter_profile" => "conducteur",
                "affected_groups" => ["conducteurs", "commerces"],
                "zone_name" => "Guéliz",
                "created_at" => "2026-06-06 17:00:00"
            ],
            [
                "reference" => "MRK-2026-00032",
                "latitude" => 31.6231,
                "longitude" => -7.9859,
                "category" => "dechets",
                "urgency" => 4,
                "duration" => "quelques mois",
                "description" => "Des sacs de poubelles sont abandonnés au pied du rempart historique à cause d'un manque de conteneurs dans cette zone.",
                "reporter_profile" => "passant",
                "affected_groups" => ["pietons", "commerces"],
                "zone_name" => "Médina",
                "created_at" => "2026-06-06 09:50:00"
            ],
            [
                "reference" => "MRK-2026-00033",
                "latitude" => 31.6079,
                "longitude" => -8.0172,
                "category" => "parc",
                "urgency" => 3,
                "duration" => "plus d'un an",
                "description" => "Absence totale d'éclairage nocturne dans le square public, favorisant les attroupements douteux.",
                "reporter_profile" => "resident",
                "affected_groups" => ["residents", "enfants_personnes_agees"],
                "zone_name" => "Syba (Hay Salam)",
                "created_at" => "2026-06-06 22:00:00"
            ],
            [
                "reference" => "MRK-2026-00034",
                "latitude" => 31.6279,
                "longitude" => -8.0075,
                "category" => "eclairage",
                "urgency" => 4,
                "duration" => "quelques jours",
                "description" => "Le feu de signalisation piéton au grand carrefour ne fonctionne plus du tout.",
                "reporter_profile" => "pieton",
                "affected_groups" => ["pietons", "personnes_handicapees"],
                "zone_name" => "Guéliz",
                "created_at" => "2026-06-06 13:40:00"
            ],
            [
                "reference" => "MRK-2026-00035",
                "latitude" => 31.6261,
                "longitude" => -7.9905,
                "category" => "eau",
                "urgency" => 5,
                "duration" => "depuis toujours",
                "description" => "Une canalisation d'évacuation a rompu, dégageant une odeur nauséabonde dans tout le secteur.",
                "reporter_profile" => "resident",
                "affected_groups" => ["residents", "commerces"],
                "zone_name" => "Médina",
                "created_at" => "2026-06-06 11:15:00"
            ],
            [
                "reference" => "MRK-2026-00036",
                "latitude" => 31.6119,
                "longitude" => -8.0135,
                "category" => "transport",
                "urgency" => 2,
                "duration" => "quelques mois",
                "description" => "Le poteau indicateur de l'arrêt de bus est tombé au sol et n'a jamais été replacé.",
                "reporter_profile" => "pieton",
                "affected_groups" => ["pietons"],
                "zone_name" => "Syba (Hay Salam)",
                "created_at" => "2026-06-06 16:50:00"
            ],
            [
                "reference" => "MRK-2026-00037",
                "latitude" => 31.6305,
                "longitude" => -8.0109,
                "category" => "route",
                "urgency" => 3,
                "duration" => "quelques jours",
                "description" => "Le revêtement de la route commence à s'affaisser, créant de grosses secousses au passage des bus.",
                "reporter_profile" => "conducteur",
                "affected_groups" => ["conducteurs", "pietons"],
                "zone_name" => "Guéliz",
                "created_at" => "2026-06-06 08:30:00"
            ],
            [
                "reference" => "MRK-2026-00038",
                "latitude" => 31.6245,
                "longitude" => -7.9939,
                "category" => "dechets",
                "urgency" => 4,
                "duration" => "quelques mois",
                "description" => "Les touristes jettent leurs gobelets et emballages dans la ruelle historique faute de corbeilles murales.",
                "reporter_profile" => "commercant",
                "affected_groups" => ["commerces", "pietons"],
                "zone_name" => "Médina",
                "created_at" => "2026-06-06 14:10:00"
            ],
            [
                "reference" => "MRK-2026-00039",
                "latitude" => 31.6094,
                "longitude" => -8.0151,
                "category" => "route",
                "urgency" => 3,
                "duration" => "plus d'un an",
                "description" => "Un trottoir non abaissé empêche les poussettes et chaises roulantes d'accéder au passage clouté.",
                "reporter_profile" => "resident",
                "affected_groups" => ["personnes_handicapees", "pietons", "enfants_personnes_agees"],
                "zone_name" => "Syba (Hay Salam)",
                "created_at" => "2026-06-06 10:25:00"
            ],
            [
                "reference" => "MRK-2026-00040",
                "latitude" => 31.6289,
                "longitude" => -8.0071,
                "category" => "eclairage",
                "urgency" => 5,
                "duration" => "quelques jours",
                "description" => "Un câble électrique dénudé pend d'un lampadaire endommagé juste au-dessus du passage piéton.",
                "reporter_profile" => "pieton",
                "affected_groups" => ["pietons", "enfants_personnes_agees", "personnes_handicapees"],
                "zone_name" => "Guéliz",
                "created_at" => "2026-06-06 09:00:00"
            ]
        ];

        foreach ($reports as $r) {
            Remarque::create([
                'user_id' => $citizen->id,
                'zone_id' => $zoneMap[$r['zone_name']],
                'categorie' => $r['category'],
                'building_type' => $r['category'],
                'statut' => 'validee', // Needs to be validated to be visible for analysis
                'reasons' => ['Signalement citoyen'],
                'problems' => [$r['category']],
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
