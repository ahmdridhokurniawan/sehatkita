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

        // Ambil ID kecamatan Banjarbaru Utara
        $kecamatanId = Wilayah::where('kode', '63.72.04')->value('id');

        if (! $kecamatanId) {
            $this->command->error('Kecamatan Banjarbaru Utara belum ada. Jalankan WilayahSeeder dulu.');
            return;
        }

        // Ambil daftar kelurahan di bawah kecamatan
        $kelurahan = Wilayah::where('parent_id', $kecamatanId)
            ->where('tipe', 'kelurahan')
            ->orderBy('kode')
            ->get();

        foreach ($kelurahan as $w) {
            $slug = strtolower(str_replace(' ', '', $w->nama));

            // Akun admin kelurahan
            Pengguna::updateOrCreate(
                ['email' => "admin.{$slug}@sehatkita.test"],
                [
                    'name'            => "Admin {$w->nama}",
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
                'password'        => $password,
                'role'            => 'super_admin',
                'wilayah_id'      => null,
                'aktif'           => true,
                'consent_at'      => now(),
                'versi_kebijakan' => '1.0',
            ]
        );

        // Update akun demo lama agar seragam 8 karakter
        $demoSa = Pengguna::where('email', 'demo.superadmin@example.test')->first();
        if ($demoSa) {
            $demoSa->password = $password;
            $demoSa->save();
        }

        $this->command->info('Seeder PenggunaWilayah selesai – super admin, admin kelurahan, & kader terbuat.');
    }
}