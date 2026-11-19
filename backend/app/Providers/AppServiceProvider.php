<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

// Tempat pengaturan awal umum saat aplikasi mulai berjalan.
class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void {}
}
