<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;            

class WilayahSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Masukkan 1 baris kecamatan dulu
        $kecamatanId = DB::table('wilayah')->insertGetId([
            'parent_id' => null,                                   // kecamatan tidak punya induk
            'nama'      => 'Banjarbaru Selatan',                   // nama wilayah
            'tipe'      => 'kecamatan',                            // enum: kecamatan | kelurahan
            'kode'      => '63.72.05',                             // kode Kemendagri asli
            'created_at' => now(),                                 // kolom timestamps, wajib diisi manual
            'updated_at' => now(),
        ]);

        $kelurahan = [
            ['nama' => 'Guntung Paikat',     'kode' => '63.72.05.1001'],
            ['nama' => 'Kemuning',           'kode' => '63.72.05.1002'],
            ['nama' => 'Loktabat Selatan',   'kode' => '63.72.05.1003'],
            ['nama' => 'Sungai Besar',       'kode' => '63.72.05.1004'],
        ];

        // 3. Masukkan kelurahan sekaligus (multi-insert).
        //    array_map: tambahkan parent_id + timestamps ke tiap elemen array di atas.
        DB::table('wilayah')->insert(
            array_map(function ($k) use ($kecamatanId) {
                return [
                    'parent_id'  => $kecamatanId,   // semua kelurahan di kelompokkan ke kecamatan tadi
                    'nama'       => $k['nama'],
                    'tipe'       => 'kelurahan',
                    'kode'       => $k['kode'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }, $kelurahan)
        );
    }
}
