<?php

namespace App\Mail;

use App\Models\Remarque;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class IssueResolvedMailable extends Mailable
{
    use Queueable, SerializesModels;

    public Remarque $remarque;
    public User $user;
    public Zone $zone;

    public function __construct(Remarque $remarque, User $user, Zone $zone)
    {
        $this->remarque = $remarque;
        $this->user = $user;
        $this->zone = $zone;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'UrbanMap — Votre signalement a été résolu',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.issue_resolved',
        );
    }
}
