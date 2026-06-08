<p>Bonjour {{ $user->nom }},</p>

@php
    $labels = ['active' => 'actif', 'rejected' => 'désactivé', 'pending' => 'en attente'];
    $old = $labels[$oldStatut] ?? $oldStatut;
    $new = $labels[$newStatut] ?? $newStatut;
@endphp

<p>Le statut de votre compte <strong>{{ ucfirst($user->role) }}</strong> sur UrbanMap Maroc est passé de <strong>{{ $old }}</strong> à <strong>{{ $new }}</strong>.</p>

@if ($newStatut === 'active')
    <p>Vous pouvez dès à présent vous connecter et accéder à vos fonctionnalités.</p>
@elseif ($newStatut === 'rejected')
    <p>Vous ne pouvez plus vous connecter à la plateforme. Pour toute question, veuillez contacter l'administration.</p>
@else
    <p>Votre compte est en attente de validation par un super administrateur.</p>
@endif

<p>Cordialement,<br>
L'équipe UrbanMap Maroc</p>
