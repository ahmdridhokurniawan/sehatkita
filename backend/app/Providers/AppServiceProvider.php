<?php

namespace App\Providers;

use App\Http\Middleware\InjectBearerFromCookie;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

// Tempat pengaturan awal umum saat aplikasi mulai berjalan.
class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        Sanctum::getAccessTokenFromRequestUsing(function (Request $request) {
            $bearer = $request->bearerToken();
            if (is_string($bearer) && $bearer !== '') {
                return $bearer;
            }

            $cookie = $request->cookie(InjectBearerFromCookie::NAMA_COOKIE);

            return is_string($cookie) && $cookie !== '' ? $cookie : null;
        });

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(100)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('login', function (Request $request) {
            $email = strtolower((string) $request->input('email', ''));

            return [
                Limit::perMinute(5)->by($email.'|'.$request->ip()),
                Limit::perMinute(20)->by('login-ip:'.$request->ip()),
            ];
        });

        RateLimiter::for('register', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });
    }
}
