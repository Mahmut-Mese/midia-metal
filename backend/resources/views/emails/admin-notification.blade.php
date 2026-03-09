@component('mail::message')
# {{ $title }}

{{ $description }}

@component('mail::button', ['url' => $url])
Go to Admin Panel
@endcomponent

Thanks,<br>
{{ config('app.name') }}
@endcomponent