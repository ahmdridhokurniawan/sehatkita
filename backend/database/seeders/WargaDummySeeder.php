<?php

namespace Database\Seeders;

use App\Models\CatatanKesehatan;
use App\Models\Faskes;
use App\Models\KunjunganPosbindu;
use App\Models\Pengguna;
use App\Models\Profil;
use App\Models\Rujukan;
use App\Models\SesiPosbindu;
use App\Models\Wilayah;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class WargaDummySeeder extends Seeder
{
    public function run(): void
    {
        $wilayah = Wilayah::where('nama', 'Loktabat Utara')->first();

        if (! $wilayah) {
            $this->command->error('Kelurahan Loktabat Utara tidak ditemukan.');
            return;
        }

        $kader = Pengguna::where('email', 'kader.loktabatutara@sehatkita.test')->first();
        $faskes = Faskes::first();
        $password = 'demo1234';

        // 1. Akun warga utama untuk tes login pribadi
        $wargaUtama = Pengguna::updateOrCreate(
            ['email' => 'warga.loktabatutara@sehatkita.test'],
            [
                'name'            => 'Budi Santoso',
                'nik'             => '6372041206880001',
                'password'        => $password,
                'role'            => 'user',
                'wilayah_id'      => $wilayah->id,
                'kader_id'        => $kader?->id,
                'aktif'           => true,
                'consent_at'      => now(),
                'versi_kebijakan' => '1.0',
                'exp_total'       => 150,
                'level_gamifikasi'=> 2,
            ]
        );

        Profil::updateOrCreate(
            ['user_id' => $wargaUtama->id],
            [
                'tgl_lahir'                   => '1988-06-12',
                'jenis_kelamin'               => 'L',
                'tinggi_cm'                   => 170.00,
                'tingkat_aktivitas'           => 'sedang',
                'merokok'                     => false,
                'bb_awal_kg'                  => 72.00,
                'bb_target_kg'                => 68.00,
                'target_aktivitas_per_minggu' => 3,
                'target_air_ml'               => 2000,
            ]
        );

        // Catatan kesehatan untuk Budi Santoso (3 bulan terakhir)
        $riwayatBudi = [
            ['hari' => 60, 'bb' => 72.0, 'sistol' => 128, 'diastol' => 82, 'gula' => 105, 'kol' => 195, 'asam' => 6.2, 'status' => 'normal', 'skor' => 1],
            ['hari' => 30, 'bb' => 71.0, 'sistol' => 124, 'diastol' => 80, 'gula' => 98,  'kol' => 188, 'asam' => 5.8, 'status' => 'normal', 'skor' => 0],
            ['hari' => 5,  'bb' => 69.5, 'sistol' => 120, 'diastol' => 78, 'gula' => 94,  'kol' => 180, 'asam' => 5.5, 'status' => 'normal', 'skor' => 0],
        ];

        foreach ($riwayatBudi as $r) {
            CatatanKesehatan::updateOrCreate(
                [
                    'user_id'      => $wargaUtama->id,
                    'dicatat_pada' => Carbon::now()->subDays($r['hari'])->toDateString(),
                ],
                [
                    'wilayah_id'          => $wilayah->id,
                    'dicatat_oleh'        => $kader?->id,
                    'sumber'              => 'kader',
                    'bb_kg'               => $r['bb'],
                    'tinggi_cm'           => 170.00,
                    'lingkar_perut'       => 82.00,
                    'sistol'              => $r['sistol'],
                    'diastol'             => $r['diastol'],
                    'gula_darah'          => $r['gula'],
                    'jenis_gula_darah'    => 'puasa',
                    'kolesterol'          => $r['kol'],
                    'asam_urat'           => $r['asam'],
                    'tidur_jam'           => 7,
                    'merokok'             => false,
                    'konsumsi_manis'      => 'jarang',
                    'kategori_imt'        => 'normal',
                    'kategori_tensi'      => 'normal',
                    'kategori_gula_darah' => 'normal',
                    'kategori_kolesterol' => 'normal',
                    'kategori_asam_urat'  => 'normal',
                    'status_kesehatan'    => $r['status'],
                    'skor_risiko'         => $r['skor'],
                    'perlu_verifikasi'    => false,
                ]
            );
        }

        // 2. Daftar 14 warga fiktif lainnya di Loktabat Utara
        $daftarWarga = [
            ['nama' => 'Siti Rahmah', 'email' => 'siti.rahmah@sehatkita.test', 'jk' => 'P', 'lahir' => '1982-04-15', 'bb' => 64.0, 'tb' => 155.0, 'sis' => 135, 'dia' => 88, 'gula' => 110, 'kol' => 210, 'status' => 'perlu_perhatian', 'tensi_kat' => 'tinggi-1', 'gula_kat' => 'normal', 'kol_kat' => 'sedang', 'skor' => 2],
            ['nama' => 'Ahmad Fauzi', 'email' => 'ahmad.fauzi@sehatkita.test', 'jk' => 'L', 'lahir' => '1975-11-20', 'bb' => 78.0, 'tb' => 165.0, 'sis' => 145, 'dia' => 92, 'gula' => 145, 'kol' => 230, 'status' => 'berisiko', 'tensi_kat' => 'hipertensi-1', 'gula_kat' => 'prediabetes', 'kol_kat' => 'tinggi', 'skor' => 3],
            ['nama' => 'Nurul Hidayah', 'email' => 'nurul.hidayah@sehatkita.test', 'jk' => 'P', 'lahir' => '1995-08-03', 'bb' => 52.0, 'tb' => 158.0, 'sis' => 115, 'dia' => 75, 'gula' => 88, 'kol' => 165, 'status' => 'normal', 'tensi_kat' => 'optimal', 'gula_kat' => 'normal', 'kol_kat' => 'normal', 'skor' => 0],
            ['nama' => 'Hendra Setiawan', 'email' => 'hendra.setiawan@sehatkita.test', 'jk' => 'L', 'lahir' => '1980-02-14', 'bb' => 85.0, 'tb' => 168.0, 'sis' => 150, 'dia' => 95, 'gula' => 160, 'kol' => 245, 'status' => 'berisiko', 'tensi_kat' => 'hipertensi-1', 'gula_kat' => 'diabetes', 'kol_kat' => 'tinggi', 'skor' => 4],
            ['nama' => 'Dewi Lestari', 'email' => 'dewi.lestari@sehatkita.test', 'jk' => 'P', 'lahir' => '1990-10-25', 'bb' => 58.0, 'tb' => 160.0, 'sis' => 122, 'dia' => 78, 'gula' => 95, 'kol' => 175, 'status' => 'normal', 'tensi_kat' => 'normal', 'gula_kat' => 'normal', 'kol_kat' => 'normal', 'skor' => 0],
            ['nama' => 'Bambang Supriyanto', 'email' => 'bambang.s@sehatkita.test', 'jk' => 'L', 'lahir' => '1968-07-09', 'bb' => 68.0, 'tb' => 162.0, 'sis' => 142, 'dia' => 88, 'gula' => 125, 'kol' => 215, 'status' => 'berisiko', 'tensi_kat' => 'hipertensi-1', 'gula_kat' => 'prediabetes', 'kol_kat' => 'sedang', 'skor' => 3],
            ['nama' => 'Rina Wulandari', 'email' => 'rina.w@sehatkita.test', 'jk' => 'P', 'lahir' => '1993-01-30', 'bb' => 50.0, 'tb' => 156.0, 'sis' => 110, 'dia' => 70, 'gula' => 85, 'kol' => 160, 'status' => 'normal', 'tensi_kat' => 'optimal', 'gula_kat' => 'normal', 'kol_kat' => 'normal', 'skor' => 0],
            ['nama' => 'Eko Prasetyo', 'email' => 'eko.p@sehatkita.test', 'jk' => 'L', 'lahir' => '1985-05-18', 'bb' => 74.0, 'tb' => 172.0, 'sis' => 130, 'dia' => 84, 'gula' => 108, 'kol' => 198, 'status' => 'perlu_perhatian', 'tensi_kat' => 'tinggi-1', 'gula_kat' => 'normal', 'kol_kat' => 'normal', 'skor' => 1],
            ['nama' => 'Sri Wahyuni', 'email' => 'sri.w@sehatkita.test', 'jk' => 'P', 'lahir' => '1978-09-12', 'bb' => 70.0, 'tb' => 152.0, 'sis' => 138, 'dia' => 86, 'gula' => 130, 'kol' => 220, 'status' => 'perlu_perhatian', 'tensi_kat' => 'tinggi-1', 'gula_kat' => 'prediabetes', 'kol_kat' => 'sedang', 'skor' => 2],
            ['nama' => 'Doni Saputra', 'email' => 'doni.s@sehatkita.test', 'jk' => 'L', 'lahir' => '1998-12-05', 'bb' => 62.0, 'tb' => 170.0, 'sis' => 118, 'dia' => 76, 'gula' => 90, 'kol' => 170, 'status' => 'normal', 'tensi_kat' => 'normal', 'gula_kat' => 'normal', 'kol_kat' => 'normal', 'skor' => 0],
            ['nama' => 'Maya Indah', 'email' => 'maya.i@sehatkita.test', 'jk' => 'P', 'lahir' => '1987-03-22', 'bb' => 60.0, 'tb' => 159.0, 'sis' => 125, 'dia' => 80, 'gula' => 100, 'kol' => 185, 'status' => 'normal', 'tensi_kat' => 'normal', 'gula_kat' => 'normal', 'kol_kat' => 'normal', 'skor' => 0],
            ['nama' => 'Rudi Hartono', 'email' => 'rudi.h@sehatkita.test', 'jk' => 'L', 'lahir' => '1972-06-17', 'bb' => 80.0, 'tb' => 166.0, 'sis' => 155, 'dia' => 98, 'gula' => 150, 'kol' => 240, 'status' => 'berisiko', 'tensi_kat' => 'hipertensi-1', 'gula_kat' => 'diabetes', 'kol_kat' => 'tinggi', 'skor' => 4],
            ['nama' => 'Lestari Ningsih', 'email' => 'lestari.n@sehatkita.test', 'jk' => 'P', 'lahir' => '1992-11-08', 'bb' => 54.0, 'tb' => 157.0, 'sis' => 112, 'dia' => 74, 'gula' => 92, 'kol' => 168, 'status' => 'normal', 'tensi_kat' => 'optimal', 'gula_kat' => 'normal', 'kol_kat' => 'normal', 'skor' => 0],
            ['nama' => 'Agus Kurniawan', 'email' => 'agus.k@sehatkita.test', 'jk' => 'L', 'lahir' => '1983-08-29', 'bb' => 76.0, 'tb' => 169.0, 'sis' => 134, 'dia' => 85, 'gula' => 115, 'kol' => 205, 'status' => 'perlu_perhatian', 'tensi_kat' => 'tinggi-1', 'gula_kat' => 'normal', 'kol_kat' => 'sedang', 'skor' => 2],
        ];

        $listUser = [];
        foreach ($daftarWarga as $index => $w) {
            $seq = $index + 2;
            $tglLahir = str_replace('-', '', substr($w['lahir'], 2)); // YYMMDD
            $user = Pengguna::updateOrCreate(
                ['email' => $w['email']],
                [
                    'name'            => $w['nama'],
                    'nik'             => sprintf('637204%s%04d', $tglLahir, $seq),
                    'password'        => $password,
                    'role'            => 'user',
                    'wilayah_id'      => $wilayah->id,
                    'kader_id'        => $kader?->id,
                    'aktif'           => true,
                    'consent_at'      => now(),
                    'versi_kebijakan' => '1.0',
                    'exp_total'       => rand(20, 300),
                    'level_gamifikasi'=> rand(1, 3),
                ]
            );
            $listUser[] = $user;

            Profil::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'tgl_lahir'                   => $w['lahir'],
                    'jenis_kelamin'               => $w['jk'],
                    'tinggi_cm'                   => $w['tb'],
                    'tingkat_aktivitas'           => 'sedang',
                    'merokok'                     => ($w['jk'] === 'L' && rand(0, 1) === 1),
                    'bb_awal_kg'                  => $w['bb'],
                    'bb_target_kg'                => $w['bb'] - 2,
                    'target_aktivitas_per_minggu' => 3,
                    'target_air_ml'               => 2000,
                ]
            );

            // Buat 1-2 catatan kesehatan per warga (terbaru 1-14 hari lalu)
            $hariLalu = ($index % 10) + 1;
            CatatanKesehatan::updateOrCreate(
                [
                    'user_id'      => $user->id,
                    'dicatat_pada' => Carbon::now()->subDays($hariLalu)->toDateString(),
                ],
                [
                    'wilayah_id'          => $wilayah->id,
                    'dicatat_oleh'        => $kader?->id,
                    'sumber'              => 'kader',
                    'bb_kg'               => $w['bb'],
                    'tinggi_cm'           => $w['tb'],
                    'lingkar_perut'       => ($w['jk'] === 'L') ? rand(78, 92) : rand(68, 84),
                    'sistol'              => $w['sis'],
                    'diastol'             => $w['dia'],
                    'gula_darah'          => $w['gula'],
                    'jenis_gula_darah'    => 'puasa',
                    'kolesterol'          => $w['kol'],
                    'asam_urat'           => rand(40, 75) / 10,
                    'tidur_jam'           => rand(6, 8),
                    'merokok'             => ($w['jk'] === 'L'),
                    'konsumsi_manis'      => 'jarang',
                    'kategori_imt'        => 'normal',
                    'kategori_tensi'      => $w['tensi_kat'],
                    'kategori_gula_darah' => $w['gula_kat'],
                    'kategori_kolesterol' => $w['kol_kat'],
                    'kategori_asam_urat'  => 'normal',
                    'status_kesehatan'    => $w['status'],
                    'skor_risiko'         => $w['skor'],
                    'perlu_verifikasi'    => false,
                ]
            );
        }

        // 3. Data Sesi Posbindu untuk Kader
        if ($kader) {
            // Sesi 1: Selesai 7 hari lalu
            $sesi1 = SesiPosbindu::updateOrCreate(
                [
                    'wilayah_id' => $wilayah->id,
                    'tanggal'    => Carbon::now()->subDays(7)->toDateString(),
                ],
                [
                    'lokasi'   => 'Balai Warga RT 02 Loktabat Utara',
                    'kader_id' => $kader->id,
                    'catatan'  => 'Pemeriksaan rutin tensi & gula darah lansia.',
                    'status'   => 'selesai',
                ]
            );

            foreach (array_slice($listUser, 0, 8) as $u) {
                KunjunganPosbindu::updateOrCreate(
                    ['sesi_id' => $sesi1->id, 'user_id' => $u->id],
                    ['hadir' => true, 'dicatat_oleh' => $kader->id]
                );
            }

            // Sesi 2: Selesai 2 hari lalu
            $sesi2 = SesiPosbindu::updateOrCreate(
                [
                    'wilayah_id' => $wilayah->id,
                    'tanggal'    => Carbon::now()->subDays(2)->toDateString(),
                ],
                [
                    'lokasi'   => 'Posyandu Mawar RT 05 Loktabat Utara',
                    'kader_id' => $kader->id,
                    'catatan'  => 'Skrining PTM usia produktif.',
                    'status'   => 'selesai',
                ]
            );

            foreach (array_slice($listUser, 4, 6) as $u) {
                KunjunganPosbindu::updateOrCreate(
                    ['sesi_id' => $sesi2->id, 'user_id' => $u->id],
                    ['hadir' => true, 'dicatat_oleh' => $kader->id]
                );
            }

            // Sesi 3: Akan Datang 5 hari lagi
            SesiPosbindu::updateOrCreate(
                [
                    'wilayah_id' => $wilayah->id,
                    'tanggal'    => Carbon::now()->addDays(5)->toDateString(),
                ],
                [
                    'lokasi'   => 'Gedung Serbaguna Loktabat Utara',
                    'kader_id' => $kader->id,
                    'catatan'  => 'Pemeriksaan kolesterol dan senam sehat bersama.',
                    'status'   => 'akan_datang',
                ]
            );

            // 4. Data Rujukan Warga Berisiko ke Faskes
            if ($faskes && count($listUser) >= 4) {
                // Rujukan 1: Ahmad Fauzi (hipertensi)
                Rujukan::updateOrCreate(
                    ['user_id' => $listUser[1]->id, 'faskes_id' => $faskes->id],
                    [
                        'alasan'         => 'Tekanan darah sistolik 145 mmHg berulang (Hipertensi derajat 1).',
                        'dibuat_oleh'    => $kader->id,
                        'otomatis'       => false,
                        'indikator'      => 'sistol',
                        'status'         => 'baru',
                        'catatan'        => 'Perlu pemeriksaan dokter spesialis / obat antihipertensi.',
                    ]
                );

                // Rujukan 2: Hendra Setiawan (hipertensi + diabetes)
                Rujukan::updateOrCreate(
                    ['user_id' => $listUser[3]->id, 'faskes_id' => $faskes->id],
                    [
                        'alasan'         => 'Gula darah puasa 160 mg/dL dan tensi 150/95 mmHg.',
                        'dibuat_oleh'    => $kader->id,
                        'otomatis'       => false,
                        'indikator'      => 'gula_darah',
                        'status'         => 'dihubungi',
                        'catatan'        => 'Sudah dihubungi kader via WA, dijadwalkan ke Puskesmas hari Senin.',
                    ]
                );

                // Rujukan 3: Rudi Hartono (kolesterol tinggi)
                Rujukan::updateOrCreate(
                    ['user_id' => $listUser[11]->id, 'faskes_id' => $faskes->id],
                    [
                        'alasan'         => 'Kolesterol total 240 mg/dL dan tensi 155/98 mmHg.',
                        'dibuat_oleh'    => $kader->id,
                        'otomatis'       => false,
                        'indikator'      => 'kolesterol',
                        'status'         => 'baru',
                        'catatan'        => 'Rujukan baru dibuat hari ini.',
                    ]
                );
            }
        }

        $this->command->info('Seeder WargaDummy selesai – data warga, sesi posbindu, kunjungan, dan rujukan kader terisi.');
    }
}
