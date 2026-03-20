<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CustomerPasswordReset extends Mailable
{
    use Queueable, SerializesModels;

    public $resetUrl;

    public function __construct(public $user, public string $token)
    {
        $frontendUrl = rtrim((string) config('app.frontend_url'), '/');
        if (empty($frontendUrl)) {
            $frontendUrl = request()->getSchemeAndHttpHost();
        }
        $this->resetUrl = $frontendUrl . '/reset-password?token=' . $token . '&email=' . urlencode($user->email);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Reset Password Notification',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.customer.password-reset',
            with: [
                'resetUrl' => $this->resetUrl,
            ],
        );
    }
}
