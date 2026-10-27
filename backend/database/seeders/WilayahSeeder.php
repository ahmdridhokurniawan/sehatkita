<?php
// database/seeders/WilayahSeeder.php
namespace Database\Seeders;

use App\Models\Wilayah;
use Illuminate\Database\Seeder;

class WilayahSeeder extends Seeder
{
    public function run(): void
    {
        // Kecamatan & kelurahan yang dipakai data demo (FaskesSeeder,
        // PenggunaWilayahSeeder). Kode mengikuti Kemendagri.
        // updateOrCreate: aman dijalankan berulang, tidak menggandakan baris
        // dan tidak menghapus wilayah lain.
        $ini = [
            '63.72.05' => [
                'nama' => 'Banjarbaru Selatan',
                'kelurahan' => [
                    '63.72.05.1001' => 'Guntung Paikat',
                    '63.72.05.1002' => 'Kemuning',
                    '63.72.05.1003' => 'Loktabat Selatan',
                    '63.72.05.1004' => 'Sungai Besar',
                ],
            ],
            '63.72.04' => [
                'nama' => 'Banjarbaru Utara',
                'kelurahan' => [
                    '63.72.04.1001' => 'Loktabat Utara',
                    '63.72.04.1002' => 'Mentaos',
                    '63.72.04.1003' => 'Sungai Ulin',
                    '63.72.04.1004' => 'Guntung Payung',
                ],
            ],
        ];

        foreach ($ini as $kode => $data) {
            $kecamatan = Wilayah::updateOrCreate(
                ['kode' => $kode],
                [
                    'parent_id' => null,
                    'nama'      => $data['nama'],
                    'tipe'      => 'kecamatan',
                ]
            );

            foreach ($data['kelurahan'] as $kodeKel => $nama) {
                Wilayah::updateOrCreate(
                    ['kode' => $kodeKel],
                    [
                        'parent_id' => $kecamatan->id,
                        'nama'      => $nama,
                        'tipe'      => 'kelurahan',
                    ]
                );
            }
        }
    }
}
