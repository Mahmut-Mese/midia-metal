<x-mail::message>
# Quote Update

Hello {{ $quote->name }},

We have reviewed your quote request.

@if($quote->service)
Service: {{ $quote->service }}
@endif

@if($quote->quoted_valid_until)
Valid Until: {{ $quote->quoted_valid_until->format('d M Y') }}
@endif

@if($quote->response_message)
{{ $quote->response_message }}
@else
Your quote has been updated in our system.
@endif

<x-mail::button :url="$accountUrl">
View In My Account
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
