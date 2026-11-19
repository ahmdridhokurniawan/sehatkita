<?php

namespace Tests\Feature;

use App\Models\BadgePengguna;
use App\Models\Edukasi;
use App\Models\Faskes;
use App\Models\Pengguna;
use App\Models\PesertaProgram;
use App\Models\Profil;
use App\Models\Program;
use App\Models\Rujukan;
use App\Models\TargetKesehatan;
use App\Models\Wilayah;
use Database\Seeders\EdukasiSeeder;
use Database\Seeders\IndikatorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class RevisiPembimbingTest extends TestCase
{
    use RefreshDatabase;

    private function wilayah(): Wilayah
    {
        return Wilayah::firstOrCreate(
            ['kode' => '63.72.05.1001'],
            ['nama' => 'Guntung Paikat', 'tipe' => 'kelurahan']
        );
    }

    private function buatUser(string $role = 'user', array $extra = []): Pengguna
    {
        $u = Pengguna::create(array_merge([
            'name' => ucfirst($role).' '.uniqid(),
            'email' => $role.'.'.uniqid().'@sehatkita.test',
            'password' => bcrypt('Rahasia123!'),
            'role' => $role,
            'wilayah_id' => $this->wilayah()->id,
            'consent_at' => now(),
            'aktif' => true,
            'exp_total' => 0,
            'level_gamifikasi' => 1,
        ], $extra));

        if ($u->role === 'user') {
            Profil::create([
                'user_id' => $u->id,
                'tgl_lahir' => '1995-05-10',
                'jenis_kelamin' => 'L',
                'tinggi_cm' => 170,
            ]);
        }

        return $u;
    }

    public function test_token_bearer_dibatasi_30_menit_dan_1_ip_1_user(): void
    {
        $userA = $this->buatUser('user');
        $userB = $this->buatUser('user');

        // 1. User A login dari IP 10.0.0.10 -> dapat token 30 menit
        $resA = $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.10'])
            ->postJson('/api/v1/auth/login', [
                'email' => $userA->email,
                'password' => 'Rahasia123!',
            ])->assertOk()
            ->assertJsonPath('data.token_ttl_menit', 30);

        $tokenA = $resA->json('data.token');
        $this->assertNotEmpty($tokenA);

        // 2. Token valid di IP sama
        $this->app['auth']->forgetGuards();
        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.10'])
            ->withHeader('Authorization', "Bearer {$tokenA}")
            ->getJson('/api/v1/auth/me')
            ->assertOk();

        // 3. Token ditolak jika dipakai dari IP berbeda (10.0.0.20)
        $this->app['auth']->forgetGuards();
        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.20'])
            ->withHeader('Authorization', "Bearer {$tokenA}")
            ->getJson('/api/v1/auth/me')
            ->assertStatus(401);

        // 4. User B mencoba login dari IP sama (10.0.0.10) saat User A masih aktif -> 409
        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.10'])
            ->postJson('/api/v1/auth/login', [
                'email' => $userB->email,
                'password' => 'Rahasia123!',
            ])->assertStatus(409);

        // 5. User A logout -> IP bebas untuk User B
        $this->app['auth']->forgetGuards();
        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.10'])
            ->withHeader('Authorization', "Bearer {$tokenA}")
            ->postJson('/api/v1/auth/logout')
            ->assertOk();

        $resB = $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.10'])
            ->postJson('/api/v1/auth/login', [
                'email' => $userB->email,
                'password' => 'Rahasia123!',
            ])->assertOk();

        $tokenB = $resB->json('data.token');

        // 6. Simulasikan waktu lewat 31 menit -> token expired (401)
        $tokenModel = PersonalAccessToken::findToken($tokenB);
        $this->assertNotNull($tokenModel);
        $tokenModel->forceFill(['expires_at' => now()->subMinute()])->save();

        $this->app['auth']->forgetGuards();
        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.10'])
            ->withHeader('Authorization', "Bearer {$tokenB}")
            ->getJson('/api/v1/auth/me')
            ->assertStatus(401);
    }

    public function test_jenis_pemeriksaan_gula_darah_sewaktu_dan_hba1c_bekerja_akurat(): void
    {
        $this->seed(IndikatorSeeder::class);
        $user = $this->buatUser('user');
        $token = $user->createToken('uji')->plainTextToken;

        // 1. HbA1c desimal 6.2% (perlu perhatian, tidak boleh ditandai perlu_verifikasi)
        $resHba1c = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/catatan-kesehatan', [
                'dicatat_pada' => now()->toDateString(),
                'sumber' => 'mandiri',
                'gula_darah' => 6.2,
                'jenis_gula_darah' => 'hba1c',
            ])->assertStatus(201);

        $resHba1c->assertJsonPath('data.jenis_gula_darah', 'hba1c')
            ->assertJsonPath('data.kategori_gula_darah', 'perlu_perhatian')
            ->assertJsonPath('data.perlu_verifikasi', false);
        $this->assertEquals(6.2, (float) $resHba1c->json('data.gula_darah'));

        // 2. HbA1c di atas 25% ditolak 422
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/catatan-kesehatan', [
                'dicatat_pada' => now()->toDateString(),
                'sumber' => 'mandiri',
                'gula_darah' => 30,
                'jenis_gula_darah' => 'hba1c',
            ])->assertStatus(422)->assertJsonValidationErrors('gula_darah');

        // 3. Gula darah sewaktu 215 mg/dL -> tinggi (berisiko)
        $resSewaktu = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/catatan-kesehatan', [
                'dicatat_pada' => now()->toDateString(),
                'sumber' => 'mandiri',
                'gula_darah' => 215,
                'jenis_gula_darah' => 'sewaktu',
            ])->assertStatus(201);

        $resSewaktu->assertJsonPath('data.jenis_gula_darah', 'sewaktu')
            ->assertJsonPath('data.kategori_gula_darah', 'tinggi')
            ->assertJsonPath('data.status_kesehatan', 'berisiko');
    }

    public function test_surat_rujukan_menggunakan_susunan_surat_resmi(): void
    {
        $user = $this->buatUser('user');
        $faskes = Faskes::create([
            'wilayah_id' => $user->wilayah_id,
            'nama' => 'Puskesmas Guntung Paikat',
            'jenis' => 'puskesmas',
            'alamat' => 'Jl. Ahmad Yani Km 34',
            'telepon' => '0511-4770001',
        ]);
        $rujukan = Rujukan::create([
            'user_id' => $user->id,
            'faskes_id' => $faskes->id,
            'alasan' => 'Tekanan darah tinggi berulang',
            'status' => 'baru',
        ]);

        $token = $user->createToken('uji')->plainTextToken;
        $html = $this->withHeader('Authorization', "Bearer {$token}")
            ->get("/api/v1/rujukan/{$rujukan->id}/surat?format=html")
            ->assertOk()
            ->getContent();

        $this->assertStringContainsString('Pemerintah Kota Banjarbaru', $html);
        $this->assertStringContainsString('Pengantar Rujukan Pemeriksaan Lanjutan', $html);
        $this->assertStringContainsString('Kepada Yth.', $html);
        $this->assertStringContainsString('Dengan hormat,', $html);
        $this->assertStringContainsString('Demikian surat pengantar rujukan ini kami sampaikan', $html);
    }

    public function test_achievement_badge_otomatis_dan_reset_peringkat_3_bulan_simpan_histori(): void
    {
        $this->seed(IndikatorSeeder::class);

        $warga1 = $this->buatUser('user', ['exp_total' => 250, 'level_gamifikasi' => 3]);
        $warga2 = $this->buatUser('user', ['exp_total' => 120, 'level_gamifikasi' => 2]);

        // Tambah 1 catatan & 1 target tercapai untuk warga1 agar dapat badge keaktifan
        $token1 = $warga1->createToken('uji')->plainTextToken;
        $this->withHeader('Authorization', "Bearer {$token1}")
            ->postJson('/api/v1/catatan-kesehatan', [
                'dicatat_pada' => now()->toDateString(),
                'sumber' => 'mandiri',
                'bb_kg' => 68,
            ])->assertStatus(201);

        $target = TargetKesehatan::create([
            'user_id' => $warga1->id,
            'judul' => 'Target BB',
            'jenis_target' => 'berat_badan',
            'nilai_awal' => 72,
            'nilai_target' => 68,
            'satuan' => 'kg',
        ]);
        $this->withHeader('Authorization', "Bearer {$token1}")
            ->patchJson("/api/v1/target-kesehatan/{$target->id}/capai", ['tercapai' => true])
            ->assertOk();

        // Cek GET /achievement
        $ach = $this->withHeader('Authorization', "Bearer {$token1}")
            ->getJson('/api/v1/achievement')
            ->assertOk();

        $diraih = collect($ach->json('data.daftar'))
            ->where('diraih', true)
            ->pluck('kode')
            ->all();
        $this->assertContains('langkah_pertama', $diraih);
        $this->assertContains('penakluk_target', $diraih);

        // Jalankan reset kuartalan (--force)
        Artisan::call('peringkat:reset-kuartal', ['--force' => true]);

        // EXP kembali 0 & level 1, tetapi badge & riwayat peringkat tetap tersimpan
        $warga1->refresh();
        $warga2->refresh();
        $this->assertSame(0, (int) $warga1->exp_total);
        $this->assertSame(1, (int) $warga1->level_gamifikasi);
        $this->assertSame(0, (int) $warga2->exp_total);
        $this->assertTrue(BadgePengguna::where('user_id', $warga1->id)->where('badge', 'langkah_pertama')->exists());

        $this->app['auth']->forgetGuards();
        $peringkat = $this->withHeader('Authorization', "Bearer {$token1}")
            ->getJson('/api/v1/peringkat')
            ->assertOk();

        $peringkat->assertJsonPath('data.saya.exp_total', 0)
            ->assertJsonPath('data.riwayat_saya.0.exp_akhir', 250)
            ->assertJsonPath('data.riwayat_saya.0.peringkat_akhir', 1);
    }

    public function test_edukasi_terpisah_progres_pribadi_program_dan_paginasi_target(): void
    {
        $this->seed(EdukasiSeeder::class);
        $warga = $this->buatUser('user');
        $admin = $this->buatUser('admin_kelurahan');

        $tokenWarga = $warga->createToken('uji')->plainTextToken;
        $tokenAdmin = $admin->createToken('uji-admin')->plainTextToken;

        // 1. Admin membuat materi edukasi baru & filter list edukasi
        $resEdu = $this->withHeader('Authorization', "Bearer {$tokenAdmin}")
            ->postJson('/api/v1/edukasi', [
                'judul' => 'Edukasi Khusus Kelurahan',
                'ringkasan' => 'Ringkasan materi lokal',
                'konten' => 'Isi lengkap materi edukasi lokal.',
                'kategori' => 'umum',
                'estimasi_menit' => 3,
            ])->assertStatus(201);

        $edukasiId = $resEdu->json('data.id');

        // 2. Warga mencatat progres pribadi pada 3 materi edukasi -> raih badge pembelajar_sehat
        $semuaEdu = Edukasi::take(3)->pluck('id')->all();
        $this->assertCount(3, $semuaEdu);

        $this->app['auth']->forgetGuards();
        foreach ($semuaEdu as $eid) {
            $this->withHeader('Authorization', "Bearer {$tokenWarga}")
                ->patchJson("/api/v1/edukasi/{$eid}/progres", [
                    'progres_persen' => 100,
                    'sudah_dibaca' => true,
                    'catatan_pribadi' => 'Sudah saya pahami dan catat.',
                ])->assertOk()
                ->assertJsonPath('data.sudah_dibaca', true);
        }

        $this->assertTrue(BadgePengguna::where('user_id', $warga->id)->where('badge', 'pembelajar_sehat')->exists());

        $listEdu = $this->withHeader('Authorization', "Bearer {$tokenWarga}")
            ->getJson('/api/v1/edukasi?per_page=4')
            ->assertOk();
        $this->assertGreaterThanOrEqual(3, (int) $listEdu->json('data.0.progres_saya.progres_persen') >= 0 ? $listEdu->json('meta.total') : 0);
        $this->assertSame(3, $listEdu->json('ringkasan_progres.selesai'));

        // 3. Progres pribadi di program tantangan
        $program = Program::create([
            'wilayah_id' => $warga->wilayah_id,
            'judul' => 'Tantangan Jalan 10 Ribu Langkah',
            'jenis' => 'olahraga',
            'mulai' => now()->toDateString(),
            'selesai' => now()->addDays(7)->toDateString(),
            'exp_reward' => 100,
            'status' => 'berjalan',
        ]);
        PesertaProgram::create([
            'program_id' => $program->id,
            'user_id' => $warga->id,
            'status' => 'terdaftar',
        ]);

        $this->withHeader('Authorization', "Bearer {$tokenWarga}")
            ->patchJson("/api/v1/program/{$program->id}/progres", [
                'progres_persen' => 65,
                'catatan_progres' => 'Hari ke-4 mencapai 6.500 langkah rata-rata.',
            ])->assertOk()
            ->assertJsonPath('data.progres_persen', 65)
            ->assertJsonPath('data.catatan_progres', 'Hari ke-4 mencapai 6.500 langkah rata-rata.');

        // 4. Target kesehatan memiliki meta paginasi
        TargetKesehatan::create([
            'user_id' => $warga->id,
            'judul' => 'Minum 2L',
            'jenis_target' => 'air_minum',
            'nilai_target' => 2000,
            'satuan' => 'ml',
        ]);
        $this->withHeader('Authorization', "Bearer {$tokenWarga}")
            ->getJson('/api/v1/target-kesehatan?per_page=1')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonPath('meta.total', 1);

        // Pastikan edit edukasi admin berhasil
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', "Bearer {$tokenAdmin}")
            ->putJson("/api/v1/edukasi/{$edukasiId}", ['judul' => 'Edukasi Diperbarui'])
            ->assertOk();
    }
}
