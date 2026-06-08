<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AccountStatusChangedMailable extends Mailable
{
    use Queueable, SerializesModels;

    public User $user;
    public string $oldStatut;
    public string $newStatut;

    public function __construct(User $user, string $oldStatut, string $newStatut)
    {
        $this->user = $user;
        $this->oldStatut = $oldStatut;
        $this->newStatut = $newStatut;
    }

    public function envelope(): Envelope
    {
        $subject = match ($this->newStatut) {
            'active'   => 'UrbanMap — Votre compte a été activé',
            'rejected' => 'UrbanMap — Votre compte a été désactivé',
            default    => 'UrbanMap — Le statut de votre compte a changé',
        };
        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.account_status_changed');
    }
}
