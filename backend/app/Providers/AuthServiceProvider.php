<?php

namespace App\Providers;

use App\Models\Pengguna;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

// Mengatur batasan hak akses supaya setiap peran hanya bisa membuka data yang sesuai tugasnya.
class AuthServiceProvider extends ServiceProvider
{
    public function boot(): void
    {

        Gate::define('view-wilayah', function (Pengguna $user, $wilayahId) {
            if ($user->role === 'super_admin') {
                return true;
            }
            if ($user->role === 'admin_kelurahan') {
                return $user->wilayah_id !== null && (int) $user->wilayah_id === (int) $wilayahId;
            }

            return false;
        });

        Gate::define('manage-master', function (Pengguna $user) {
            return $user->role === 'super_admin';
        });
    }
}
