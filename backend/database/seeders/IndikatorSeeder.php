<?php

namespace Database\Seeders;

use App\Models\Indikator;
use App\Services\HealthCalculatorService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class IndikatorSeeder extends Seeder
{
    public function run(): void
    {
        // Pertahankan ID indikator eksisting dengan updateOrCreate, lalu reset ambang agar selalu selaras Kontrak v1.5.
        DB::table('ambang_kategori')->delete();

        // Format tiap ambang: [jenis_gula_darah, batas_min, batas_max, kategori, status, skor, memicu_rujukan]
        // Rentang [batas_min, batas_max) kontinu tanpa celah desimal.
        $indikator = [
            [
                'kode'                   => 'imt',
                'nama'                   => 'Indeks Massa Tubuh',
                'satuan'                 => 'kg/m2',
                'kelompok'               => 'antropometri',
                'interval_skrining_hari' => 30,
                'ambang'                 => [
                    [null, 0,    18.5, 'kurus',    'perlu_perhatian', 1, false],
                    [null, 18.5, 25,   'normal',   'normal',          0, false],
                    [null, 25,   30,   'gemuk',    'perlu_perhatian', 1, false],
                    [null, 30,   null, 'obesitas', 'berisiko',        2, false],
                ],
            ],
            [
                'kode'                   => 'sistol',
                'nama'                   => 'Tekanan Darah Sistolik',
                'satuan'                 => 'mmHg',
                'kelompok'               => 'pemeriksaan fisik',
                'interval_skrining_hari' => 30,
                'ambang'                 => [
                    [null, 0,   120,  'normal',          'normal',          0, false],
                    [null, 120, 140,  'perlu_perhatian', 'perlu_perhatian', 1, false],
                    [null, 140, 180,  'tinggi',          'berisiko',        2, false],
                    [null, 180, null, 'krisis',          'berisiko',        3, true],
                ],
            ],
            [
                'kode'                   => 'diastol',
                'nama'                   => 'Tekanan Darah Diastolik',
                'satuan'                 => 'mmHg',
                'kelompok'               => 'pemeriksaan fisik',
                'interval_skrining_hari' => 30,
                'ambang'                 => [
                    [null, 0,   80,   'normal',          'normal',          0, false],
                    [null, 80,  90,   'perlu_perhatian', 'perlu_perhatian', 1, false],
                    [null, 90,  110,  'tinggi',          'berisiko',        2, false],
                    [null, 110, null, 'krisis',          'berisiko',        3, true],
                ],
            ],
            [
                'kode'                   => 'gula_darah',
                'nama'                   => 'Gula Darah',
                'satuan'                 => 'mg/dL',
                'kelompok'               => 'biokimia',
                'interval_skrining_hari' => 90,
                'ambang'                 => [
                    ['puasa',   0,   100,  'normal',          'normal',          0, false],
                    ['puasa',   100, 126,  'perlu_perhatian', 'perlu_perhatian', 1, false],
                    ['puasa',   126, null, 'tinggi',          'berisiko',        2, false],
                    ['2jam_pp', 0,   140,  'normal',          'normal',          0, false],
                    ['2jam_pp', 140, 200,  'perlu_perhatian', 'perlu_perhatian', 1, false],
                    ['2jam_pp', 200, null, 'tinggi',          'berisiko',        2, true],
                ],
            ],
            [
                'kode'                   => 'kolesterol',
                'nama'                   => 'Kolesterol Total',
                'satuan'                 => 'mg/dL',
                'kelompok'               => 'biokimia',
                'interval_skrining_hari' => 30,
                'ambang'                 => [
                    [null, 0,   200,  'normal',          'normal',          0, false],
                    [null, 200, 240,  'perlu_perhatian', 'perlu_perhatian', 1, false],
                    [null, 240, null, 'tinggi',          'berisiko',        2, false],
                ],
            ],
            [
                'kode'                   => 'asam_urat',
                'nama'                   => 'Asam Urat',
                'satuan'                 => 'mg/dL',
                'kelompok'               => 'biokimia',
                'interval_skrining_hari' => 30,
                'ambang'                 => [
                    [null, 0, 7,    'normal',          'normal',          0, false],
                    [null, 7, 9,    'perlu_perhatian', 'perlu_perhatian', 1, false],
                    [null, 9, null, 'tinggi',          'berisiko',        2, false],
                ],
            ],
        ];

        $sekarang = now();
        foreach ($indikator as $ind) {
            $model = Indikator::updateOrCreate(
                ['kode' => $ind['kode']],
                [
                    'nama'                   => $ind['nama'],
                    'satuan'                 => $ind['satuan'],
                    'kelompok'               => $ind['kelompok'],
                    'interval_skrining_hari' => $ind['interval_skrining_hari'],
                ]
            );

            DB::table('ambang_kategori')->insert(
                array_map(function ($a) use ($model, $sekarang) {
                    return [
                        'indikator_id'     => $model->id,
                        'jenis_gula_darah' => $a[0],
                        'batas_min'        => $a[1],
                        'batas_max'        => $a[2],
                        'kategori'         => $a[3],
                        'status'           => $a[4],
                        'skor'             => $a[5],
                        'memicu_rujukan'   => $a[6],
                        'created_at'       => $sekarang,
                        'updated_at'       => $sekarang,
                    ];
                }, $ind['ambang'])
            );
        }

        Cache::forget('ambang_kategori:semua');
        app(HealthCalculatorService::class)->lupakanCache();
    }
}
