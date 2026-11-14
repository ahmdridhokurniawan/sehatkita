<?php

namespace Tests\Feature;

use App\Models\CatatanKesehatan;
use App\Models\Faskes;
use App\Models\Pengaduan;
use App\Models\Pengguna;
use App\Models\PesertaProgram;
use App\Models\Profil;
use App\Models\Program;
use App\Models\SesiPosbindu;
use App\Models\TargetKesehatan;
use App\Models\Wilayah;
use Database\Seeders\IndikatorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TelegramNotificationsTest extends TestCase
{
    use RefreshDatabase;

    private Wilayah $kecamatan;
    private Wilayah $kelurahanA;
    private Wilayah $kelurahanB;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.telegram.bot_token'    => 'test-bot-token',
            'services.telegram.bot_username' => 'sehatkita_ptm_bot',
        ]);

        Http::fake([
            'https://api.telegram.org/*' => Http::response(['ok' => true, 'result' => []], 200),
        ]);

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

    public function test_rujukan_manual_dan_ubah_status_mengirim_notifikasi_telegram(): void
    {
        $kader = $this->buatPengguna('kader', ['wilayah_id' => $this->kelurahanA->id], false);
        $warga = $this->buatPengguna('user', [
            'kader_id'         => $kader->id,
            'telegram_chat_id' => '111001',
        ]);
        $faskes = Faskes::create([
            'wilayah_id' => $this->kelurahanA->id,
            'nama'       => 'Puskesmas Banjarbaru Selatan',
            'jenis'      => 'puskesmas',
            'alamat'     => 'Jl. Ahmad Yani',
        ]);

        $resBuat = $this->asUser($kader)->postJson('/api/v1/rujukan', [
            'user_id'   => $warga->id,
            'faskes_id' => $faskes->id,
            'alasan'    => 'Tekanan darah tinggi menetap',
        ])->assertStatus(201);

        $rujukanId = $resBuat->json('data.id');

        $this->asUser($kader)->patchJson("/api/v1/rujukan/{$rujukanId}/status", [
            'status'  => 'dihubungi',
            'catatan' => 'Jadwal konsultasi dokter besok pagi',
        ])->assertOk();

        Http::assertSentCount(3);
        Http::assertSent(fn (HttpRequest $req) =>
            str_contains($req->url(), '/sendMessage')
            && (string) $req['chat_id'] === '111001'
            && str_contains((string) $req['text'], 'Rujukan Faskes Baru')
            && str_contains((string) $req['text'], 'Puskesmas Banjarbaru Selatan')
        );
        Http::assertSent(fn (HttpRequest $req) =>
            str_contains($req->url(), '/sendDocument')
            && str_contains((string) $req->body(), 'SURAT PENGANTAR RUJUKAN POSBINDU')
        );
        Http::assertSent(fn (HttpRequest $req) =>
            str_contains($req->url(), '/sendMessage')
            && (string) $req['chat_id'] === '111001'
            && str_contains((string) $req['text'], 'Pembaruan Status Rujukan')
            && str_contains((string) $req['text'], 'DIHUBUNGI')
        );
    }

    public function test_surat_rujukan_otorisasi_json_dan_html_cetak(): void
    {
        $kader = $this->buatPengguna('kader', ['wilayah_id' => $this->kelurahanA->id], false);
        $adminKel = $this->buatPengguna('admin_kelurahan', ['wilayah_id' => $this->kelurahanA->id], false);
        $superAdmin = $this->buatPengguna('super_admin', ['wilayah_id' => null], false);
        $warga = $this->buatPengguna('user', [
            'name'       => 'Siti Aminah',
            'nik'        => '6372010101010099',
            'kader_id'   => $kader->id,
            'wilayah_id' => $this->kelurahanA->id,
        ]);
        $wargaLain = $this->buatPengguna('user', ['wilayah_id' => $this->kelurahanB->id]);
        $faskes = Faskes::create([
            'wilayah_id' => $this->kelurahanA->id,
            'nama'       => 'RSUD Idaman Banjarbaru',
            'jenis'      => 'rumah_sakit',
            'alamat'     => 'Jl. Trikora No. 115',
            'telepon'    => '0511-6749696',
        ]);

        $resBuat = $this->asUser($kader)->postJson('/api/v1/rujukan', [
            'user_id'   => $warga->id,
            'faskes_id' => $faskes->id,
            'alasan'    => 'Evaluasi lanjutan hipertensi berat',
        ])->assertStatus(201);

        $rujukanId = $resBuat->json('data.id');

        // Warga pemilik mendapat JSON lengkap surat pengantar
        $this->asUser($warga)->getJson("/api/v1/rujukan/{$rujukanId}/surat")
            ->assertOk()
            ->assertJsonPath('data.pasien.name', 'Siti Aminah')
            ->assertJsonPath('data.pasien.nik', '6372010101010099')
            ->assertJsonPath('data.faskes.nama', 'RSUD Idaman Banjarbaru')
            ->assertJsonPath('data.faskes.alamat', 'Jl. Trikora No. 115');

        // Format HTML siap cetak / simpan PDF
        $htmlRes = $this->asUser($warga)->get("/api/v1/rujukan/{$rujukanId}/surat?format=html")
            ->assertOk();
        $htmlRes->assertSee('SURAT PENGANTAR RUJUKAN POSBINDU');
        $htmlRes->assertSee('Siti Aminah');
        $htmlRes->assertSee('RSUD Idaman Banjarbaru');

        // Kader pembina & super admin diizinkan; warga lain 404; admin kelurahan 403
        $this->asUser($kader)->getJson("/api/v1/rujukan/{$rujukanId}/surat")->assertOk();
        $this->asUser($superAdmin)->getJson("/api/v1/rujukan/{$rujukanId}/surat")->assertOk();
        $this->asUser($wargaLain)->getJson("/api/v1/rujukan/{$rujukanId}/surat")->assertStatus(404);
        $this->asUser($adminKel)->getJson("/api/v1/rujukan/{$rujukanId}/surat")->assertStatus(403);
    }

    public function test_catatan_kesehatan_berisiko_dan_rujukan_otomatis_mengirim_notifikasi_telegram(): void
    {
        $this->seed(IndikatorSeeder::class);

        $warga = $this->buatPengguna('user', [
            'wilayah_id'       => $this->kelurahanA->id,
            'telegram_chat_id' => '111002',
        ]);
        Faskes::create([
            'wilayah_id' => $this->kelurahanA->id,
            'nama'       => 'Puskesmas Guntung Paikat',
            'jenis'      => 'puskesmas',
            'alamat'     => 'Jl. Panglima Batur',
        ]);

        $this->asUser($warga)->postJson('/api/v1/catatan-kesehatan', [
            'sumber'       => 'mandiri',
            'bb_kg'        => 82,
            'sistol'       => 185,
            'diastol'      => 115,
            'dicatat_pada' => now()->toDateString(),
        ])->assertStatus(201);

        Http::assertSent(fn (HttpRequest $req) =>
            str_contains($req->url(), '/sendMessage')
            && (string) $req['chat_id'] === '111002'
            && str_contains((string) $req['text'], 'Saran Rujukan Kesehatan Baru')
            && str_contains((string) $req['text'], 'Puskesmas Guntung Paikat')
        );
        Http::assertSent(fn (HttpRequest $req) =>
            str_contains($req->url(), '/sendMessage')
            && (string) $req['chat_id'] === '111002'
            && str_contains((string) $req['text'], 'Peringatan Dini Hasil Pemeriksaan')
        );
    }

    public function test_tanggapi_pengaduan_mengirim_notifikasi_telegram(): void
    {
        $admin = $this->buatPengguna('admin_kelurahan', ['wilayah_id' => $this->kelurahanA->id], false);
        $warga = $this->buatPengguna('user', [
            'wilayah_id'       => $this->kelurahanA->id,
            'telegram_chat_id' => '111003',
        ]);

        $pengaduan = Pengaduan::create([
            'user_id'    => $warga->id,
            'wilayah_id' => $this->kelurahanA->id,
            'judul'      => 'Tenda Posbindu Bocor',
            'isi'        => 'Mohon perbaikan tenda posbindu RW 02.',
            'kategori'   => 'layanan_posbindu',
            'status'     => 'menunggu',
        ]);

        $this->asUser($admin)->patchJson("/api/v1/pengaduan/{$pengaduan->id}/tanggapi", [
            'status'    => 'selesai',
            'tanggapan' => 'Tenda baru sudah dipasang untuk jadwal pekan depan.',
        ])->assertOk();

        Http::assertSentCount(1);
        Http::assertSent(fn (HttpRequest $req) =>
            (string) $req['chat_id'] === '111003'
            && str_contains($req['text'], 'Tanggapan Pengaduan Anda')
            && str_contains($req['text'], 'Tenda Posbindu Bocor')
            && str_contains($req['text'], 'SELESAI')
        );
    }

    public function test_program_baru_siaran_wilayah_dan_verifikasi_peserta_mengirim_notifikasi_telegram(): void
    {
        $admin = $this->buatPengguna('admin_kelurahan', ['wilayah_id' => $this->kelurahanA->id], false);
        $wargaA = $this->buatPengguna('user', [
            'wilayah_id'       => $this->kelurahanA->id,
            'telegram_chat_id' => '111004',
        ]);
        $wargaB = $this->buatPengguna('user', [
            'wilayah_id'       => $this->kelurahanB->id,
            'telegram_chat_id' => '111005',
        ]);

        $resProg = $this->asUser($admin)->postJson('/api/v1/program', [
            'judul'        => 'Jalan Pagi 30 Menit',
            'jenis'        => 'olahraga',
            'mulai'        => now()->toDateString(),
            'selesai'      => now()->addDays(7)->toDateString(),
            'exp_reward'   => 120,
            'badge_reward' => 'Pejalan_Aktif',
        ])->assertStatus(201);

        $programId = $resProg->json('data.id');

        // Hanya warga kelurahanA yang menerima siaran program baru kelurahanA
        Http::assertSentCount(1);
        Http::assertSent(fn (HttpRequest $req) =>
            (string) $req['chat_id'] === '111004'
            && str_contains($req['text'], 'Program & Tantangan Kesehatan Baru')
            && str_contains($req['text'], 'Jalan Pagi 30 Menit')
        );
        Http::assertNotSent(fn (HttpRequest $req) => (string) $req['chat_id'] === '111005');

        PesertaProgram::create([
            'program_id' => $programId,
            'user_id'    => $wargaA->id,
            'status'     => 'menunggu_verifikasi',
        ]);

        $this->asUser($admin)->patchJson("/api/v1/program/{$programId}/peserta", [
            'user_id' => $wargaA->id,
            'status'  => 'selesai',
        ])->assertOk();

        // Verifikasi selesai mengirim hadiah EXP & badge yang sudah di-escape Markdown-nya
        Http::assertSentCount(2);
        Http::assertSent(fn (HttpRequest $req) =>
            (string) $req['chat_id'] === '111004'
            && str_contains($req['text'], 'Misi Program Selesai!')
            && str_contains($req['text'], '+120 EXP')
            && str_contains($req['text'], 'Pejalan\\_Aktif')
        );

        // Warga lain ditolak buktinya -> notifikasi perbaikan
        $wargaTanpaUnderscore = $this->buatPengguna('user', [
            'wilayah_id'       => $this->kelurahanA->id,
            'telegram_chat_id' => '111006',
        ]);
        PesertaProgram::create([
            'program_id' => $programId,
            'user_id'    => $wargaTanpaUnderscore->id,
            'status'     => 'menunggu_verifikasi',
        ]);

        $this->asUser($admin)->patchJson("/api/v1/program/{$programId}/peserta", [
            'user_id'            => $wargaTanpaUnderscore->id,
            'status'             => 'ditolak',
            'catatan_verifikasi' => 'Foto buram, ulangi di luar ruangan',
        ])->assertOk();

        Http::assertSent(fn (HttpRequest $req) =>
            (string) $req['chat_id'] === '111006'
            && str_contains($req['text'], 'Bukti Program Perlu Diperbaiki')
            && str_contains($req['text'], 'Foto buram, ulangi di luar ruangan')
        );

        $this->assertNotNull($wargaB);
    }

    public function test_posbindu_sesi_baru_dan_hasil_peserta_mengirim_notifikasi_telegram(): void
    {
        $this->seed(IndikatorSeeder::class);

        $admin = $this->buatPengguna('admin_kelurahan', ['wilayah_id' => $this->kelurahanA->id], false);
        $kader = $this->buatPengguna('kader', ['wilayah_id' => $this->kelurahanA->id], false);
        $warga = $this->buatPengguna('user', [
            'wilayah_id'       => $this->kelurahanA->id,
            'kader_id'         => $kader->id,
            'telegram_chat_id' => '111007',
        ]);

        $resSesi = $this->asUser($admin)->postJson('/api/v1/posbindu/sesi', [
            'wilayah_id' => $this->kelurahanA->id,
            'tanggal'    => now()->addDays(2)->toDateString(),
            'lokasi'     => 'Balai Warga RT 04',
            'kader_id'   => $kader->id,
        ])->assertStatus(201);

        $sesiId = $resSesi->json('data.id');

        Http::assertSentCount(1);
        Http::assertSent(fn (HttpRequest $req) =>
            (string) $req['chat_id'] === '111007'
            && str_contains($req['text'], 'Jadwal Sesi Posbindu Baru')
            && str_contains($req['text'], 'Balai Warga RT 04')
        );

        $this->asUser($kader)->postJson("/api/v1/posbindu/sesi/{$sesiId}/peserta", [
            'user_id'           => $warga->id,
            'hadir'             => true,
            'catatan_kesehatan' => [
                'bb_kg'   => 60,
                'sistol'  => 118,
                'diastol' => 76,
            ],
        ])->assertStatus(201);

        Http::assertSentCount(2);
        Http::assertSent(fn (HttpRequest $req) =>
            (string) $req['chat_id'] === '111007'
            && str_contains($req['text'], 'Hasil Pemeriksaan Posbindu Tercatat')
        );
    }

    public function test_target_kesehatan_tercapai_mengirim_notifikasi_telegram(): void
    {
        $warga = $this->buatPengguna('user', ['telegram_chat_id' => '111008']);

        $target = TargetKesehatan::create([
            'user_id'          => $warga->id,
            'judul'            => 'Turunkan Tensi Sistol',
            'jenis_target'     => 'tekanan_darah',
            'nilai_awal'       => 145,
            'nilai_target'     => 120,
            'satuan'           => 'mmHg',
            'tenggat_waktu'    => now()->addDays(14)->toDateString(),
            'tercapai'         => false,
            'catatan_motivasi' => 'Mantap, terus jaga pola makan rendah garam!',
        ]);

        $this->asUser($warga)->patchJson("/api/v1/target-kesehatan/{$target->id}/capai", [
            'tercapai' => true,
        ])->assertOk();

        Http::assertSentCount(1);
        Http::assertSent(fn (HttpRequest $req) =>
            (string) $req['chat_id'] === '111008'
            && str_contains($req['text'], 'Target Kesehatan Tercapai!')
            && str_contains($req['text'], 'Turunkan Tensi Sistol')
        );
    }

    public function test_cron_reminder_mengirim_pengingat_skrining_posbindu_h1_dan_target_jatuh_tempo(): void
    {
        // Warga A rutin periksa kemarin (tidak kena pengingat skrining >30 hari), tapi punya target jatuh tempo hari ini & sesi Posbindu besok
        $wargaA = $this->buatPengguna('user', [
            'wilayah_id'       => $this->kelurahanA->id,
            'telegram_chat_id' => '111009',
        ]);
        CatatanKesehatan::create([
            'user_id'      => $wargaA->id,
            'wilayah_id'   => $this->kelurahanA->id,
            'dicatat_oleh' => $wargaA->id,
            'dicatat_pada' => now()->subDay()->toDateString(),
            'sumber'       => 'mandiri',
            'bb_kg'        => 60,
        ]);

        // Warga B di kelurahanB tidak pernah periksa -> kena pengingat skrining >30 hari
        $wargaB = $this->buatPengguna('user', [
            'wilayah_id'       => $this->kelurahanB->id,
            'telegram_chat_id' => '111010',
        ]);

        SesiPosbindu::create([
            'wilayah_id' => $this->kelurahanA->id,
            'tanggal'    => now()->addDay()->toDateString(),
            'lokasi'     => 'Posyandu Anggrek',
            'status'     => 'akan_datang',
        ]);

        TargetKesehatan::create([
            'user_id'       => $wargaA->id,
            'judul'         => 'Minum Air 2 Liter',
            'jenis_target'  => 'hidrasi',
            'nilai_target'  => 2,
            'satuan'        => 'liter',
            'tenggat_waktu' => now()->toDateString(),
            'tercapai'      => false,
        ]);

        $this->artisan('reminder:skrining-ptm')->assertExitCode(0);

        Http::assertSent(fn (HttpRequest $req) =>
            (string) $req['chat_id'] === '111010'
            && str_contains($req['text'], 'cek tensi dan gula darah bulan ini')
        );
        Http::assertSent(fn (HttpRequest $req) =>
            (string) $req['chat_id'] === '111009'
            && str_contains($req['text'], 'Pengingat Posbindu Besok')
            && str_contains($req['text'], 'Posyandu Anggrek')
        );
        Http::assertSent(fn (HttpRequest $req) =>
            (string) $req['chat_id'] === '111009'
            && str_contains($req['text'], 'Pengingat Target Kesehatan Hari Ini')
            && str_contains($req['text'], 'Minum Air 2 Liter')
        );

        $this->assertNotNull($wargaB);
    }

    public function test_kegagalan_api_telegram_tidak_menggagalkan_endpoint_utama(): void
    {
        Http::fake([
            'https://api.telegram.org/*' => Http::response(['ok' => false], 500),
        ]);

        $admin = $this->buatPengguna('admin_kelurahan', ['wilayah_id' => $this->kelurahanA->id], false);
        $warga = $this->buatPengguna('user', [
            'wilayah_id'       => $this->kelurahanA->id,
            'telegram_chat_id' => '111011',
        ]);

        $pengaduan = Pengaduan::create([
            'user_id'    => $warga->id,
            'wilayah_id' => $this->kelurahanA->id,
            'judul'      => 'Antrean Panjang',
            'isi'        => 'Mohon tambah loket pendaftaran.',
            'kategori'   => 'faskes',
            'status'     => 'menunggu',
        ]);

        $this->asUser($admin)->patchJson("/api/v1/pengaduan/{$pengaduan->id}/tanggapi", [
            'status'    => 'diproses',
            'tanggapan' => 'Sedang kami koordinasikan dengan kepala puskesmas.',
        ])->assertOk();
    }
}
