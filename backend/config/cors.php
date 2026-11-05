<?php

/*
|--------------------------------------------------------------------------
| Konfigurasi CORS
|--------------------------------------------------------------------------
|
| Frontend Next.js dan backend Laravel berjalan di origin berbeda, jadi
| browser mengirim preflight (OPTIONS) sebelum setiap request yang membawa
| header Authorization. Bila origin frontend tidak terdaftar di sini,
| browser memblokir responsnya dan aplikasi hanya menampilkan
| "Failed to fetch" — tanpa pesan yang berguna.
|
| Origin produksi diisi lewat CORS_ALLOWED_ORIGINS (dipisah koma) di .env.
| Di luar produksi, semua port localhost dan hostname *.test otomatis
| diizinkan supaya port dev yang berubah-ubah tidak perlu didaftarkan satu
| per satu.
|
*/

$produksi = env('APP_ENV', 'production') === 'production';

$asalDariEnv = array_values(array_filter(array_map(
    'trim',
    explode(',', (string) env('CORS_ALLOWED_ORIGINS', ''))
)));

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $produksi
        ? $asalDariEnv
        : array_merge($asalDariEnv, ['http://sehatkita.test', 'https://sehatkita.test']),

    // Pola regex untuk origin yang port-nya dinamis (Next.js localhost:3000/3001/3002, dll).
    'allowed_origins_patterns' => $produksi ? [] : [
        '#^http://(localhost|127\.0\.0\.1)(:\d+)?$#',
        '#^https?://([a-z0-9-]+\.)*test$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    // Cache preflight 24 jam supaya browser tidak membebani server terus-menerus.
    'max_age' => 86400,

    'supports_credentials' => true,

];
