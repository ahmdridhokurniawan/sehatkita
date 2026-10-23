<?php
// database/seeders/WilayahSeeder.php
namespace Database\Seeders;

use App\Models\Wilayah;
use Illuminate\Database\Seeder;

class WilayahSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Kecamatan Banjarbaru Utara (kode Kemendagri 63.72.04).
        //    updateOrCreate: kalau kode sudah ada, baris di-update, tidak digandakan.
        $kecamatan = Wilayah::updateOrCreate(
            ['kode' => '63.72.04'],          // kunci pencarian
            [
                'parent_id' => null,          // kecamatan tidak punya induk
                'nama'      => 'Banjarbaru Utara',
                'tipe'      => 'kecamatan',
            ]
        );

        // 2. Empat kelurahan di bawah Banjarbaru Utara.
        $kelurahan = [
            ['nama' => 'Loktabat Utara', 'kode' => '63.72.04.1001'],
            ['nama' => 'Mentaos',        'kode' => '63.72.04.1002'],
            ['nama' => 'Sungai Ulin',    'kode' => '63.72.04.1003'],
            ['nama' => 'Guntung Payung', 'kode' => '63.72.04.1004'],
        ];

        foreach ($kelurahan as $k) {
            // 3. parent_id diambil dari id kecamatan hasil langkah 1,
            //    supaya relasi kecamatan -> kelurahan benar.
            Wilayah::updateOrCreate(
                ['kode' => $k['kode']],
                [
                    'parent_id' => $kecamatan->id,
                    'nama'      => $k['nama'],
                    'tipe'      => 'kelurahan',
                ]
            );
        }
    }
}
