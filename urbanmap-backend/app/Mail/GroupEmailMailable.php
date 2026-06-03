<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class GroupEmailMailable extends Mailable
{
    use Queueable, SerializesModels;

    public $subject;
    public string $messageContent;
    public string $recipientName;

    /**
     * Create a new message instance.
     */
    public function __construct(string $subject, string $messageContent, string $recipientName)
    {
        $this->subject = $subject;
        $this->messageContent = $messageContent;
        $this->recipientName = $recipientName;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->subject,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.group_email',
        );
    }
}
