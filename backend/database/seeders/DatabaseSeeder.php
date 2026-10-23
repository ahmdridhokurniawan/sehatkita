<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Menjalankan semua seeder data master dan data demo.
     */
    public function run(): void
    {
        $this->call([
            WilayahSeeder::class,
            IndikatorSeeder::class,
            FaskesSeeder::class,
            PenggunaDemoSeeder::class,
        ]);
    }
}
