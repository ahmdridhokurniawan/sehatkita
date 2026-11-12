<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;               

class FaskesSeeder extends Seeder
{
    // Dijalankan saat: php artisan db:seed --class=FaskesSeeder
    public function run(): void
    {
        // 1. Cari id tiap kelurahan berdasarkan NAMA, bukan angka.
        //    Kenapa dicari? Supaya tidak hardcoded id=1, id=2 dst —
        //    kalau seeder wilayah diubah urutannya, seeder ini tetap benar.
        $kelurahan = [
            'Guntung Paikat'   => DB::table('wilayah')->where('nama', 'Guntung Paikat')->value('id'),
            'Kemuning'         => DB::table('wilayah')->where('nama', 'Kemuning')->value('id'),
            'Loktabat Selatan' => DB::table('wilayah')->where('nama', 'Loktabat Selatan')->value('id'),
            'Sungai Besar'     => DB::table('wilayah')->where('nama', 'Sungai Besar')->value('id'),
            'Loktabat Utara'   => DB::table('wilayah')->where('nama', 'Loktabat Utara')->value('id'),
            'Sungai Ulin'      => DB::table('wilayah')->where('nama', 'Sungai Ulin')->value('id'),
        ];

        $faskes = [
            [
                'wilayah_id' => $kelurahan['Loktabat Selatan'] ?? null,
                'nama'       => 'Puskesmas Banjarbaru Selatan',
                'jenis'      => 'puskesmas',
                'alamat'     => 'Jl. Rambai No. 1, Loktabat Selatan, Banjarbaru Selatan',
                'telepon'    => '(0511) 4772134',
                'lat'        => -3.4475120,
                'lng'        => 114.8392110,
            ],
            [
                'wilayah_id' => $kelurahan['Sungai Besar'] ?? null,
                'nama'       => 'Puskesmas Sungai Besar',
                'jenis'      => 'puskesmas',
                'alamat'     => 'Jl. Mistar Cokrokusumo, Sungai Besar, Banjarbaru Selatan',
                'telepon'    => '(0511) 4781254',
                'lat'        => -3.4561020,
                'lng'        => 114.8489210,
            ],
            [
                'wilayah_id' => $kelurahan['Loktabat Utara'] ?? null,
                'nama'       => 'Puskesmas Banjarbaru Utara',
                'jenis'      => 'puskesmas',
                'alamat'     => 'Jl. Panglima Batur No. 12, Loktabat Utara, Banjarbaru Utara',
                'telepon'    => '(0511) 4772589',
                'lat'        => -3.4385210,
                'lng'        => 114.8315420,
            ],
            [
                'wilayah_id' => $kelurahan['Sungai Ulin'] ?? null,
                'nama'       => 'Puskesmas Sungai Ulin',
                'jenis'      => 'puskesmas',
                'alamat'     => 'Jl. PM Noor, Sungai Ulin, Banjarbaru Utara',
                'telepon'    => '(0511) 4773120',
                'lat'        => -3.4312500,
                'lng'        => 114.8512400,
            ],
            [
                'wilayah_id' => $kelurahan['Guntung Paikat'] ?? null,
                'nama'       => 'RSD Idaman Kota Banjarbaru',
                'jenis'      => 'rumah_sakit',
                'alamat'     => 'Jl. Trikora No. 115, Guntung Paikat, Banjarbaru Selatan',
                'telepon'    => '(0511) 6749696',
                'lat'        => -3.4687500,
                'lng'        => 114.8164000,
            ],
            [
                'wilayah_id' => $kelurahan['Guntung Paikat'] ?? null,
                'nama'       => 'RS Almansyur Medika',
                'jenis'      => 'rumah_sakit',
                'alamat'     => 'Jl. P. Suriansyah No. 25, Guntung Paikat, Banjarbaru Selatan',
                'telepon'    => '(0511) 4774500',
                'lat'        => -3.4442000,
                'lng'        => 114.8351000,
            ],
            [
                'wilayah_id' => $kelurahan['Kemuning'] ?? null,
                'nama'       => 'Klinik Pratama Banjarbaru Selatan',
                'jenis'      => 'klinik',
                'alamat'     => 'Jl. Kemuning Raya, Kemuning, Banjarbaru Selatan',
                'telepon'    => '(0511) 4776100',
                'lat'        => -3.4491200,
                'lng'        => 114.8415000,
            ],
        ];

        foreach ($faskes as $f) {
            $ada = DB::table('faskes')->where('nama', $f['nama'])->exists();

            $isi = [
                'wilayah_id' => $f['wilayah_id'],
                'jenis'      => $f['jenis'],
                'alamat'     => $f['alamat'],
                'telepon'    => $f['telepon'],
                'lat'        => $f['lat'],
                'lng'        => $f['lng'],
                'updated_at' => now(),
            ];

            if ($ada) {
                // Jangan sentuh created_at saat update.
                DB::table('faskes')->where('nama', $f['nama'])->update($isi);
            } else {
                DB::table('faskes')->insert($isi + [
                    'nama'       => $f['nama'],
                    'created_at' => now(),
                ]);
            }
        }
    }
}
