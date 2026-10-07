<?php
/**
 * Sanctum configuration – minimal untuk API token (SPA style tidak dipakai).
 * Sesuaikan `stateful` bila nanti pakai cookie‑based SPA.
 */

return [

    /*
    |--------------------------------------------------------------------------
    | Expiration Minutes
    |--------------------------------------------------------------------------
    | Berapa lama token API berlaku (menit). Null = tidak kedaluwarsa.
    | 60 menit (1 jam) biasanya cukup aman untuk mobile/web.
    |
    */
    'expiration' => 60,

    /*
    |--------------------------------------------------------------------------
    | Middleware
    |--------------------------------------------------------------------------
    |
    | Middleware yang dijalankan oleh Sanctum pada request yang memerlukan
    | otentikasi token. Biasanya hanya `EnsureFrontendRequestsAreStateful`
    | kalau pakai cookie, tapi untuk API token cukup `auth:sanctum`.
    |
    */
    'middleware' => [
        'verify_csrf_token' => false, // tidak pakai session/csrf di API
    ],
];
