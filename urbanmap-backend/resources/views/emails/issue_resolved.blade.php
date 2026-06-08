<p>Bonjour {{ $user->nom }},</p>

<p>Bonnes nouvelles ! Le problème que vous avez signalé dans la zone <strong>{{ $zone->nom }}</strong> a été résolu.</p>

<p><strong>Référence :</strong> #{{ $remarque->id }}<br>
<strong>Catégorie :</strong> {{ $remarque->categorie }}<br>
<strong>Zone :</strong> {{ $zone->nom }}</p>

<p>Vous pouvez consulter l'évolution de vos signalements depuis votre compte sur UrbanMap Maroc.</p>

<p>Merci de contribuer à l'amélioration de votre ville.</p>

<p>Cordialement,<br>
L'équipe UrbanMap Maroc</p>
