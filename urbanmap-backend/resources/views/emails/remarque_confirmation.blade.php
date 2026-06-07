<p>Bonjour {{ $user->nom }},</p>

<p>Votre signalement a bien été enregistré.</p>

<p><strong>Référence :</strong> #{{ $remarque->id }}<br>
<strong>Catégorie :</strong> {{ $remarque->categorie }}<br>
<strong>Urgence :</strong> @switch($remarque->urgency) @case(5) Très urgent @break @case(4) Urgent @break @case(3) Modéré @break @case(2) Faible @break @default Non précisé @endswitch<br>
<strong>Zone :</strong> {{ $remarque->zone->nom ?? 'Non assignée' }}<br>
<strong>Adresse :</strong> {{ $remarque->latitude }}, {{ $remarque->longitude }}<br>
<strong>Soumis le :</strong> {{ $remarque->created_at->format('d/m/Y à H:i') }}</p>

<p>Vous pouvez suivre son statut sur UrbanMap Maroc.</p>

<p>Cordialement,<br>
L'équipe UrbanMap Maroc</p>
