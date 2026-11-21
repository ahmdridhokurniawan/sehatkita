<?php

namespace App\Services;

use App\Models\CatatanKesehatan;
use App\Models\Pengguna;
use Carbon\Carbon;

// Membuat pesan peringatan dini dan saran kesehatan berdasarkan riwayat pemeriksaan warga.
class InsightService
{
    public function __construct(
        private HealthCalculatorService $kalkulator
    ) {}

    public function untukUser(Pengguna $user): array
    {
        $catatan = $user->catatanKesehatan()
            ->where('perlu_verifikasi', false)
            ->orderBy('dicatat_pada')
            ->orderBy('id')
            ->get();

        if ($catatan->isEmpty()) {
            return [[
                'kode' => 'BELUM_CATAT',
                'level' => 'info',
                'teks' => 'Anda belum mencatat data kesehatan. Mulai catat berat badan hari ini.',
                'dibuat_pada' => now()->toIso8601String(),
            ]];
        }

        $insight = [];

        $insight = array_merge($insight, $this->bbNaik($catatan));
        $insight = array_merge($insight, $this->tensiTinggi($catatan));
        $insight = array_merge($insight, $this->statusBerisiko($catatan->last()));
        $insight = array_merge($insight, $this->belumSkriningGula($catatan));
        $insight = array_merge($insight, $this->belomCatat($catatan->last()));

        $urutan = ['bahaya' => 0, 'peringatan' => 1, 'info' => 2];
        usort($insight, fn ($a, $b) => $urutan[$a['level']] <=> $urutan[$b['level']]);

        return $insight;
    }

    private function bbNaik($catatan): array
    {
        $bb = $catatan->filter(fn ($c) => $c->bb_kg !== null)->take(-3)->values();

        if ($bb->count() < 3) {
            return [];
        }

        if ((float) $bb[0]->bb_kg < (float) $bb[1]->bb_kg
            && (float) $bb[1]->bb_kg < (float) $bb[2]->bb_kg) {
            $selisih = round((float) $bb[2]->bb_kg - (float) $bb[0]->bb_kg, 1);

            return [[
                'kode' => 'BB_NAIK_3KALI',
                'level' => 'peringatan',
                'teks' => "Berat badan naik {$selisih} kg dalam 3 pencatatan terakhir. Perhatikan pola makan dan aktivitas.",
                'dibuat_pada' => now()->toIso8601String(),
            ]];
        }

        return [];
    }

    private function tensiTinggi($catatan): array
    {
        $duaTerakhir = $catatan->filter(fn ($c) => $c->sistol !== null || $c->diastol !== null)->take(-2);

        if ($duaTerakhir->count() < 2) {
            return [];
        }

        $duaBerisiko = $duaTerakhir->every(function ($c) {
            $hasil = $this->kalkulator->kategoriTensi($c->sistol, $c->diastol);

            return $hasil && $hasil['status'] !== 'normal';
        });

        if ($duaBerisiko) {
            return [[
                'kode' => 'TENSI_TINGGI_2KALI',
                'level' => 'peringatan',
                'teks' => 'Tekanan darah di atas batas normal pada 2 pencatatan terakhir. Kurangi garam dan periksa ke petugas kesehatan.',
                'dibuat_pada' => now()->toIso8601String(),
            ]];
        }

        return [];
    }

    private function statusBerisiko(?CatatanKesehatan $terakhir): array
    {
        if ($terakhir === null) {
            return [];
        }

        if ($this->kalkulator->statusKesehatan($terakhir) !== 'berisiko') {
            return [];
        }

        return [[
            'kode' => 'STATUS_BERISIKO',
            'level' => 'bahaya',
            'teks' => 'Hasil pemeriksaan terakhir Anda menunjukkan risiko tinggi. Segera periksa ke fasilitas kesehatan terdekat.',
            'dibuat_pada' => now()->toIso8601String(),
        ]];
    }

    private function belumSkriningGula($catatan): array
    {
        $gulaTerakhir = $catatan->filter(fn ($c) => $c->gula_darah !== null)->last();

        if ($gulaTerakhir === null) {
            return [[
                'kode' => 'BELUM_SKRINING_GULA',
                'level' => 'info',
                'teks' => 'Anda belum pernah mencatat gula darah. Jadwalkan pemeriksaan gula darah.',
                'dibuat_pada' => now()->toIso8601String(),
            ]];
        }

        $bulan = (int) floor(Carbon::parse($gulaTerakhir->dicatat_pada)->diffInMonths(now()));

        if ($bulan >= 6) {
            return [[
                'kode' => 'BELUM_SKRINING_GULA',
                'level' => 'info',
                'teks' => "Anda belum melakukan skrining gula darah selama {$bulan} bulan. Jadwalkan pemeriksaan.",
                'dibuat_pada' => now()->toIso8601String(),
            ]];
        }

        return [];
    }

    private function belomCatat(?CatatanKesehatan $terakhir): array
    {
        if ($terakhir === null) {
            return [];
        }

        $hari = (int) floor(Carbon::parse($terakhir->dicatat_pada)->diffInDays(now()));

        if ($hari >= 5) {
            return [[
                'kode' => 'BELUM_CATAT_5HARI',
                'level' => 'info',
                'teks' => "Anda belum mencatat data kesehatan selama {$hari} hari. Catat berat badan atau tekanan darah hari ini.",
                'dibuat_pada' => now()->toIso8601String(),
            ]];
        }

        return [];
    }
}
