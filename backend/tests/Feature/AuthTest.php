<?php

namespace Tests\Feature;

use App\Models\Pengguna;
use App\Models\Wilayah;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    /** Wilayah minimal supaya foreign key pengguna valid. */
    private function wilayah(): Wilayah
    {
        return Wilayah::create([
            'kode' => '63.72.05.1001',
            'nama' => 'Guntung Paikat',
            'tipe' => 'kelurahan',
        ]);
    }

    private function pengguna(array $atribut = []): Pengguna
    {
        return Pengguna::create(array_merge([
            'name'       => 'Uji Coba',
            'email'      => 'uji@sehatkita.test',
            'password'   => 'rahasia123',
            'role'       => 'user',
            'wilayah_id' => $this->wilayah()->id,
            'consent_at' => now(),
        ], $atribut));
    }

    public function test_login_berhasil_mengembalikan_token(): void
    {
        $user = $this->pengguna();

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => $user->email,
            'password' => 'rahasia123',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['token', 'user' => ['id', 'email', 'role']]]);

        // Password tidak boleh bocor di response.
        $response->assertJsonMissingPath('data.user.password');
    }

    public function test_login_password_salah_ditolak(): void
    {
        $user = $this->pengguna();

        $this->postJson('/api/v1/auth/login', [
            'email'    => $user->email,
            'password' => 'salah-banget',
        ])->assertStatus(422)
          ->assertJsonValidationErrors('email');

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_login_email_tidak_terdaftar_ditolak(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email'    => 'tidakada@sehatkita.test',
            'password' => 'rahasia123',
        ])->assertStatus(422);
    }

    public function test_akun_nonaktif_tidak_bisa_login(): void
    {
        $user = $this->pengguna(['aktif' => false]);

        $this->postJson('/api/v1/auth/login', [
            'email'    => $user->email,
            'password' => 'rahasia123',
        ])->assertStatus(403)
          ->assertJsonPath('success', false);
    }

    public function test_login_dibatasi_setelah_5_percobaan(): void
    {
        $user = $this->pengguna();

        // 5 percobaan pertama: ditolak karena password salah (422).
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email'    => $user->email,
                'password' => 'salah',
            ])->assertStatus(422);
        }

        // Percobaan ke-6 kena throttle.
        $this->postJson('/api/v1/auth/login', [
            'email'    => $user->email,
            'password' => 'salah',
        ])->assertStatus(429);
    }

    public function test_me_wajib_token(): void
    {
        $this->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    public function test_me_mengembalikan_user_pemilik_token(): void
    {
        $user = $this->pengguna();
        $token = $user->createToken('uji')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', $user->email);
    }

    public function test_logout_mencabut_token(): void
    {
        $user = $this->pengguna();
        $token = $user->createToken('uji')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/auth/logout')
            ->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 0);

        // Guard auth menyimpan user yang sudah di-resolve; lupakan dulu supaya
        // request berikutnya benar-benar memeriksa ulang token ke database.
        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/auth/me')
            ->assertStatus(401);
    }

    public function test_register_membuat_user_role_user(): void
    {
        $wilayah = $this->wilayah();

        $this->postJson('/api/v1/auth/register', [
            'name'                  => 'Pendaftar Baru',
            'email'                 => 'baru@sehatkita.test',
            'password'              => 'Rahasia123!',
            'password_confirmation' => 'Rahasia123!',
            'wilayah_id'            => $wilayah->id,
        ])->assertStatus(201)
          ->assertJsonPath('data.user.role', 'user');

        $baru = Pengguna::where('email', 'baru@sehatkita.test')->firstOrFail();
        $this->assertTrue(Hash::check('Rahasia123!', $baru->password));
        // Password harus tersimpan sebagai hash, bukan teks asli.
        $this->assertNotSame('Rahasia123!', $baru->password);
    }

    public function test_register_password_harus_punya_kapital_angka_dan_simbol(): void
    {
        $wilayah = $this->wilayah();

        // Tanpa huruf kapital
        $this->postJson('/api/v1/auth/register', [
            'name'                  => 'Uji Lemah 1',
            'email'                 => 'lemah1@sehatkita.test',
            'password'              => 'rahasia!123',
            'password_confirmation' => 'rahasia!123',
            'wilayah_id'            => $wilayah->id,
        ])->assertStatus(422)->assertJsonValidationErrors('password');

        // Tanpa angka
        $this->postJson('/api/v1/auth/register', [
            'name'                  => 'Uji Lemah 2',
            'email'                 => 'lemah2@sehatkita.test',
            'password'              => 'Rahasia!abc',
            'password_confirmation' => 'Rahasia!abc',
            'wilayah_id'            => $wilayah->id,
        ])->assertStatus(422)->assertJsonValidationErrors('password');

        // Tanpa simbol
        $this->postJson('/api/v1/auth/register', [
            'name'                  => 'Uji Lemah 3',
            'email'                 => 'lemah3@sehatkita.test',
            'password'              => 'Rahasia123',
            'password_confirmation' => 'Rahasia123',
            'wilayah_id'            => $wilayah->id,
        ])->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_register_email_ganda_ditolak(): void
    {
        $user    = $this->pengguna();
        $wilayah = $user->wilayah;

        $this->postJson('/api/v1/auth/register', [
            'name'                  => 'Duplikat',
            'email'                 => $user->email,
            'password'              => 'Rahasia123!',
            'password_confirmation' => 'Rahasia123!',
            'wilayah_id'            => $wilayah->id,
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_register_password_lemah_ditolak(): void
    {
        $wilayah = $this->wilayah();

        // Tanpa simbol dan tanpa huruf kapital
        $this->postJson('/api/v1/auth/register', [
            'name'                  => 'Lemah',
            'email'                 => 'lemah@sehatkita.test',
            'password'              => 'rahasia123',
            'password_confirmation' => 'rahasia123',
            'wilayah_id'            => $wilayah->id,
        ])->assertStatus(422)->assertJsonValidationErrors('password');
    }
}
