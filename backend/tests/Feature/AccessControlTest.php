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

    public function test_non_user_tidak_boleh_akses_target_dan_refleksi(): void
    {
        $kader = $this->pengguna('kader');

        $this->asUser($kader)->getJson('/api/v1/target')->assertStatus(403);
        $this->asUser($kader)->putJson('/api/v1/target', ['target_air_ml' => 2000])->assertStatus(403);
        $this->asUser($kader)->getJson('/api/v1/refleksi')->assertStatus(403);
        $this->asUser($kader)->postJson('/api/v1/refleksi', ['minggu' => '2026-W45', 'catatan' => 'Uji'])->assertStatus(403);
    }

    public function test_hak_akses_pengaduan_dan_lingkup_404(): void
    {
        $userA = $this->pengguna('user');
        $userB = $this->pengguna('user');
        $kader = $this->pengguna('kader');
        $admin = $this->pengguna('super_admin');

        $this->asUser($kader)->getJson('/api/v1/pengaduan')->assertStatus(403);

        $this->asUser($admin)->postJson('/api/v1/pengaduan', [
            'judul'      => 'Uji',
            'isi'        => 'Keluhan staf',
            'kategori'   => 'aplikasi',
            'wilayah_id' => $this->wilayah()->id,
        ])->assertStatus(403);

        $res = $this->asUser($userA)->postJson('/api/v1/pengaduan', [
            'judul'      => 'Antrean lama',
            'isi'        => 'Pelayanan posbindu lambat',
            'kategori'   => 'layanan_posbindu',
            'wilayah_id' => $this->wilayah()->id,
        ])->assertCreated();

        $id = $res->json('data.id');

        $this->asUser($userB)->getJson("/api/v1/pengaduan/{$id}")->assertStatus(404);
        $this->asUser($userA)->getJson("/api/v1/pengaduan/{$id}")->assertOk();
    }

    public function test_hak_akses_telegram_hanya_warga(): void
    {
        $user  = $this->pengguna('user');
        $admin = $this->pengguna('admin_kelurahan');

        $this->asUser($admin)->getJson('/api/v1/telegram/status')->assertStatus(403);
        $this->asUser($admin)->postJson('/api/v1/telegram/putuskan')->assertStatus(403);

        $res = $this->asUser($user)->getJson('/api/v1/telegram/status')->assertOk();
        $res->assertJsonPath('success', true)
            ->assertJsonPath('data.terhubung', false)
            ->assertJsonStructure(['data' => ['terhubung', 'chat_id', 'link_telegram']]);

        $resPutus = $this->asUser($user)->postJson('/api/v1/telegram/putuskan')->assertOk();
        $resPutus->assertJsonPath('success', true);
    }

    public function test_riwayat_mutasi_wilayah_warga(): void
    {
        $superAdmin = $this->pengguna('super_admin');
        $user       = $this->pengguna('user');

        $wilayahBaru = Wilayah::firstOrCreate(
            ['kode' => '63.72.05.1002'],
            ['nama' => 'Loktabat Selatan', 'tipe' => 'kelurahan']
        );

        $this->asUser($superAdmin)->putJson("/api/v1/admin/pengguna/{$user->id}", [
            'wilayah_id'    => $wilayahBaru->id,
            'alasan_mutasi' => 'Pindah domisili tugas kantor',
        ])->assertOk();

        $this->assertDatabaseHas('riwayat_wilayah', [
            'user_id'           => $user->id,
            'wilayah_asal_id'   => $this->wilayah()->id,
            'wilayah_tujuan_id' => $wilayahBaru->id,
            'alasan'            => 'Pindah domisili tugas kantor',
            'diubah_oleh'       => $superAdmin->id,
        ]);

        $riwayatRes = $this->asUser($superAdmin)->getJson("/api/v1/admin/pengguna/{$user->id}/riwayat-wilayah")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertCount(1, $riwayatRes->json('data'));

        // Non super admin ditolak
        $this->asUser($user)->getJson("/api/v1/admin/pengguna/{$user->id}/riwayat-wilayah")->assertStatus(403);
    }
}
