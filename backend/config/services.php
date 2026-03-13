<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'stripe' => [
        'key' => env('STRIPE_KEY'),
        'secret' => env('STRIPE_SECRET'),
    ],

    'shipping' => [
        'provider' => env('SHIPPING_PROVIDER', 'easypost'),
        'mock' => env('SHIPPING_MOCK', true),
        'from_name' => env('SHIPPING_FROM_NAME', env('APP_NAME', 'Midia Metal')),
        'from_company' => env('SHIPPING_FROM_COMPANY', 'Midia Metal'),
        'from_email' => env('SHIPPING_FROM_EMAIL', 'info@midia-metal.com'),
        'from_phone' => env('SHIPPING_FROM_PHONE', '+44 123 456 7890'),
        'from_address_line1' => env('SHIPPING_FROM_ADDRESS_LINE1', 'Unit 8A Cromwell Centre'),
        'from_address_line2' => env('SHIPPING_FROM_ADDRESS_LINE2', 'Roebuck Road, Hainault Business Park'),
        'from_city' => env('SHIPPING_FROM_CITY', 'Ilford'),
        'from_postcode' => env('SHIPPING_FROM_POSTCODE', 'IG6 3UG'),
        'from_country' => env('SHIPPING_FROM_COUNTRY', 'GB'),
        'default_parcel' => [
            'length' => (float) env('SHIPPING_DEFAULT_LENGTH', 30),
            'width' => (float) env('SHIPPING_DEFAULT_WIDTH', 20),
            'height' => (float) env('SHIPPING_DEFAULT_HEIGHT', 10),
            'distance_unit' => env('SHIPPING_DEFAULT_DISTANCE_UNIT', 'cm'),
            'weight' => (float) env('SHIPPING_DEFAULT_WEIGHT', 2),
            'mass_unit' => env('SHIPPING_DEFAULT_MASS_UNIT', 'kg'),
        ],
    ],

    'easypost' => [
        'api_key' => env('EASYPOST_API_KEY'),
        'base_url' => env('EASYPOST_BASE_URL', 'https://api.easypost.com/v2'),
        'default_carrier' => env('EASYPOST_DEFAULT_CARRIER', 'Royal Mail'),
        'default_service' => env('EASYPOST_DEFAULT_SERVICE', 'Tracked 48'),
        'webhook_secret' => env('EASYPOST_WEBHOOK_SECRET'),
    ],

];
