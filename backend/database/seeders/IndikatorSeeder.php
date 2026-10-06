<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class IndikatorSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('ambang_kategori')->delete();
        DB::table('indikator')->delete();
        // 1. Data indikator + ambangnya dalam satu struktur.
        //    Format ambang: [batas_min, batas_max, kategori, status, skor]
        //    Status hanya boleh: normal | perlu_perhatian | berisiko (sesuai enum di migrasi).
        //    Batas mengikuti standar Kemenkes/Permenkes.
        $indikator = [
            [
                'kode'     => 'imt',
                'nama'     => 'Indeks Massa Tubuh',
                'satuan'   => 'kg/m2',
                'kelompok' => 'antropometri',
                'ambang'   => [
                    [0,     18.49, 'berat badan kurang',  'perlu_perhatian', 1],
                    [18.50, 22.99, 'normal',              'normal',          0],
                    [23.00, 24.99, 'berat badan berlebih', 'perlu_perhatian', 1],
                    [25.00, 29.99, 'gemuk',               'perlu_perhatian', 2],
                    [30.00, null,  'obesitas',            'berisiko',        3],
                ],
            ],
            [
                'kode'     => 'sistol',
                'nama'     => 'Tekanan Darah Sistolik',
                'satuan'   => 'mmHg',
                'kelompok' => 'pemeriksaan fisik',
                'ambang'   => [
                    [0,     119, 'optimal',      'normal',          0],
                    [120,   129, 'normal',       'normal',          1],
                    [130,   139, 'tinggi-1',     'perlu_perhatian', 2],
                    [140,   159, 'hipertensi-1', 'berisiko',        3],
                    [160,   null, 'hipertensi-2', 'berisiko',        4],
                ],
            ],
            [
                'kode'     => 'diastol',
                'nama'     => 'Tekanan Darah Diastolik',
                'satuan'   => 'mmHg',
                'kelompok' => 'pemeriksaan fisik',
                'ambang'   => [
                    [0,   79,  'optimal',      'normal',          0],
                    [80,  84,  'normal',       'normal',          1],
                    [85,  89,  'tinggi-1',     'perlu_perhatian', 2],
                    [90,  99,  'hipertensi-1', 'berisiko',        3],
                    [100, null, 'hipertensi-2', 'berisiko',        4],
                ],
            ],
            [
                'kode'     => 'gula_darah',
                'nama'     => 'Gula Darah Sewaktu',
                'satuan'   => 'mg/dL',
                'kelompok' => 'biokimia',
                'ambang'   => [
                    [0,   139, 'normal',       'normal',          0],
                    [140, 199, 'pre-diabetes', 'perlu_perhatian', 2],
                    [200, null, 'diabetes',     'berisiko',        3],
                ],
            ],
            [
                'kode'     => 'kolesterol',
                'nama'     => 'Kolesterol Total',
                'satuan'   => 'mg/dL',
                'kelompok' => 'biokimia',
                'ambang'   => [
                    [0,   149, 'normal',     'normal',          0],
                    [150, 199, 'borderline', 'perlu_perhatian', 1],
                    [200, null, 'tinggi',     'berisiko',        2],
                ],
            ],
            [
                'kode'     => 'asam_urat',
                'nama'     => 'Asam Urat',
                'satuan'   => 'mg/dL',
                'kelompok' => 'biokimia',
                'ambang'   => [
                    // Batas umum. Asam urat idealnya dibedakan per jenis kelamin
                    // (pria < 7, wanita < 6), tapi tabel ambang belum punya
                    // kolom jenis_kelamin. Sementara pakai batas umum;
                    // service kalkulasi nanti bisa bedakan sendiri.
                    [0,   5.99, 'normal',        'normal',          0],
                    [6.0, 8.99, 'tinggi',        'perlu_perhatian', 2],
                    [9.0, null, 'sangat tinggi', 'berisiko',        3],
                ],
            ],
        ];

        // 2. Setiap indikator: masukkan indikatornya dulu (insertGetId),
        //    lalu masukkan ambangnya pakai id yang baru.
        foreach ($indikator as $ind) {
            $indikatorId = DB::table('indikator')->insertGetId([
                'kode'       => $ind['kode'],
                'nama'       => $ind['nama'],
                'satuan'     => $ind['satuan'],
                'kelompok'   => $ind['kelompok'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // 3. Ambang kategori: banyak baris untuk 1 indikator.
            //    Batas tidak wajib desimal 2 angka, tapi kolomnya decimal(8,2),
            //    jadi MariaDB otomatis bulatkan.
            DB::table('ambang_kategori')->insert(
                array_map(function ($a) use ($indikatorId) {
                    return [
                        'indikator_id' => $indikatorId,
                        'batas_min'    => $a[0],
                        'batas_max'    => $a[1],
                        'kategori'     => $a[2],
                        'status'       => $a[3],
                        'skor'         => $a[4],
                        'created_at'   => now(),
                        'updated_at'   => now(),
                    ];
                }, $ind['ambang'])
            );
        }
    }
}
