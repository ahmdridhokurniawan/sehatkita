<?php

namespace App\Http\Controllers;

use App\Models\CatatanKesehatan;
use App\Models\Rujukan;
use App\Services\HealthCalculatorService;
use App\Services\PeringkatService;
use Carbon\Carbon;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        private HealthCalculatorService $kalkulator,
        private PeringkatService $peringkat
    ) {}

    /** Kolom pengukuran yang punya ambang & muncul di `indikator_terkini`. */
    private const KOLOM_INDIKATOR = [
        'bb_kg', 'sistol', 'diastol', 'gula_darah', 'kolesterol',
        'asam_urat', 'lingkar_perut', 'tidur_jam',
    ];

    // GET /api/v1/dashboard/pribadi — kontrak §8.1
    public function pribadi(Request $request)
    {
        $user   = $request->user();
        $profil = $user->profil;

        $periode  = $this->periodeSah($request->query('periode'));
        $tglMulai = now()->subMonths($this->bulanPeriode($periode));

        // Semua log sah user, terbaru dulu (outlier dilewati — §8.1).
        $semua = CatatanKesehatan::where('user_id', $user->id)
            ->where('perlu_verifikasi', false)
            ->orderBy('dicatat_pada', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        // `indikator_terkini` = log terbaru PER INDIKATOR (boleh beda tanggal).
        $terkini = [];
        foreach (self::KOLOM_INDIKATOR as $kolom) {
            $baris = $semua->firstWhere(fn ($c) => $c->{$kolom} !== null);

            if ($baris) {
                $terkini[$kolom] = $this->nilaiNumerik($baris->{$kolom});
            }
        }

        // Tinggi efektif: snapshot log terbaru yang punya tinggi, lalu profil.
        $tinggiTerakhir = $semua
            ->first(fn ($c) => $c->tinggi_cm !== null)?->tinggi_cm;

        $tinggiEfektif = $tinggiTerakhir !== null
            ? (float) $tinggiTerakhir
            : ($profil?->tinggi_cm !== null ? (float) $profil->tinggi_cm : null);

        // Baris sintetis berisi nilai terbaru tiap indikator → dipakai mesin hitung.
        $sintetis = new CatatanKesehatan($terkini + [
            'tinggi_cm' => $tinggiEfektif,
            'jenis_gula_darah' => $semua->first(fn ($c) => $c->gula_darah !== null)?->jenis_gula_darah,
        ]);

        $imt     = $this->kalkulator->hitungImt($terkini['bb_kg'] ?? null, $tinggiEfektif);
        $kJenisGula = $sintetis->jenis_gula_darah;

        $indikatorTerkini = $terkini === [] ? null : array_merge(
            [
                'bb_kg'     => $terkini['bb_kg'] ?? null,
                'tinggi_cm' => $tinggiEfektif,
                'imt'       => $imt,
                'kategori_imt' => $this->kalkulator->kategori('imt', $imt)['kategori'] ?? null,
            ],
            [
                'sistol'          => $terkini['sistol'] ?? null,
                'diastol'         => $terkini['diastol'] ?? null,
                'kategori_tensi'  => $this->kalkulator->kategoriTensi(
                    isset($terkini['sistol']) ? (int) $terkini['sistol'] : null,
                    isset($terkini['diastol']) ? (int) $terkini['diastol'] : null
                )['kategori'] ?? null,
                'gula_darah'      => $terkini['gula_darah'] ?? null,
                'kategori_gula_darah' => $this->kalkulator->kategori('gula_darah', $terkini['gula_darah'] ?? null, $kJenisGula)['kategori'] ?? null,
                'kolesterol'      => $terkini['kolesterol'] ?? null,
                'kategori_kolesterol' => $this->kalkulator->kategori('kolesterol', $terkini['kolesterol'] ?? null)['kategori'] ?? null,
                'asam_urat'       => $terkini['asam_urat'] ?? null,
                'kategori_asam_urat'  => $this->kalkulator->kategori('asam_urat', $terkini['asam_urat'] ?? null)['kategori'] ?? null,
                'lingkar_perut'   => $terkini['lingkar_perut'] ?? null,
                // Tanggal & sumber = log terbaru yang punya salah satu ukuran.
                'dicatat_pada'    => $semua->first(fn ($c) => $this->punyaUkuran($c))?->dicatat_pada?->toDateString(),
                'sumber'          => $semua->first(fn ($c) => $this->punyaUkuran($c))?->sumber,
            ]
        );

        $target = $this->blokTarget($profil, $terkini['bb_kg'] ?? null);

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => [
                'status_kesehatan'   => $this->kalkulator->statusKesehatan($sintetis),
                'skor_risiko'        => $this->kalkulator->skorRisiko($sintetis),
                'profil_lengkap'     => $profil !== null
                    && $profil->tinggi_cm !== null
                    && $profil->tgl_lahir !== null
                    && $profil->jenis_kelamin !== null,
                'indikator_terkini'  => $indikatorTerkini,
                'perbandingan'       => $this->perbandingan($semua),
                'target'             => $target,
                'gamifikasi'         => $this->blokGamifikasi($user),
                'jadwal_skrining_berikutnya' => $this->jadwalSkrining($semua, $tinggiEfektif),
                'rujukan_aktif'      => $this->rujukanAktif($user),
            ],
        ]);
    }

    // GET /api/v1/laporan/pribadi — kontrak §14.1
    public function laporanPribadi(Request $request)
    {
        $user    = $request->user();
        $profil  = $user->profil;
        $periode = $this->periodeSah($request->query('periode'));
        $tglMulai = now()->subMonths($this->bulanPeriode($periode));

        $catatan = CatatanKesehatan::where('user_id', $user->id)
            ->where('dicatat_pada', '>=', $tglMulai)
            ->where('perlu_verifikasi', false)
            ->orderBy('dicatat_pada', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        // Ringkasan memakai log terbaru per indikator (konsisten dengan §8.1).
        $semua = CatatanKesehatan::where('user_id', $user->id)
            ->where('perlu_verifikasi', false)
            ->orderBy('dicatat_pada', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        $terkini = [];
        foreach (self::KOLOM_INDIKATOR as $kolom) {
            $baris = $semua->firstWhere(fn ($c) => $c->{$kolom} !== null);
            if ($baris) {
                $terkini[$kolom] = $this->nilaiNumerik($baris->{$kolom});
            }
        }

        $tinggiEfektif = $semua->first(fn ($c) => $c->tinggi_cm !== null)?->tinggi_cm;
        $tinggiEfektif = $tinggiEfektif !== null
            ? (float) $tinggiEfektif
            : ($profil?->tinggi_cm !== null ? (float) $profil->tinggi_cm : null);

        $sintetis = new CatatanKesehatan($terkini + [
            'tinggi_cm' => $tinggiEfektif,
            'jenis_gula_darah' => $semua->first(fn ($c) => $c->gula_darah !== null)?->jenis_gula_darah,
        ]);

        $rujukan = Rujukan::with('faskes')
            ->where('user_id', $user->id)
            ->where('created_at', '>=', $tglMulai)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($r) => [
                'tanggal' => $r->created_at->toDateString(),
                'faskes'  => $r->faskes?->nama ?? '-',
                'status'  => $r->status,
            ]);

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => [
                'periode' => $periode,
                'user'    => [
                    'name'          => $user->name,
                    'usia'          => $profil?->tgl_lahir ? Carbon::parse($profil->tgl_lahir)->age : null,
                    'jenis_kelamin' => $profil?->jenis_kelamin,
                ],
                'ringkasan' => [
                    'status_kesehatan' => $this->kalkulator->statusKesehatan($sintetis),
                    'skor_risiko'      => $this->kalkulator->skorRisiko($sintetis),
                    'total_pencatatan' => $catatan->count(),
                ],
                'catatan' => $catatan->map(fn ($c) => [
                    'dicatat_pada' => $c->dicatat_pada->toDateString(),
                    'sumber'       => $c->sumber,
                    'bb_kg'        => $c->bb_kg === null ? null : (float) $c->bb_kg,
                    'imt'          => $c->imt,
                    'sistol'       => $c->sistol === null ? null : (int) $c->sistol,
                    'diastol'      => $c->diastol === null ? null : (int) $c->diastol,
                ])->values(),
                'rujukan'    => $rujukan,
                'disclaimer' => 'Sistem ini bukan alat diagnosis medis. Konsultasikan hasil dengan tenaga kesehatan.',
            ],
        ]);
    }

    /*
    |------------------------------------------------------------------
    | Helper
    |------------------------------------------------------------------
    */

    private function periodeSah(?string $periode): string
    {
        return in_array($periode, ['1m', '3m', '6m', '1y'], true) ? $periode : '3m';
    }

    private function bulanPeriode(string $periode): int
    {
        return match ($periode) {
            '1m' => 1,
            '6m' => 6,
            '1y' => 12,
            default => 3,
        };
    }

    private function nilaiNumerik($nilai): ?float
    {
        return $nilai === null ? null : (float) $nilai;
    }

    /** Ada minimal satu pengukuran di baris ini (bukan hanya catatan kosong)? */
    private function punyaUkuran(CatatanKesehatan $c): bool
    {
        foreach (self::KOLOM_INDIKATOR as $kolom) {
            if ($c->{$kolom} !== null) {
                return true;
            }
        }

        return false;
    }

    /** `perbandingan`: nilai log terakhir bulan ini − bulan lalu (§8.1). */
    private function perbandingan($semua): array
    {
        $sekarang = now();
        $ini      = $semua->first(fn ($c) => $c->dicatat_pada->isSameMonth($sekarang));
        $lalu     = $semua->first(fn ($c) => $c->dicatat_pada->isSameMonth($sekarang->copy()->subMonth()));

        $selisih = fn (string $kolom, int $desimal = 2) => ($ini && $lalu && $ini->{$kolom} !== null && $lalu->{$kolom} !== null)
            ? round((float) $ini->{$kolom} - (float) $lalu->{$kolom}, $desimal)
            : null;

        $imtIni  = $ini ? $this->kalkulator->hitungImt($ini->bb_kg, $ini->tinggi_cm) : null;
        $imtLalu = $lalu ? $this->kalkulator->hitungImt($lalu->bb_kg, $lalu->tinggi_cm) : null;

        return [
            'periode_ini'   => $ini?->dicatat_pada->format('Y-m'),
            'periode_lalu'  => $lalu?->dicatat_pada->format('Y-m'),
            'bb_selisih_kg' => $selisih('bb_kg'),
            'imt_selisih'   => ($imtIni !== null && $imtLalu !== null) ? round($imtIni - $imtLalu, 2) : null,
            'sistol_selisih' => $selisih('sistol', 0),
        ];
    }

    /** Blok `target` §8.1/§13.1. */
    private function blokTarget($profil, ?float $bbTerkini): array
    {
        $awal   = $profil?->bb_awal_kg !== null ? (float) $profil->bb_awal_kg : null;
        $target = $profil?->bb_target_kg !== null ? (float) $profil->bb_target_kg : null;

        $progress = null;
        if ($awal !== null && $target !== null && $bbTerkini !== null && $awal !== $target) {
            $progress = ($awal - $bbTerkini) / ($awal - $target) * 100;
            $progress = (int) max(0, min(100, round($progress)));
        }

        return [
            'bb_target_kg'     => $target,
            'bb_awal_kg'       => $awal,
            'progress_persen'  => $progress,
        ];
    }

    /** Blok `gamifikasi` §8.1/§12.5. */
    private function blokGamifikasi($user): array
    {
        return [
            'exp_total'        => (int) $user->exp_total,
            'level_gamifikasi' => (int) $user->level_gamifikasi,
            'badge'            => $user->badge()->pluck('badge')->values(),
            'rank_kelurahan'   => $this->peringkat->rankUser($user),
        ];
    }

    /**
     * `jadwal_skrining_berikutnya` §8.1: tanggal log terakhir +
     * `indikator.interval_skrining_hari` (default 30).
     */
    private function jadwalSkrining($semua, ?float $tinggiEfektif): array
    {
        $interval = \App\Models\Indikator::pluck('interval_skrining_hari', 'kode');
        $hasil    = [];

        foreach (self::KOLOM_INDIKATOR as $kolom) {
            $baris = $semua->firstWhere(fn ($c) => $c->{$kolom} !== null);

            if (! $baris) {
                continue;
            }

            $hari      = (int) ($interval[$kolom] ?? 30);
            $jatuhTempo = $baris->dicatat_pada->copy()->addDays($hari);

            $hasil[] = [
                'indikator'   => $kolom,
                'jatuh_tempo' => $jatuhTempo->toDateString(),
                'status'      => $jatuhTempo->isPast() ? 'terlambat' : 'akan_datang',
            ];
        }

        // Yang paling dekat lebih dulu.
        usort($hasil, fn ($a, $b) => strcmp($a['jatuh_tempo'], $b['jatuh_tempo']));

        return $hasil;
    }

    /** `rujukan_aktif` §8.1: rujukan berstatus baru/dihubungi, terbaru. */
    private function rujukanAktif($user): ?array
    {
        $r = Rujukan::with('faskes')
            ->where('user_id', $user->id)
            ->whereIn('status', ['baru', 'dihubungi'])
            ->orderBy('created_at', 'desc')
            ->first();

        if (! $r) {
            return null;
        }

        return [
            'id'       => $r->id,
            'faskes'   => $r->faskes?->nama,
            'status'   => $r->status,
            'alasan'   => $r->alasan,
            'tanggal'  => $r->created_at->toDateString(),
        ];
    }
}
