<?php

namespace Tests\Feature;

use App\Models\Pengguna;
use App\Models\Profil;
use App\Models\Wilayah;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Pagar peran (role guard) — kontrak §2 & §15.
 * Memastikan endpoint terlarang benar-benar 403, bukan cuma disembunyikan di UI.
 */
class AccessControlTest extends TestCase
{
    use RefreshDatabase;

    private function wilayah(): Wilayah
    {
        return Wilayah::firstOrCreate(
            ['kode' => '63.72.05.1001'],
            ['nama' => 'Guntung Paikat', 'tipe' => 'kelurahan']
        );
    }

    private function pengguna(string $role): Pengguna
    {
        $user = Pengguna::create([
            'name'       => ucfirst($role),
            'email'      => $role . '.' . uniqid() . '@sehatkita.test',
            'password'   => 'rahasia123',
            'role'       => $role,
            'wilayah_id' => $this->wilayah()->id,
            'consent_at' => now(),
            'aktif'      => true,
        ]);

        Profil::create([
            'user_id'       => $user->id,
            'tgl_lahir'     => now()->subYears(35)->toDateString(),
            'jenis_kelamin' => 'P',
            'tinggi_cm'     => 160,
        ]);

        return $user;
    }

    private function asUser(Pengguna $user): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeaders([
            'Authorization' => 'Bearer ' . $user->createToken('uji')->plainTextToken,
        ]);
    }

    public function test_semua_endpoint_terlindungi_menolak_tanpa_token(): void
    {
        $daftar = [
            ['get', '/api/v1/auth/me'],
            ['get', '/api/v1/profil'],
            ['get', '/api/v1/catatan-kesehatan'],
            ['get', '/api/v1/insight'],
            ['get', '/api/v1/dashboard/pribadi'],
            ['get', '/api/v1/admin/pengguna'],
            ['get', '/api/v1/rujukan'],
        ];

        foreach ($daftar as [$method, $url]) {
            $this->{$method . 'Json'}($url)->assertStatus(401);
        }
    }

    public function test_user_biasa_tidak_boleh_akses_admin_master(): void
    {
        $user = $this->pengguna('user');

        foreach ([
            '/api/v1/admin/pengguna',
            '/api/v1/admin/indikator',
            '/api/v1/admin/ambang-kategori',
            '/api/v1/admin/faskes',
            '/api/v1/admin/log-audit',
            '/api/v1/admin/statistik',
        ] as $url) {
            $this->asUser($user)->getJson($url)->assertStatus(403);
        }
    }

    public function test_kader_tidak_boleh_akses_admin_master(): void
    {
        $kader = $this->pengguna('kader');

        $this->asUser($kader)->getJson('/api/v1/admin/pengguna')->assertStatus(403);
    }

    public function test_super_admin_boleh_akses_admin_master(): void
    {
        $admin = $this->pengguna('super_admin');

        $this->asUser($admin)->getJson('/api/v1/admin/pengguna')->assertOk();

        $this->asUser($admin)->getJson('/api/v1/admin/indikator')->assertOk();
    }

    public function test_user_biasa_tidak_boleh_dashboard_kelurahan(): void
    {
        $user = $this->pengguna('user');

        $this->asUser($user)->getJson('/api/v1/dashboard/kelurahan')->assertStatus(403);
        $this->asUser($user)->getJson('/api/v1/laporan/kelurahan')->assertStatus(403);
    }

    public function test_admin_kelurahan_boleh_dashboard_kelurahan(): void
    {
        $admin = $this->pengguna('admin_kelurahan');

        $this->asUser($admin)->getJson('/api/v1/dashboard/kelurahan')->assertOk();
    }

    public function test_user_boleh_insight_sendiri(): void
    {
        $user = $this->pengguna('user');

        $this->asUser($user)
            ->getJson('/api/v1/insight')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data']);
    }

    public function test_ambang_insight_terbuka_untuk_user(): void
    {
        $user = $this->pengguna('user');

        $this->asUser($user)->getJson('/api/v1/insight/ambang')->assertOk();
    }

    public function test_user_biasa_tidak_boleh_simpan_target_gamifikasi_admin(): void
    {
        // Hanya memastikan endpoint tulis admin ikut terpagari.
        $user = $this->pengguna('user');

        $this->asUser($user)
            ->postJson('/api/v1/admin/indikator', ['kode' => 'zz', 'nama' => 'Uji', 'satuan' => 'x'])
            ->assertStatus(403);
    }
}
