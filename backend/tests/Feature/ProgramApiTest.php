<?php

namespace Tests\Feature;

use App\Models\Pengguna;
use App\Models\PesertaProgram;
use App\Models\Program;
use App\Models\Wilayah;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
