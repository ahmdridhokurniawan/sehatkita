<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Menjalankan semua seeder data master dan data demo.
     *
     * Urutan penting: wilayah harus ada sebelum faskes & pengguna, karena
     * keduanya mencari id wilayah berdasarkan kode/nama.
     */
    public function run(): void
    {
        $this->call([
            WilayahSeeder::class,
            IndikatorSeeder::class,
            FaskesSeeder::class,
            PenggunaWilayahSeeder::class,
        ]);
    }
}
