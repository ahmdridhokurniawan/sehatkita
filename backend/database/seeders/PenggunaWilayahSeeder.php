<?php

namespace Database\Seeders;

use App\Models\Pengguna;
use App\Models\Wilayah;
use Illuminate\Database\Seeder;

class PenggunaWilayahSeeder extends Seeder
{
    public function run(): void
    {
        // Sandi seragam akun demo
        $password = 'demo1234';

        // Ambil seluruh kelurahan (Banjarbaru Utara & Banjarbaru Selatan) agar setiap role di semua kelurahan punya akun demo
        $kelurahan = Wilayah::where('tipe', 'kelurahan')
            ->orderBy('kode')
            ->get();

        if ($kelurahan->isEmpty()) {
            $this->command->error('Data kelurahan belum ada. Jalankan WilayahSeeder dulu.');
            return;
        }

        foreach ($kelurahan as $index => $w) {
            $slug = strtolower(str_replace(' ', '', $w->nama));
            $seq = $index + 1;

            // Akun admin kelurahan
            Pengguna::updateOrCreate(
                ['email' => "admin.{$slug}@sehatkita.test"],
                [
                    'name'            => "Admin {$w->nama}",
                    'nik'             => sprintf('637204100185%04d', $seq),
                    'password'        => $password,
                    'role'            => 'admin_kelurahan',
                    'wilayah_id'      => $w->id,
                    'aktif'           => true,
                    'consent_at'      => now(),
                    'versi_kebijakan' => '1.0',
                ]
            );

            // Akun kader posbindu
            Pengguna::updateOrCreate(
                ['email' => "kader.{$slug}@sehatkita.test"],
                [
                    'name'            => "Kader {$w->nama}",
                    'nik'             => sprintf('637204200190%04d', $seq),
                    'password'        => $password,
                    'role'            => 'kader',
                    'wilayah_id'      => $w->id,
                    'aktif'           => true,
                    'consent_at'      => now(),
                    'versi_kebijakan' => '1.0',
                ]
            );
        }

        // 👤 super admin – akses penuh master data & statistik sistem
        Pengguna::updateOrCreate(
            ['email' => 'superadmin@sehatkita.test'],
            [
                'name'            => 'Super Admin Dinkes',
                'nik'             => '6372000101850001',
                'password'        => $password,
                'role'            => 'super_admin',
                'wilayah_id'      => null,
                'aktif'           => true,
                'consent_at'      => now(),
                'versi_kebijakan' => '1.0',
            ]
        );

        // Kader tambahan di kelurahan padat (untuk demonstrasi penugasan banyak kader di Super Admin)
        $kaderTambahan = [
            ['Loktabat Utara', 'kader2.loktabatutara@sehatkita.test', 'Kader Posbindu Mawar (LU)', '6372042002920001'],
            ['Guntung Paikat', 'kader2.guntungpaikat@sehatkita.test', 'Kader Posbindu Melati (GP)', '6372052002930002'],
        ];
        foreach ($kaderTambahan as [$namaKel, $emailKader, $namaKader, $nikKader]) {
            $wil = $kelurahan->firstWhere('nama', $namaKel);
            if ($wil) {
                Pengguna::updateOrCreate(
                    ['email' => $emailKader],
                    [
                        'name'            => $namaKader,
                        'nik'             => $nikKader,
                        'password'        => $password,
                        'role'            => 'kader',
                        'wilayah_id'      => $wil->id,
                        'aktif'           => true,
                        'consent_at'      => now(),
                        'versi_kebijakan' => '1.0',
                    ]
                );
            }
        }

        // Update akun demo lama agar seragam 8 karakter
        $demoSa = Pengguna::where('email', 'demo.superadmin@example.test')->first();
        if ($demoSa) {
            $demoSa->password = $password;
            $demoSa->save();
        }

        $this->command->info('Seeder PenggunaWilayah selesai – super admin, admin kelurahan, & kader terbuat.');
    }
}