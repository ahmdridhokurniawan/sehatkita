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
        ];

        // 2. Daftar faskes di Banjarbaru Selatan.
        //    Nama diambil dari daftar resmi Kota Banjarbaru.
        //    Alamat hanya ditulis nama kelurahannya saja (info wilayah),
        //    telepon & koordinat dikosongkan — lengkapi nanti lewat menu admin.
        $faskes = [
            [
                'wilayah_id' => $kelurahan['Loktabat Selatan'],
                'nama'       => 'Puskesmas Banjarbaru Selatan',
                'jenis'      => 'puskesmas',                          // enum: puskesmas | klinik | rumah_sakit | lainnya
                'alamat'     => 'Kel. Loktabat Selatan, Kec. Banjarbaru Selatan',
            ],
            [
                'wilayah_id' => $kelurahan['Sungai Besar'],
                'nama'       => 'Puskesmas Sungai Besar',
                'jenis'      => 'puskesmas',
                'alamat'     => 'Kel. Sungai Besar, Kec. Banjarbaru Selatan',
            ],
            [
                'wilayah_id' => $kelurahan['Guntung Paikat'],
                'nama'       => 'RS Almansyur Medika',
                'jenis'      => 'rumah_sakit',
                'alamat'     => 'Kel. Guntung Paikat, Kec. Banjarbaru Selatan',
            ],
            [
                'wilayah_id' => $kelurahan['Kemuning'],
                'nama'       => 'Klinik Pratama Banjarbaru Selatan',
                'jenis'      => 'klinik',
                'alamat'     => 'Kel. Kemuning, Kec. Banjarbaru Selatan',
            ],
        ];

        // 3. Masukkan dengan updateOrCreate (bukan insert biasa) supaya seeder
        //    aman dijalankan berulang: `insert` selalu menambah baris baru,
        //    sehingga faskes jadi dobel tiap kali db:seed dijalankan.
        foreach ($faskes as $f) {
            $ada = DB::table('faskes')->where('nama', $f['nama'])->exists();

            $isi = [
                'wilayah_id' => $f['wilayah_id'],
                'jenis'      => $f['jenis'],
                'alamat'     => $f['alamat'],
                'telepon'    => null,             // nullable — admin isi nanti
                'lat'        => null,
                'lng'        => null,
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
