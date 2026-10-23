<?php

namespace App\Services;

use App\Models\CatatanKesehatan;
use App\Models\Pengguna;
use Carbon\Carbon;

/**
 * ─────────────────────────────────────────────────────────────────────
 *  InsightService — insight berbasis aturan (if-then, BUKAN ML)
 *  Sesuai kontrak 8.3: array of { kode, level, teks, dibuat_pada }
 *  level: info | peringatan | bahaya
 * ─────────────────────────────────────────────────────────────────────
 */
class InsightService
{
    public function __construct(
        private HealthCalculatorService $kalkulator
    ) {}

    /**
     * Ambil semua insight untuk seorang user.
     *
     * @return array<int, array{kode: string, level: string, teks: string, dibuat_pada: string}>
     */
    public function untukUser(Pengguna $user): array
    {
        // Ambil seluruh catatan user, urut tanggal naik.
        // with('pengguna.profil') supaya accessor imt tidak N+1.
        $catatan = $user->catatanKesehatan()
            ->orderBy('dicatat_pada')
            ->get();

        // Belum pernah mencatat sama sekali → 1 insight info.
        if ($catatan->isEmpty()) {
            return [[
                'kode'        => 'BELUM_CATAT',
                'level'       => 'info',
                'teks'        => 'Anda belum mencatat data kesehatan. Mulai catat berat badan hari ini.',
                'dibuat_pada' => now()->toIso8601String(),
            ]];
        }

        $insight = [];

        // Aturan 1: berat badan naik 3 pencatatan berturut-turut.
        $insight = array_merge(
            $insight,
            $this->bbNaik($catatan)
        );

        // Aturan 2: tekanan darah di atas normal di 2 pencatatan terakhir.
        $insight = array_merge(
            $insight,
            $this->tensiTinggi($catatan)
        );

        // Aturan 3: status keseluruhan berisiko.
        $insight = array_merge(
            $insight,
            $this->statusBerisiko($catatan->last())
        );

        // Aturan 4: belum skrining gula darah dalam 6 bulan.
        $insight = array_merge(
            $insight,
            $this->belumSkriningGula($catatan)
        );

        // Aturan 5: belum catat data dalam 5 hari.
        $insight = array_merge(
            $insight,
            $this->belomCatat($catatan->last())
        );

        // Urut: bahaya dulu, lalu peringatan, lalu info (kontrak tak wajib,
        // tapi membantu FE memilih urutan tampil).
        $urutan = ['bahaya' => 0, 'peringatan' => 1, 'info' => 2];

        usort($insight, fn ($a, $b) => $urutan[$a['level']] <=> $urutan[$b['level']]);

        return $insight;
    }

    /*
    |-------------------------------------------------------------------
    | Aturan-aturan individual
    |-------------------------------------------------------------------
    */

    /**
     * Berat badan naik di 3 pencatatan terakhir yang punya bb_kg.
     */
    private function bbNaik($catatan): array
    {
        // Ambil 3 catatan terakhir yang punya berat badan.
        $bb = $catatan->filter(fn ($c) => $c->bb_kg !== null)->take(-3)->values();

        if ($bb->count() < 3) {
            return [];
        }

        // Strictly increasing: bb[0] < bb[1] < bb[2].
        if ((float) $bb[0]->bb_kg < (float) $bb[1]->bb_kg
            && (float) $bb[1]->bb_kg < (float) $bb[2]->bb_kg) {
            $selisih = round((float) $bb[2]->bb_kg - (float) $bb[0]->bb_kg, 1);

            return [[
                'kode'        => 'BB_NAIK_3KALI',
                'level'       => 'peringatan',
                'teks'        => "Berat badan naik {$selisih} kg dalam 3 pencatatan terakhir. Perhatikan pola makan dan aktivitas.",
                'dibuat_pada' => now()->toIso8601String(),
            ]];
        }

        return [];
    }

    /**
     * Tekanan darah di atas normal di 2 pencatatan terakhir.
     */
    private function tensiTinggi($catatan): array
    {
        $duaTerakhir = $catatan->filter(fn ($c) => $c->sistol !== null)->take(-2);

        if ($duaTerakhir->count() < 2) {
            return [];
        }

        // Cek keduanya statusnya lebih parah dari "normal".
        // Catatan: fn() hanya untuk 1 expression, kalau butuh blok pakai function(){}.
        $duaBerisiko = $duaTerakhir->every(function ($c) {
            $hasil = $this->kalkulator->kategori('sistol', $c->sistol);

            return $hasil && $hasil['status'] !== 'normal';
        });

        if ($duaBerisiko) {
            return [[
                'kode'        => 'TENSI_TINGGI_2KALI',
                'level'       => 'peringatan',
                'teks'        => 'Tekanan darah di atas batas normal pada 2 pencatatan terakhir. Kurangi garam dan periksa ke petugas kesehatan.',
                'dibuat_pada' => now()->toIso8601String(),
            ]];
        }

        return [];
    }

    /**
     * Catatan terbaru berstatus berisiko → anjuran ke faskes.
     */
    private function statusBerisiko(?CatatanKesehatan $terakhir): array
    {
        if ($terakhir === null) {
            return [];
        }

        if ($this->kalkulator->statusKesehatan($terakhir) !== 'berisiko') {
            return [];
        }

        return [[
            'kode'        => 'STATUS_BERISIKO',
            'level'       => 'bahaya',
            'teks'        => 'Hasil pemeriksaan terakhir Anda menunjukkan risiko tinggi. Segera periksa ke fasilitas kesehatan terdekat.',
            'dibuat_pada' => now()->toIso8601String(),
        ]];
    }

    /**
     * Belum ada catatan gula darah dalam 6 bulan terakhir.
     */
    private function belumSkriningGula($catatan): array
    {
        $gulaTerakhir = $catatan->filter(fn ($c) => $c->gula_darah !== null)->last();

        if ($gulaTerakhir === null) {
            // Pernah catat tapi tidak ada gula darah sama sekali.
            return [[
                'kode'        => 'BELUM_SKRINING_GULA',
                'level'       => 'info',
                'teks'        => 'Anda belum pernah mencatat gula darah. Jadwalkan pemeriksaan gula darah.',
                'dibuat_pada' => now()->toIso8601String(),
            ]];
        }

        $bulan = Carbon::parse($gulaTerakhir->dicatat_pada)->diffInMonths(now());

        if ($bulan >= 6) {
            return [[
                'kode'        => 'BELUM_SKRINING_GULA',
                'level'       => 'info',
                'teks'        => "Anda belum melakukan skrining gula darah selama {$bulan} bulan. Jadwalkan pemeriksaan.",
                'dibuat_pada' => now()->toIso8601String(),
            ]];
        }

        return [];
    }

    /**
     * Belum mencatat data apa pun dalam 5 hari.
     */
    private function belomCatat(?CatatanKesehatan $terakhir): array
    {
        if ($terakhir === null) {
            return [];
        }

        $hari = Carbon::parse($terakhir->dicatat_pada)->diffInDays(now());

        if ($hari >= 5) {
            return [[
                'kode'        => 'BELUM_CATAT_5HARI',
                'level'       => 'info',
                'teks'        => "Anda belum mencatat data kesehatan selama {$hari} hari. Catat berat badan atau tekanan darah hari ini.",
                'dibuat_pada' => now()->toIso8601String(),
            ]];
        }

        return [];
    }
}