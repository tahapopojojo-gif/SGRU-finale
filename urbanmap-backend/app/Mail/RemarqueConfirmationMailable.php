<?php

namespace App\Mail;

use App\Models\Remarque;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RemarqueConfirmationMailable extends Mailable
{
    use Queueable, SerializesModels;

    public Remarque $remarque;
    public User $user;

    /**
     * Create a new message instance.
     */
    public function __construct(Remarque $remarque, User $user)
    {
        $this->remarque = $remarque;
        $this->user = $user;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'UrbanMap — Votre signalement a été reçu',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.remarque_confirmation',
        );
    }
}
