<?php

namespace App\Http\Controllers;

use App\Models\CatatanKesehatan;
use App\Models\Indikator;
use App\Models\Rujukan;
use App\Services\BadgeKeaktifanService;
use App\Services\HealthCalculatorService;
use App\Services\PeringkatService;
use Carbon\Carbon;
use Illuminate\Http\Request;

// Menyajikan ringkasan kondisi kesehatan dan laporan pribadi untuk halaman utama warga.
class DashboardController extends Controller
{
    public function __construct(
        private HealthCalculatorService $kalkulator,
        private PeringkatService $peringkat,
        private BadgeKeaktifanService $badges
    ) {}

    private const KOLOM_INDIKATOR = [
        'bb_kg', 'sistol', 'diastol', 'gula_darah', 'kolesterol',
        'asam_urat', 'lingkar_perut', 'tidur_jam',
    ];

    public function pribadi(Request $request)
    {
        $user = $request->user();

        $this->wajibPeran($user, ['user'], 'Hanya warga yang memiliki dashboard pribadi.');
        $profil = $user->profil;

        [, $tglMulai] = $this->parsePeriode($request->query('periode'));

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

        $tinggiTerakhir = $semua
            ->first(fn ($c) => $c->tinggi_cm !== null)?->tinggi_cm;

        $tinggiEfektif = $tinggiTerakhir !== null
            ? (float) $tinggiTerakhir
            : ($profil?->tinggi_cm !== null ? (float) $profil->tinggi_cm : null);

        $sintetis = new CatatanKesehatan($terkini + [
            'tinggi_cm' => $tinggiEfektif,
            'jenis_gula_darah' => $semua->first(fn ($c) => $c->gula_darah !== null)?->jenis_gula_darah,
        ]);

        $imt = $this->kalkulator->hitungImt($terkini['bb_kg'] ?? null, $tinggiEfektif);
        $kJenisGula = $sintetis->jenis_gula_darah;

        $indikatorTerkini = $terkini === [] ? null : array_merge(
            [
                'bb_kg' => $terkini['bb_kg'] ?? null,
                'tinggi_cm' => $tinggiEfektif,
                'imt' => $imt,
                'kategori_imt' => $this->kalkulator->kategori('imt', $imt)['kategori'] ?? null,
            ],
            [
                'sistol' => $terkini['sistol'] ?? null,
                'diastol' => $terkini['diastol'] ?? null,
                'kategori_tensi' => $this->kalkulator->kategoriTensi(
                    isset($terkini['sistol']) ? (int) $terkini['sistol'] : null,
                    isset($terkini['diastol']) ? (int) $terkini['diastol'] : null
                )['kategori'] ?? null,
                'gula_darah' => $terkini['gula_darah'] ?? null,
                'jenis_gula_darah' => $kJenisGula,
                'kategori_gula_darah' => $this->kalkulator->kategori('gula_darah', $terkini['gula_darah'] ?? null, $kJenisGula)['kategori'] ?? null,
                'kolesterol' => $terkini['kolesterol'] ?? null,
                'kategori_kolesterol' => $this->kalkulator->kategori('kolesterol', $terkini['kolesterol'] ?? null)['kategori'] ?? null,
                'asam_urat' => $terkini['asam_urat'] ?? null,
                'kategori_asam_urat' => $this->kalkulator->kategori('asam_urat', $terkini['asam_urat'] ?? null)['kategori'] ?? null,
                'lingkar_perut' => $terkini['lingkar_perut'] ?? null,
                'dicatat_pada' => $semua->first(fn ($c) => $this->punyaUkuran($c))?->dicatat_pada?->toDateString(),
                'sumber' => $semua->first(fn ($c) => $this->punyaUkuran($c))?->sumber,
            ]
        );

        $target = $this->blokTarget($profil, $terkini['bb_kg'] ?? null);

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data' => [
                'status_kesehatan' => $this->kalkulator->statusKesehatan($sintetis),
                'skor_risiko' => $this->kalkulator->skorRisiko($sintetis),
                'profil_lengkap' => $profil !== null
                    && $profil->tinggi_cm !== null
                    && $profil->tgl_lahir !== null
                    && $profil->jenis_kelamin !== null,
                'indikator_terkini' => $indikatorTerkini,
                'perbandingan' => $this->perbandingan($semua, $tinggiEfektif),
                'target' => $target,
                'gamifikasi' => $this->blokGamifikasi($user),
                'jadwal_skrining_berikutnya' => $this->jadwalSkrining($semua),
                'rujukan_aktif' => $this->rujukanAktif($user),
            ],
        ]);
    }

    public function laporanPribadi(Request $request)
    {
        $user = $request->user();

        $this->wajibPeran($user, ['user'], 'Hanya warga yang memiliki laporan pribadi.');
        $profil = $user->profil;
        [$periode, $tglMulai] = $this->parsePeriode($request->query('periode'));

        $catatan = CatatanKesehatan::where('user_id', $user->id)
            ->where('dicatat_pada', '>=', $tglMulai)
            ->where('perlu_verifikasi', false)
            ->orderBy('dicatat_pada', 'desc')
            ->orderBy('id', 'desc')
            ->get();

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
                'faskes' => $r->faskes?->nama ?? '-',
                'status' => $r->status,
            ]);

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data' => [
                'periode' => $periode,
                'user' => [
                    'name' => $user->name,
                    'usia' => $profil?->tgl_lahir ? Carbon::parse($profil->tgl_lahir)->age : null,
                    'jenis_kelamin' => $profil?->jenis_kelamin,
                ],
                'ringkasan' => [
                    'status_kesehatan' => $this->kalkulator->statusKesehatan($sintetis),
                    'skor_risiko' => $this->kalkulator->skorRisiko($sintetis),
                    'total_pencatatan' => $catatan->count(),
                ],
                'catatan' => $catatan->map(fn ($c) => [
                    'dicatat_pada' => $c->dicatat_pada->toDateString(),
                    'sumber' => $c->sumber,
                    'bb_kg' => $c->bb_kg === null ? null : (float) $c->bb_kg,
                    'imt' => $c->imt,
                    'sistol' => $c->sistol === null ? null : (int) $c->sistol,
                    'diastol' => $c->diastol === null ? null : (int) $c->diastol,
                ])->values(),
                'rujukan' => $rujukan,
                'disclaimer' => 'Sistem ini bukan alat diagnosis medis. Konsultasikan hasil dengan tenaga kesehatan.',
            ],
        ]);
    }

    private function nilaiNumerik($nilai): ?float
    {
        return $nilai === null ? null : (float) $nilai;
    }

    private function punyaUkuran(CatatanKesehatan $c): bool
    {
        foreach (self::KOLOM_INDIKATOR as $kolom) {
            if ($c->{$kolom} !== null) {
                return true;
            }
        }

        return false;
    }

    private function perbandingan($semua, ?float $tinggiEfektif): array
    {
        $sekarang = now();
        $bulanLalu = $sekarang->copy()->subMonthNoOverflow();

        $catatanIni = $semua->filter(fn ($c) => $c->dicatat_pada && $c->dicatat_pada->isSameMonth($sekarang));
        $catatanLalu = $semua->filter(fn ($c) => $c->dicatat_pada && $c->dicatat_pada->isSameMonth($bulanLalu));

        $iniBb = $catatanIni->first(fn ($c) => $c->bb_kg !== null);
        $laluBb = $catatanLalu->first(fn ($c) => $c->bb_kg !== null);
        $iniSis = $catatanIni->first(fn ($c) => $c->sistol !== null);
        $laluSis = $catatanLalu->first(fn ($c) => $c->sistol !== null);

        $imtIni = $iniBb ? $this->kalkulator->hitungImt((float) $iniBb->bb_kg, $iniBb->tinggi_cm !== null ? (float) $iniBb->tinggi_cm : $tinggiEfektif) : null;
        $imtLalu = $laluBb ? $this->kalkulator->hitungImt((float) $laluBb->bb_kg, $laluBb->tinggi_cm !== null ? (float) $laluBb->tinggi_cm : $tinggiEfektif) : null;

        return [
            'periode_ini' => $catatanIni->first()?->dicatat_pada?->format('Y-m'),
            'periode_lalu' => $catatanLalu->first()?->dicatat_pada?->format('Y-m'),
            'bb_selisih_kg' => ($iniBb && $laluBb) ? round((float) $iniBb->bb_kg - (float) $laluBb->bb_kg, 2) : null,
            'imt_selisih' => ($imtIni !== null && $imtLalu !== null) ? round($imtIni - $imtLalu, 2) : null,
            'sistol_selisih' => ($iniSis && $laluSis) ? (int) $iniSis->sistol - (int) $laluSis->sistol : null,
        ];
    }

    private function blokTarget($profil, ?float $bbTerkini): array
    {
        $awal = $profil?->bb_awal_kg !== null ? (float) $profil->bb_awal_kg : null;
        $target = $profil?->bb_target_kg !== null ? (float) $profil->bb_target_kg : null;

        $progress = null;
        if ($awal !== null && $target !== null && $bbTerkini !== null && $awal !== $target) {
            $progress = ($awal - $bbTerkini) / ($awal - $target) * 100;
            $progress = (int) max(0, min(100, round($progress)));
        }

        return [
            'bb_target_kg' => $target,
            'bb_awal_kg' => $awal,
            'progress_persen' => $progress,
        ];
    }

    private function blokGamifikasi($user): array
    {
        $achievement = $this->badges->daftarAchievement($user);

        return [
            'exp_total' => (int) $user->exp_total,
            'level_gamifikasi' => (int) $user->level_gamifikasi,
            'badge' => $user->badge()->pluck('badge')->values(),
            'rank_kelurahan' => $this->peringkat->rankUser($user),
            'achievement' => $achievement,
        ];
    }

    private function jadwalSkrining($semua): array
    {
        $interval = Indikator::pluck('interval_skrining_hari', 'kode');
        $hasil = [];

        foreach (self::KOLOM_INDIKATOR as $kolom) {
            $baris = $semua->firstWhere(fn ($c) => $c->{$kolom} !== null);

            if (! $baris) {
                continue;
            }

            $hari = (int) ($interval[$kolom] ?? 30);
            $jatuhTempo = $baris->dicatat_pada->copy()->addDays($hari);

            $hasil[] = [
                'indikator' => $kolom,
                'jatuh_tempo' => $jatuhTempo->toDateString(),
                'status' => $jatuhTempo->isPast() ? 'terlambat' : 'akan_datang',
            ];
        }

        usort($hasil, fn ($a, $b) => strcmp($a['jatuh_tempo'], $b['jatuh_tempo']));

        return $hasil;
    }

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
            'id' => $r->id,
            'faskes' => $r->faskes ? ['id' => $r->faskes->id, 'nama' => $r->faskes->nama] : null,
            'status' => $r->status,
            'alasan' => $r->alasan,
            'tanggal' => $r->created_at->toDateString(),
            'created_at' => $r->created_at->toIso8601String(),
        ];
    }
}
