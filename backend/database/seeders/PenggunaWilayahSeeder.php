<?php
// database/seeders/PenggunaWilayahSeeder.php
namespace Database\Seeders;

use App\Models\Pengguna;
use App\Models\Wilayah;
use Illuminate\Database\Seeder;

class PenggunaWilayahSeeder extends Seeder
{
    public function run(): void
    {
        // 1️ password semua akun demo (model Pengguna punya cast "hashed")
        $password = 'demo1234';

        // 2 cari id kecamatan Banjarbaru Utara (kode 63.72.04)
        $kecamatanId = Wilayah::where('kode', '63.72.04')->value('id');

        if (! $kecamatanId) {
            $this->command->error('Kecamatan Banjarbaru Utara belum ada. Jalankan WilayahSeeder dulu.');
            return;
        }

        // 3️⃣ ambil semua kelurahan yang child‑nya kecamatan itu
        $kelurahan = Wilayah::where('parent_id', $kecamatanId)
            ->where('tipe', 'kelurahan')
            ->orderBy('kode')
            ->get();

        foreach ($kelurahan as $w) {
            // contoh: "Loktabat Utara" → "loktabatutara"
            $slug = strtolower(str_replace(' ', '', $w->nama));

            // 👤 admin kelurahan – akses agregat kelurahan saja
            Pengguna::updateOrCreate(
                ['email' => "admin.{$slug}@sehatkita.test"],
                [
                    'name'            => "Admin {$w->nama}",
                    'password'        => $password,
                    'role'            => 'admin_kelurahan',
                    'wilayah_id'      => $w->id,
                    'aktif'           => true,
                    'consent_at'      => now(),
                    'versi_kebijakan' => '1.0',
                ]
            );

            // 👥 kader – dapat mengelola data warga di wilayahnya
            Pengguna::updateOrCreate(
                ['email' => "kader.{$slug}@sehatkita.test"],
                [
                    'name'            => "Kader {$w->nama}",
                    'password'        => $password,
                    'role'            => 'kader',
                    'wilayah_id'      => $w->id,
                    'aktif'           => true,
                    'consent_at'      => now(),
                    'versi_kebijakan' => '1.0',
                ]
            );
        }

        $this->command->info('Seeder PenggunaWilayah selesai – admin & kader Banjarbaru Utara terbuat.');
    }
}