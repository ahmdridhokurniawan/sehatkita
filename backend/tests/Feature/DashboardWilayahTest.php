<?php

namespace Tests\Feature;

use App\Models\Pengguna;
use App\Models\Profil;
use App\Models\Wilayah;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Dashboard wilayah — kontrak §9.1 & §9.2.
 * Fokus: agregat tidak boleh membocorkan data individu (k-anonymity).
 */
class DashboardWilayahTest extends TestCase
{
    use RefreshDatabase;

    private function wilayah(): Wilayah
    {
        return Wilayah::firstOrCreate(
            ['kode' => '63.72.05.1001'],
            ['nama' => 'Guntung Paikat', 'tipe' => 'kelurahan']
        );
    }

    private function pengguna(string $role, array $atribut = []): Pengguna
    {
        return Pengguna::create(array_merge([
            'name'       => ucfirst($role),
            'email'      => $role . '.' . uniqid() . '@sehatkita.test',
            'password'   => 'rahasia123',
            'role'       => $role,
            'wilayah_id' => $this->wilayah()->id,
            'consent_at' => now(),
            'aktif'      => true,
        ], $atribut));
    }

    private function wargaDenganProfil(string $tglLahir): Pengguna
    {
        $warga = $this->pengguna('user');

        Profil::create([
            'user_id'       => $warga->id,
            'tgl_lahir'     => $tglLahir,
            'jenis_kelamin' => 'L',
            'tinggi_cm'     => 165,
        ]);

        return $warga;
    }

    private function asUser(Pengguna $user): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeaders([
            'Authorization' => 'Bearer ' . $user->createToken('uji')->plainTextToken,
        ]);
    }

    public function test_kelompok_usia_disembunyikan_bila_kurang_dari_5_orang(): void
    {
        $admin = $this->pengguna('admin_kelurahan');

        // 2 warga di kelompok umur yang sama → di bawah ambang sel minimum.
        $this->wargaDenganProfil(now()->subYears(30)->toDateString());
        $this->wargaDenganProfil(now()->subYears(32)->toDateString());

        $data = $this->asUser($admin)
            ->getJson('/api/v1/dashboard/kelurahan')
            ->assertOk()
            ->json('data');

        $this->assertSame([], $data['distribusi_kelompok_usia']);
        $this->assertTrue($data['ada_data_disembunyikan']);
    }

    public function test_kelompok_usia_tampil_bila_5_orang_atau_lebih(): void
    {
        $admin = $this->pengguna('admin_kelurahan');

        for ($i = 0; $i < 6; $i++) {
            $this->wargaDenganProfil(now()->subYears(30 + $i % 3)->toDateString());
        }

        $data = $this->asUser($admin)
            ->getJson('/api/v1/dashboard/kelurahan')
            ->assertOk()
            ->json('data');

        $this->assertNotEmpty($data['distribusi_kelompok_usia']);
        $this->assertSame('30-34', $data['distribusi_kelompok_usia'][0]['kelompok']);
        $this->assertSame(6, $data['distribusi_kelompok_usia'][0]['jumlah']);
    }

    public function test_tren_bulanan_mengelompokkan_per_bulan(): void
    {
        $admin = $this->pengguna('admin_kelurahan');
        $warga = $this->wargaDenganProfil(now()->subYears(30)->toDateString());

        foreach ([now(), now()->subDays(1)] as $tanggal) {
            $this->asUser($warga)->postJson('/api/v1/catatan-kesehatan', [
                'dicatat_pada' => $tanggal->toDateString(),
                'sumber'       => 'mandiri',
                'bb_kg'        => 60,
            ])->assertStatus(201);
        }

        $data = $this->asUser($admin)
            ->getJson('/api/v1/dashboard/kelurahan')
            ->assertOk()
            ->json('data');

        $this->assertNotEmpty($data['tren']);
        $this->assertSame(now()->format('Y-m'), $data['tren'][0]['periode']);
        $this->assertSame(2, $data['tren'][0]['total_pencatatan']);
    }

    public function test_admin_kelurahan_hanya_melihat_wilayahnya_sendiri(): void
    {
        $lain = Wilayah::create([
            'kode' => '63.72.04.1001',
            'nama' => 'Loktabat Utara',
            'tipe' => 'kelurahan',
        ]);

        $admin      = $this->pengguna('admin_kelurahan');
        $wargaLain  = $this->pengguna('user', ['wilayah_id' => $lain->id]);

        Profil::create([
            'user_id'       => $wargaLain->id,
            'tgl_lahir'     => now()->subYears(30)->toDateString(),
            'jenis_kelamin' => 'P',
            'tinggi_cm'     => 160,
        ]);

        $data = $this->asUser($admin)
            ->getJson('/api/v1/dashboard/kelurahan')
            ->assertOk()
            ->json('data');

        $this->assertSame($admin->wilayah_id, $data['wilayah']['id']);
        $this->assertSame(0, $data['total_peserta']);
    }

    public function test_super_admin_wajib_sebut_wilayah(): void
    {
        $admin = $this->pengguna('super_admin');

        $this->asUser($admin)
            ->getJson('/api/v1/dashboard/kelurahan')
            ->assertStatus(422);
    }

    public function test_kader_tidak_boleh_dashboard_kelurahan(): void
    {
        $kader = $this->pengguna('kader');

        $this->asUser($kader)
            ->getJson('/api/v1/dashboard/kelurahan')
            ->assertStatus(403);
    }
}
