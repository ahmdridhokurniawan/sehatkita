<?php

namespace Tests\Feature;

use App\Models\CatatanKesehatan;
use App\Models\Faskes;
use App\Models\KunjunganPosbindu;
use App\Models\LogAudit;
use App\Models\Pengaduan;
use App\Models\Pengguna;
use App\Models\PesertaProgram;
use App\Models\Program;
use App\Models\Refleksi;
use App\Models\RiwayatWilayah;
use App\Models\Rujukan;
use App\Models\SesiPosbindu;
use App\Models\TargetKesehatan;
use App\Models\Wilayah;
use App\Services\HealthCalculatorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Seeder harus bisa dijalankan berulang tanpa menggandakan data.
 * Ini penting karena `php artisan migrate --seed` sering dijalankan ulang
 * di mesin developer, dan duplikat data master merusak dashboard.
 */
class SeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_seeder_berjalan_tanpa_error(): void
    {
        Storage::fake('local');

        $this->seed();

        $this->assertGreaterThan(0, Wilayah::count());
        $this->assertGreaterThan(0, Faskes::count());
        $this->assertGreaterThan(0, Pengguna::where('role', 'admin_kelurahan')->count());
        $this->assertGreaterThan(0, Pengguna::where('role', 'kader')->count());
        $this->assertGreaterThan(0, CatatanKesehatan::where('perlu_verifikasi', false)->count());
        $this->assertGreaterThan(0, CatatanKesehatan::where('perlu_verifikasi', true)->count());
        $this->assertGreaterThan(0, SesiPosbindu::count());
        $this->assertGreaterThan(0, KunjunganPosbindu::count());
        $this->assertGreaterThan(0, Rujukan::count());
        $this->assertGreaterThan(0, Program::count());
        $this->assertGreaterThan(0, PesertaProgram::where('status', 'menunggu_verifikasi')->count());
        $this->assertGreaterThan(0, TargetKesehatan::count());
        $this->assertGreaterThan(0, Refleksi::count());
        $this->assertGreaterThan(0, Pengaduan::count());
        $this->assertGreaterThan(0, LogAudit::count());
        $this->assertGreaterThan(0, RiwayatWilayah::count());

        // Pastikan IndikatorSeeder selaras dengan HealthCalculatorService (gula_darah puasa, 2jam_pp & ambang Kemenkes 130/85)
        $kalkulator = app(HealthCalculatorService::class);
        $this->assertSame('tinggi', $kalkulator->kategori('gula_darah', 150, 'puasa')['kategori'] ?? null);
        $this->assertFalse($kalkulator->kategori('gula_darah', 210, '2jam_pp')['memicu_rujukan'] ?? true);
        $this->assertSame('normal', $kalkulator->kategori('sistol', 125)['kategori'] ?? null);
        $this->assertSame('normal', $kalkulator->kategori('diastol', 82)['kategori'] ?? null);
        $this->assertTrue($kalkulator->kategori('sistol', 185)['memicu_rujukan'] ?? false);
    }

    public function test_seeder_dua_kali_tidak_menggandakan_data(): void
    {
        Storage::fake('local');

        $this->seed();

        $wilayah = Wilayah::count();
        $faskes  = Faskes::count();
        $admin   = Pengguna::where('role', 'admin_kelurahan')->count();
        $catatan = CatatanKesehatan::count();
        $program = Program::count();
        $rujukan = Rujukan::count();

        $this->seed();

        $this->assertSame($wilayah, Wilayah::count(), 'wilayah bertambah saat seed diulang');
        $this->assertSame($faskes, Faskes::count(), 'faskes bertambah saat seed diulang');
        $this->assertSame($admin, Pengguna::where('role', 'admin_kelurahan')->count());
        $this->assertSame($catatan, CatatanKesehatan::count(), 'catatan bertambah saat seed diulang');
        $this->assertSame($program, Program::count(), 'program bertambah saat seed diulang');
        $this->assertSame($rujukan, Rujukan::count(), 'rujukan bertambah saat seed diulang');
    }

    public function test_wilayah_yang_dipakai_faskes_tersedia(): void
    {
        Storage::fake('local');

        $this->seed();

        $namaFaskes = Faskes::pluck('wilayah_id')->unique();

        foreach ($namaFaskes as $id) {
            $this->assertNotNull(
                Wilayah::find($id),
                "Faskes menunjuk wilayah_id={$id} yang tidak ada"
            );
        }
    }
}
