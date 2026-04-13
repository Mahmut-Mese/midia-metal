<?php

namespace App\Mail;

use App\Models\QuoteRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CustomerQuoteResponse extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public QuoteRequest $quote) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Midia Metal Quote Update #'.$this->quote->id,
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.customer-quote-response',
            with: [
                'quote' => $this->quote,
                'accountUrl' => config('app.frontend_url').'/account',
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
