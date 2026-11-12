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
    // Daftarkan aturan izin akses berbasis peran pengguna
    public function boot(): void
    {
        // Admin kelurahan hanya boleh melihat data wilayah tugasnya sendiri
        Gate::define('view-wilayah', function (Pengguna $user, $wilayahId) {
            if ($user->role === 'super_admin') {
                return true;
            }
            if ($user->role === 'admin_kelurahan') {
                return $user->wilayah_id !== null && (int) $user->wilayah_id === (int) $wilayahId;
            }
            return false;
        });

        // Hanya super admin yang boleh mengelola data master sistem
        Gate::define('manage-master', function (Pengguna $user) {
            return $user->role === 'super_admin';
        });
    }
}
