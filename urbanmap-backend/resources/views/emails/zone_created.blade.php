<p>Bonjour {{ $admin->nom }},</p>

<p>Une nouvelle zone a été créée sur UrbanMap Maroc.</p>

<p><strong>Nom :</strong> {{ $zone->nom }}<br>
<strong>Ville :</strong> {{ $zone->ville ?? 'Non précisée' }}<br>
<strong>Couleur :</strong> {{ $zone->couleur ?? 'Non définie' }}</p>

<p>Vous pouvez consulter les détails dans votre tableau de bord.</p>

<p>Cordialement,<br>
L'équipe UrbanMap Maroc</p>
