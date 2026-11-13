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

    public function test_admin_kelurahan_bisa_lihat_detail_wilayahnya_sendiri_saja(): void
    {
        $admin = $this->pengguna('admin_kelurahan');
        $lain  = Wilayah::firstOrCreate(
            ['kode' => '63.72.05.1003'],
            ['nama' => 'Sungai Besar', 'tipe' => 'kelurahan']
        );

        $this->asUser($admin)->getJson("/api/v1/wilayah/{$admin->wilayah_id}")
            ->assertOk()
            ->assertJsonPath('data.id', $admin->wilayah_id);

        $this->asUser($admin)->getJson("/api/v1/wilayah/{$lain->id}")->assertStatus(403);
    }

    public function test_filter_tanggal_log_audit_bersifat_inklusif(): void
    {
        $superAdmin = $this->pengguna('super_admin');
        $warga      = $this->pengguna('user');

        // Akses profil warga oleh super_admin memicu pembuatan LogAudit pada hari ini
        $this->asUser($superAdmin)->getJson("/api/v1/profil?user_id={$warga->id}")->assertOk();

        $hariIni = now()->toDateString();
        $res = $this->asUser($superAdmin)
            ->getJson("/api/v1/admin/log-audit?dari={$hariIni}&sampai={$hariIni}")
            ->assertOk();

        $this->assertNotEmpty($res->json('data'));
    }

    public function test_rujukan_otomatis_menyimpan_flag_dan_indikator_dengan_benar(): void
    {
        $warga  = $this->pengguna('user');
        $faskes = \App\Models\Faskes::create([
            'wilayah_id' => $warga->wilayah_id,
            'nama'       => 'Puskesmas Guntung Paikat',
            'jenis'      => 'puskesmas',
        ]);

        $rujukan = \App\Models\Rujukan::create([
            'user_id'   => $warga->id,
            'faskes_id' => $faskes->id,
            'alasan'    => 'Rujukan otomatis uji',
            'status'    => 'baru',
            'otomatis'  => true,
            'indikator' => 'tensi',
        ]);

        $this->assertTrue($rujukan->fresh()->otomatis);
        $this->assertSame('tensi', $rujukan->fresh()->indikator);
    }

    public function test_posbindu_dan_program_menolak_akses_lintas_peran_dan_wilayah(): void
    {
        $kelA = $this->wilayah();
        $kelB = Wilayah::firstOrCreate(
            ['kode' => '63.72.05.1009'],
            ['nama' => 'Kemuning', 'tipe' => 'kelurahan']
        );

        $wargaA = $this->pengguna('user');
        $wargaA->update(['nik' => '6372050101010001']);
        $kaderB = Pengguna::create([
            'name'       => 'Kader B',
            'email'      => 'kader.b.' . uniqid() . '@sehatkita.test',
            'password'   => 'rahasia123',
            'role'       => 'kader',
            'wilayah_id' => $kelB->id,
            'consent_at' => now(),
            'aktif'      => true,
        ]);

        $sesiA = \App\Models\SesiPosbindu::create([
            'wilayah_id' => $kelA->id,
            'tanggal'    => now()->toDateString(),
            'lokasi'     => 'Posbindu A',
            'status'     => 'akan_datang',
        ]);

        // showSesi ditolak untuk warga biasa & kader kelurahan lain
        $this->asUser($wargaA)->getJson("/api/v1/posbindu/sesi/{$sesiA->id}")->assertStatus(403);
        $this->asUser($kaderB)->getJson("/api/v1/posbindu/sesi/{$sesiA->id}")->assertStatus(403);

        // cariNik kader B tidak melihat warga kelurahan A
        $resNik = $this->asUser($kaderB)->getJson('/api/v1/pengguna/cari-nik?nik=637205')->assertOk();
        $this->assertCount(0, $resNik->json('data'));

        // Program wilayah A tidak boleh diikuti warga kelurahan lain, daftar peserta ditolak untuk warga biasa
        $progA = \App\Models\Program::create([
            'wilayah_id' => $kelA->id,
            'judul'      => 'Senam Kel A',
            'jenis'      => 'olahraga',
            'mulai'      => now()->toDateString(),
            'selesai'    => now()->addDays(5)->toDateString(),
            'exp_reward' => 50,
            'status'     => 'berjalan',
        ]);
        \App\Models\PesertaProgram::create([
            'program_id' => $progA->id,
            'user_id'    => $wargaA->id,
            'status'     => 'terdaftar',
        ]);

        $this->asUser($wargaA)->getJson("/api/v1/program/{$progA->id}/peserta")->assertStatus(403);
        $this->asUser($kaderB)->patchJson("/api/v1/program/{$progA->id}/peserta", [
            'user_id' => $wargaA->id,
            'status'  => 'selesai',
        ])->assertStatus(403);
    }

    public function test_webhook_telegram_menolak_secret_salah_dan_profil_menjaga_peringkat(): void
    {
        config()->set('services.telegram.webhook_secret', 'rahasia-webhook-uji');
        $this->postJson('/api/v1/telegram/webhook', ['message' => ['chat' => ['id' => 123], 'text' => '/start']])
            ->assertStatus(403);
        $this->withHeader('X-Telegram-Bot-Api-Secret-Token', 'rahasia-webhook-uji')
            ->postJson('/api/v1/telegram/webhook', ['message' => ['chat' => ['id' => 123], 'text' => '/start']])
            ->assertOk();

        $user = $this->pengguna('user');
        $user->profil->update(['tampil_di_peringkat' => true]);

        $this->asUser($user)->putJson('/api/v1/profil', [
            'tgl_lahir'         => '1990-01-01',
            'jenis_kelamin'     => 'P',
            'tinggi_cm'         => 160,
            'tingkat_aktivitas' => 'sedang',
            'merokok'           => false,
            'riwayat_keluarga'  => ['tidak_ada'],
        ])->assertOk()->assertJsonPath('data.tampil_di_peringkat', true);
    }
}
