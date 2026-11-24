<?php

namespace Tests\Feature;

use App\Models\BadgePengguna;
use App\Models\Faskes;
use App\Models\Pengguna;
use App\Models\Profil;
use App\Models\Program;
use App\Models\Wilayah;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RevisiSuperkita23NovTest extends TestCase
{
    use RefreshDatabase;

    private function buatWilayah(): Wilayah
    {
        return Wilayah::create([
            'kode' => 'KEL-UJI',
            'nama' => 'Kelurahan Uji',
            'tipe' => 'kelurahan',
        ]);
    }

    private function buatUser(string $role = 'user', ?int $wilayahId = null, array $extra = []): Pengguna
    {
        $u = Pengguna::create(array_merge([
            'name' => ucfirst($role).' '.uniqid(),
            'email' => uniqid($role).'@sehatkita.test',
            'password' => Hash::make('Rahasia123!'),
            'role' => $role,
            'wilayah_id' => $wilayahId,
            'aktif' => true,
            'consent_at' => now(),
        ], $extra));

        if ($role === 'user') {
            Profil::create([
                'user_id' => $u->id,
                'tinggi_cm' => 165,
                'tampil_di_peringkat' => true,
            ]);
        }

        return $u;
    }

    public function test_progres_pribadi_tantangan_otomatis_dari_target_nilai(): void
    {
        $wil = $this->buatWilayah();
        $warga = $this->buatUser('user', $wil->id);

        $program = Program::create([
            'wilayah_id' => $wil->id,
            'judul' => 'Tantangan Push Up 50 Kali',
            'jenis' => 'olahraga',
            'target_nilai' => 50,
            'satuan_target' => 'kali',
            'mulai' => now()->subDay()->toDateString(),
            'selesai' => now()->addDays(7)->toDateString(),
            'status' => 'berjalan',
            'exp_reward' => 100,
        ]);

        $this->actingAs($warga, 'sanctum')
            ->postJson("/api/v1/program/{$program->id}/peserta")
            ->assertStatus(201);

        // Input 10 dari target 50 -> otomatis 20%
        $this->actingAs($warga, 'sanctum')
            ->patchJson("/api/v1/program/{$program->id}/progres", [
                'tambah_capaian' => 10,
                'catatan_progres' => 'Sesi pagi',
            ])
            ->assertOk()
            ->assertJsonPath('data.capaian_nilai', 10)
            ->assertJsonPath('data.progres_persen', 20);
    }

    public function test_peringkat_diurutkan_berdasarkan_jumlah_badge(): void
    {
        $wil = $this->buatWilayah();
        $wargaBanyakExp = $this->buatUser('user', $wil->id, ['name' => 'Warga EXP Tinggi', 'exp_total' => 500]);
        $wargaBanyakBadge = $this->buatUser('user', $wil->id, ['name' => 'Warga Banyak Badge', 'exp_total' => 100]);
        for ($i = 0; $i < 3; $i++) {
            $this->buatUser('user', $wil->id);
        }

        BadgePengguna::create(['user_id' => $wargaBanyakBadge->id, 'badge' => 'langkah_pertama']);
        BadgePengguna::create(['user_id' => $wargaBanyakBadge->id, 'badge' => 'rajin_mencatat']);
        BadgePengguna::create(['user_id' => $wargaBanyakExp->id, 'badge' => 'langkah_pertama']);

        $res = $this->actingAs($wargaBanyakBadge, 'sanctum')
            ->getJson('/api/v1/peringkat')
            ->assertOk();

        $this->assertSame('Warga Banyak Badge', $res->json('data.daftar.0.nama'));
        $this->assertSame(2, $res->json('data.daftar.0.jumlah_badge'));
        $this->assertSame(1, $res->json('data.saya.rank'));
    }

    public function test_kepuasan_masyarakat_bisa_dikirim_warga_dan_dilihat_admin_superadmin(): void
    {
        $wil = $this->buatWilayah();
        $warga = $this->buatUser('user', $wil->id);
        $admin = $this->buatUser('admin_kelurahan', $wil->id);
        $super = $this->buatUser('super_admin');

        $this->actingAs($warga, 'sanctum')
            ->postJson('/api/v1/kepuasan-masyarakat', [
                'rating' => 5,
                'aspek_pelayanan' => 'Pelayanan Kader Posbindu',
                'komentar' => 'Sangat membantu dan ramah.',
            ])
            ->assertStatus(201);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/kepuasan-masyarakat')
            ->assertOk()
            ->assertJsonPath('ringkasan.total_responden', 1)
            ->assertJsonPath('ringkasan.rata_rata_rating', 5);

        $this->actingAs($super, 'sanctum')
            ->getJson('/api/v1/kepuasan-masyarakat')
            ->assertOk()
            ->assertJsonPath('ringkasan.total_responden', 1);

        $this->actingAs($warga, 'sanctum')
            ->getJson('/api/v1/kepuasan-masyarakat')
            ->assertStatus(403);
    }

    public function test_export_excel_super_admin_berhasil(): void
    {
        $super = $this->buatUser('super_admin');

        $res = $this->actingAs($super, 'sanctum')
            ->get('/api/v1/admin/export?tipe=catatan&format=excel');

        $res->assertOk();
        $this->assertStringContainsString('application/vnd.ms-excel', (string) $res->headers->get('Content-Type'));
        $this->assertStringContainsString('<Workbook', $res->streamedContent());
    }

    public function test_cache_wilayah_dan_faskes_tersimpan_sebagai_array(): void
    {
        $wil = $this->buatWilayah();
        $user = $this->buatUser('user', $wil->id);
        Faskes::create([
            'nama' => 'Puskesmas Uji',
            'jenis' => 'puskesmas',
            'wilayah_id' => $wil->id,
        ]);

        // Request ke-1 (isi cache) & ke-2 (baca dari cache) harus tetap mengembalikan id & nama.
        $this->getJson('/api/v1/wilayah?tipe=kelurahan')
            ->assertOk()
            ->assertJsonPath('data.0.id', $wil->id)
            ->assertJsonPath('data.0.nama', $wil->nama);

        $this->getJson('/api/v1/wilayah?tipe=kelurahan')
            ->assertOk()
            ->assertJsonPath('data.0.id', $wil->id)
            ->assertJsonPath('data.0.nama', $wil->nama);

        $cachedWilayah = Cache::get('wilayah:v2:list:'.md5('kelurahan|'));
        $this->assertIsArray($cachedWilayah);
        $this->assertIsArray($cachedWilayah[0] ?? null);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/faskes')
            ->assertOk()
            ->assertJsonPath('data.0.nama', 'Puskesmas Uji');

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/faskes')
            ->assertOk()
            ->assertJsonPath('data.0.nama', 'Puskesmas Uji');

        $cachedFaskes = Cache::get('faskes:v2:list:semua');
        $this->assertIsArray($cachedFaskes);
        $this->assertIsArray($cachedFaskes[0] ?? null);
    }
}
