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

        // 3. Admin menolak terlebih dahulu dengan alasan
        $this->asUser($admin)
            ->patchJson("/api/v1/program/{$program->id}/peserta", [
                'user_id'            => $warga->id,
                'status'             => 'ditolak',
                'catatan_verifikasi' => 'Foto buram, mohon unggah ulang.',
            ])->assertOk()
              ->assertJsonPath('data.status', 'ditolak');
        $this->assertEquals(0, $warga->fresh()->exp_total);

        // 4. Admin menyetujui selesai -> EXP bertambah
        $this->asUser($admin)
            ->patchJson("/api/v1/program/{$program->id}/peserta", [
                'user_id' => $warga->id,
                'status'  => 'selesai',
            ])->assertOk()
              ->assertJsonPath('data.status', 'selesai')
              ->assertJsonPath('data.exp_didapat', 120);
        $this->assertEquals(120, $warga->fresh()->exp_total);
    }
}
