<?php

namespace App\Http\Controllers;

use App\Models\CatatanKesehatan;
use App\Models\Rujukan;
use App\Services\HealthCalculatorService;
use App\Services\InsightService; // <-- Layanan pembuat notifikasi/insight otomatis
use Illuminate\Http\Request;

/**
 * Dashboard pribadi - kontrak 8.1.
 */
class DashboardController extends Controller
{
    private const INTERVAL_SKRINING_BULAN = 6;
    private const INDIKATOR_SKRINING      = ['gula_darah', 'kolesterol', 'asam_urat'];

    // === BELAJAR: Dependency Injection (DI) ===
    // Laravel otomatis memasukkan (inject) 2 service ini saat controller dipanggil.
    public function __construct(
        private HealthCalculatorService $kalkulator,
        private InsightService $insightService // Service untuk menghitung peringatan/notifikasi
    ) {}

    /** GET /dashboard/pribadi */
    public function pribadi(Request $request)
    {
        $user   = $request->user();
        $profil = $user->profil;

        // Ambil seluruh riwayat catatan kesehatan user
        $catatan = $user->catatanKesehatan()
            ->orderBy('dicatat_pada')
            ->orderBy('id')
            ->with('pengguna.profil')
            ->get();

        $terbaru = $catatan->last();

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => [
                'status_kesehatan'           => $terbaru ? $this->kalkulator->statusKesehatan($terbaru) : 'normal',
                'skor_risiko'                => $terbaru ? $this->kalkulator->skorRisiko($terbaru) : 0,
                'indikator_terkini'          => $this->indikatorTerkini($catatan, $profil, $terbaru),
                'perbandingan'               => $this->perbandingan($catatan, $profil),
                'target'                     => $this->target($catatan, $profil),
                'jadwal_skrining_berikutnya' => $this->jadwalSkrining($catatan),
                'rujukan_aktif'              => $this->rujukanAktif($user->id),
                
                // === BELAJAR: Memanggil Service Lain ===
                // Kontrak §31: Memanggil InsightService untuk menghasilkan 
                // daftar peringatan/notifikasi penting secara otomatis bagi user ini.
                'next_notifications'         => $this->insightService->untukUser($user),
            ],
        ]);
    }

    private function indikatorTerkini($catatan, $profil, ?CatatanKesehatan $terbaru): array
    {
        $tinggi  = $profil?->tinggi_cm === null ? null : (float) $profil->tinggi_cm;
        $bb      = $this->nilaiTerakhir($catatan, 'bb_kg');
        $sistol  = $this->nilaiTerakhir($catatan, 'sistol');
        $diastol = $this->nilaiTerakhir($catatan, 'diastol');

        $sistolInt  = $sistol === null ? null : (int) $sistol;
        $diastolInt = $diastol === null ? null : (int) $diastol;

        $imt = $this->kalkulator->hitungImt($bb, $tinggi);

        return [
            'bb_kg'          => $bb,
            'tinggi_cm'      => $tinggi,
            'imt'            => $imt,
            'kategori_imt'   => $this->kalkulator->kategori('imt', $imt)['kategori'] ?? null,
            'sistol'         => $sistolInt,
            'diastol'        => $diastolInt,
            'kategori_tensi' => $this->kalkulator->kategoriTensi($sistolInt, $diastolInt)['status'] ?? null,
            'gula_darah'     => $this->bulatDesimal($this->nilaiTerakhir($catatan, 'gula_darah')),
            'kolesterol'     => $this->bulatDesimal($this->nilaiTerakhir($catatan, 'kolesterol')),
            'asam_urat'      => $this->nilaiTerakhir($catatan, 'asam_urat'),
            'lingkar_perut'  => $this->nilaiTerakhir($catatan, 'lingkar_perut'),
            'dicatat_pada'   => $terbaru?->dicatat_pada?->toDateString(),
            'sumber'         => $terbaru?->sumber,
        ];
    }

    private function nilaiTerakhir($catatan, string $kolom): ?float
    {
        $baris = $catatan->filter(fn ($c) => $c->{$kolom} !== null)->last();
        return $baris === null ? null : (float) $baris->{$kolom};
    }

    private function nilaiPertama($catatan, string $kolom): ?float
    {
        $baris = $catatan->filter(fn ($c) => $c->{$kolom} !== null)->first();
        return $baris === null ? null : (float) $baris->{$kolom};
    }

    private function perbandingan($catatan, $profil): array
    {
        $ini  = now();
        $lalu = now()->subMonthNoOverflow();

        $bulanIni  = $catatan->filter(fn ($c) => $c->dicatat_pada->isSameMonth($ini));
        $bulanLalu = $catatan->filter(fn ($c) => $c->dicatat_pada->isSameMonth($lalu));

        $tinggi = $profil?->tinggi_cm === null ? null : (float) $profil->tinggi_cm;

        $bbIni  = $this->rata($bulanIni, 'bb_kg');
        $bbLalu = $this->rata($bulanLalu, 'bb_kg');

        return [
            'periode_ini'    => $ini->format('Y-m'),
            'periode_lalu'   => $lalu->format('Y-m'),
            'bb_selisih_kg'  => $this->selisih($bbIni, $bbLalu, 1),
            'imt_selisih'    => $this->selisih(
                $this->kalkulator->hitungImt($bbIni, $tinggi),
                $this->kalkulator->hitungImt($bbLalu, $tinggi),
                2
            ),
            'sistol_selisih' => $this->selisih($this->rata($bulanIni, 'sistol'), $this->rata($bulanLalu, 'sistol'), 0),
        ];
    }

    private function rata($baris, string $kolom): ?float
    {
        $nilai = $baris->pluck($kolom)->filter(fn ($v) => $v !== null)->map(fn ($v) => (float) $v);
        return $nilai->isEmpty() ? null : round($nilai->avg(), 2);
    }

    private function selisih(?float $ini, ?float $lalu, int $desimal): ?float
    {
        if ($ini === null || $lalu === null) return null;
        return round($ini - $lalu, $desimal);
    }

    private function target($catatan, $profil): array
    {
        $bbTarget = $profil?->bb_target_kg === null ? null : (float) $profil->bb_target_kg;
        $bbAwal   = $this->nilaiPertama($catatan, 'bb_kg');
        $bbKini   = $this->nilaiTerakhir($catatan, 'bb_kg');
        $progress = null;

        if ($bbTarget !== null && $bbAwal !== null && $bbKini !== null) {
            if ($bbKini <= $bbTarget) {
                $progress = 100;
            } elseif ($bbAwal > $bbTarget) {
                $raw = ($bbAwal - $bbKini) / ($bbAwal - $bbTarget) * 100;
                $progress = max(0, min(100, (int) round($raw)));
            } else {
                $progress = 0;
            }
        }

        return [
            'bb_target_kg'    => $bbTarget,
            'progress_persen' => $progress,
        ];
    }

    private function jadwalSkrining($catatan): array
    {
        $jadwal = [];
        foreach (self::INDIKATOR_SKRINING as $kode) {
            $baris = $catatan->filter(fn ($c) => $c->{$kode} !== null)->last();
            if ($baris === null) continue;

            $jatuhTempo = $baris->dicatat_pada->copy()->addMonths(self::INTERVAL_SKRINING_BULAN);
            $jadwal[] = [
                'indikator'   => $kode,
                'jatuh_tempo' => $jatuhTempo->toDateString(),
                'status'      => $jatuhTempo->isPast() ? 'terlewat' : 'akan_datang',
            ];
        }
        return $jadwal;
    }

    private function rujukanAktif(int $userId): ?array
    {
        $rujukan = Rujukan::with('faskes')
            ->where('user_id', $userId)
            ->whereIn('status', ['baru', 'dihubungi'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($r) => [
                'id'     => $r->id,
                'faskes' => $r->faskes?->nama,
                'alasan' => $r->alasan,
                'status' => $r->status,
            ])
            ->values()
            ->all();

        return $rujukan === [] ? null : $rujukan;
    }

    private function bulatDesimal(?float $nilai): ?float
    {
        return $nilai === null ? null : round($nilai, 1);
    }
}