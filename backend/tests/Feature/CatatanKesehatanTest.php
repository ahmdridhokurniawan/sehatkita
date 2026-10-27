<?php

namespace Tests\Feature;

use App\Models\Pengguna;
use App\Models\Profil;
use App\Models\Wilayah;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatatanKesehatanTest extends TestCase
{
    use RefreshDatabase;

    /** Wilayah satu-satunya per test (kode unique). */
    private function wilayah(): Wilayah
    {
        return Wilayah::firstOrCreate(
            ['kode' => '63.72.05.1001'],
            ['nama' => 'Guntung Paikat', 'tipe' => 'kelurahan']
        );
    }

    private function pengguna(string $role = 'user', array $atribut = []): Pengguna
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

    /**
     * Request sebagai user tertentu.
     *
     * `forgetGuards()` wajib: dalam satu tes, Laravel memakai instance app yang
     * sama untuk semua request, dan guard menyimpan user hasil resolve pertama.
     * Tanpa ini, request kedua tetap dianggap milik user pertama — persis
     * jebakan yang bikin tes logout di AuthTest sempat gagal.
     */
    private function asUser(Pengguna $user): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeaders([
            'Authorization' => 'Bearer ' . $user->createToken('uji')->plainTextToken,
        ]);
    }

    private function denganProfil(Pengguna $user, array $atribut = []): void
    {
        Profil::create(array_merge([
            'user_id'       => $user->id,
            'tgl_lahir'     => now()->subYears(40)->toDateString(),
            'jenis_kelamin' => 'L',
            'tinggi_cm'     => 170,
        ], $atribut));
    }

    // ---------- store ----------

    public function test_user_bisa_menyimpan_catatan_sendiri(): void
    {
        $user = $this->pengguna();
        $this->denganProfil($user);

        $response = $this->asUser($user)
            ->postJson('/api/v1/catatan-kesehatan', [
                'dicatat_pada' => now()->toDateString(),
                'sumber'       => 'mandiri',
                'bb_kg'        => 70,
                'sistol'       => 120,
                'diastol'      => 80,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user_id', $user->id);

        $this->assertDatabaseHas('catatan_kesehatan', [
            'user_id' => $user->id,
            'bb_kg'   => 70,
        ]);
    }

    public function test_tanpa_pengukuran_ditolak_422(): void
    {
        $user = $this->pengguna();
        $this->denganProfil($user);

        $this->asUser($user)
            ->postJson('/api/v1/catatan-kesehatan', [
                'dicatat_pada' => now()->toDateString(),
                'sumber'       => 'mandiri',
            ])->assertStatus(422)->assertJsonValidationErrors('pengukuran');
    }

    public function test_sistol_tanpa_diastol_ditolak(): void
    {
        $user = $this->pengguna();
        $this->denganProfil($user);

        $this->asUser($user)
            ->postJson('/api/v1/catatan-kesehatan', [
                'dicatat_pada' => now()->toDateString(),
                'sumber'       => 'mandiri',
                'sistol'       => 130,
            ])->assertStatus(422)->assertJsonValidationErrors('sistol');
    }

    public function test_gula_darah_tanpa_jenis_ditolak(): void
    {
        $user = $this->pengguna();
        $this->denganProfil($user);

        $this->asUser($user)
            ->postJson('/api/v1/catatan-kesehatan', [
                'dicatat_pada' => now()->toDateString(),
                'sumber'       => 'mandiri',
                'gula_darah'   => 110,
            ])->assertStatus(422)->assertJsonValidationErrors('jenis_gula_darah');
    }

    public function test_tanggal_masa_depan_ditolak(): void
    {
        $user = $this->pengguna();
        $this->denganProfil($user);

        $this->asUser($user)
            ->postJson('/api/v1/catatan-kesehatan', [
                'dicatat_pada' => now()->addDay()->toDateString(),
                'sumber'       => 'mandiri',
                'bb_kg'        => 70,
            ])->assertStatus(422)->assertJsonValidationErrors('dicatat_pada');
    }

    public function test_tanpa_consent_ditolak(): void
    {
        $user = $this->pengguna(atribut: ['consent_at' => null]);
        $this->denganProfil($user);

        $this->asUser($user)
            ->postJson('/api/v1/catatan-kesehatan', [
                'dicatat_pada' => now()->toDateString(),
                'sumber'       => 'mandiri',
                'bb_kg'        => 70,
            ])->assertStatus(422)->assertJsonValidationErrors('consent');
    }

    public function test_user_id_diabaikan_untuk_sumber_mandiri(): void
    {
        $user  = $this->pengguna();
        $lain  = $this->pengguna();
        $this->denganProfil($user);
        $this->denganProfil($lain);

        // Kirim user_id orang lain: server harus tetap mencatat atas nama pemanggil.
        $this->asUser($user)
            ->postJson('/api/v1/catatan-kesehatan', [
                'dicatat_pada' => now()->toDateString(),
                'sumber'       => 'mandiri',
                'bb_kg'        => 70,
                'user_id'      => $lain->id,
            ])->assertStatus(201)
              ->assertJsonPath('data.user_id', $user->id);

        $this->assertDatabaseMissing('catatan_kesehatan', ['user_id' => $lain->id]);
    }

    // ---------- index / isolasi data ----------

    public function test_user_hanya_melihat_catatannya_sendiri(): void
    {
        $user = $this->pengguna();
        $lain = $this->pengguna();
        $this->denganProfil($user);
        $this->denganProfil($lain);

        $this->asUser($lain)
            ->postJson('/api/v1/catatan-kesehatan', [
                'dicatat_pada' => now()->toDateString(),
                'sumber'       => 'mandiri',
                'bb_kg'        => 90,
            ])->assertStatus(201);

        $this->asUser($user)
            ->postJson('/api/v1/catatan-kesehatan', [
                'dicatat_pada' => now()->toDateString(),
                'sumber'       => 'mandiri',
                'bb_kg'        => 60,
            ])->assertStatus(201);

        $data = $this->asUser($user)
            ->getJson('/api/v1/catatan-kesehatan')
            ->assertOk()
            ->json('data');

        $this->assertCount(1, $data);
        $this->assertSame($user->id, $data[0]['user_id']);
    }

    public function test_user_meminta_user_id_orang_lain_dapat_404(): void
    {
        $user = $this->pengguna();
        $lain = $this->pengguna();
        $this->denganProfil($user);

        $this->asUser($user)
            ->getJson('/api/v1/catatan-kesehatan?user_id=' . $lain->id)
            ->assertStatus(404);
    }

    public function test_admin_kelurahan_tidak_boleh_akses_data_individu(): void
    {
        $admin = $this->pengguna('admin_kelurahan');

        $this->asUser($admin)
            ->getJson('/api/v1/catatan-kesehatan')
            ->assertStatus(403);
    }

    public function test_tanpa_token_ditolak_401(): void
    {
        $this->getJson('/api/v1/catatan-kesehatan')->assertStatus(401);
    }

    public function test_filter_sumber_bekerja(): void
    {
        $user = $this->pengguna('super_admin');
        $warga = $this->pengguna();

        // Dua catatan: satu mandiri milik warga, satu puskesmas.
        $this->asUser($warga)
            ->postJson('/api/v1/catatan-kesehatan', [
                'dicatat_pada' => now()->toDateString(),
                'sumber'       => 'mandiri',
                'bb_kg'        => 65,
            ])->assertStatus(201);

        $this->asUser($user)
            ->postJson('/api/v1/catatan-kesehatan', [
                'dicatat_pada' => now()->toDateString(),
                'sumber'       => 'puskesmas',
                'bb_kg'        => 66,
                'user_id'      => $warga->id,
            ])->assertStatus(201);

        $this->asUser($user)
            ->getJson('/api/v1/catatan-kesehatan?sumber=puskesmas')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->asUser($user)
            ->getJson('/api/v1/catatan-kesehatan?sumber=mandiri')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }
}
