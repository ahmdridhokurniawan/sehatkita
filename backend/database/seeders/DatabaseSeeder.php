<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Orkestrator: menjalankan semua seeder data master.
     *
     * Urutan wajib karena ada relasi antar tabel:
     *   1. Wilayah   → dipakai FK oleh faskes & pengguna.
     *   2. Indikator → sekaligus mengisi ambang_kategori (24 baris).
     *   3. Faskes    → butuh wilayah_id dari langkah pertama.
     */
    public function run(): void
    {
        $this->call([
            WilayahSeeder::class,
            IndikatorSeeder::class,
            FaskesSeeder::class,
        ]);
    }
}