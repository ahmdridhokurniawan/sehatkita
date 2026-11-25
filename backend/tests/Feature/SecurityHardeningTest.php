<?php

namespace Tests\Feature;

use App\Models\Faskes;
use App\Models\Pengguna;
use App\Models\PesertaProgram;
use App\Models\Profil;
use App\Models\Program;
use App\Models\Wilayah;
use App\Services\TelegramService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    private Wilayah $kelurahanA;
    private Wilayah $kelurahanB;

    protected function setUp(): void
    {
        parent::setUp();

        $kecamatan = Wilayah::create([
            'kode' => '63.72.05',
            'nama' => 'Banjarbaru Selatan',
            'tipe' => 'kecamatan',
        ]);

        $this->kelurahanA = Wilayah::create([
            'kode' => '63.72.05.1001',
            'nama' => 'Guntung Paikat',
            'tipe' => 'kelurahan',
            'parent_id' => $kecamatan->id,
        ]);

        $this->kelurahanB = Wilayah::create([
            'kode' => '63.72.05.1002',
            'nama' => 'Kemuning',
            'tipe' => 'kelurahan',
            'parent_id' => $kecamatan->id,
        ]);
    }

    private function buatPengguna(string $role, array $atribut = []): Pengguna
    {
        $seq = Pengguna::count() + 1;

        $pengguna = Pengguna::create(array_merge([
            'name' => ucfirst($role).' '.$seq,
            'email' => "{$role}{$seq}@sehatkita.test",
            'password' => Hash::make('Rahasia123!'),
            'role' => $role,
            'wilayah_id' => $this->kelurahanA->id,
            'consent_at' => now(),
            'aktif' => true,
        ], $atribut));

        if ($pengguna->role === 'user') {
            Profil::create([
                'user_id' => $pengguna->id,
                'tgl_lahir' => '1992-04-12',
                'jenis_kelamin' => 'L',
                'tinggi_cm' => 170,
            ]);
        }

        return $pengguna;
    }

    private function asUser(Pengguna $pengguna): static
    {
        $this->app['auth']->forgetGuards();
        $token = $pengguna->createToken('sec-test')->plainTextToken;

        return $this->withHeader('Authorization', 'Bearer '.$token);
    }

    public function test_kader_tidak_bisa_akses_profil_atau_rujukan_staff_sekelurahan(): void
    {
        $kader = $this->buatPengguna('kader');
        $kaderLain = $this->buatPengguna('kader');
        $admin = $this->buatPengguna('admin_kelurahan');
        $faskes = Faskes::create([
            'wilayah_id' => $this->kelurahanA->id,
            'nama' => 'Puskesmas Guntung Paikat',
            'jenis' => 'puskesmas',
        ]);

        $this->asUser($kader)->getJson('/api/v1/profil?user_id='.$admin->id)->assertStatus(404);
        $this->asUser($kader)->getJson('/api/v1/profil?user_id='.$kaderLain->id)->assertStatus(404);

        $this->asUser($kader)->postJson('/api/v1/rujukan', [
            'user_id' => $admin->id,
            'faskes_id' => $faskes->id,
            'alasan' => 'Percobaan eskalasi',
        ])->assertStatus(404);
    }

    public function test_webhook_telegram_menolak_jika_secret_kosong(): void
    {
        config()->set('services.telegram.webhook_secret', '');

        $this->postJson('/api/v1/telegram/webhook', [
            'message' => ['chat' => ['id' => 12345], 'text' => '/start palsu'],
        ])->assertStatus(403);
    }

    public function test_edukasi_menolak_skema_non_http_pada_media_video_url(): void
    {
        $admin = $this->buatPengguna('admin_kelurahan');

        $this->asUser($admin)->postJson('/api/v1/edukasi', [
            'judul' => 'Materi Uji XSS',
            'ringkasan' => 'Ringkasan materi',
            'konten' => 'Konten materi edukasi yang aman.',
            'kategori' => 'umum',
            'media_video_url' => 'javascript:alert(1)',
        ])->assertStatus(422)->assertJsonValidationErrors(['media_video_url']);

        $this->asUser($admin)->postJson('/api/v1/edukasi', [
            'judul' => 'Materi Video Valid',
            'ringkasan' => 'Ringkasan materi',
            'konten' => 'Konten materi edukasi yang aman.',
            'kategori' => 'umum',
            'media_video_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ])->assertStatus(201);
    }

    public function test_perubahan_role_atau_wilayah_mencabut_sesi_aktif(): void
    {
        $superAdmin = $this->buatPengguna('super_admin', ['wilayah_id' => null]);
        $target = $this->buatPengguna('kader');

        $loginRes = $this->withServerVariables(['REMOTE_ADDR' => '10.1.2.3'])
            ->postJson('/api/v1/auth/login', [
                'email' => $target->email,
                'password' => 'Rahasia123!',
            ])->assertOk();
        $tokenLama = $loginRes->json('data.token');

        $this->asUser($superAdmin)->putJson("/api/v1/admin/pengguna/{$target->id}", [
            'role' => 'user',
        ])->assertOk();

        $this->app['auth']->forgetGuards();
        $this->withServerVariables(['REMOTE_ADDR' => '10.1.2.3'])
            ->withHeader('Authorization', 'Bearer '.$tokenLama)
            ->getJson('/api/v1/auth/me')
            ->assertStatus(401);
    }

    public function test_program_berhenti_bukti_dan_paginasi_menegakkan_isolasi_serta_validasi(): void
    {
        $kaderA = $this->buatPengguna('kader');
        $kaderLain = $this->buatPengguna('kader');
        $wargaKaderLain = $this->buatPengguna('user', ['kader_id' => $kaderLain->id]);
        $wargaTanpaWilayah = $this->buatPengguna('user', ['wilayah_id' => null]);

        $progB = Program::create([
            'wilayah_id' => $this->kelurahanB->id,
            'judul' => 'Program Kelurahan B',
            'jenis' => 'olahraga',
            'mulai' => now()->toDateString(),
            'selesai' => now()->addDays(7)->toDateString(),
            'exp_reward' => 50,
        ]);

        $wargaB = $this->buatPengguna('user', ['wilayah_id' => $this->kelurahanB->id]);
        PesertaProgram::create([
            'program_id' => $progB->id,
            'user_id' => $wargaB->id,
            'status' => 'terdaftar',
        ]);

        // Kader A tidak boleh memaksa warga kelurahan B berhenti dari program kelurahan B
        $this->asUser($kaderA)->patchJson("/api/v1/program/{$progB->id}/peserta", [
            'user_id' => $wargaB->id,
            'status' => 'berhenti',
        ])->assertStatus(403);

        // Kader A tidak boleh mengubah status warga binaan kaderLain pada program kota
        $progKota = Program::create([
            'wilayah_id' => null,
            'judul' => 'Program Kota',
            'jenis' => 'olahraga',
            'mulai' => now()->toDateString(),
            'selesai' => now()->addDays(7)->toDateString(),
            'exp_reward' => 50,
        ]);
        PesertaProgram::create([
            'program_id' => $progKota->id,
            'user_id' => $wargaKaderLain->id,
            'status' => 'terdaftar',
        ]);
        $this->asUser($kaderA)->patchJson("/api/v1/program/{$progKota->id}/peserta", [
            'user_id' => $wargaKaderLain->id,
            'status' => 'selesai',
        ])->assertStatus(403);

        // User non-super_admin tanpa wilayah_id ditolak 422 pada program/edukasi
        $this->asUser($wargaTanpaWilayah)->getJson('/api/v1/program')->assertStatus(422);

        // per_page di luar 1..100 & tanggal filter tidak valid mengembalikan 422
        $this->asUser($kaderA)->getJson('/api/v1/catatan-kesehatan?per_page=500')->assertStatus(422);
        $this->asUser($kaderA)->getJson('/api/v1/catatan-kesehatan?dari=bukan-tanggal')->assertStatus(422);
    }

    public function test_trusted_proxy_membedakan_ip_asli_klien(): void
    {
        $user1 = $this->buatPengguna('user');
        $user2 = $this->buatPengguna('user');

        $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.1'])
            ->withHeader('X-Forwarded-For', '203.0.113.10')
            ->postJson('/api/v1/auth/login', [
                'email' => $user1->email,
                'password' => 'Rahasia123!',
            ])->assertOk();

        $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.1'])
            ->withHeader('X-Forwarded-For', '203.0.113.11')
            ->postJson('/api/v1/auth/login', [
                'email' => $user2->email,
                'password' => 'Rahasia123!',
            ])->assertOk();
    }

    public function test_httponly_cookie_auth_dan_logout_mencabut_cookie(): void
    {
        $user = $this->buatPengguna('user');

        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'Rahasia123!',
        ])->assertOk()
            ->assertCookie('sehatkita_token');

        $token = $loginRes->json('data.token');

        $this->app['auth']->forgetGuards();
        $this->withCredentials()
            ->withUnencryptedCookie('sehatkita_token', $token)
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id);

        $this->app['auth']->forgetGuards();
        $this->withCredentials()
            ->withUnencryptedCookie('sehatkita_token', $token)
            ->postJson('/api/v1/auth/logout')
            ->assertOk()
            ->assertCookieExpired('sehatkita_token');
    }

    public function test_telegram_connect_token_kedaluwarsa_setelah_30_menit(): void
    {
        $warga = $this->buatPengguna('user');

        $resAwal = $this->asUser($warga)->getJson('/api/v1/telegram/status')->assertOk();
        $linkAwal = (string) $resAwal->json('data.link_telegram');
        $tokenAwal = explode('?start=', $linkAwal)[1] ?? '';
        $this->assertSame(32, strlen($tokenAwal));

        $this->travel(31)->minutes();

        $terhubung = app(TelegramService::class)->prosesPesan([
            'chat' => ['id' => 777001],
            'text' => '/start '.$tokenAwal,
        ]);
        $this->assertFalse($terhubung);
        $this->assertNull($warga->fresh()->telegram_chat_id);

        $resBaru = $this->asUser($warga)->getJson('/api/v1/telegram/status')->assertOk();
        $tokenBaru = explode('?start=', (string) $resBaru->json('data.link_telegram'))[1] ?? '';
        $this->assertNotSame($tokenAwal, $tokenBaru);
    }

    public function test_cari_nik_menyamarkan_nik_dan_mencatat_audit(): void
    {
        $kader = $this->buatPengguna('kader');
        $warga = $this->buatPengguna('user', [
            'kader_id' => $kader->id,
            'nik' => '6372051206900001',
        ]);

        $res = $this->asUser($kader)->getJson('/api/v1/pengguna/cari-nik')->assertOk();
        $baris = collect($res->json('data'))->firstWhere('id', $warga->id);

        $this->assertNotNull($baris);
        $this->assertSame('637205******0001', $baris['nik']);
        $this->assertDatabaseHas('log_audit', [
            'user_id' => $kader->id,
            'aksi' => 'cari_warga',
        ]);
    }
}
