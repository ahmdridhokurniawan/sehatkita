<?php

namespace Tests\Feature;

use App\Models\Pengguna;
use App\Models\PesertaProgram;
use App\Models\Program;
use App\Models\Wilayah;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProgramApiTest extends TestCase
{
    use RefreshDatabase;

    private function wilayah(): Wilayah
    {
        return Wilayah::firstOrCreate(
            ['kode' => '63.72.05.1001'],
            ['nama' => 'Guntung Paikat', 'tipe' => 'kelurahan']
        );
    }

    private function pengguna(string $role = 'user'): Pengguna
    {
        return Pengguna::create([
            'name'       => ucfirst($role) . ' ' . uniqid(),
            'email'      => $role . '.' . uniqid() . '@sehatkita.test',
            'password'   => bcrypt('rahasia123'),
            'role'       => $role,
            'wilayah_id' => $this->wilayah()->id,
            'consent_at' => now(),
            'aktif'      => true,
            'exp_total'  => 0,
        ]);
    }

    private function asUser(Pengguna $user): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeaders([
            'Authorization' => 'Bearer ' . $user->createToken('uji')->plainTextToken,
        ]);
    }

    public function test_admin_bisa_melihat_daftar_peserta_program_dan_patch_status(): void
    {
        $admin = $this->pengguna('admin_kelurahan');
        $warga = $this->pengguna('user');

        $program = Program::create([
            'wilayah_id' => $admin->wilayah_id,
            'judul'      => 'Tantangan Jalan Pagi',
            'jenis'      => 'olahraga',
            'mulai'      => now()->toDateString(),
            'selesai'    => now()->addDays(7)->toDateString(),
            'exp_reward' => 75,
            'status'     => 'berjalan',
        ]);

        PesertaProgram::create([
            'program_id' => $program->id,
            'user_id'    => $warga->id,
            'status'     => 'terdaftar',
        ]);

        // 1. GET /program/{id}/peserta
        $resPeserta = $this->asUser($admin)
            ->getJson("/api/v1/program/{$program->id}/peserta");

        $resPeserta->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.0.user_id', $warga->id)
            ->assertJsonPath('data.0.status', 'terdaftar');

        // 2. GET /program/{id} detail include peserta untuk admin
        $resDetail = $this->asUser($admin)
            ->getJson("/api/v1/program/{$program->id}");

        $resDetail->assertOk()
            ->assertJsonPath('data.id', $program->id)
            ->assertJsonPath('data.peserta.0.user_id', $warga->id);

        // 3. PATCH /program/{id}/peserta untuk tandai warga selesai
        $resSelesai = $this->asUser($admin)
            ->patchJson("/api/v1/program/{$program->id}/peserta", [
                'user_id' => $warga->id,
                'status'  => 'selesai',
            ]);

        $resSelesai->assertOk()
            ->assertJsonPath('data.status', 'selesai')
            ->assertJsonPath('data.exp_didapat', 75);

        $this->assertEquals(75, $warga->fresh()->exp_total);

        // 4. PATCH /program/{id} untuk ubah status program menjadi selesai
        $resPatchProg = $this->asUser($admin)
            ->patchJson("/api/v1/program/{$program->id}", [
                'status' => 'selesai',
            ]);

        $resPatchProg->assertOk()
            ->assertJsonPath('data.status', 'selesai');
    }

    public function test_warga_unggah_foto_bukti_dan_admin_verifikasi_misi(): void
    {
        Storage::fake('local');

        $admin = $this->pengguna('admin_kelurahan');
        $warga = $this->pengguna('user');

        $program = Program::create([
            'wilayah_id'    => $admin->wilayah_id,
            'judul'         => 'Misi Lari 5K',
            'deskripsi'     => 'Lari santai keliling lapangan.',
            'kriteria_misi' => 'Unggah foto stopwatch atau selfie di garis akhir.',
            'jenis'         => 'olahraga',
            'mulai'         => now()->toDateString(),
            'selesai'       => now()->addDays(7)->toDateString(),
            'exp_reward'    => 120,
            'status'        => 'berjalan',
        ]);

        PesertaProgram::create([
            'program_id' => $program->id,
            'user_id'    => $warga->id,
            'status'     => 'terdaftar',
        ]);

        // 1. Warga unggah dokumentasi -> menunggu_verifikasi
        $file = function_exists('imagecreatetruecolor')
            ? UploadedFile::fake()->image('dokumentasi.jpg', 320, 240)
            : UploadedFile::fake()->createWithContent(
                'dokumentasi.png',
                base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
            );
        $resUpload = $this->asUser($warga)->post("/api/v1/program/{$program->id}/bukti", [
            'foto'          => $file,
            'catatan_bukti' => 'Sudah lari 5 km pagi ini',
        ], ['Accept' => 'application/json']);

        $resUpload->assertOk()
            ->assertJsonPath('data.status', 'menunggu_verifikasi')
            ->assertJsonPath('data.catatan_bukti', 'Sudah lari 5 km pagi ini');

        $peserta = PesertaProgram::where('program_id', $program->id)->where('user_id', $warga->id)->firstOrFail();
        $this->assertNotNull($peserta->bukti_foto);
        Storage::disk('local')->assertExists($peserta->bukti_foto);

        // 2. Admin bisa mengakses gambar bukti
        $this->asUser($admin)
            ->get("/api/v1/program/{$program->id}/bukti/{$peserta->id}")
            ->assertOk();

        // 3. Admin menolak terlebih dahulu tanpa catatan (pakai alasan default, tidak boleh 500)
        $this->asUser($admin)
            ->patchJson("/api/v1/program/{$program->id}/peserta", [
                'user_id' => $warga->id,
                'status'  => 'ditolak',
            ])->assertOk()
              ->assertJsonPath('data.status', 'ditolak');
        $this->assertNotNull($peserta->fresh()->catatan_verifikasi);
        $this->assertEquals(0, $warga->fresh()->exp_total);

        // 3b. Warga dapat menghapus foto bukti saat belum selesai -> status kembali terdaftar
        $this->asUser($admin)
            ->deleteJson("/api/v1/program/{$program->id}/bukti")
            ->assertStatus(403);

        $pathLama = $peserta->bukti_foto;
        $this->asUser($warga)
            ->deleteJson("/api/v1/program/{$program->id}/bukti")
            ->assertOk()
            ->assertJsonPath('data.status', 'terdaftar')
            ->assertJsonPath('data.bukti_foto_url', null);

        Storage::disk('local')->assertMissing($pathLama);
        $this->assertNull($peserta->fresh()->bukti_foto);

        // 3c. Warga unggah ulang foto bukti lalu admin setujui selesai -> EXP bertambah & tidak boleh hapus setelah selesai
        $fileUlang = function_exists('imagecreatetruecolor')
            ? UploadedFile::fake()->image('dokumentasi-ulang.jpg', 320, 240)
            : UploadedFile::fake()->createWithContent(
                'dokumentasi-ulang.png',
                base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
            );
        $this->asUser($warga)->post("/api/v1/program/{$program->id}/bukti", [
            'foto' => $fileUlang,
        ], ['Accept' => 'application/json'])->assertOk();

        // 4. Admin menyetujui selesai -> EXP bertambah
        $this->asUser($admin)
            ->patchJson("/api/v1/program/{$program->id}/peserta", [
                'user_id' => $warga->id,
                'status'  => 'selesai',
            ])->assertOk()
              ->assertJsonPath('data.status', 'selesai')
              ->assertJsonPath('data.exp_didapat', 120);
        $this->assertEquals(120, $warga->fresh()->exp_total);
        $this->assertNull($peserta->fresh()->catatan_verifikasi);

        // Setelah misi selesai terverifikasi, foto tidak boleh dihapus (422)
        $this->asUser($warga)
            ->deleteJson("/api/v1/program/{$program->id}/bukti")
            ->assertStatus(422);
    }

    public function test_daftar_program_mengutamakan_tantangan_belum_selesai_di_atas(): void
    {
        $warga = $this->pengguna('user');
        $kader = $this->pengguna('kader');

        $sudahBerakhir = Program::create([
            'wilayah_id' => $warga->wilayah_id,
            'judul'      => 'Program Lama Selesai',
            'jenis'      => 'olahraga',
            'mulai'      => now()->subDays(30)->toDateString(),
            'selesai'    => now()->subDays(5)->toDateString(),
            'exp_reward' => 50,
            'status'     => 'selesai',
        ]);

        $berjalanSelesaiWarga = Program::create([
            'wilayah_id' => $warga->wilayah_id,
            'judul'      => 'Program Berjalan Sudah Selesai Warga',
            'jenis'      => 'edukasi',
            'mulai'      => now()->subDays(10)->toDateString(),
            'selesai'    => now()->addDays(10)->toDateString(),
            'exp_reward' => 60,
            'status'     => 'berjalan',
        ]);

        PesertaProgram::create([
            'program_id' => $berjalanSelesaiWarga->id,
            'user_id'    => $warga->id,
            'status'     => 'selesai',
        ]);

        $berjalanBelum = Program::create([
            'wilayah_id' => $warga->wilayah_id,
            'judul'      => 'Program Berjalan Belum Selesai',
            'jenis'      => 'olahraga',
            'mulai'      => now()->subDays(2)->toDateString(),
            'selesai'    => now()->addDays(14)->toDateString(),
            'exp_reward' => 80,
            'status'     => 'berjalan',
        ]);

        $akanDatang = Program::create([
            'wilayah_id' => $warga->wilayah_id,
            'judul'      => 'Program Akan Datang',
            'jenis'      => 'pemeriksaan',
            'mulai'      => now()->addDays(5)->toDateString(),
            'selesai'    => now()->addDays(12)->toDateString(),
            'exp_reward' => 40,
            'status'     => 'akan_datang',
        ]);

        // Role warga: berjalan (belum selesai) -> akan_datang -> selesai (periode/misi pribadi)
        $resWarga = $this->asUser($warga)->getJson('/api/v1/program')->assertOk();
        $idsWarga = array_column($resWarga->json('data'), 'id');
        $this->assertSame([
            $berjalanBelum->id,
            $akanDatang->id,
            $sudahBerakhir->id,
            $berjalanSelesaiWarga->id,
        ], $idsWarga);

        // Role kader: berjalan -> akan_datang -> selesai periode
        $resKader = $this->asUser($kader)->getJson('/api/v1/program')->assertOk();
        $idsKader = array_column($resKader->json('data'), 'id');
        $this->assertSame([
            $berjalanSelesaiWarga->id,
            $berjalanBelum->id,
            $akanDatang->id,
            $sudahBerakhir->id,
        ], $idsKader);
    }

    public function test_warga_bisa_unggah_multi_foto_dan_hapus_per_indeks(): void
    {
        Storage::fake('local');

        $warga = $this->pengguna('user');
        $program = Program::create([
            'wilayah_id' => $warga->wilayah_id,
            'judul'      => 'Misi Multi Foto',
            'jenis'      => 'olahraga',
            'mulai'      => now()->toDateString(),
            'selesai'    => now()->addDays(7)->toDateString(),
            'exp_reward' => 90,
            'status'     => 'berjalan',
        ]);

        PesertaProgram::create([
            'program_id' => $program->id,
            'user_id'    => $warga->id,
            'status'     => 'terdaftar',
        ]);

        $buatFoto = fn (string $nama) => UploadedFile::fake()->createWithContent(
            $nama,
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
        );

        // Unggah 2 foto sekaligus
        $resMulti = $this->asUser($warga)->post("/api/v1/program/{$program->id}/bukti", [
            'fotos'         => [$buatFoto('awal.png'), $buatFoto('akhir.png')],
            'catatan_bukti' => 'Mulai dan selesai jalan sehat',
        ], ['Accept' => 'application/json']);

        $resMulti->assertOk()
            ->assertJsonCount(2, 'data.bukti_foto_urls');

        $peserta = PesertaProgram::where('program_id', $program->id)->where('user_id', $warga->id)->firstOrFail();
        $this->assertCount(2, $peserta->bukti_foto_daftar);

        // Akses masing-masing foto lewat index=0 & index=1
        $this->asUser($warga)->get("/api/v1/program/{$program->id}/bukti/{$peserta->id}?index=0")->assertOk();
        $this->asUser($warga)->get("/api/v1/program/{$program->id}/bukti/{$peserta->id}?index=1")->assertOk();

        // Melebihi kuota 5 foto -> 422
        $this->asUser($warga)->post("/api/v1/program/{$program->id}/bukti", [
            'fotos' => [$buatFoto('3.png'), $buatFoto('4.png'), $buatFoto('5.png'), $buatFoto('6.png')],
        ], ['Accept' => 'application/json'])->assertStatus(422);

        // Hapus foto pertama (index=0) -> sisa 1 foto, status tetap menunggu_verifikasi
        $pathPertama = $peserta->bukti_foto_daftar[0];
        $this->asUser($warga)
            ->deleteJson("/api/v1/program/{$program->id}/bukti?index=0")
            ->assertOk()
            ->assertJsonCount(1, 'data.bukti_foto_urls')
            ->assertJsonPath('data.status', 'menunggu_verifikasi');

        Storage::disk('local')->assertMissing($pathPertama);
        $this->assertCount(1, $peserta->fresh()->bukti_foto_daftar);

        // Hapus sisa foto -> kembali terdaftar
        $this->asUser($warga)
            ->deleteJson("/api/v1/program/{$program->id}/bukti")
            ->assertOk()
            ->assertJsonCount(0, 'data.bukti_foto_urls')
            ->assertJsonPath('data.status', 'terdaftar');
    }

    public function test_program_mewajibkan_tenggat_reward_exp_dan_kategori_saat_jenis_lainnya(): void
    {
        $admin = $this->pengguna('admin_kelurahan');

        // 1. Gagal (422) jika tanpa selesai, exp_reward=0, atau jenis=lainnya tanpa kategori_aktivitas
        $this->asUser($admin)->postJson('/api/v1/program', [
            'judul'      => 'Tantangan Tanpa Tenggat',
            'jenis'      => 'lainnya',
            'mulai'      => now()->toDateString(),
            'exp_reward' => 0,
        ])->assertStatus(422)
          ->assertJsonValidationErrors(['selesai', 'exp_reward', 'kategori_aktivitas']);

        // 2. Berhasil (201) jika tenggat, reward EXP >= 1, dan kategori_aktivitas terisi
        $res = $this->asUser($admin)->postJson('/api/v1/program', [
            'judul'              => 'Tantangan Minum Air 2 Liter',
            'jenis'              => 'lainnya',
            'kategori_aktivitas' => 'Hidrasi & Minum Air',
            'mulai'              => now()->toDateString(),
            'selesai'            => now()->addDays(7)->toDateString(),
            'exp_reward'         => 60,
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('data.jenis', 'lainnya')
            ->assertJsonPath('data.kategori_aktivitas', 'Hidrasi & Minum Air')
            ->assertJsonPath('data.exp_reward', 60);

        $progId = $res->json('data.id');

        // 3. Update tidak boleh mengosongkan kategori_aktivitas selama jenis masih lainnya
        $this->asUser($admin)->putJson("/api/v1/program/{$progId}", [
            'kategori_aktivitas' => '',
        ])->assertStatus(422)
          ->assertJsonValidationErrors(['kategori_aktivitas']);
    }
}
