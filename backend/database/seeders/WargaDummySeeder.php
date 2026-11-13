<?php

namespace Database\Seeders;

use App\Models\BadgePengguna;
use App\Models\CatatanKesehatan;
use App\Models\Faskes;
use App\Models\KunjunganPosbindu;
use App\Models\LogAudit;
use App\Models\Pengaduan;
use App\Models\Pengguna;
use App\Models\PesertaProgram;
use App\Models\Profil;
use App\Models\Program;
use App\Models\Refleksi;
use App\Models\RiwayatWilayah;
use App\Models\Rujukan;
use App\Models\SesiPosbindu;
use App\Models\TargetKesehatan;
use App\Models\Wilayah;
use App\Services\HealthCalculatorService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class WargaDummySeeder extends Seeder
{
    private HealthCalculatorService $kalkulator;

    public function run(): void
    {
        $this->kalkulator = app(HealthCalculatorService::class);
        $this->kalkulator->lupakanCache();

        $loktabatUtara = Wilayah::where('nama', 'Loktabat Utara')->first();
        $guntungPaikat = Wilayah::where('nama', 'Guntung Paikat')->first();

        if (! $loktabatUtara) {
            $this->command->error('Kelurahan Loktabat Utara tidak ditemukan.');
            return;
        }

        $kaderLu = Pengguna::where('email', 'kader.loktabatutara@sehatkita.test')->first();
        $kader2Lu = Pengguna::where('email', 'kader2.loktabatutara@sehatkita.test')->first();
        $adminLu = Pengguna::where('email', 'admin.loktabatutara@sehatkita.test')->first();
        $kaderGp = Pengguna::where('email', 'kader.guntungpaikat@sehatkita.test')->first();
        $kader2Gp = Pengguna::where('email', 'kader2.guntungpaikat@sehatkita.test')->first();
        $adminGp = Pengguna::where('email', 'admin.guntungpaikat@sehatkita.test')->first();
        $superAdmin = Pengguna::where('email', 'superadmin@sehatkita.test')->first();

        $faskesPuskesmasLu = Faskes::where('nama', 'Puskesmas Banjarbaru Utara')->first() ?? Faskes::first();
        $faskesRs = Faskes::where('nama', 'RSD Idaman Kota Banjarbaru')->first() ?? Faskes::first();
        $faskesRsAlmansyur = Faskes::where('nama', 'RS Almansyur Medika')->first() ?? $faskesRs;
        $faskesKlinik = Faskes::where('nama', 'Klinik Pratama Banjarbaru Selatan')->first() ?? Faskes::first();
        $faskesPuskesmasBs = Faskes::where('nama', 'Puskesmas Banjarbaru Selatan')->first() ?? $faskesPuskesmasLu;
        $faskesPuskesmasSb = Faskes::where('nama', 'Puskesmas Sungai Besar')->first() ?? $faskesPuskesmasLu;
        $faskesPuskesmasSu = Faskes::where('nama', 'Puskesmas Sungai Ulin')->first() ?? $faskesPuskesmasLu;

        $password = 'demo1234';

        // ------------------------------------------------------------------
        // 1. Akun warga utama (Budi Santoso - Loktabat Utara)
        // ------------------------------------------------------------------
        $budi = Pengguna::updateOrCreate(
            ['email' => 'warga.loktabatutara@sehatkita.test'],
            [
                'name'             => 'Budi Santoso',
                'nik'              => '6372041206880001',
                'password'         => $password,
                'role'             => 'user',
                'wilayah_id'       => $loktabatUtara->id,
                'kader_id'         => $kaderLu?->id,
                'aktif'            => true,
                'consent_at'       => now()->subMonths(3),
                'versi_kebijakan'  => '1.0',
                'exp_total'        => 380,
                'level_gamifikasi' => 4,
            ]
        );

        Profil::updateOrCreate(
            ['user_id' => $budi->id],
            [
                'tgl_lahir'                   => Carbon::now()->subYears(32)->format('Y-06-12'),
                'jenis_kelamin'               => 'L',
                'tinggi_cm'                   => 170.00,
                'tingkat_aktivitas'           => 'sedang',
                'merokok'                     => false,
                'riwayat_keluarga'            => ['hipertensi', 'diabetes'],
                'tampil_di_peringkat'         => true,
                'bb_awal_kg'                  => 78.00,
                'bb_target_kg'                => 70.00,
                'target_aktivitas_per_minggu' => 4,
                'target_air_ml'               => 2200,
            ]
        );

        // Riwayat multi-bulan Budi Santoso: menghasilkan grafik tren 6 bulan, perbandingan bulan lalu, dan beberapa level insight
        $riwayatBudi = [
            [
                'tanggal'  => Carbon::now()->subMonthsNoOverflow(5)->startOfMonth()->addDays(7)->toDateString(),
                'sumber'   => 'puskesmas',
                'bb'       => 80.5,
                'tb'       => 170.0,
                'lp'       => 95.0,
                'sistol'   => 150,
                'diastol'  => 96,
                'gula'     => 168,
                'jenis'    => '2jam_pp',
                'kol'      => 234,
                'asam'     => 7.9,
                'tidur'    => 5,
                'merokok'  => false,
                'manis'    => 'setiap_hari',
                'catatan'  => 'Pemeriksaan awal poli PTM Puskesmas Banjarbaru Utara.',
            ],
            [
                'tanggal'  => Carbon::now()->subMonthsNoOverflow(4)->startOfMonth()->addDays(10)->toDateString(),
                'sumber'   => 'mandiri',
                'bb'       => 79.4,
                'tb'       => 170.0,
                'lp'       => 94.0,
                'sistol'   => 148,
                'diastol'  => 94,
                'gula'     => 120,
                'jenis'    => 'puasa',
                'kol'      => 226,
                'asam'     => 7.6,
                'tidur'    => 6,
                'merokok'  => false,
                'manis'    => 'sering',
                'catatan'  => 'Mulai kurangi konsumsi minuman manis kemasan.',
            ],
            [
                'tanggal'  => Carbon::now()->subMonthsNoOverflow(3)->startOfMonth()->addDays(12)->toDateString(),
                'sumber'   => 'kader',
                'bb'       => 78.8,
                'tb'       => 170.0,
                'lp'       => 93.0,
                'sistol'   => 146,
                'diastol'  => 93,
                'gula'     => 116,
                'jenis'    => 'puasa',
                'kol'      => 222,
                'asam'     => 7.5,
                'tidur'    => 6,
                'merokok'  => false,
                'manis'    => 'sering',
                'catatan'  => 'Skrining Posbindu bulan ke-3.',
            ],
            [
                'tanggal'  => Carbon::now()->subMonthsNoOverflow(2)->startOfMonth()->addDays(9)->toDateString(),
                'sumber'   => 'kader',
                'bb'       => 78.0,
                'tb'       => 170.0,
                'lp'       => 92.0,
                'sistol'   => 144,
                'diastol'  => 92,
                'gula'     => 112,
                'jenis'    => 'puasa',
                'kol'      => 218,
                'asam'     => 7.4,
                'tidur'    => 6,
                'merokok'  => false,
                'manis'    => 'sering',
                'catatan'  => 'Pemeriksaan awal triwulan di Posbindu.',
            ],
            [
                'tanggal'  => Carbon::now()->subMonthNoOverflow()->startOfMonth()->addDays(11)->toDateString(),
                'sumber'   => 'mandiri',
                'bb'       => 75.5,
                'tb'       => 170.0,
                'lp'       => 89.0,
                'sistol'   => 138,
                'diastol'  => 88,
                'gula'     => 104,
                'jenis'    => 'puasa',
                'kol'      => 205,
                'asam'     => 6.8,
                'tidur'    => 7,
                'merokok'  => false,
                'manis'    => 'jarang',
                'catatan'  => 'Mulai rutin jalan pagi 3x seminggu.',
            ],
            [
                'tanggal'  => Carbon::now()->subDays(12)->toDateString(),
                'sumber'   => 'kader',
                'bb'       => 74.2,
                'tb'       => 170.0,
                'lp'       => 87.5,
                'sistol'   => 146,
                'diastol'  => 94,
                'gula'     => 101,
                'jenis'    => 'puasa',
                'kol'      => 202,
                'asam'     => 6.5,
                'tidur'    => 6,
                'merokok'  => false,
                'manis'    => 'jarang',
                'catatan'  => 'Tensi sedikit naik karena kurang tidur.',
            ],
            [
                'tanggal'  => Carbon::now()->subDays(3)->toDateString(),
                'sumber'   => 'mandiri',
                'bb'       => 73.4,
                'tb'       => 170.0,
                'lp'       => 86.0,
                'sistol'   => 142,
                'diastol'  => 90,
                'gula'     => 96,
                'jenis'    => 'puasa',
                'kol'      => 194,
                'asam'     => 6.1,
                'tidur'    => 7,
                'merokok'  => false,
                'manis'    => 'jarang',
                'catatan'  => 'Berat badan turun stabil, lanjut pantau tensi.',
            ],
        ];

        $catatanBudi = [];
        foreach ($riwayatBudi as $r) {
            $catatanBudi[] = $this->upsertCatatan($budi, $loktabatUtara->id, $kaderLu?->id, $r);
        }

        // ------------------------------------------------------------------
        // 2. Warga dummy Loktabat Utara (30 warga tambahan + Budi = 31 warga)
        //    Dirancang agar kelompok usia (25-29, 30-34, 40-44, 50-54, 60-64),
        //    IMT (kurus, normal, gemuk, obesitas), dan riwayat keluarga
        //    (hipertensi, diabetes, kolesterol, asma, jantung, stroke) lolos ambang k-anonymity (>= 5).
        // ------------------------------------------------------------------
        $daftarLoktabatUtara = [
            // Kelompok 30-34 (4 warga + Budi = 5)
            ['nama' => 'Nurul Hidayah',     'email' => 'nurul.hidayah@sehatkita.test',   'jk' => 'P', 'umur' => 30, 'bb' => 53.0, 'tb' => 158.0, 'sis' => 114, 'dia' => 74, 'gula' => 88,  'kol' => 165, 'asam' => 4.8, 'rk' => ['tidak_ada'],             'exp' => 440, 'rank' => true,  'merokok' => false],
            ['nama' => 'Dewi Lestari',      'email' => 'dewi.lestari@sehatkita.test',    'jk' => 'P', 'umur' => 31, 'bb' => 58.0, 'tb' => 160.0, 'sis' => 122, 'dia' => 78, 'gula' => 94,  'kol' => 176, 'asam' => 5.1, 'rk' => ['diabetes'],              'exp' => 310, 'rank' => true,  'merokok' => false],
            ['nama' => 'Rina Wulandari',    'email' => 'rina.w@sehatkita.test',          'jk' => 'P', 'umur' => 33, 'bb' => 51.0, 'tb' => 157.0, 'sis' => 112, 'dia' => 72, 'gula' => 86,  'kol' => 160, 'asam' => 4.6, 'rk' => ['asma'],                  'exp' => 270, 'rank' => true,  'merokok' => false],
            ['nama' => 'Doni Saputra',      'email' => 'doni.s@sehatkita.test',          'jk' => 'L', 'umur' => 34, 'bb' => 76.0, 'tb' => 170.0, 'sis' => 126, 'dia' => 82, 'gula' => 97,  'kol' => 188, 'asam' => 6.2, 'rk' => ['hipertensi'],            'exp' => 210, 'rank' => false, 'merokok' => true],
            // Kelompok 40-44 (6 warga)
            ['nama' => 'Siti Rahmah',       'email' => 'siti.rahmah@sehatkita.test',     'jk' => 'P', 'umur' => 41, 'bb' => 64.0, 'tb' => 155.0, 'sis' => 136, 'dia' => 86, 'gula' => 110, 'kol' => 210, 'asam' => 5.9, 'rk' => ['hipertensi', 'kolesterol'], 'exp' => 350, 'rank' => true, 'merokok' => false],
            ['nama' => 'Eko Prasetyo',      'email' => 'eko.p@sehatkita.test',           'jk' => 'L', 'umur' => 42, 'bb' => 78.0, 'tb' => 170.0, 'sis' => 132, 'dia' => 84, 'gula' => 106, 'kol' => 204, 'asam' => 7.2, 'rk' => ['kolesterol'],            'exp' => 195, 'rank' => true,  'merokok' => true],
            ['nama' => 'Agus Kurniawan',    'email' => 'agus.k@sehatkita.test',          'jk' => 'L', 'umur' => 43, 'bb' => 77.0, 'tb' => 168.0, 'sis' => 134, 'dia' => 85, 'gula' => 114, 'kol' => 208, 'asam' => 7.4, 'rk' => ['hipertensi'],            'exp' => 260, 'rank' => true,  'merokok' => true],
            ['nama' => 'Maya Indah',        'email' => 'maya.i@sehatkita.test',          'jk' => 'P', 'umur' => 40, 'bb' => 60.0, 'tb' => 159.0, 'sis' => 124, 'dia' => 80, 'gula' => 98,  'kol' => 185, 'asam' => 5.4, 'rk' => ['diabetes'],              'exp' => 180, 'rank' => false, 'merokok' => false],
            ['nama' => 'Lestari Ningsih',   'email' => 'lestari.n@sehatkita.test',       'jk' => 'P', 'umur' => 44, 'bb' => 55.0, 'tb' => 156.0, 'sis' => 118, 'dia' => 76, 'gula' => 92,  'kol' => 170, 'asam' => 5.0, 'rk' => ['tidak_ada'],             'exp' => 410, 'rank' => true,  'merokok' => false],
            ['nama' => 'Fajar Nugroho',     'email' => 'fajar.n@sehatkita.test',         'jk' => 'L', 'umur' => 41, 'bb' => 88.0, 'tb' => 166.0, 'sis' => 148, 'dia' => 94, 'gula' => 132, 'kol' => 242, 'asam' => 7.8, 'rk' => ['diabetes', 'kolesterol'], 'exp' => 125, 'rank' => true,  'merokok' => true],
            // Kelompok 50-54 (7 warga)
            ['nama' => 'Ahmad Fauzi',       'email' => 'ahmad.fauzi@sehatkita.test',     'jk' => 'L', 'umur' => 51, 'bb' => 86.0, 'tb' => 165.0, 'sis' => 152, 'dia' => 94, 'gula' => 142, 'kol' => 244, 'asam' => 8.1, 'rk' => ['hipertensi', 'diabetes'], 'exp' => 290, 'rank' => true, 'merokok' => true],
            ['nama' => 'Hendra Setiawan',   'email' => 'hendra.setiawan@sehatkita.test', 'jk' => 'L', 'umur' => 52, 'bb' => 90.0, 'tb' => 168.0, 'sis' => 162, 'dia' => 98, 'gula' => 164, 'kol' => 255, 'asam' => 8.5, 'rk' => ['diabetes', 'jantung'],   'exp' => 160, 'rank' => true,  'merokok' => true],
            ['nama' => 'Bambang Supriyanto','email' => 'bambang.s@sehatkita.test',       'jk' => 'L', 'umur' => 54, 'bb' => 72.0, 'tb' => 162.0, 'sis' => 144, 'dia' => 88, 'gula' => 122, 'kol' => 218, 'asam' => 7.6, 'rk' => ['hipertensi'],            'exp' => 220, 'rank' => true,  'merokok' => false],
            ['nama' => 'Sri Wahyuni',       'email' => 'sri.w@sehatkita.test',           'jk' => 'P', 'umur' => 50, 'bb' => 74.0, 'tb' => 153.0, 'sis' => 138, 'dia' => 86, 'gula' => 128, 'kol' => 225, 'asam' => 6.4, 'rk' => ['hipertensi', 'kolesterol'], 'exp' => 330, 'rank' => true, 'merokok' => false],
            ['nama' => 'Rudi Hartono',      'email' => 'rudi.h@sehatkita.test',          'jk' => 'L', 'umur' => 53, 'bb' => 88.0, 'tb' => 166.0, 'sis' => 182, 'dia' => 112,'gula' => 152, 'kol' => 248, 'asam' => 9.2, 'rk' => ['hipertensi', 'stroke'],  'exp' => 95,  'rank' => false, 'merokok' => true],
            ['nama' => 'Kartini Sari',      'email' => 'kartini.s@sehatkita.test',       'jk' => 'P', 'umur' => 52, 'bb' => 56.0, 'tb' => 156.0, 'sis' => 120, 'dia' => 78, 'gula' => 93,  'kol' => 182, 'asam' => 5.3, 'rk' => ['kolesterol'],            'exp' => 245, 'rank' => true,  'merokok' => false],
            ['nama' => 'Wahyu Hidayat',     'email' => 'wahyu.h@sehatkita.test',         'jk' => 'L', 'umur' => 51, 'bb' => 75.0, 'tb' => 167.0, 'sis' => 134, 'dia' => 84, 'gula' => 109, 'kol' => 206, 'asam' => 6.7, 'rk' => ['diabetes'],              'exp' => 140, 'rank' => true,  'merokok' => false],
            // Kelompok 25-29 (5 warga -> profil kurus & normal muda, juga memenuhi >= 5 IMT kurus & faktor asma)
            ['nama' => 'Nisa Aulia',        'email' => 'nisa.aulia@sehatkita.test',      'jk' => 'P', 'umur' => 26, 'bb' => 45.0, 'tb' => 162.0, 'sis' => 108, 'dia' => 70, 'gula' => 82,  'kol' => 156, 'asam' => 4.2, 'rk' => ['asma'],                  'exp' => 365, 'rank' => true,  'merokok' => false, 'kader' => 'kader2'],
            ['nama' => 'Putri Melati',      'email' => 'putri.melati@sehatkita.test',    'jk' => 'P', 'umur' => 27, 'bb' => 44.0, 'tb' => 158.0, 'sis' => 110, 'dia' => 72, 'gula' => 85,  'kol' => 162, 'asam' => 4.5, 'rk' => ['asma'],                  'exp' => 295, 'rank' => true,  'merokok' => false, 'kader' => 'kader2'],
            ['nama' => 'Bagas Aditya',      'email' => 'bagas.aditya@sehatkita.test',    'jk' => 'L', 'umur' => 28, 'bb' => 50.0, 'tb' => 168.0, 'sis' => 116, 'dia' => 74, 'gula' => 88,  'kol' => 168, 'asam' => 5.0, 'rk' => ['asma'],                  'exp' => 230, 'rank' => true,  'merokok' => false, 'kader' => 'kader2'],
            ['nama' => 'Tania Maharani',    'email' => 'tania.m@sehatkita.test',         'jk' => 'P', 'umur' => 25, 'bb' => 47.0, 'tb' => 164.0, 'sis' => 112, 'dia' => 72, 'gula' => 84,  'kol' => 158, 'asam' => 4.4, 'rk' => ['asma'],                  'exp' => 340, 'rank' => true,  'merokok' => false, 'kader' => 'kader2'],
            ['nama' => 'Dimas Pratama',     'email' => 'dimas.pratama@sehatkita.test',   'jk' => 'L', 'umur' => 29, 'bb' => 48.0, 'tb' => 165.0, 'sis' => 118, 'dia' => 76, 'gula' => 89,  'kol' => 170, 'asam' => 5.2, 'rk' => ['tidak_ada'],             'exp' => 205, 'rank' => true,  'merokok' => true,  'kader' => null],
            // Kelompok 60-64 (5 warga -> memenuhi >= 5 faktor jantung & stroke, sekaligus status rujukan ditolak)
            ['nama' => 'Sudirman Halim',    'email' => 'sudirman.h@sehatkita.test',      'jk' => 'L', 'umur' => 61, 'bb' => 76.0, 'tb' => 165.0, 'sis' => 150, 'dia' => 92, 'gula' => 136, 'kol' => 238, 'asam' => 8.0, 'rk' => ['jantung', 'hipertensi'], 'exp' => 175, 'rank' => true,  'merokok' => false],
            ['nama' => 'Marfuah Zainal',    'email' => 'marfuah.z@sehatkita.test',       'jk' => 'P', 'umur' => 62, 'bb' => 69.0, 'tb' => 154.0, 'sis' => 146, 'dia' => 90, 'gula' => 126, 'kol' => 228, 'asam' => 6.6, 'rk' => ['jantung', 'stroke'],     'exp' => 190, 'rank' => true,  'merokok' => false],
            ['nama' => 'Joko Susilo',       'email' => 'joko.susilo@sehatkita.test',     'jk' => 'L', 'umur' => 60, 'bb' => 84.0, 'tb' => 167.0, 'sis' => 154, 'dia' => 94, 'gula' => 140, 'kol' => 244, 'asam' => 7.9, 'rk' => ['jantung', 'stroke'],     'exp' => 155, 'rank' => true,  'merokok' => true],
            ['nama' => 'Salma Khairani',    'email' => 'salma.k@sehatkita.test',         'jk' => 'P', 'umur' => 63, 'bb' => 60.0, 'tb' => 156.0, 'sis' => 136, 'dia' => 86, 'gula' => 114, 'kol' => 214, 'asam' => 6.0, 'rk' => ['jantung', 'stroke'],     'exp' => 215, 'rank' => true,  'merokok' => false],
            ['nama' => 'Rusdiansyah',       'email' => 'rusdiansyah@sehatkita.test',     'jk' => 'L', 'umur' => 64, 'bb' => 78.0, 'tb' => 166.0, 'sis' => 148, 'dia' => 92, 'gula' => 130, 'kol' => 232, 'asam' => 7.7, 'rk' => ['stroke', 'hipertensi'],  'exp' => 130, 'rank' => true,  'merokok' => false, 'kader' => null],
            // 3 akun tambahan variasi status akun untuk Manajemen Pengguna Super Admin (nonaktif / belum consent / aktif normal)
            ['nama' => 'Rizka Amelia (Belum Consent)', 'email' => 'rizka.noconsent@sehatkita.test', 'jk' => 'P', 'umur' => 33, 'bb' => 55.0, 'tb' => 158.0, 'sis' => 116, 'dia' => 76, 'gula' => 90, 'kol' => 172, 'asam' => 4.9, 'rk' => ['tidak_ada'], 'exp' => 50, 'rank' => false, 'merokok' => false, 'consent' => false],
            ['nama' => 'Yusuf Mansyur (Nonaktif)',     'email' => 'yusuf.nonaktif@sehatkita.test',  'jk' => 'L', 'umur' => 43, 'bb' => 74.0, 'tb' => 169.0, 'sis' => 130, 'dia' => 82, 'gula' => 102, 'kol' => 195, 'asam' => 6.3, 'rk' => ['hipertensi'], 'exp' => 80, 'rank' => false, 'merokok' => false, 'aktif' => false],
            ['nama' => 'Nurlaila Sari',                'email' => 'nurlaila.s@sehatkita.test',      'jk' => 'P', 'umur' => 42, 'bb' => 57.0, 'tb' => 158.0, 'sis' => 122, 'dia' => 78, 'gula' => 95, 'kol' => 184, 'asam' => 5.2, 'rk' => ['diabetes'], 'exp' => 285, 'rank' => true, 'merokok' => false],
        ];

        $listWargaLu = [];
        $catatanLu = [];
        foreach ($daftarLoktabatUtara as $index => $w) {
            $kaderPenugasan = array_key_exists('kader', $w)
                ? ($w['kader'] === 'kader2' ? $kader2Lu?->id : null)
                : $kaderLu?->id;

            [$user, $catatan] = $this->seedSatuWarga(
                $w,
                $loktabatUtara->id,
                $kaderPenugasan,
                $password,
                $index + 2,
                '637204'
            );
            $listWargaLu[] = $user;
            $catatanLu[] = $catatan;
        }

        // Tambah catatan multi-bulan (1 sampai 4 bulan lalu) untuk 10 warga agar grafik tren bulanan kelurahan penuh & dinamis
        foreach (array_slice($listWargaLu, 0, 10) as $idx => $u) {
            $profilU = $u->profil;
            $wInfo = $daftarLoktabatUtara[$idx];
            foreach ([1, 2, 3, 4] as $bulanLalu) {
                $this->upsertCatatan($u, $loktabatUtara->id, $kaderLu?->id, [
                    'tanggal' => Carbon::now()->subMonthsNoOverflow($bulanLalu)->startOfMonth()->addDays(4 + ($idx % 12))->toDateString(),
                    'sumber'  => $bulanLalu === 2 ? 'puskesmas' : ($bulanLalu % 2 === 1 ? 'kader' : 'mandiri'),
                    'bb'      => ((float) $wInfo['bb']) + ($bulanLalu * 0.4),
                    'tb'      => (float) $profilU->tinggi_cm,
                    'lp'      => 84.0,
                    'sistol'  => $wInfo['sis'] + ($bulanLalu * 2),
                    'diastol' => $wInfo['dia'] + 1,
                    'gula'    => $wInfo['gula'] + ($bulanLalu * 2),
                    'jenis'   => $bulanLalu === 3 ? '2jam_pp' : 'puasa',
                    'kol'     => $wInfo['kol'] + ($bulanLalu * 3),
                    'asam'    => $wInfo['asam'],
                    'tidur'   => 7,
                    'merokok' => $wInfo['merokok'],
                    'manis'   => 'jarang',
                    'catatan' => "Rekam pemeriksaan rutin {$bulanLalu} bulan lalu.",
                ]);
            }
        }

        // ------------------------------------------------------------------
        // 3. Warga dummy Kelurahan Guntung Paikat (14 warga) & 6 Kelurahan Lain (masing-masing 6 warga)
        //    Agar akun admin.{slug} & kader.{slug} di SEMUA 8 kelurahan terisi data!
        // ------------------------------------------------------------------
        $listWargaGp = [];
        $catatanGp = [];
        if ($guntungPaikat) {
            $daftarGp = [
                ['nama' => 'M. Rizky Pratama',   'email' => 'warga.guntungpaikat@sehatkita.test', 'jk' => 'L', 'umur' => 31, 'bb' => 68.0, 'tb' => 170.0, 'sis' => 118, 'dia' => 76, 'gula' => 92,  'kol' => 178, 'asam' => 5.6, 'rk' => ['tidak_ada'],             'exp' => 320, 'rank' => true,  'merokok' => false],
                ['nama' => 'Yulia Anggraini',    'email' => 'yulia.gp@sehatkita.test',            'jk' => 'P', 'umur' => 32, 'bb' => 54.0, 'tb' => 158.0, 'sis' => 116, 'dia' => 74, 'gula' => 90,  'kol' => 168, 'asam' => 4.9, 'rk' => ['hipertensi'],            'exp' => 275, 'rank' => true,  'merokok' => false],
                ['nama' => 'Arif Rahman',        'email' => 'arif.gp@sehatkita.test',             'jk' => 'L', 'umur' => 33, 'bb' => 79.0, 'tb' => 171.0, 'sis' => 136, 'dia' => 86, 'gula' => 112, 'kol' => 210, 'asam' => 6.9, 'rk' => ['diabetes'],              'exp' => 210, 'rank' => true,  'merokok' => true],
                ['nama' => 'Nadia Putri',        'email' => 'nadia.gp@sehatkita.test',            'jk' => 'P', 'umur' => 34, 'bb' => 58.0, 'tb' => 160.0, 'sis' => 120, 'dia' => 78, 'gula' => 95,  'kol' => 180, 'asam' => 5.2, 'rk' => ['kolesterol'],            'exp' => 390, 'rank' => true,  'merokok' => false],
                ['nama' => 'Taufik Hidayat',     'email' => 'taufik.gp@sehatkita.test',           'jk' => 'L', 'umur' => 30, 'bb' => 88.0, 'tb' => 168.0, 'sis' => 148, 'dia' => 92, 'gula' => 134, 'kol' => 244, 'asam' => 7.7, 'rk' => ['hipertensi', 'diabetes'], 'exp' => 145, 'rank' => false, 'merokok' => true],
                ['nama' => 'Fitriani Hasan',     'email' => 'fitriani.gp@sehatkita.test',         'jk' => 'P', 'umur' => 42, 'bb' => 74.0, 'tb' => 156.0, 'sis' => 140, 'dia' => 88, 'gula' => 120, 'kol' => 215, 'asam' => 6.1, 'rk' => ['hipertensi'],            'exp' => 260, 'rank' => true,  'merokok' => false],
                ['nama' => 'Slamet Riyadi',      'email' => 'slamet.gp@sehatkita.test',           'jk' => 'L', 'umur' => 43, 'bb' => 85.0, 'tb' => 166.0, 'sis' => 156, 'dia' => 96, 'gula' => 148, 'kol' => 246, 'asam' => 8.2, 'rk' => ['diabetes', 'kolesterol'], 'exp' => 180, 'rank' => true,  'merokok' => true],
                ['nama' => 'Halimah Tusadiyah',  'email' => 'halimah.gp@sehatkita.test',          'jk' => 'P', 'umur' => 41, 'bb' => 62.0, 'tb' => 158.0, 'sis' => 128, 'dia' => 82, 'gula' => 102, 'kol' => 195, 'asam' => 5.7, 'rk' => ['hipertensi'],            'exp' => 235, 'rank' => true,  'merokok' => false],
                ['nama' => 'Bagus Santosa',      'email' => 'bagus.gp@sehatkita.test',            'jk' => 'L', 'umur' => 44, 'bb' => 74.0, 'tb' => 169.0, 'sis' => 134, 'dia' => 84, 'gula' => 108, 'kol' => 205, 'asam' => 6.8, 'rk' => ['kolesterol', 'diabetes'], 'exp' => 150, 'rank' => true,  'merokok' => false],
                ['nama' => 'Rahmawati',          'email' => 'rahmawati.gp@sehatkita.test',        'jk' => 'P', 'umur' => 40, 'bb' => 66.0, 'tb' => 156.0, 'sis' => 132, 'dia' => 84, 'gula' => 106, 'kol' => 202, 'asam' => 5.8, 'rk' => ['hipertensi', 'diabetes'], 'exp' => 305, 'rank' => true,  'merokok' => false],
                ['nama' => 'Kurnia Saputra',     'email' => 'kurnia.gp@sehatkita.test',           'jk' => 'L', 'umur' => 52, 'bb' => 82.0, 'tb' => 166.0, 'sis' => 144, 'dia' => 90, 'gula' => 124, 'kol' => 218, 'asam' => 7.2, 'rk' => ['hipertensi'],            'exp' => 215, 'rank' => true,  'merokok' => true, 'kader' => 'kader2'],
                ['nama' => 'Aisyah Permata',     'email' => 'aisyah.gp@sehatkita.test',           'jk' => 'P', 'umur' => 51, 'bb' => 55.0, 'tb' => 157.0, 'sis' => 122, 'dia' => 78, 'gula' => 94,  'kol' => 176, 'asam' => 5.0, 'rk' => ['diabetes'],              'exp' => 340, 'rank' => true,  'merokok' => false, 'kader' => 'kader2'],
                ['nama' => 'Heri Gunawan',       'email' => 'heri.gp@sehatkita.test',             'jk' => 'L', 'umur' => 53, 'bb' => 77.0, 'tb' => 168.0, 'sis' => 138, 'dia' => 86, 'gula' => 116, 'kol' => 210, 'asam' => 6.9, 'rk' => ['kolesterol'],            'exp' => 170, 'rank' => true,  'merokok' => false, 'kader' => 'kader2'],
                ['nama' => 'Endang Susilowati',  'email' => 'endang.gp@sehatkita.test',           'jk' => 'P', 'umur' => 54, 'bb' => 64.0, 'tb' => 155.0, 'sis' => 136, 'dia' => 86, 'gula' => 114, 'kol' => 206, 'asam' => 5.9, 'rk' => ['hipertensi'],            'exp' => 255, 'rank' => true,  'merokok' => false, 'kader' => 'kader2'],
            ];

            foreach ($daftarGp as $index => $w) {
                $kaderGpPenugasan = ($w['kader'] ?? null) === 'kader2' ? ($kader2Gp?->id ?? $kaderGp?->id) : $kaderGp?->id;
                [$user, $catGp] = $this->seedSatuWarga(
                    $w,
                    $guntungPaikat->id,
                    $kaderGpPenugasan,
                    $password,
                    $index + 1,
                    '637205'
                );
                $listWargaGp[] = $user;
                $catatanGp[] = $catGp;
            }

            // Riwayat multi-bulan M. Rizky Pratama (warga.guntungpaikat@sehatkita.test)
            if (isset($listWargaGp[0])) {
                foreach ([1, 2] as $bln) {
                    $this->upsertCatatan($listWargaGp[0], $guntungPaikat->id, $kaderGp?->id, [
                        'tanggal' => Carbon::now()->subMonthsNoOverflow($bln)->startOfMonth()->addDays(8)->toDateString(),
                        'sumber'  => $bln === 1 ? 'kader' : 'mandiri',
                        'bb'      => 69.0 + $bln,
                        'tb'      => 170.0,
                        'lp'      => 84.0,
                        'sistol'  => 122 + $bln * 2,
                        'diastol' => 78 + $bln,
                        'gula'    => 95 + $bln * 2,
                        'jenis'   => 'puasa',
                        'kol'     => 182 + $bln * 3,
                        'asam'    => 5.8,
                        'tidur'   => 7,
                        'merokok' => false,
                        'manis'   => 'jarang',
                        'catatan' => "Pemantauan rutin {$bln} bulan lalu di Guntung Paikat.",
                    ]);
                }
            }
        }

        // Seed 6 warga + 1 sesi Posbindu + rujukan + pengaduan di 6 kelurahan lainnya
        // agar login admin/kader manapun (Kemuning, Loktabat Selatan, Sungai Besar, Mentaos, Sungai Ulin, Guntung Payung)
        // langsung menampilkan data aktif, serta memperkaya grafik & statistik lintas kelurahan Super Admin.
        $kelurahanTambahan = [
            ['nama' => 'Kemuning',         'kode' => 'km', 'prefix' => '637205', 'seqBase' => 101, 'faskes' => $faskesKlinik],
            ['nama' => 'Loktabat Selatan', 'kode' => 'ls', 'prefix' => '637205', 'seqBase' => 201, 'faskes' => $faskesPuskesmasBs],
            ['nama' => 'Sungai Besar',     'kode' => 'sb', 'prefix' => '637205', 'seqBase' => 301, 'faskes' => $faskesPuskesmasSb],
            ['nama' => 'Mentaos',          'kode' => 'mt', 'prefix' => '637204', 'seqBase' => 101, 'faskes' => $faskesPuskesmasLu],
            ['nama' => 'Sungai Ulin',      'kode' => 'su', 'prefix' => '637204', 'seqBase' => 201, 'faskes' => $faskesPuskesmasSu],
            ['nama' => 'Guntung Payung',   'kode' => 'gy', 'prefix' => '637204', 'seqBase' => 301, 'faskes' => $faskesRsAlmansyur],
        ];
        $wargaKelurahanLain = [];
        foreach ($kelurahanTambahan as $kIdx => $kMeta) {
            $wil = Wilayah::where('nama', $kMeta['nama'])->first();
            if (! $wil) {
                continue;
            }
            $slug = strtolower(str_replace(' ', '', $wil->nama));
            $kaderWil = Pengguna::where('email', "kader.{$slug}@sehatkita.test")->first();
            $adminWil = Pengguna::where('email', "admin.{$slug}@sehatkita.test")->first();

            $polaWarga = [
                ['label' => 'Adi',     'jk' => 'L', 'umur' => 32, 'bb' => 68.0, 'tb' => 170.0, 'sis' => 122, 'dia' => 78, 'gula' => 92,  'kol' => 182, 'asam' => 5.6, 'rk' => ['tidak_ada'],  'exp' => 290, 'merokok' => false],
                ['label' => 'Lina',    'jk' => 'P', 'umur' => 31, 'bb' => 55.0, 'tb' => 158.0, 'sis' => 116, 'dia' => 74, 'gula' => 88,  'kol' => 170, 'asam' => 4.9, 'rk' => ['hipertensi'], 'exp' => 320, 'merokok' => false],
                ['label' => 'Hendra',  'jk' => 'L', 'umur' => 43, 'bb' => 81.0, 'tb' => 169.0, 'sis' => 142, 'dia' => 90, 'gula' => 124, 'kol' => 216, 'asam' => 7.2, 'rk' => ['hipertensi'], 'exp' => 190, 'merokok' => true],
                ['label' => 'Ratna',   'jk' => 'P', 'umur' => 41, 'bb' => 63.0, 'tb' => 156.0, 'sis' => 134, 'dia' => 84, 'gula' => 108, 'kol' => 204, 'asam' => 5.8, 'rk' => ['diabetes'],   'exp' => 240, 'merokok' => false],
                ['label' => 'Syahrul', 'jk' => 'L', 'umur' => 52, 'bb' => 86.0, 'tb' => 166.0, 'sis' => 154, 'dia' => 96, 'gula' => 146, 'kol' => 242, 'asam' => 8.1, 'rk' => ['hipertensi', 'diabetes'], 'exp' => 140, 'merokok' => true],
                ['label' => 'Murni',   'jk' => 'P', 'umur' => 51, 'bb' => 66.0, 'tb' => 155.0, 'sis' => 138, 'dia' => 86, 'gula' => 118, 'kol' => 214, 'asam' => 6.2, 'rk' => ['kolesterol'], 'exp' => 265, 'merokok' => false],
            ];

            $wargaWil = [];
            foreach ($polaWarga as $pIdx => $pw) {
                $emailW = $pIdx === 0
                    ? "warga.{$slug}@sehatkita.test"
                    : "{$kMeta['kode']}.warga" . ($pIdx + 1) . '@sehatkita.test';

                [$uWil] = $this->seedSatuWarga([
                    'nama'    => "{$pw['label']} ({$wil->nama})",
                    'email'   => $emailW,
                    'jk'      => $pw['jk'],
                    'umur'    => $pw['umur'],
                    'bb'      => $pw['bb'],
                    'tb'      => $pw['tb'],
                    'sis'     => $pw['sis'],
                    'dia'     => $pw['dia'],
                    'gula'    => $pw['gula'],
                    'kol'     => $pw['kol'],
                    'asam'    => $pw['asam'],
                    'rk'      => $pw['rk'],
                    'exp'     => $pw['exp'],
                    'rank'    => true,
                    'merokok' => $pw['merokok'],
                ], $wil->id, $kaderWil?->id, $password, $kMeta['seqBase'] + $pIdx, $kMeta['prefix']);
                $wargaWil[] = $uWil;
            }
            $wargaKelurahanLain[$wil->nama] = $wargaWil;

            if ($kaderWil && count($wargaWil) >= 5) {
                $sesiWil = SesiPosbindu::updateOrCreate(
                    ['wilayah_id' => $wil->id, 'tanggal' => Carbon::now()->subDays(3 + $kIdx)->toDateString()],
                    [
                        'lokasi'   => "Balai Kelurahan {$wil->nama}",
                        'kader_id' => $kaderWil->id,
                        'catatan'  => "Posbindu rutin PTM Kelurahan {$wil->nama}.",
                        'status'   => 'selesai',
                    ]
                );
                foreach (array_slice($wargaWil, 0, 4) as $uKunj) {
                    KunjunganPosbindu::updateOrCreate(
                        ['sesi_id' => $sesiWil->id, 'user_id' => $uKunj->id],
                        ['hadir' => true, 'dicatat_oleh' => $kaderWil->id]
                    );
                }
                SesiPosbindu::updateOrCreate(
                    ['wilayah_id' => $wil->id, 'tanggal' => Carbon::now()->addDays(2 + $kIdx)->toDateString()],
                    [
                        'lokasi'   => "Posyandu Utama {$wil->nama}",
                        'kader_id' => $kaderWil->id,
                        'catatan'  => "Jadwal skrining tensi & gula darah {$wil->nama}.",
                        'status'   => 'akan_datang',
                    ]
                );

                Rujukan::updateOrCreate(
                    ['user_id' => $wargaWil[4]->id, 'faskes_id' => $kMeta['faskes']->id, 'indikator' => 'sistol'],
                    [
                        'alasan'         => "Tensi tinggi 154/96 mmHg dan gula darah 146 mg/dL di {$wil->nama}.",
                        'dibuat_oleh'    => $kaderWil->id,
                        'otomatis'       => false,
                        'status'         => $kIdx % 2 === 0 ? 'baru' : 'dihubungi',
                        'ditangani_oleh' => $kIdx % 2 === 0 ? null : $kaderWil->id,
                        'catatan'        => $kIdx % 2 === 0 ? null : 'Warga sudah dijadwalkan periksa ke poli PTM.',
                    ]
                );
            }

            Pengaduan::updateOrCreate(
                ['user_id' => $wargaWil[0]->id, 'judul' => "Informasi Jadwal Posbindu {$wil->nama}"],
                [
                    'wilayah_id'      => $wil->id,
                    'isi'             => "Mohon info jadwal rutin pemeriksaan kolesterol bulan depan di {$wil->nama}.",
                    'kategori'        => $kIdx % 2 === 0 ? 'layanan_posbindu' : 'lainnya',
                    'status'          => $kIdx % 2 === 0 ? 'menunggu' : 'selesai',
                    'tanggapan'       => $kIdx % 2 === 0 ? null : "Jadwal sudah dipublikasikan di menu Posbindu kelurahan {$wil->nama}.",
                    'ditanggapi_oleh' => $kIdx % 2 === 0 ? null : ($adminWil?->id ?? $superAdmin?->id),
                    'ditanggapi_pada' => $kIdx % 2 === 0 ? null : Carbon::now()->subDays(1),
                ]
            );
        }

        // ------------------------------------------------------------------
        // 4. Catatan Anomali (perlu_verifikasi = true) untuk antrean Super Admin lintas kelurahan
        // ------------------------------------------------------------------
        $anomaliTarget = [
            [$listWargaLu[10] ?? $budi, ['tanggal' => Carbon::now()->subDays(2)->toDateString(), 'sumber' => 'mandiri', 'bb' => 75.0, 'tb' => 165.0, 'sistol' => 295, 'diastol' => 175, 'catatan' => 'Dugaan salah ketik tensi oleh warga.']],
            [$listWargaLu[11] ?? $budi, ['tanggal' => Carbon::now()->subDays(1)->toDateString(), 'sumber' => 'mandiri', 'bb' => 340.0, 'tb' => 168.0, 'gula' => 780, 'jenis' => 'puasa', 'catatan' => 'Nilai berat badan & gula darah di luar batas wajar.']],
            [$listWargaLu[12] ?? $budi, ['tanggal' => Carbon::now()->subDays(3)->toDateString(), 'sumber' => 'mandiri', 'bb' => 72.0, 'tb' => 162.0, 'kol' => 980, 'catatan' => 'Angka kolesterol melebihi batas wajar alat ukur.']],
        ];
        if (! empty($listWargaGp)) {
            $anomaliTarget[] = [$listWargaGp[4], ['tanggal' => Carbon::now()->subDays(1)->toDateString(), 'sumber' => 'mandiri', 'bb' => 88.0, 'tb' => 168.0, 'sistol' => 95, 'diastol' => 120, 'catatan' => 'Diastol lebih tinggi dari sistol (perlu cek ulang).']];
        }
        if (! empty($wargaKelurahanLain['Kemuning'][2])) {
            $anomaliTarget[] = [$wargaKelurahanLain['Kemuning'][2], ['tanggal' => Carbon::now()->subDays(2)->toDateString(), 'sumber' => 'mandiri', 'bb' => 81.0, 'tb' => 169.0, 'asam' => 28.5, 'catatan' => 'Kadar asam urat 28.5 mg/dL mencurigakan (cek satuan).']];
        }
        if (! empty($wargaKelurahanLain['Sungai Ulin'][4])) {
            $anomaliTarget[] = [$wargaKelurahanLain['Sungai Ulin'][4], ['tanggal' => Carbon::now()->subDays(1)->toDateString(), 'sumber' => 'mandiri', 'bb' => 21.0, 'tb' => 166.0, 'sistol' => 130, 'diastol' => 82, 'catatan' => 'Berat badan tercatat 21 kg untuk dewasa (indikasi typo 81 kg).']];
        }
        foreach ($anomaliTarget as [$uAnom, $dataAnom]) {
            $this->upsertCatatan($uAnom, $uAnom->wilayah_id, $uAnom->id, $dataAnom, true);
        }

        // ------------------------------------------------------------------
        // 5. Data Sesi & Kunjungan Posbindu (selesai, berjalan, akan_datang)
        // ------------------------------------------------------------------
        if ($kaderLu) {
            $sesi1 = SesiPosbindu::updateOrCreate(
                ['wilayah_id' => $loktabatUtara->id, 'tanggal' => Carbon::now()->subDays(12)->toDateString()],
                [
                    'lokasi'   => 'Balai Warga RT 02 Loktabat Utara',
                    'kader_id' => $kaderLu->id,
                    'catatan'  => 'Pemeriksaan rutin tensi, IMT & gula darah warga binaan.',
                    'status'   => 'selesai',
                ]
            );

            // Budi hadir & terhubung ke catatan kesehatan hari ke-12 lalu
            KunjunganPosbindu::updateOrCreate(
                ['sesi_id' => $sesi1->id, 'user_id' => $budi->id],
                [
                    'hadir'                => true,
                    'dicatat_oleh'         => $kaderLu->id,
                    'catatan_kesehatan_id' => $catatanBudi[2]->id ?? null,
                ]
            );
            foreach (array_slice($listWargaLu, 0, 7) as $idx => $u) {
                KunjunganPosbindu::updateOrCreate(
                    ['sesi_id' => $sesi1->id, 'user_id' => $u->id],
                    [
                        'hadir'                => true,
                        'dicatat_oleh'         => $kaderLu->id,
                        'catatan_kesehatan_id' => $catatanLu[$idx]->id ?? null,
                    ]
                );
            }
            // 2 warga tercatat tidak hadir
            foreach (array_slice($listWargaLu, 7, 2) as $u) {
                KunjunganPosbindu::updateOrCreate(
                    ['sesi_id' => $sesi1->id, 'user_id' => $u->id],
                    ['hadir' => false, 'dicatat_oleh' => $kaderLu->id, 'catatan_kesehatan_id' => null]
                );
            }

            // Sesi berjalan hari ini (kader siap input peserta langsung)
            $sesiBerjalan = SesiPosbindu::updateOrCreate(
                ['wilayah_id' => $loktabatUtara->id, 'tanggal' => Carbon::now()->toDateString()],
                [
                    'lokasi'   => 'Posyandu Mawar RT 05 Loktabat Utara',
                    'kader_id' => $kaderLu->id,
                    'catatan'  => 'Skrining PTM hari ini (tensi, gula darah, kolesterol).',
                    'status'   => 'berjalan',
                ]
            );
            foreach (array_slice($listWargaLu, 9, 4) as $idx => $u) {
                KunjunganPosbindu::updateOrCreate(
                    ['sesi_id' => $sesiBerjalan->id, 'user_id' => $u->id],
                    [
                        'hadir'                => true,
                        'dicatat_oleh'         => $kaderLu->id,
                        'catatan_kesehatan_id' => $idx < 2 ? ($catatanLu[9 + $idx]->id ?? null) : null,
                    ]
                );
            }

            // Sesi bulan lalu (selesai) oleh kader utama
            $sesiLalu = SesiPosbindu::updateOrCreate(
                ['wilayah_id' => $loktabatUtara->id, 'tanggal' => Carbon::now()->subMonthNoOverflow()->startOfMonth()->addDays(11)->toDateString()],
                [
                    'lokasi'   => 'Aula Kelurahan Loktabat Utara',
                    'kader_id' => $kaderLu->id,
                    'catatan'  => 'Skrining PTM massal triwulan dan senam lansia.',
                    'status'   => 'selesai',
                ]
            );
            foreach (array_slice($listWargaLu, 0, 10) as $u) {
                KunjunganPosbindu::updateOrCreate(
                    ['sesi_id' => $sesiLalu->id, 'user_id' => $u->id],
                    ['hadir' => true, 'dicatat_oleh' => $kaderLu->id]
                );
            }

            // Sesi berjalan oleh kader kedua (jika tersedia) agar kader2.loktabatutara juga langsung melihat data sesi
            if ($kader2Lu) {
                $sesiKader2 = SesiPosbindu::updateOrCreate(
                    ['wilayah_id' => $loktabatUtara->id, 'tanggal' => Carbon::now()->subDays(6)->toDateString()],
                    [
                        'lokasi'   => 'Posyandu Anggrek RT 08 Loktabat Utara',
                        'kader_id' => $kader2Lu->id,
                        'catatan'  => 'Pemeriksaan khusus warga usia muda & pradiabetes.',
                        'status'   => 'selesai',
                    ]
                );
                foreach (array_slice($listWargaLu, 17, 5) as $idx => $u) {
                    KunjunganPosbindu::updateOrCreate(
                        ['sesi_id' => $sesiKader2->id, 'user_id' => $u->id],
                        [
                            'hadir'                => true,
                            'dicatat_oleh'         => $kader2Lu->id,
                            'catatan_kesehatan_id' => $catatanLu[17 + $idx]->id ?? null,
                        ]
                    );
                }
            }

            // Sesi akan datang 5 hari lagi
            SesiPosbindu::updateOrCreate(
                ['wilayah_id' => $loktabatUtara->id, 'tanggal' => Carbon::now()->addDays(5)->toDateString()],
                [
                    'lokasi'   => 'Gedung Serbaguna Loktabat Utara',
                    'kader_id' => $kaderLu->id,
                    'catatan'  => 'Pemeriksaan kolesterol dan senam sehat bersama.',
                    'status'   => 'akan_datang',
                ]
            );
        }

        if ($guntungPaikat && $kaderGp && count($listWargaGp) >= 10) {
            $sesiGp = SesiPosbindu::updateOrCreate(
                ['wilayah_id' => $guntungPaikat->id, 'tanggal' => Carbon::now()->subDays(4)->toDateString()],
                [
                    'lokasi'   => 'Balai Kelurahan Guntung Paikat',
                    'kader_id' => $kaderGp->id,
                    'catatan'  => 'Posbindu PTM rutin bulanan Guntung Paikat.',
                    'status'   => 'selesai',
                ]
            );
            foreach (array_slice($listWargaGp, 0, 6) as $idx => $u) {
                KunjunganPosbindu::updateOrCreate(
                    ['sesi_id' => $sesiGp->id, 'user_id' => $u->id],
                    [
                        'hadir'                => true,
                        'dicatat_oleh'         => $kaderGp->id,
                        'catatan_kesehatan_id' => $catatanGp[$idx]->id ?? null,
                    ]
                );
            }
            $sesiGpBerjalan = SesiPosbindu::updateOrCreate(
                ['wilayah_id' => $guntungPaikat->id, 'tanggal' => Carbon::now()->toDateString()],
                [
                    'lokasi'   => 'Posyandu Melati RT 03 Guntung Paikat',
                    'kader_id' => $kaderGp->id,
                    'catatan'  => 'Skrining tekanan darah dan gula darah hari ini.',
                    'status'   => 'berjalan',
                ]
            );
            foreach (array_slice($listWargaGp, 6, 3) as $u) {
                KunjunganPosbindu::updateOrCreate(
                    ['sesi_id' => $sesiGpBerjalan->id, 'user_id' => $u->id],
                    ['hadir' => true, 'dicatat_oleh' => $kaderGp->id]
                );
            }
            SesiPosbindu::updateOrCreate(
                ['wilayah_id' => $guntungPaikat->id, 'tanggal' => Carbon::now()->addDays(4)->toDateString()],
                [
                    'lokasi'   => 'Taman Kemuning / Balai Warga GP',
                    'kader_id' => $kaderGp->id,
                    'catatan'  => 'Skrining PTM & edukasi gizi seimbang.',
                    'status'   => 'akan_datang',
                ]
            );
        }

        // ------------------------------------------------------------------
        // 6. Data Rujukan Faskes (memenuhi 4 status: baru, dihubungi, tertangani, ditolak & k-anonymity)
        // ------------------------------------------------------------------
        if ($kaderLu && $faskesPuskesmasLu && count($listWargaLu) >= 27) {
            $rujukanSeed = [
                // Budi punya 1 rujukan aktif supaya kartu "Rujukan Aktif" tampil di Dashboard Warga
                [$budi,            $faskesPuskesmasLu, 'sistol',     false, 'dihubungi',  'Tekanan darah 142/90 mmHg berulang, dianjurkan kontrol ke Puskesmas.', 'Sudah dihubungi kader untuk jadwal poli PTM besok pagi.', $kaderLu->id, $kaderLu->id],
                // 5 status baru
                [$listWargaLu[4],  $faskesPuskesmasLu, 'sistol',     false, 'baru',       'Tekanan darah 136/86 mmHg disertai kolesterol 210 mg/dL.', null, $kaderLu->id, null],
                [$listWargaLu[5],  $faskesPuskesmasLu, 'asam_urat',  false, 'baru',       'Asam urat 7.2 mg/dL dan keluhan nyeri sendi.', null, $kaderLu->id, null],
                [$listWargaLu[9],  $faskesPuskesmasLu, 'kolesterol', false, 'baru',       'Kolesterol total 242 mg/dL dan IMT obesitas.', null, $kaderLu->id, null],
                [$listWargaLu[10], $faskesPuskesmasLu, 'gula_darah', false, 'baru',       'Gula darah puasa 142 mg/dL (risiko diabetes).', null, $kaderLu->id, null],
                [$listWargaLu[14], $faskesRs ?? $faskesPuskesmasLu, 'sistol', true, 'baru', 'Rujukan otomatis: Tensi krisis 182/112 mmHg.', 'Segera ke IGD / Poli Penyakit Dalam.', $kaderLu->id, null],
                // 4 status dihubungi (+ Budi = 5 total di Loktabat Utara)
                [$listWargaLu[11], $faskesPuskesmasLu, 'gula_darah', false, 'dihubungi',  'Gula darah puasa 164 mg/dL dan tensi 162/98 mmHg.', 'Warga sudah konfirmasi hadir ke Puskesmas hari Senin.', $kaderLu->id, $kaderLu->id],
                [$listWargaLu[12], $faskesPuskesmasLu, 'sistol',     false, 'dihubungi',  'Tekanan darah sistolik 144 mmHg.', 'Kader sudah menjadwalkan pendampingan lansia.', $kaderLu->id, $kaderLu->id],
                [$listWargaLu[13], $faskesKlinik ?? $faskesPuskesmasLu, 'kolesterol', false, 'dihubungi', 'Kolesterol 225 mg/dL dan riwayat hipertensi keluarga.', 'Menunggu antrean pemeriksaan lab klinik.', $kaderLu->id, $kaderLu->id],
                [$listWargaLu[6],  $faskesPuskesmasLu, 'asam_urat',  false, 'dihubungi',  'Asam urat 7.4 mg/dL dan sistol 134 mmHg.', 'Dihubungi via telepon untuk kontrol.', $kaderLu->id, $kaderLu->id],
                // 5 status tertangani
                [$listWargaLu[0],  $faskesPuskesmasLu, 'kolesterol', false, 'tertangani', 'Kontrol rutin kolesterol & kebugaran.', 'Sudah diperiksa dokter Puskesmas, hasil baik.', $kaderLu->id, $adminLu?->id ?? $kaderLu->id],
                [$listWargaLu[1],  $faskesPuskesmasLu, 'sistol',     false, 'tertangani', 'Konsultasi riwayat diabetes keluarga.', 'Sudah mendapatkan edukasi diet rendah gula.', $kaderLu->id, $adminLu?->id ?? $kaderLu->id],
                [$listWargaLu[2],  $faskesPuskesmasLu, 'asam_urat',  false, 'tertangani', 'Skrining lanjutan posbindu.', 'Sudah ditangani di poli umum.', $kaderLu->id, $kaderLu->id],
                [$listWargaLu[3],  $faskesPuskesmasLu, 'sistol',     false, 'tertangani', 'Edukasi berhenti merokok dan tensi.', 'Warga mengikuti konseling UBM Puskesmas.', $kaderLu->id, $kaderLu->id],
                [$listWargaLu[7],  $faskesPuskesmasLu, 'gula_darah', false, 'tertangani', 'Pemeriksaan ulang gula darah.', 'Hasil HbA1c stabil, lanjut kontrol 3 bulan.', $kaderLu->id, $kaderLu->id],
                // 5 status ditolak (memenuhi MIN_SEL = 5 agar seluruh 4 status tampil di Dashboard Wilayah)
                [$listWargaLu[22], $faskesPuskesmasLu, 'sistol',     false, 'ditolak',    'Tekanan darah 150/92 mmHg perlu konfirmasi.', 'Warga sudah kontrol ke dokter pribadi dengan hasil tensi stabil.', $kaderLu->id, $kaderLu->id],
                [$listWargaLu[23], $faskesPuskesmasLu, 'gula_darah', false, 'ditolak',    'Gula darah puasa 126 mg/dL.', 'Warga belum berpuasa 8 jam saat pengecekan, dijadwalkan ulang.', $kaderLu->id, $kaderLu->id],
                [$listWargaLu[24], $faskesRs ?? $faskesPuskesmasLu, 'sistol', false, 'ditolak', 'Tekanan darah 154/94 mmHg.', 'Warga meminta pengalihan pemeriksaan ke Puskesmas setempat.', $kaderLu->id, $adminLu?->id ?? $kaderLu->id],
                [$listWargaLu[25], $faskesPuskesmasLu, 'kolesterol', false, 'ditolak',    'Kolesterol total 214 mg/dL.', 'Sudah mendapat obat statin rutin dari klinik keluarga.', $kaderLu->id, $kaderLu->id],
                [$listWargaLu[26], $faskesPuskesmasLu, 'asam_urat',  false, 'ditolak',    'Asam urat 7.7 mg/dL.', 'Warga pindah jadwal kontrol ke bulan depan karena dinas luar kota.', $kaderLu->id, $kaderLu->id],
            ];

            foreach ($rujukanSeed as [$uRuj, $faskesRuj, $ind, $auto, $status, $alasan, $catatan, $pembuatId, $penanganId]) {
                Rujukan::updateOrCreate(
                    ['user_id' => $uRuj->id, 'faskes_id' => $faskesRuj->id, 'indikator' => $ind],
                    [
                        'alasan'         => $alasan,
                        'dibuat_oleh'    => $pembuatId,
                        'otomatis'       => $auto,
                        'status'         => $status,
                        'ditangani_oleh' => $penanganId,
                        'catatan'        => $catatan,
                    ]
                );
            }
        }

        if (! empty($listWargaGp) && $kaderGp && $faskesRs && count($listWargaGp) >= 11) {
            $rujukanGpSeed = [
                [$listWargaGp[6],  $faskesRs,          'sistol',     'baru',       'Tensi 156/96 mmHg dan gula darah puasa 148 mg/dL.', null, 'Dirujuk ke poli penyakit dalam RSD Idaman.'],
                [$listWargaGp[4],  $faskesPuskesmasBs, 'kolesterol', 'dihubungi',  'Kolesterol 244 mg/dL dan tensi 148/92 mmHg.', $kaderGp->id, 'Sudah dijadwalkan konsultasi gizi & PTM.'],
                [$listWargaGp[5],  $faskesPuskesmasBs, 'sistol',     'tertangani', 'Tensi 140/88 mmHg berkala.', $adminGp?->id ?? $kaderGp->id, 'Sudah menerima terapi antihipertensi ringan.'],
                [$listWargaGp[10], $faskesRsAlmansyur, 'gula_darah', 'ditolak',    'Gula darah 124 mg/dL.', $kaderGp->id, 'Warga sudah kontrol rutin di klinik BPJS terdaftar.'],
            ];
            foreach ($rujukanGpSeed as [$uGp, $fGp, $indGp, $stGp, $alasanGp, $penGp, $catGp]) {
                Rujukan::updateOrCreate(
                    ['user_id' => $uGp->id, 'faskes_id' => $fGp->id, 'indikator' => $indGp],
                    [
                        'alasan'         => $alasanGp,
                        'dibuat_oleh'    => $kaderGp->id,
                        'otomatis'       => false,
                        'status'         => $stGp,
                        'ditangani_oleh' => $penGp,
                        'catatan'        => $catGp,
                    ]
                );
            }
        }

        // ------------------------------------------------------------------
        // 7. Data Program Kesehatan, Peserta (termasuk bukti foto) & Badge
        // ------------------------------------------------------------------
        $programSeed = [
            [
                'judul'              => 'Tantangan Jalan Pagi 30 Menit',
                'wilayah_id'         => null,
                'deskripsi'          => 'Jalan santai minimal 30 menit setiap pagi selama 7 hari untuk menjaga kebugaran jantung dan tekanan darah.',
                'kriteria_misi'      => 'Unggah foto tangkapan layar aplikasi langkah kaki atau selfie saat jalan pagi.',
                'jenis'              => 'olahraga',
                'kategori_aktivitas' => 'kardio',
                'target_peserta'     => 50,
                'mulai'              => Carbon::now()->subDays(10)->toDateString(),
                'selesai'            => Carbon::now()->addDays(20)->toDateString(),
                'status'             => 'berjalan',
                'exp_reward'         => 100,
                'badge_reward'       => 'Pejalan Tangguh',
            ],
            [
                'judul'              => 'Gerakan Bebas Gula Berlebih Loktabat Utara',
                'wilayah_id'         => $loktabatUtara->id,
                'deskripsi'          => 'Tantangan mengurangi konsumsi minuman manis kemasan selama 14 hari bersama kader Loktabat Utara.',
                'kriteria_misi'      => 'Unggah foto botol air mineral atau menu bekal sehat tanpa gula tambahan.',
                'jenis'              => 'edukasi',
                'kategori_aktivitas' => 'nutrisi',
                'target_peserta'     => 30,
                'mulai'              => Carbon::now()->subDays(5)->toDateString(),
                'selesai'            => Carbon::now()->addDays(25)->toDateString(),
                'status'             => 'berjalan',
                'exp_reward'         => 120,
                'badge_reward'       => 'Sahabat Gula Stabil',
            ],
            [
                'judul'              => 'Skrining Tensi & Kolesterol Warga Aktif',
                'wilayah_id'         => $loktabatUtara->id,
                'deskripsi'          => 'Ikuti pemeriksaan tensi dan kolesterol di Posbindu kelurahan atau catat hasil mandiri secara berkala.',
                'kriteria_misi'      => 'Unggah foto kartu kontrol Posbindu atau hasil cek tensi terakhir.',
                'jenis'              => 'pemeriksaan',
                'kategori_aktivitas' => 'skrining',
                'target_peserta'     => 40,
                'mulai'              => Carbon::now()->subDays(15)->toDateString(),
                'selesai'            => Carbon::now()->addDays(15)->toDateString(),
                'status'             => 'berjalan',
                'exp_reward'         => 80,
                'badge_reward'       => 'Warga Peduli PTM',
            ],
            [
                'judul'              => 'Senam Jantung Sehat Bersama (Akan Datang)',
                'wilayah_id'         => null,
                'deskripsi'          => 'Kegiatan senam jantung sehat serentak seluruh kelurahan di Kota Banjarbaru.',
                'kriteria_misi'      => 'Hadir di lokasi senam kelurahan dan unggah foto dokumentasi kegiatan.',
                'jenis'              => 'olahraga',
                'kategori_aktivitas' => 'senam',
                'target_peserta'     => 100,
                'mulai'              => Carbon::now()->addDays(7)->toDateString(),
                'selesai'            => Carbon::now()->addDays(14)->toDateString(),
                'status'             => 'akan_datang',
                'exp_reward'         => 150,
                'badge_reward'       => 'Jantung Prima',
            ],
            [
                'judul'              => 'Pekan Cek Kesehatan Triwulan Lalu (Selesai)',
                'wilayah_id'         => $loktabatUtara->id,
                'deskripsi'          => 'Program skrining dasar PTM warga Loktabat Utara bulan lalu.',
                'kriteria_misi'      => 'Kunjungan dan pencatatan minimal 1 kali pemeriksaan.',
                'jenis'              => 'pemeriksaan',
                'kategori_aktivitas' => 'skrining',
                'target_peserta'     => 35,
                'mulai'              => Carbon::now()->subDays(45)->toDateString(),
                'selesai'            => Carbon::now()->subDays(15)->toDateString(),
                'status'             => 'selesai',
                'exp_reward'         => 75,
                'badge_reward'       => 'Pelopor Sehat',
            ],
            [
                'judul'              => 'Kelas Edukasi Hipertensi Guntung Paikat',
                'wilayah_id'         => $guntungPaikat?->id,
                'deskripsi'          => 'Pendampingan pola makan rendah garam (DASH) bagi warga Kelurahan Guntung Paikat.',
                'kriteria_misi'      => 'Unggah foto menu harian rendah garam atau catatan tensi 3 hari berturut-turut.',
                'jenis'              => 'edukasi',
                'kategori_aktivitas' => 'nutrisi',
                'target_peserta'     => 30,
                'mulai'              => Carbon::now()->subDays(6)->toDateString(),
                'selesai'            => Carbon::now()->addDays(24)->toDateString(),
                'status'             => 'berjalan',
                'exp_reward'         => 110,
                'badge_reward'       => 'Pejuang Tensi Stabil',
            ],
            [
                'judul'              => 'Challenge Hidrasi 2 Liter Harian',
                'wilayah_id'         => null,
                'deskripsi'          => 'Bangun kebiasaan minum air putih minimal 2 liter per hari untuk seluruh warga Banjarbaru.',
                'kriteria_misi'      => 'Unggah foto tumbler harian beserta catatan asupan cairan.',
                'jenis'              => 'lainnya',
                'kategori_aktivitas' => 'hidrasi',
                'target_peserta'     => 80,
                'mulai'              => Carbon::now()->subDays(3)->toDateString(),
                'selesai'            => Carbon::now()->addDays(27)->toDateString(),
                'status'             => 'berjalan',
                'exp_reward'         => 90,
                'badge_reward'       => 'Duta Hidrasi',
            ],
        ];

        $programs = [];
        foreach ($programSeed as $pData) {
            $programs[] = Program::updateOrCreate(
                ['judul' => $pData['judul']],
                $pData
            );
        }

        // File PNG 1x1 valid agar endpoint GET /program/{id}/bukti/{pesertaId} langsung merender gambar tanpa 404
        $pngMinimal = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
        $simpanBukti = function (int $programId, int $userId) use ($pngMinimal): string {
            $path = "program-bukti/{$programId}/dummy-bukti-{$userId}.png";
            if (! Storage::disk('local')->exists($path)) {
                Storage::disk('local')->put($path, $pngMinimal);
            }
            return $path;
        };

        // Keikutsertaan & status verifikasi bervariasi untuk Budi + warga lain
        if (count($programs) >= 7 && count($listWargaLu) >= 20) {
            // Program 0 (berjalan): Budi selesai, warga lain menunggu_verifikasi / ditolak / terdaftar / berhenti
            PesertaProgram::updateOrCreate(
                ['program_id' => $programs[0]->id, 'user_id' => $budi->id],
                [
                    'status'            => 'selesai',
                    'bukti_foto'        => $simpanBukti($programs[0]->id, $budi->id),
                    'catatan_bukti'     => 'Sudah jalan pagi 35 menit tiap hari selama 1 minggu.',
                    'dikirim_pada'      => Carbon::now()->subDays(4),
                    'catatan_verifikasi'=> 'Bukti sesuai kriteria, selamat!',
                    'diverifikasi_oleh' => $kaderLu?->id,
                    'diverifikasi_pada' => Carbon::now()->subDays(3),
                    'selesai_pada'      => Carbon::now()->subDays(3),
                ]
            );
            BadgePengguna::firstOrCreate(
                ['user_id' => $budi->id, 'badge' => 'Pejalan Tangguh'],
                ['program_id' => $programs[0]->id]
            );

            // Program 1 (berjalan): Budi baru terdaftar, warga lain menunggu verifikasi
            PesertaProgram::updateOrCreate(
                ['program_id' => $programs[1]->id, 'user_id' => $budi->id],
                ['status' => 'terdaftar']
            );
            // Program 2 (berjalan): Budi ditolak supaya bisa coba unggah ulang dari UI warga
            PesertaProgram::updateOrCreate(
                ['program_id' => $programs[2]->id, 'user_id' => $budi->id],
                [
                    'status'             => 'ditolak',
                    'bukti_foto'         => $simpanBukti($programs[2]->id, $budi->id),
                    'catatan_bukti'      => 'Foto hasil tensi minggu lalu.',
                    'dikirim_pada'       => Carbon::now()->subDays(2),
                    'catatan_verifikasi' => 'Tanggal pada foto kurang terlihat, mohon foto ulang lebih jelas.',
                    'diverifikasi_oleh'  => $adminLu?->id ?? $kaderLu?->id,
                    'diverifikasi_pada'  => Carbon::now()->subDay(),
                ]
            );
            // Program 4 (selesai): Budi selesai & dapat badge kedua
            PesertaProgram::updateOrCreate(
                ['program_id' => $programs[4]->id, 'user_id' => $budi->id],
                [
                    'status'            => 'selesai',
                    'selesai_pada'      => Carbon::now()->subDays(18),
                    'diverifikasi_oleh' => $adminLu?->id,
                    'diverifikasi_pada' => Carbon::now()->subDays(18),
                ]
            );
            BadgePengguna::firstOrCreate(
                ['user_id' => $budi->id, 'badge' => 'Pelopor Sehat'],
                ['program_id' => $programs[4]->id]
            );

            // Antrean menunggu_verifikasi untuk tampilan Kader & Admin Kelurahan (Loktabat Utara)
            foreach ([$listWargaLu[0], $listWargaLu[1], $listWargaLu[17]] as $wWait) {
                PesertaProgram::updateOrCreate(
                    ['program_id' => $programs[0]->id, 'user_id' => $wWait->id],
                    [
                        'status'        => 'menunggu_verifikasi',
                        'bukti_foto'    => $simpanBukti($programs[0]->id, $wWait->id),
                        'catatan_bukti' => 'Jalan pagi keliling komplek 4.200 langkah.',
                        'dikirim_pada'  => Carbon::now()->subHours(5),
                    ]
                );
            }
            foreach ([$listWargaLu[2], $listWargaLu[4], $listWargaLu[18]] as $wWait) {
                PesertaProgram::updateOrCreate(
                    ['program_id' => $programs[1]->id, 'user_id' => $wWait->id],
                    [
                        'status'        => 'menunggu_verifikasi',
                        'bukti_foto'    => $simpanBukti($programs[1]->id, $wWait->id),
                        'catatan_bukti' => 'Bekal minum air putih 2 liter tanpa minuman kemasan.',
                        'dikirim_pada'  => Carbon::now()->subHours(2),
                    ]
                );
            }
            PesertaProgram::updateOrCreate(
                ['program_id' => $programs[0]->id, 'user_id' => $listWargaLu[3]->id],
                ['status' => 'terdaftar']
            );
            PesertaProgram::updateOrCreate(
                ['program_id' => $programs[0]->id, 'user_id' => $listWargaLu[5]->id],
                ['status' => 'selesai', 'selesai_pada' => Carbon::now()->subDays(2)]
            );
            PesertaProgram::updateOrCreate(
                ['program_id' => $programs[0]->id, 'user_id' => $listWargaLu[6]->id],
                ['status' => 'berhenti']
            );
            PesertaProgram::updateOrCreate(
                ['program_id' => $programs[6]->id, 'user_id' => $listWargaLu[0]->id],
                [
                    'status'        => 'menunggu_verifikasi',
                    'bukti_foto'    => $simpanBukti($programs[6]->id, $listWargaLu[0]->id),
                    'catatan_bukti' => 'Sudah minum air putih 8 gelas sehari.',
                    'dikirim_pada'  => Carbon::now()->subHours(3),
                ]
            );

            // Peserta di Program Guntung Paikat & Global agar kader/admin GP juga punya antrean verifikasi
            if (count($listWargaGp) >= 4) {
                PesertaProgram::updateOrCreate(
                    ['program_id' => $programs[5]->id, 'user_id' => $listWargaGp[0]->id],
                    [
                        'status'        => 'menunggu_verifikasi',
                        'bukti_foto'    => $simpanBukti($programs[5]->id, $listWargaGp[0]->id),
                        'catatan_bukti' => 'Menu makan siang rendah garam & rebusan sayur.',
                        'dikirim_pada'  => Carbon::now()->subHours(4),
                    ]
                );
                PesertaProgram::updateOrCreate(
                    ['program_id' => $programs[5]->id, 'user_id' => $listWargaGp[1]->id],
                    ['status' => 'terdaftar']
                );
                PesertaProgram::updateOrCreate(
                    ['program_id' => $programs[5]->id, 'user_id' => $listWargaGp[2]->id],
                    [
                        'status'            => 'selesai',
                        'bukti_foto'        => $simpanBukti($programs[5]->id, $listWargaGp[2]->id),
                        'catatan_bukti'     => 'Catatan tensi stabil 3 hari berturut-turut.',
                        'dikirim_pada'      => Carbon::now()->subDays(3),
                        'diverifikasi_oleh' => $kaderGp?->id,
                        'diverifikasi_pada' => Carbon::now()->subDays(2),
                        'selesai_pada'      => Carbon::now()->subDays(2),
                    ]
                );
                PesertaProgram::updateOrCreate(
                    ['program_id' => $programs[0]->id, 'user_id' => $listWargaGp[0]->id],
                    ['status' => 'terdaftar']
                );
            }
        }

        // ------------------------------------------------------------------
        // 8. Target Kesehatan Dinamis & Refleksi Mingguan Warga
        // ------------------------------------------------------------------
        $targetSeed = [
            ['judul' => 'Turunkan Berat Badan ke 70 kg', 'jenis_target' => 'berat_badan', 'nilai_awal' => 78.0, 'nilai_target' => 70.0, 'satuan' => 'kg', 'tenggat_waktu' => Carbon::now()->addDays(45)->toDateString(), 'tercapai' => false, 'tercapai_pada' => null, 'catatan_motivasi' => 'Sudah turun 4,6 kg! Tinggal 3,4 kg lagi menuju berat ideal.'],
            ['judul' => 'Jaga Tensi Sistolik di Bawah 130 mmHg', 'jenis_target' => 'tekanan_darah', 'nilai_awal' => 144.0, 'nilai_target' => 125.0, 'satuan' => 'mmHg', 'tenggat_waktu' => Carbon::now()->addDays(30)->toDateString(), 'tercapai' => false, 'tercapai_pada' => null, 'catatan_motivasi' => 'Kurangi garam dan tidur cukup 7 jam setiap malam.'],
            ['judul' => 'Minum Air Putih 2.200 ml per Hari', 'jenis_target' => 'hidrasi', 'nilai_awal' => 1500.0, 'nilai_target' => 2200.0, 'satuan' => 'ml', 'tenggat_waktu' => Carbon::now()->addDays(14)->toDateString(), 'tercapai' => true, 'tercapai_pada' => Carbon::now()->subDays(2), 'catatan_motivasi' => 'Mantap! Kebutuhan cairan harianmu berhasil terpenuhi konsisten.'],
            ['judul' => 'Gula Darah Puasa Stabil < 100 mg/dL', 'jenis_target' => 'gula_darah', 'nilai_awal' => 112.0, 'nilai_target' => 98.0, 'satuan' => 'mg/dL', 'tenggat_waktu' => Carbon::now()->subDay()->toDateString(), 'tercapai' => true, 'tercapai_pada' => Carbon::now()->subDays(3), 'catatan_motivasi' => 'Hasil cek terbaru 96 mg/dL! Pertahankan pola makan rendah gula.'],
        ];
        foreach ($targetSeed as $t) {
            TargetKesehatan::updateOrCreate(
                ['user_id' => $budi->id, 'judul' => $t['judul']],
                $t
            );
        }

        if (! empty($listWargaGp[0])) {
            TargetKesehatan::updateOrCreate(
                ['user_id' => $listWargaGp[0]->id, 'judul' => 'Lari Pagi 3 Kali Seminggu'],
                ['jenis_target' => 'aktivitas', 'nilai_awal' => 1.0, 'nilai_target' => 3.0, 'satuan' => 'sesi/minggu', 'tenggat_waktu' => Carbon::now()->addDays(21)->toDateString(), 'tercapai' => false, 'tercapai_pada' => null, 'catatan_motivasi' => 'Tetap konsisten olahraga ringan setiap akhir pekan.']
            );
            Refleksi::updateOrCreate(
                ['user_id' => $listWargaGp[0]->id, 'minggu' => Carbon::now()->format('o-\WW')],
                ['catatan' => 'Pekan ini berhasil menjaga tekanan darah tetap normal dan tidur teratur 7 jam.']
            );
        }

        $mingguIni = Carbon::now();
        for ($w = 0; $w < 3; $w++) {
            $tglMinggu = $mingguIni->copy()->subWeeks($w);
            $kodeMinggu = $tglMinggu->format('o-\WW');
            $isiRefleksi = match ($w) {
                0 => 'Minggu ini berhasil rutin jalan pagi 4 kali dan menghindari gorengan di malam hari.',
                1 => 'Sempat kurang tidur 2 hari karena lembur sehingga tensi naik sedikit, minggu depan fokus perbaiki jam tidur.',
                default => 'Mulai mencatat tekanan darah secara rutin setiap akhir pekan dan mengurangi konsumsi teh manis.',
            };
            Refleksi::updateOrCreate(
                ['user_id' => $budi->id, 'minggu' => $kodeMinggu],
                ['catatan' => $isiRefleksi]
            );
        }

        // ------------------------------------------------------------------
        // 9. Pengaduan Warga (semua kategori & status untuk Admin Kelurahan & Super Admin)
        // ------------------------------------------------------------------
        $pengaduanSeed = [
            [$budi,                    $loktabatUtara->id, 'Jadwal Antrean Posbindu RT 05',      'Mohon pembagian nomor antrean online agar lansia tidak menunggu terlalu lama di Balai Warga.', 'layanan_posbindu', 'menunggu', null, null, null],
            [$listWargaLu[4] ?? $budi, $loktabatUtara->id, 'Stok Strip Kolesterol di Posbindu',  'Pada sesi kemarin strip cek kolesterol habis sebelum siang, mohon penambahan kuota bulan depan.', 'layanan_posbindu', 'diproses', 'Terima kasih laporannya. Sudah kami koordinasikan dengan Puskesmas untuk penambahan logistik sesi berikutnya.', $adminLu?->id, Carbon::now()->subDays(1)],
            [$listWargaLu[10] ?? $budi,$loktabatUtara->id, 'Konfirmasi Rujukan ke Puskesmas',    'Apakah surat rujukan dari kader sudah otomatis terdaftar di loket poli PTM Puskesmas?', 'rujukan', 'selesai', 'Betul, silakan sebutkan NIK di loket Puskesmas Banjarbaru Utara dan tunjukkan status rujukan di aplikasi.', $adminLu?->id, Carbon::now()->subDays(3)],
            [$listWargaLu[1] ?? $budi, $loktabatUtara->id, 'Saran Grafik Berat Badan Harian',    'Akan lebih membantu jika di menu tren tersedia ringkasan selisih target mingguan.', 'aplikasi', 'selesai', 'Masukan sangat baik dan sudah kami catat untuk pembaruan fitur berikutnya.', $superAdmin?->id ?? $adminLu?->id, Carbon::now()->subDays(5)],
            [$listWargaLu[6] ?? $budi, $loktabatUtara->id, 'Permintaan Cek Darah Lengkap ke Rumah','Mohon layanan kunjungan cek laboratorium penuh ke rumah setiap minggu.', 'lainnya', 'ditolak', 'Pemeriksaan laboratorium lengkap di luar pemeriksaan dasar Posbindu dilakukan langsung di Puskesmas.', $adminLu?->id, Carbon::now()->subDays(2)],
        ];
        if ($guntungPaikat && ! empty($listWargaGp)) {
            $pengaduanSeed[] = [$listWargaGp[0], $guntungPaikat->id, 'Jam Buka Poli Lansia Puskesmas', 'Mohon informasi jam pendaftaran poli lansia hari Sabtu apakah tetap buka hingga pukul 11.00.', 'faskes', 'diproses', 'Sedang dikonfirmasi ulang ke koordinator layanan Puskesmas setempat.', $adminGp?->id ?? $superAdmin?->id, Carbon::now()->subHours(6)];
            $pengaduanSeed[] = [$listWargaGp[5], $guntungPaikat->id, 'Penambahan Kursi Tunggu Posyandu Melati', 'Saat skrining pagi hari warga lansia memerlukan tambahan kursi tunggu teduh.', 'layanan_posbindu', 'menunggu', null, null, null];
        }
        foreach ($pengaduanSeed as [$pelapor, $wId, $judul, $isi, $kat, $status, $tanggapan, $penanggapId, $tglTanggapan]) {
            Pengaduan::updateOrCreate(
                ['user_id' => $pelapor->id, 'judul' => $judul],
                [
                    'wilayah_id'      => $wId,
                    'isi'             => $isi,
                    'kategori'        => $kat,
                    'status'          => $status,
                    'tanggapan'       => $tanggapan,
                    'ditanggapi_oleh' => $penanggapId,
                    'ditanggapi_pada' => $tglTanggapan,
                ]
            );
        }

        // ------------------------------------------------------------------
        // 10. Log Audit & Riwayat Mutasi Wilayah untuk Super Admin
        // ------------------------------------------------------------------
        if ($superAdmin) {
            $auditSeed = [
                [$superAdmin->id, 'baca_data_individu',         Profil::class,           $budi->id],
                [$superAdmin->id, 'baca_data_individu',         CatatanKesehatan::class, $catatanBudi[0]->id ?? $budi->id],
                [$superAdmin->id, 'ubah_status_rujukan',        Rujukan::class,          Rujukan::where('user_id', $budi->id)->value('id') ?? 1],
                [$superAdmin->id, 'verifikasi_setujui_catatan', CatatanKesehatan::class, $catatanLu[0]->id ?? 1],
                [$superAdmin->id, 'verifikasi_tolak_catatan',   CatatanKesehatan::class, $catatanLu[1]->id ?? 2],
                [$superAdmin->id, 'ubah_pengguna',              Pengguna::class,         $listWargaLu[28]->id ?? $budi->id],
                [$superAdmin->id, 'tambah_faskes',              Faskes::class,           $faskesPuskesmasLu?->id ?? 1],
                [$adminLu?->id ?? $superAdmin->id, 'tanggapi_pengaduan', Pengaduan::class, Pengaduan::value('id') ?? 1],
            ];
            foreach ($auditSeed as [$uId, $aksi, $model, $mId]) {
                LogAudit::firstOrCreate(
                    ['user_id' => $uId, 'aksi' => $aksi, 'model' => $model, 'model_id' => $mId],
                    ['ip' => '127.0.0.1', 'user_agent' => 'SehatKitaSeeder/1.5']
                );
            }

            if ($guntungPaikat && count($listWargaLu) >= 8) {
                RiwayatWilayah::firstOrCreate(
                    ['user_id' => $listWargaLu[7]->id, 'wilayah_tujuan_id' => $loktabatUtara->id],
                    [
                        'wilayah_asal_id' => $guntungPaikat->id,
                        'alasan'          => 'Pindah domisili tempat tinggal ke Loktabat Utara',
                        'diubah_oleh'     => $superAdmin->id,
                    ]
                );
                RiwayatWilayah::firstOrCreate(
                    ['user_id' => $budi->id, 'wilayah_tujuan_id' => $loktabatUtara->id],
                    [
                        'wilayah_asal_id' => $guntungPaikat->id,
                        'alasan'          => 'Mutasi KK ke Kelurahan Loktabat Utara',
                        'diubah_oleh'     => $superAdmin->id,
                    ]
                );
                if (! empty($listWargaGp[2])) {
                    RiwayatWilayah::firstOrCreate(
                        ['user_id' => $listWargaGp[2]->id, 'wilayah_tujuan_id' => $guntungPaikat->id],
                        [
                            'wilayah_asal_id' => $loktabatUtara->id,
                            'alasan'          => 'Penyesuaian alamat domisili KTP terbaru',
                            'diubah_oleh'     => $superAdmin->id,
                        ]
                    );
                }
            }
        }

        $this->command->info('Seeder WargaDummy selesai – data lengkap untuk Warga, Kader, Admin Kelurahan, dan Super Admin siap digunakan.');
    }

    /**
     * Buat atau perbarui satu akun warga beserta profil & catatan kesehatan terhitung otomatis.
     *
     * @return array{0: Pengguna, 1: CatatanKesehatan}
     */
    private function seedSatuWarga(
        array $w,
        int $wilayahId,
        ?int $kaderId,
        string $password,
        int $seq,
        string $kodePrefixNik
    ): array {
        $tglLahir = Carbon::now()->subYears($w['umur'])->format('Y-04-15');
        $kodeNikTgl = Carbon::parse($tglLahir)->format('ymd');

        $isAktif = $w['aktif'] ?? true;
        $hasConsent = $w['consent'] ?? true;

        $user = Pengguna::updateOrCreate(
            ['email' => $w['email']],
            [
                'name'             => $w['nama'],
                'nik'              => sprintf('%s%s%04d', $kodePrefixNik, $kodeNikTgl, $seq),
                'password'         => $password,
                'role'             => 'user',
                'wilayah_id'       => $wilayahId,
                'kader_id'         => $kaderId,
                'aktif'            => $isAktif,
                'consent_at'       => $hasConsent ? Carbon::now()->subMonths(2) : null,
                'versi_kebijakan'  => $hasConsent ? '1.0' : null,
                'exp_total'        => $w['exp'],
                'level_gamifikasi' => max(1, (int) floor($w['exp'] / 100) + 1),
            ]
        );

        Profil::updateOrCreate(
            ['user_id' => $user->id],
            [
                'tgl_lahir'                   => $tglLahir,
                'jenis_kelamin'               => $w['jk'],
                'tinggi_cm'                   => $w['tb'],
                'tingkat_aktivitas'           => $w['exp'] >= 300 ? 'berat' : ($w['exp'] >= 180 ? 'sedang' : 'ringan'),
                'merokok'                     => $w['merokok'],
                'riwayat_keluarga'            => $w['rk'],
                'tampil_di_peringkat'         => $w['rank'],
                'bb_awal_kg'                  => $w['bb'] + 1.5,
                'bb_target_kg'                => $w['bb'] < 50 ? $w['bb'] + 5.0 : max(48.0, $w['bb'] - 3.0),
                'target_aktivitas_per_minggu' => 3,
                'target_air_ml'               => 2000,
            ]
        );

        $hariLalu = ($seq % 10) + 1;
        $catatan = $this->upsertCatatan($user, $wilayahId, $kaderId, [
            'tanggal' => Carbon::now()->subDays($hariLalu)->toDateString(),
            'sumber'  => 'kader',
            'bb'      => $w['bb'],
            'tb'      => $w['tb'],
            'lp'      => $w['jk'] === 'L' ? 86.0 : 78.0,
            'sistol'  => $w['sis'],
            'diastol' => $w['dia'],
            'gula'    => $w['gula'],
            'jenis'   => 'puasa',
            'kol'     => $w['kol'],
            'asam'    => $w['asam'],
            'tidur'   => 7,
            'merokok' => $w['merokok'],
            'manis'   => $w['gula'] >= 126 ? 'sering' : 'jarang',
            'catatan' => 'Hasil pemeriksaan Posbindu kelurahan.',
        ]);

        return [$user, $catatan];
    }

    // Simpan catatan kesehatan secara idempoten dengan kalkulasi kategori & skor resmi
    private function upsertCatatan(
        Pengguna $user,
        int $wilayahId,
        ?int $pencatatId,
        array $r,
        bool $forceVerifikasi = false
    ): CatatanKesehatan {
        $payload = [
            'bb_kg'            => $r['bb'] ?? null,
            'tinggi_cm'        => $r['tb'] ?? null,
            'lingkar_perut'    => $r['lp'] ?? null,
            'sistol'           => $r['sistol'] ?? null,
            'diastol'          => $r['diastol'] ?? null,
            'gula_darah'       => $r['gula'] ?? null,
            'jenis_gula_darah' => isset($r['gula']) ? ($r['jenis'] ?? 'puasa') : null,
            'kolesterol'       => $r['kol'] ?? null,
            'asam_urat'        => $r['asam'] ?? null,
            'tidur_jam'        => $r['tidur'] ?? null,
            'merokok'          => $r['merokok'] ?? null,
            'konsumsi_manis'   => $r['manis'] ?? null,
        ];

        $snapshot = $this->kalkulator->snapshot($payload, $r['tb'] ?? null);
        $perluVerifikasi = $forceVerifikasi || $this->kalkulator->perluVerifikasi($payload);

        $atribut = array_merge($payload, $snapshot, [
            'user_id'          => $user->id,
            'wilayah_id'       => $wilayahId,
            'dicatat_oleh'     => $pencatatId,
            'dicatat_pada'     => $r['tanggal'],
            'sumber'           => $r['sumber'] ?? 'kader',
            'catatan'          => $r['catatan'] ?? null,
            'perlu_verifikasi' => $perluVerifikasi,
        ]);

        $eksisting = CatatanKesehatan::withTrashed()
            ->where('user_id', $user->id)
            ->whereDate('dicatat_pada', $r['tanggal'])
            ->first();

        if ($eksisting) {
            if ($eksisting->trashed()) {
                $eksisting->restore();
            }
            $eksisting->fill($atribut);
            $eksisting->save();
            $baris = $eksisting;
        } else {
            $baris = CatatanKesehatan::create($atribut);
        }

        $baris->status_kesehatan = $this->kalkulator->statusKesehatan($baris);
        $baris->skor_risiko      = $this->kalkulator->skorRisiko($baris);
        $baris->save();

        return $baris;
    }
}
