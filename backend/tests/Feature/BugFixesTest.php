<?php

namespace Tests\Feature;

use App\Models\AmbangKategori;
use App\Models\BadgePengguna;
use App\Models\CatatanKesehatan;
use App\Models\Faskes;
use App\Models\Indikator;
use App\Models\LogAudit;
use App\Models\Pengguna;
use App\Models\PesertaProgram;
use App\Models\Profil;
use App\Models\Program;
use App\Models\Rujukan;
use App\Models\SesiPosbindu;
use App\Models\Wilayah;
use App\Services\HealthCalculatorService;
use App\Services\InsightService;
use App\Services\TelegramService;
use Database\Seeders\IndikatorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BugFixesTest extends TestCase
{
    use RefreshDatabase;

    private Wilayah $kecamatan;
    private Wilayah $kelurahanA;
    private Wilayah $kelurahanB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->kecamatan = Wilayah::create([
            'kode' => '63.72.05',
            'nama' => 'Banjarbaru Selatan',
            'tipe' => 'kecamatan',
        ]);

        $this->kelurahanA = Wilayah::create([
            'kode'      => '63.72.05.1001',
            'nama'      => 'Guntung Paikat',
            'tipe'      => 'kelurahan',
            'parent_id' => $this->kecamatan->id,
        ]);

        $this->kelurahanB = Wilayah::create([
            'kode'      => '63.72.05.1002',
            'nama'      => 'Kemuning',
            'tipe'      => 'kelurahan',
            'parent_id' => $this->kecamatan->id,
        ]);
    }

    private function buatPengguna(string $role, array $atribut = [], bool $denganProfil = true): Pengguna
    {
        $seq = Pengguna::count() + 1;

        $pengguna = Pengguna::create(array_merge([
            'name'       => ucfirst($role) . ' ' . $seq,
            'email'      => "{$role}{$seq}@sehatkita.test",
            'password'   => Hash::make('Rahasia123!'),
            'role'       => $role,
            'wilayah_id' => $this->kelurahanA->id,
            'consent_at' => now(),
            'aktif'      => true,
        ], $atribut));

        if ($denganProfil && $pengguna->role === 'user') {
            Profil::create([
                'user_id'       => $pengguna->id,
                'tgl_lahir'     => '1990-05-01',
                'jenis_kelamin' => 'P',
                'tinggi_cm'     => 160,
            ]);
        }

        return $pengguna;
    }

    private function asUser(Pengguna $pengguna): static
    {
        $this->app['auth']->forgetGuards();
        $token = $pengguna->createToken('test-suite')->plainTextToken;

        return $this->withHeader('Authorization', 'Bearer ' . $token);
    }

    public function test_bug01_parameter_id_non_numerik_mengembalikan_404_bukan_500(): void
    {
        $admin = $this->buatPengguna('super_admin', ['wilayah_id' => null], false);

        $this->asUser($admin)->getJson('/api/v1/program/abc')->assertStatus(404);
        $this->asUser($admin)->patchJson('/api/v1/program/abc/peserta', ['user_id' => 1, 'status' => 'selesai'])->assertStatus(404);
        $this->asUser($admin)->getJson('/api/v1/posbindu/sesi/abc')->assertStatus(404);
        $this->asUser($admin)->getJson('/api/v1/catatan-kesehatan/abc')->assertStatus(404);
        $this->asUser($admin)->putJson('/api/v1/admin/faskes/abc', ['nama' => 'X'])->assertStatus(404);
    }

    public function test_bug02_sanctum_acting_as_pengguna_berfungsi(): void
    {
        $warga = $this->buatPengguna('user');

        Sanctum::actingAs($warga);

        $this->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.id', $warga->id);
    }

    public function test_bug04_ubah_status_peserta_idempoten_dan_update_exp_badge_atomik(): void
    {
        $admin = $this->buatPengguna('admin_kelurahan', [], false);
        $warga = $this->buatPengguna('user');

        $program = Program::create([
            'wilayah_id'         => $this->kelurahanA->id,
            'judul'              => 'Misi Jalan Kaki',
            'deskripsi'          => 'Jalan kaki rutin setiap pagi',
            'kriteria_misi'      => 'Minimal 5 kali',
            'jenis'              => 'misi',
            'kategori_aktivitas' => 'fisik',
            'target_peserta'     => 20,
            'mulai'              => now()->subDay()->toDateString(),
            'selesai'            => now()->addDays(10)->toDateString(),
            'status'             => 'aktif',
            'badge_reward'       => 'Pejalan Tangguh',
            'exp_reward'         => 150,
            'level'              => 1,
        ]);

        PesertaProgram::create([
            'program_id' => $program->id,
            'user_id'    => $warga->id,
            'status'     => 'terdaftar',
        ]);

        $this->asUser($admin)
            ->patchJson("/api/v1/program/{$program->id}/peserta", [
                'user_id' => $warga->id,
                'status'  => 'selesai',
            ])
            ->assertOk();

        // Patch ulang status selesai harus idempoten tanpa menggandakan EXP atau badge
        $this->asUser($admin)
            ->patchJson("/api/v1/program/{$program->id}/peserta", [
                'user_id' => $warga->id,
                'status'  => 'selesai',
            ])
            ->assertOk();

        $warga->refresh();
        $this->assertSame(150, (int) $warga->exp_total);
        $this->assertSame(1, BadgePengguna::where('user_id', $warga->id)->where('program_id', $program->id)->count());
    }

    public function test_bug05_kader_dan_admin_ditolak_endpoint_pribadi_warga(): void
    {
        $kader = $this->buatPengguna('kader', [], false);
        $admin = $this->buatPengguna('admin_kelurahan', [], false);

        $this->asUser($kader)
            ->postJson('/api/v1/catatan-kesehatan', [
                'sumber'       => 'mandiri',
                'dicatat_pada' => now()->toDateString(),
                'bb_kg'        => 62,
            ])
            ->assertStatus(403);

        $this->asUser($kader)->getJson('/api/v1/dashboard/pribadi')->assertStatus(403);
        $this->asUser($admin)->getJson('/api/v1/dashboard/pribadi')->assertStatus(403);
        $this->asUser($kader)->getJson('/api/v1/laporan/pribadi')->assertStatus(403);
        $this->asUser($admin)->getJson('/api/v1/laporan/pribadi')->assertStatus(403);
        $this->asUser($kader)->getJson('/api/v1/target-kesehatan')->assertStatus(403);
        $this->asUser($kader)->postJson('/api/v1/target-kesehatan', [
            'judul'        => 'Turun BB',
            'jenis_target' => 'berat_badan',
            'nilai_awal'   => 70,
            'nilai_target' => 65,
            'satuan'       => 'kg',
        ])->assertStatus(403);
    }

    public function test_bug06_batas_cakupan_kader_dan_admin_kelurahan(): void
    {
        $admin = $this->buatPengguna('admin_kelurahan', [], false);
        $kaderA = $this->buatPengguna('kader', [], false);
        $kaderB = $this->buatPengguna('kader', [], false);

        $wargaA = $this->buatPengguna('user', ['kader_id' => $kaderA->id]);
        $wargaB = $this->buatPengguna('user', ['kader_id' => $kaderB->id]);

        $faskes = Faskes::create([
            'wilayah_id' => $this->kelurahanA->id,
            'nama'       => 'Puskesmas Guntung Paikat',
            'jenis'      => 'puskesmas',
            'alamat'     => 'Jl. Pangeran Antasari',
        ]);

        $sesiA = SesiPosbindu::create([
            'wilayah_id' => $this->kelurahanA->id,
            'tanggal'    => now()->toDateString(),
            'lokasi'     => 'Balai Warga A',
            'kader_id'   => $kaderA->id,
            'status'     => 'berjalan',
        ]);

        $sesiB = SesiPosbindu::create([
            'wilayah_id' => $this->kelurahanA->id,
            'tanggal'    => now()->toDateString(),
            'lokasi'     => 'Balai Warga B',
            'kader_id'   => $kaderB->id,
            'status'     => 'berjalan',
        ]);

        $rujukanB = Rujukan::create([
            'user_id'  => $wargaB->id,
            'faskes_id'=> $faskes->id,
            'alasan'   => 'Tekanan darah tinggi',
            'otomatis' => false,
            'status'   => 'baru',
        ]);

        // Admin kelurahan ditolak mengakses data individu posbindu dan profil warga
        $this->asUser($admin)->getJson('/api/v1/posbindu/kunjungan')->assertStatus(403);
        $this->asUser($admin)->postJson("/api/v1/posbindu/sesi/{$sesiA->id}/peserta", [
            'user_id' => $wargaA->id,
            'sistol'  => 120,
            'diastol' => 80,
        ])->assertStatus(403);
        $this->asUser($admin)->getJson('/api/v1/profil?user_id=' . $wargaA->id)->assertStatus(404);

        // Kader A ditolak mengakses sesi kader B, input posbindu warga B, atau rujukan warga B
        $this->asUser($kaderA)->getJson("/api/v1/posbindu/sesi/{$sesiB->id}")->assertStatus(404);
        $this->asUser($kaderA)->postJson("/api/v1/posbindu/sesi/{$sesiA->id}/peserta", [
            'user_id' => $wargaB->id,
            'hadir'   => true,
            'sistol'  => 120,
            'diastol' => 80,
        ])->assertStatus(404);
        $this->asUser($kaderA)->postJson('/api/v1/rujukan', [
            'user_id'   => $wargaB->id,
            'faskes_id' => $faskes->id,
            'alasan'    => 'Periksa lanjutan',
        ])->assertStatus(404);
        $this->asUser($kaderA)->patchJson("/api/v1/rujukan/{$rujukanB->id}/status", [
            'status' => 'dihubungi',
        ])->assertStatus(404);
    }

    public function test_bug07_audit_log_super_admin_dan_hapus_catatan(): void
    {
        $superAdmin = $this->buatPengguna('super_admin', ['wilayah_id' => null], false);
        $warga = $this->buatPengguna('user');

        $catatan = CatatanKesehatan::create([
            'user_id'          => $warga->id,
            'bb_kg'            => 60,
            'tinggi_cm'        => 160,
            'dicatat_pada'     => now()->toDateString(),
            'sumber'           => 'mandiri',
            'perlu_verifikasi' => false,
        ]);

        $this->asUser($superAdmin)->getJson('/api/v1/catatan-kesehatan')->assertOk();
        $this->asUser($superAdmin)->getJson('/api/v1/rujukan')->assertOk();
        $this->asUser($superAdmin)->get('/api/v1/admin/export?tipe=catatan')->assertOk();

        $this->assertSame(
            3,
            LogAudit::where('user_id', $superAdmin->id)
                ->where('aksi', 'baca_data_individu')
                ->count()
        );

        $this->asUser($superAdmin)->deleteJson("/api/v1/catatan-kesehatan/{$catatan->id}")->assertOk();

        $this->assertDatabaseHas('log_audit', [
            'user_id'  => $superAdmin->id,
            'aksi'     => 'ubah_data_individu',
            'model'    => CatatanKesehatan::class,
            'model_id' => $catatan->id,
        ]);
    }

    public function test_bug08_insight_service_mengembalikan_selisih_waktu_integer(): void
    {
        $this->seed(IndikatorSeeder::class);
        $warga = $this->buatPengguna('user');

        CatatanKesehatan::create([
            'user_id'          => $warga->id,
            'sistol'           => 120,
            'diastol'          => 80,
            'dicatat_pada'     => now()->subDays(40)->setTime(9, 15),
            'sumber'           => 'mandiri',
            'perlu_verifikasi' => false,
        ]);

        $insights = app(InsightService::class)->untukUser($warga);
        $this->assertNotEmpty($insights);

        foreach ($insights as $item) {
            $this->assertDoesNotMatchRegularExpression('/\d+\.\d+\s+(hari|bulan)/', $item['teks']);
        }
    }

    public function test_bug09_validasi_profil_catatan_kelurahan_dan_kader(): void
    {
        $this->seed(IndikatorSeeder::class);

        $superAdmin = $this->buatPengguna('super_admin', ['wilayah_id' => null], false);
        $warga = $this->buatPengguna('user');
        $kaderKelB = $this->buatPengguna('kader', ['wilayah_id' => $this->kelurahanB->id], false);

        $wargaTanpaConsent = $this->buatPengguna('user', ['consent_at' => null], false);

        // PUT /profil menolak warga yang belum consent dan tinggi di luar rentang 120-220 cm
        $this->asUser($wargaTanpaConsent)->putJson('/api/v1/profil', [
            'tgl_lahir'         => '1990-05-01',
            'jenis_kelamin'     => 'P',
            'tinggi_cm'         => 160,
            'tingkat_aktivitas' => 'sedang',
            'merokok'           => false,
            'riwayat_keluarga'  => [],
        ])->assertStatus(422)->assertJsonValidationErrors(['consent']);

        $this->asUser($warga)->putJson('/api/v1/profil', [
            'tgl_lahir'         => '1990-05-01',
            'jenis_kelamin'     => 'P',
            'tinggi_cm'         => 100,
            'tingkat_aktivitas' => 'sedang',
            'merokok'           => false,
            'riwayat_keluarga'  => [],
        ])->assertStatus(422)->assertJsonValidationErrors(['tinggi_cm']);

        // POST /catatan-kesehatan menolak field turunan server dan penimpaan tinggi_cm jika profil sudah punya
        $this->asUser($warga)->postJson('/api/v1/catatan-kesehatan', [
            'sumber'           => 'mandiri',
            'dicatat_pada'     => now()->toDateString(),
            'sistol'           => 120,
            'diastol'          => 80,
            'status_kesehatan' => 'krisis',
        ])->assertStatus(422)->assertJsonValidationErrors(['status_kesehatan']);

        $this->asUser($warga)->postJson('/api/v1/catatan-kesehatan', [
            'sumber'       => 'mandiri',
            'dicatat_pada' => now()->toDateString(),
            'bb_kg'        => 65,
            'tinggi_cm'    => 170,
        ])->assertStatus(422)->assertJsonValidationErrors(['tinggi_cm']);

        // Filter indikator=imt mengecualikan baris tanpa tinggi_cm > 0
        CatatanKesehatan::create([
            'user_id'          => $warga->id,
            'bb_kg'            => 65,
            'tinggi_cm'        => null,
            'dicatat_pada'     => now()->subDay()->toDateString(),
            'sumber'           => 'mandiri',
            'perlu_verifikasi' => false,
        ]);
        CatatanKesehatan::create([
            'user_id'          => $warga->id,
            'bb_kg'            => 66,
            'tinggi_cm'        => 160,
            'dicatat_pada'     => now()->toDateString(),
            'sumber'           => 'mandiri',
            'perlu_verifikasi' => false,
        ]);

        $resImt = $this->asUser($warga)->getJson('/api/v1/catatan-kesehatan?indikator=imt')->assertOk();
        $this->assertCount(1, $resImt->json('data'));

        // Dashboard kelurahan menolak wilayah tingkat kecamatan
        $this->asUser($superAdmin)
            ->getJson('/api/v1/dashboard/kelurahan?wilayah_id=' . $this->kecamatan->id)
            ->assertStatus(422);

        // Admin tidak boleh menetapkan kader dari kelurahan berbeda
        $this->asUser($superAdmin)->postJson('/api/v1/admin/pengguna', [
            'name'       => 'Warga Baru',
            'email'      => 'warga.kader.beda@sehatkita.test',
            'password'   => 'Rahasia123!',
            'role'       => 'user',
            'wilayah_id' => $this->kelurahanA->id,
            'kader_id'   => $kaderKelB->id,
        ])->assertStatus(422)->assertJsonValidationErrors(['kader_id']);
    }

    public function test_bug10_csv_injection_cache_indikator_dan_overlap_ambang(): void
    {
        $this->seed(IndikatorSeeder::class);
        $superAdmin = $this->buatPengguna('super_admin', ['wilayah_id' => null], false);
        $warga = $this->buatPengguna('user', ['name' => "=CMD|' /C calc'!A0"]);

        CatatanKesehatan::create([
            'user_id'          => $warga->id,
            'bb_kg'            => 60,
            'tinggi_cm'        => 160,
            'dicatat_pada'     => now()->toDateString(),
            'sumber'           => 'mandiri',
            'perlu_verifikasi' => false,
        ]);

        $csvResponse = $this->asUser($superAdmin)->get('/api/v1/admin/export?tipe=catatan')->assertOk();
        $this->assertStringContainsString("'=CMD|' /C calc'!A0", $csvResponse->streamedContent());

        // Perubahan indikator membersihkan cache kalkulator
        $sistol = Indikator::where('kode', 'sistol')->firstOrFail();
        app(HealthCalculatorService::class)->kategori('sistol', 125);
        $this->assertTrue(Cache::has('ambang_kategori:semua'));

        $this->asUser($superAdmin)->putJson("/api/v1/admin/indikator/{$sistol->id}", [
            'nama' => 'Tekanan Darah Sistolik',
        ])->assertOk();
        $this->assertFalse(Cache::has('ambang_kategori:semua'));

        // Ambang tumpang tindih dengan rentang eksisting (normal 0..130) harus ditolak 422
        $this->asUser($superAdmin)->postJson('/api/v1/admin/ambang-kategori', [
            'indikator_id'   => $sistol->id,
            'batas_min'      => 110,
            'batas_max'      => 135,
            'kategori'       => 'waspada',
            'status'         => 'perlu_perhatian',
            'skor'           => 2,
            'memicu_rujukan' => false,
        ])->assertStatus(422)->assertJsonValidationErrors(['batas_min']);
    }

    public function test_bug11_login_nonaktif_dan_kebijakan_password_admin(): void
    {
        $superAdmin = $this->buatPengguna('super_admin', ['wilayah_id' => null], false);
        $nonaktif = $this->buatPengguna('user', ['aktif' => false]);

        // Password salah pada akun nonaktif harus 422 agar status aktif tidak bocor ke pihak tanpa kredensial
        $this->postJson('/api/v1/auth/login', [
            'email'    => $nonaktif->email,
            'password' => 'SalahBanget1!',
        ])->assertStatus(422)->assertJsonValidationErrors(['email']);

        // Kredensial valid pada akun nonaktif tetap 403
        $this->postJson('/api/v1/auth/login', [
            'email'    => $nonaktif->email,
            'password' => 'Rahasia123!',
        ])->assertStatus(403);

        // Password tanpa huruf kecil ditolak saat admin membuat pengguna
        $this->asUser($superAdmin)->postJson('/api/v1/admin/pengguna', [
            'name'     => 'User Password Lemah',
            'email'    => 'lemah@sehatkita.test',
            'password' => 'RAHASIA123!',
            'role'     => 'user',
        ])->assertStatus(422)->assertJsonValidationErrors(['password']);
    }

    public function test_bug12_telegram_start_token_memindahkan_chat_id_dari_akun_lama(): void
    {
        $wargaLama = $this->buatPengguna('user', ['telegram_chat_id' => '999001']);
        $wargaBaru = $this->buatPengguna('user', [
            'telegram_connect_token'   => 'tokenbaru123',
            'telegram_token_expires_at'=> now()->addMinutes(15),
        ]);

        app(TelegramService::class)->prosesPesan([
            'chat' => ['id' => 999001],
            'text' => '/start tokenbaru123',
        ]);

        $wargaLama->refresh();
        $wargaBaru->refresh();

        $this->assertNull($wargaLama->telegram_chat_id);
        $this->assertSame('999001', (string) $wargaBaru->telegram_chat_id);
        $this->assertNull($wargaBaru->telegram_connect_token);

        // Mendukung format /start@nama_bot <token> saat pindah kembali ke akun lama
        $wargaLama->update(['telegram_connect_token' => 'tokenbot123']);
        app(TelegramService::class)->prosesPesan([
            'chat' => ['id' => 999001],
            'text' => '/start@sehatkita_ptm_bot tokenbot123',
        ]);

        $wargaLama->refresh();
        $wargaBaru->refresh();
        $this->assertSame('999001', (string) $wargaLama->telegram_chat_id);
        $this->assertNull($wargaBaru->telegram_chat_id);

        // Perintah /putus melepas tautan chat_id dari akun aktif langsung lewat bot Telegram
        app(TelegramService::class)->prosesPesan([
            'chat' => ['id' => 999001],
            'text' => '/putus',
        ]);

        $wargaLama->refresh();
        $this->assertNull($wargaLama->telegram_chat_id);
    }

    public function test_bug13_program_kota_isolasi_wilayah_dan_anti_double_exp(): void
    {
        $superAdmin = $this->buatPengguna('super_admin', ['wilayah_id' => null], false);
        $adminA     = $this->buatPengguna('admin_kelurahan', ['wilayah_id' => $this->kelurahanA->id], false);
        $wargaA     = $this->buatPengguna('user', ['wilayah_id' => $this->kelurahanA->id]);
        $wargaB     = $this->buatPengguna('user', ['wilayah_id' => $this->kelurahanB->id]);

        $program = Program::create([
            'wilayah_id' => null,
            'judul'      => 'Tantangan Sehat Kota',
            'jenis'      => 'olahraga',
            'mulai'      => now()->subDay()->toDateString(),
            'selesai'    => now()->addDays(10)->toDateString(),
            'status'     => 'berjalan',
            'exp_reward' => 100,
        ]);

        PesertaProgram::create(['program_id' => $program->id, 'user_id' => $wargaA->id, 'status' => 'terdaftar']);
        PesertaProgram::create(['program_id' => $program->id, 'user_id' => $wargaB->id, 'status' => 'terdaftar']);

        // Admin kelurahan A hanya boleh melihat peserta kelurahan A di program tingkat kota
        $resPeserta = $this->asUser($adminA)->getJson("/api/v1/program/{$program->id}/peserta")->assertOk();
        $userIds = collect($resPeserta->json('data'))->pluck('user_id')->all();
        $this->assertSame([$wargaA->id], $userIds);

        // Admin kelurahan A ditolak memverifikasi peserta kelurahan B
        $this->asUser($adminA)->patchJson("/api/v1/program/{$program->id}/peserta", [
            'user_id' => $wargaB->id,
            'status'  => 'selesai',
        ])->assertStatus(403);

        // Selesaikan warga A, lalu pastikan tidak bisa diturunkan/diulang untuk menggandakan EXP
        $this->asUser($adminA)->patchJson("/api/v1/program/{$program->id}/peserta", [
            'user_id' => $wargaA->id,
            'status'  => 'selesai',
        ])->assertOk();
        $this->asUser($adminA)->patchJson("/api/v1/program/{$program->id}/peserta", [
            'user_id' => $wargaA->id,
            'status'  => 'ditolak',
            'catatan_verifikasi' => 'Tes ulang',
        ])->assertStatus(422);
        $this->assertSame(100, (int) $wargaA->fresh()->exp_total);

        // Super admin tidak boleh menonaktifkan atau menurunkan peran diri sendiri
        $this->asUser($superAdmin)->putJson("/api/v1/admin/pengguna/{$superAdmin->id}", [
            'aktif' => false,
        ])->assertStatus(422);
        $this->asUser($superAdmin)->putJson("/api/v1/admin/pengguna/{$superAdmin->id}", [
            'role' => 'user',
        ])->assertStatus(422);
    }

    public function test_bug14_posbindu_sesi_tak_bertuan_dan_status_rujukan_final(): void
    {
        $kaderA = $this->buatPengguna('kader', ['wilayah_id' => $this->kelurahanA->id], false);
        $kaderB = $this->buatPengguna('kader', ['wilayah_id' => $this->kelurahanA->id], false);
        $wargaA = $this->buatPengguna('user', ['wilayah_id' => $this->kelurahanA->id, 'kader_id' => $kaderA->id, 'nik' => '6372051001000001']);
        $wargaB = $this->buatPengguna('user', ['wilayah_id' => $this->kelurahanA->id, 'kader_id' => $kaderB->id, 'nik' => '6372051001000002']);

        SesiPosbindu::create([
            'wilayah_id' => $this->kelurahanA->id,
            'tanggal'    => now()->toDateString(),
            'lokasi'     => 'Balai Warga Umum',
            'kader_id'   => null,
            'status'     => 'akan_datang',
        ]);

        // Sesi tanpa kader_id di kelurahan sendiri harus terlihat oleh kader kelurahan tsb
        $resSesi = $this->asUser($kaderA)->getJson('/api/v1/posbindu/sesi')->assertOk();
        $this->assertCount(1, $resSesi->json('data'));

        // Autocomplete NIK kader A tidak boleh membocorkan warga binaan kader B
        $resNik = $this->asUser($kaderA)->getJson('/api/v1/pengguna/cari-nik?nik=637205')->assertOk();
        $this->assertSame([$wargaA->id], collect($resNik->json('data'))->pluck('id')->all());

        $faskes = Faskes::create([
            'wilayah_id' => $this->kelurahanA->id,
            'nama'       => 'Puskesmas Uji',
            'jenis'      => 'puskesmas',
        ]);
        $rujukan = Rujukan::create([
            'user_id'   => $wargaA->id,
            'faskes_id' => $faskes->id,
            'alasan'    => 'Tensi tinggi',
            'status'    => 'selesai',
        ]);

        // Rujukan menyertakan ringkasan identitas warga bagi kader dan status final tidak bisa dibalik
        $resRuj = $this->asUser($kaderA)->getJson('/api/v1/rujukan')->assertOk();
        $this->assertSame($wargaA->name, $resRuj->json('data.0.user.name'));
        $this->asUser($kaderA)->patchJson("/api/v1/rujukan/{$rujukan->id}/status", [
            'status'  => 'ditolak',
            'catatan' => 'Batal',
        ])->assertStatus(422);
    }
}
