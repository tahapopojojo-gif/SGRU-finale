<?php

namespace App\Mail;

use App\Models\Zone;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ZoneCreatedMailable extends Mailable
{
    use Queueable, SerializesModels;

    public Zone $zone;
    public User $admin;

    public function __construct(Zone $zone, User $admin)
    {
        $this->zone = $zone;
        $this->admin = $admin;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'UrbanMap — Nouvelle zone créée : ' . $this->zone->nom,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.zone_created',
        );
    }
}
