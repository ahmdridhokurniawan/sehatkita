<?php

namespace Tests\Feature;

use App\Models\Faskes;
use App\Models\Pengguna;
use App\Models\Wilayah;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
        // PenggunaDemoSeeder dulu dipanggil padahal tidak ada → db:seed gagal total.
        $this->seed();

        $this->assertGreaterThan(0, Wilayah::count());
        $this->assertGreaterThan(0, Faskes::count());
        $this->assertGreaterThan(0, Pengguna::where('role', 'admin_kelurahan')->count());
        $this->assertGreaterThan(0, Pengguna::where('role', 'kader')->count());
    }

    public function test_seeder_dua_kali_tidak_menggandakan_data(): void
    {
        $this->seed();

        $wilayah = Wilayah::count();
        $faskes  = Faskes::count();
        $admin   = Pengguna::where('role', 'admin_kelurahan')->count();

        $this->seed();

        $this->assertSame($wilayah, Wilayah::count(), 'wilayah bertambah saat seed diulang');
        $this->assertSame($faskes, Faskes::count(), 'faskes bertambah saat seed diulang');
        $this->assertSame($admin, Pengguna::where('role', 'admin_kelurahan')->count());
    }

    public function test_wilayah_yang_dipakai_faskes_tersedia(): void
    {
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
