<?php

namespace App\Services;

use App\Models\BadgePengguna;
use App\Models\CatatanKesehatan;
use App\Models\KunjunganPosbindu;
use App\Models\Pengguna;
use App\Models\PesertaProgram;
use App\Models\ProgresEdukasi;
use App\Models\TargetKesehatan;

// Mengevaluasi dan menyusun katalog simbol badge keaktifan (achievement) untuk warga.
class BadgeKeaktifanService
{
    public const KATALOG = [
        [
            'kode' => 'langkah_pertama',
            'nama' => 'Langkah Pertama',
            'deskripsi' => 'Mulai memantau kesehatan dengan mencatat pemeriksaan pertama.',
            'ikon' => 'activity',
            'tier' => 'perunggu',
            'kategori' => 'pencatatan',
            'syarat' => 'Simpan minimal 1 catatan kesehatan valid',
        ],
        [
            'kode' => 'rajin_mencatat',
            'nama' => 'Rajin Mencatat',
            'deskripsi' => 'Disiplin melakukan pemantauan kesehatan secara berkala.',
            'ikon' => 'clipboard',
            'tier' => 'perak',
            'kategori' => 'pencatatan',
            'syarat' => 'Simpan minimal 5 catatan kesehatan valid',
        ],
        [
            'kode' => 'konsisten_sehat',
            'nama' => 'Konsisten Sehat',
            'deskripsi' => 'Menjaga rekam medis rutin hingga 10 kali pemeriksaan.',
            'ikon' => 'flame',
            'tier' => 'emas',
            'kategori' => 'pencatatan',
            'syarat' => 'Simpan minimal 10 catatan kesehatan valid',
        ],
        [
            'kode' => 'aktif_posbindu',
            'nama' => 'Aktif Posbindu',
            'deskripsi' => 'Hadir langsung mengikuti pemeriksaan skrining di Posbindu.',
            'ikon' => 'heart-pulse',
            'tier' => 'perak',
            'kategori' => 'posbindu',
            'syarat' => 'Hadir minimal 1 kegiatan Posbindu',
        ],
        [
            'kode' => 'penakluk_target',
            'nama' => 'Penakluk Target',
            'deskripsi' => 'Berhasil menuntaskan target kesehatan pribadi yang dibuat.',
            'ikon' => 'target',
            'tier' => 'perak',
            'kategori' => 'target',
            'syarat' => 'Tandai minimal 1 target kesehatan tercapai',
        ],
        [
            'kode' => 'pejuang_tantangan',
            'nama' => 'Pejuang Tantangan',
            'deskripsi' => 'Menyelesaikan program tantangan sehat hingga disetujui petugas.',
            'ikon' => 'trophy',
            'tier' => 'emas',
            'kategori' => 'tantangan',
            'syarat' => 'Selesaikan minimal 1 program tantangan',
        ],
        [
            'kode' => 'pembelajar_sehat',
            'nama' => 'Pembelajar Sehat',
            'deskripsi' => 'Menuntaskan materi edukasi pengendalian faktor risiko PTM.',
            'ikon' => 'book-open',
            'tier' => 'perak',
            'kategori' => 'edukasi',
            'syarat' => 'Selesaikan minimal 3 materi edukasi',
        ],
        [
            'kode' => 'warga_teladan',
            'nama' => 'Warga Teladan',
            'deskripsi' => 'Teladan keaktifan warga yang meraih berbagai pencapaian kesehatan.',
            'ikon' => 'star',
            'tier' => 'emas',
            'kategori' => 'keaktifan',
            'syarat' => 'Raih minimal 4 lencana keaktifan',
        ],
    ];

    public function evaluasiUntukUser(Pengguna $user): array
    {
        if ($user->role !== 'user') {
            return [];
        }

        $jumlahCatatan = CatatanKesehatan::where('user_id', $user->id)
            ->where('perlu_verifikasi', false)
            ->count();

        $hadirPosbindu = KunjunganPosbindu::where('user_id', $user->id)
            ->where('hadir', true)
            ->count();

        $targetTercapai = TargetKesehatan::where('user_id', $user->id)
            ->where('tercapai', true)
            ->count();

        $tantanganSelesai = PesertaProgram::where('user_id', $user->id)
            ->where('status', 'selesai')
            ->count();

        $edukasiSelesai = ProgresEdukasi::where('user_id', $user->id)
            ->where('sudah_dibaca', true)
            ->count();

        $layak = [];
        if ($jumlahCatatan >= 1) {
            $layak[] = 'langkah_pertama';
        }
        if ($jumlahCatatan >= 5) {
            $layak[] = 'rajin_mencatat';
        }
        if ($jumlahCatatan >= 10) {
            $layak[] = 'konsisten_sehat';
        }
        if ($hadirPosbindu >= 1) {
            $layak[] = 'aktif_posbindu';
        }
        if ($targetTercapai >= 1) {
            $layak[] = 'penakluk_target';
        }
        if ($tantanganSelesai >= 1) {
            $layak[] = 'pejuang_tantangan';
        }
        if ($edukasiSelesai >= 3) {
            $layak[] = 'pembelajar_sehat';
        }

        $kodeSudahAda = BadgePengguna::where('user_id', $user->id)
            ->pluck('badge')
            ->all();

        $gabunganAktif = array_unique(array_merge($kodeSudahAda, $layak));
        if (count($gabunganAktif) >= 4) {
            $layak[] = 'warga_teladan';
        }

        $baru = [];
        foreach ($layak as $kode) {
            if (! in_array($kode, $kodeSudahAda, true)) {
                BadgePengguna::firstOrCreate(
                    ['user_id' => $user->id, 'badge' => $kode],
                    ['program_id' => null]
                );
                $baru[] = $kode;
            }
        }

        return $baru;
    }

    public function daftarAchievement(Pengguna $user): array
    {
        if ($user->role === 'user') {
            $this->evaluasiUntukUser($user);
        }

        $dimiliki = BadgePengguna::where('user_id', $user->id)
            ->get()
            ->keyBy('badge');

        $katalogKode = array_column(self::KATALOG, 'kode');
        $daftar = [];

        foreach (self::KATALOG as $item) {
            $row = $dimiliki->get($item['kode']);
            $daftar[] = $item + [
                'diraih' => $row !== null,
                'diraih_pada' => $row?->created_at?->toIso8601String(),
                'sumber' => 'keaktifan',
            ];
        }

        foreach ($dimiliki as $kode => $row) {
            if (in_array($kode, $katalogKode, true)) {
                continue;
            }
            $daftar[] = [
                'kode' => $kode,
                'nama' => ucwords(str_replace('_', ' ', $kode)),
                'deskripsi' => 'Lencana khusus dari penyelesaian tantangan kesehatan kelurahan.',
                'ikon' => 'award',
                'tier' => 'emas',
                'kategori' => 'program',
                'syarat' => 'Disetujui pada program tantangan terkait',
                'diraih' => true,
                'diraih_pada' => $row->created_at?->toIso8601String(),
                'sumber' => 'program',
            ];
        }

        $total = count($daftar);
        $jumlahDiraih = count(array_filter($daftar, fn ($d) => $d['diraih']));

        return [
            'ringkasan' => [
                'total' => $total,
                'diraih' => $jumlahDiraih,
                'persen' => $total > 0 ? (int) round(($jumlahDiraih / $total) * 100) : 0,
            ],
            'daftar' => $daftar,
        ];
    }
}
