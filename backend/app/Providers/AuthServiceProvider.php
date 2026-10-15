<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\Pengguna;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        Gate::define('view-wilayah', function (Pengguna $user, $wilayahId) {
            if ($user->role === 'super_admin') {
                return true;
            }
            if ($user->role === 'admin_kelurahan') {
                return $user->wilayah_id === $wilayahId;
            }
            return false;
        });

        Gate::define('manage-master', function (Pengguna $user) {
            return $user->role === 'super_admin';
        });
    }
}
