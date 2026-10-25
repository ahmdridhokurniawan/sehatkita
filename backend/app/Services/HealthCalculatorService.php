<?php

namespace App\Services;

use App\Models\AmbangKategori;
use App\Models\CatatanKesehatan;
use Illuminate\Support\Facades\Cache;

/**
 * ─────────────────────────────────────────────────────────────────────
 *  HealthCalculatorService — mesin kalkulasi kesehatan
 * ─────────────────────────────────────────────────────────────────────
 *  Sumber kebenaran tunggal untuk:
 *    1. IMT
 *    2. Kategori tiap indikator (tabel ambang_kategori, kontrak §8.3)
 *    3. Status kesehatan + skor risiko (formula definitif kontrak §8.1)
 *    4. Flag perlu_verifikasi (kontrak §7.2)
 *
 *  Aturan rentang: [batas_min, batas_max) — bawah termasuk, atas TIDAK.
 *  Gula darah punya dua set ambang (puasa / 2jam_pp).
 */
class HealthCalculatorService
{
    /**
     * Skor maksimum per indikator (kontrak §8.1) untuk normalisasi skor_risiko.
     * Tensi memakai kategori yang lebih berat dari sistol/diastol → maks 3.
     */
    public const SKOR_MAKS = [
        'imt'         => 2,
        'tensi'       => 3,
        'gula_darah'  => 2,
        'kolesterol'  => 2,
        'asam_urat'   => 2,
    ];

    /** Urutan keparahan kategori tensi (kontrak §1.5). */
    private const URUTAN_KATEGORI = [
        'normal'          => 0,
        'perlu_perhatian' => 1,
        'tinggi'          => 2,
        'krisis'          => 3,
    ];

    /*
    |-------------------------------------------------------------------
    | 1. Ambang batas (dari DB, di-cache)
    |-------------------------------------------------------------------
    */

    /**
     * Ambil daftar ambang untuk 1 kode indikator.
     * $jenisGula hanya dipakai untuk kode `gula_darah` (puasa | 2jam_pp).
     */
    public function ambang(string $kode, ?string $jenisGula = null): array
    {
        $semua = Cache::remember('ambang_kategori:semua', now()->addHour(), function () {
            return AmbangKategori::with('indikator')
                ->orderBy('indikator_id')
                ->orderBy('batas_min')
                ->get()
                ->groupBy(fn ($a) => $a->indikator->kode.'|'.($a->jenis_gula_darah ?? ''))
                ->map(fn ($baris) => $baris->map(fn ($a) => [
                    'batas_min'      => (float) $a->batas_min,
                    'batas_max'      => $a->batas_max === null ? null : (float) $a->batas_max,
                    'kategori'       => $a->kategori,
                    'status'         => $a->status,
                    'skor'           => (int) $a->skor,
                    'memicu_rujukan' => (bool) $a->memicu_rujukan,
                ])->toArray())
                ->toArray();
        });

        $kunci = $kode.'|'.($kode === 'gula_darah' ? ($jenisGula ?? 'puasa') : '');

        return $semua[$kunci] ?? [];
    }

    /** Bersihkan cache ambang (dipanggil admin setelah ubah master data). */
    public function lupakanCache(): void
    {
        Cache::forget('ambang_kategori:semua');
    }

    /*
    |-------------------------------------------------------------------
    | 2. IMT
    |-------------------------------------------------------------------
    */

    /** IMT = berat (kg) / tinggi(m)². Null bila data belum lengkap. */
    public function hitungImt(?float $bbKg, ?float $tinggiCm): ?float
    {
        if ($bbKg === null || $tinggiCm === null || $tinggiCm <= 0) {
            return null;
        }

        $meter = $tinggiCm / 100;

        return round($bbKg / ($meter * $meter), 2);   // 2 desimal (kontrak 1.6)
    }

    /*
    |-------------------------------------------------------------------
    | 3. Kategori per indikator
    |-------------------------------------------------------------------
    */

    /**
     * Cari rentang ambang yang memuat $nilai.
     * Rentang [batas_min, batas_max); batas_max null = terbuka ke atas.
     */
    public function kategori(string $kode, ?float $nilai, ?string $jenisGula = null): ?array
    {
        if ($nilai === null) {
            return null;
        }

        foreach ($this->ambang($kode, $jenisGula) as $a) {
            $atas = $a['batas_max'];

            if ($nilai >= $a['batas_min'] && ($atas === null || $nilai < $atas)) {
                return $a;
            }
        }

        return null;
    }

    /**
     * Dari beberapa hasil ambang, ambil yang PALING PARAH.
     * Urut: keparahan kategori, lalu skor terbesar.
     */
    public function kategoriTerburuk(array $hasil): ?array
    {
        return collect($hasil)
            ->filter()
            ->sortByDesc(fn ($a) => (self::URUTAN_KATEGORI[$a['kategori'] ?? ''] ?? 0) * 100 + ($a['skor'] ?? 0))
            ->first();
    }

    /**
     * Kategori tekanan darah = yang lebih berat antara sistol & diastol.
     */
    public function kategoriTensi(?int $sistol, ?int $diastol): ?array
    {
        return $this->kategoriTerburuk([
            $this->kategori('sistol', $sistol),
            $this->kategori('diastol', $diastol),
        ]);
    }

    /*
    |-------------------------------------------------------------------
    | 4. Skor risiko & status (kontrak §8.1)
    |-------------------------------------------------------------------
    */

    /**
     * Skor risiko 0–100 = round(Σ skor / Σ skor_maks × 100)
     * hanya atas indikator yang terukur pada log ini.
     */
    public function skorRisiko(CatatanKesehatan $c): int
    {
        $terukur = $this->komponenSkor($c);

        $maks = array_sum(array_column($terukur, 'maks'));

        if ($maks === 0) {
            return 0;
        }

        return (int) min(100, round(array_sum(array_column($terukur, 'skor')) / $maks * 100));
    }

    /**
     * Daftar komponen skor yang terukur: [{kunci, skor, maks}, …]
     * Dipakai skorRisiko() dan untuk menentukan status.
     */
    public function komponenSkor(CatatanKesehatan $c): array
    {
        $komponen = [];

        $imt = $c->imt;
        if ($imt !== null) {
            $komponen[] = [
                'kunci' => 'imt',
                'skor'  => (int) ($this->kategori('imt', $imt)['skor'] ?? 0),
                'maks'  => self::SKOR_MAKS['imt'],
            ];
        }

        if ($c->sistol !== null || $c->diastol !== null) {
            $komponen[] = [
                'kunci' => 'tensi',
                'skor'  => (int) ($this->kategoriTensi($c->sistol, $c->diastol)['skor'] ?? 0),
                'maks'  => self::SKOR_MAKS['tensi'],
            ];
        }

        if ($c->gula_darah !== null) {
            $komponen[] = [
                'kunci' => 'gula_darah',
                'skor'  => (int) ($this->kategori('gula_darah', $c->gula_darah, $c->jenis_gula_darah)['skor'] ?? 0),
                'maks'  => self::SKOR_MAKS['gula_darah'],
            ];
        }

        if ($c->kolesterol !== null) {
            $komponen[] = [
                'kunci' => 'kolesterol',
                'skor'  => (int) ($this->kategori('kolesterol', $c->kolesterol)['skor'] ?? 0),
                'maks'  => self::SKOR_MAKS['kolesterol'],
            ];
        }

        if ($c->asam_urat !== null) {
            $komponen[] = [
                'kunci' => 'asam_urat',
                'skor'  => (int) ($this->kategori('asam_urat', $c->asam_urat)['skor'] ?? 0),
                'maks'  => self::SKOR_MAKS['asam_urat'],
            ];
        }

        return $komponen;
    }

    /**
     * Status kesehatan = skor tertinggi antar indikator (kontrak §1.5):
     * 0 → normal, 1 → perlu_perhatian, ≥2 → berisiko.
     */
    public function statusKesehatan(CatatanKesehatan $c): string
    {
        $tertinggi = max([0, ...array_column($this->komponenSkor($c), 'skor')]);

        return match (true) {
            $tertinggi >= 2 => 'berisiko',
            $tertinggi === 1 => 'perlu_perhatian',
            default => 'normal',
        };
    }

    /** Status dari satu skor (dipakai agregat wilayah). */
    public function statusDariSkor(int $skor): string
    {
        return match (true) {
            $skor >= 2 => 'berisiko',
            $skor === 1 => 'perlu_perhatian',
            default => 'normal',
        };
    }

    /*
    |-------------------------------------------------------------------
    | 5. Snapshot saat insert (kontrak §7.1)
    |-------------------------------------------------------------------
    */

    /**
     * Hitung semua field turunan untuk DISIMPAN di baris log.
     * Dipanggil controller pada POST /catatan-kesehatan.
     *
     * @param  array  $data  data mentah yang akan diinsert
     * @param  float|null  $tinggiCm  tinggi efektif (profil atau input kader)
     */
    public function snapshot(array $data, ?float $tinggiCm): array
    {
        $bb = isset($data['bb_kg']) ? (float) $data['bb_kg'] : null;
        $imt = $this->hitungImt($bb, $tinggiCm);

        $kJenisGula = $data['jenis_gula_darah'] ?? null;

        $kImt   = $this->kategori('imt', $imt);
        $kTensi = $this->kategoriTensi(
            isset($data['sistol']) ? (int) $data['sistol'] : null,
            isset($data['diastol']) ? (int) $data['diastol'] : null
        );
        $kGula  = $this->kategori('gula_darah', isset($data['gula_darah']) ? (float) $data['gula_darah'] : null, $kJenisGula);
        $kKol   = $this->kategori('kolesterol', isset($data['kolesterol']) ? (float) $data['kolesterol'] : null);
        $kAsam  = $this->kategori('asam_urat', isset($data['asam_urat']) ? (float) $data['asam_urat'] : null);

        return [
            'tinggi_cm'           => $tinggiCm,
            'kategori_imt'        => $kImt['kategori'] ?? null,
            'kategori_tensi'      => $kTensi['kategori'] ?? null,
            'kategori_gula_darah' => $kGula['kategori'] ?? null,
            'kategori_kolesterol' => $kKol['kategori'] ?? null,
            'kategori_asam_urat'  => $kAsam['kategori'] ?? null,
        ];
    }

    /**
     * Indikator mana saja yang memicu rujukan otomatis (§8.3).
     * Contoh: sistol/diastol ≥ 180/110 → kategori `krisis`.
     *
     * @return array<string> kunci indikator
     */
    public function indikatorMemicuRujukan(CatatanKesehatan $c): array
    {
        $hasil = [];

        $cek = [
            'sistol'      => $c->sistol,
            'diastol'     => $c->diastol,
            'gula_darah'  => $c->gula_darah,
            'kolesterol'  => $c->kolesterol,
            'asam_urat'   => $c->asam_urat,
        ];

        foreach ($cek as $kode => $nilai) {
            $a = $this->kategori($kode, $nilai, $kode === 'gula_darah' ? $c->jenis_gula_darah : null);

            if (($a['memicu_rujukan'] ?? false) === true) {
                $hasil[] = $kode;
            }
        }

        return $hasil;
    }

    /*
    |-------------------------------------------------------------------
    | 6. Rentang wajar → perlu_verifikasi
    |-------------------------------------------------------------------
    */

    /**
     * Ada nilai di luar rentang wajar? (tabel kontrak §7.2)
     * Log tetap disimpan, ditandai, dan dikeluarkan dari agregat.
     */
    public function perluVerifikasi(array $data): bool
    {
        $rentang = [
            'bb_kg'         => [20, 300],
            'sistol'        => [60, 260],
            'diastol'       => [30, 160],
            'gula_darah'    => [20, 700],
            'kolesterol'    => [50, 600],
            'asam_urat'     => [1, 20],
            'lingkar_perut' => [40, 200],
            'tidur_jam'     => [3, 12],
            'tinggi_cm'     => [120, 220],
        ];

        foreach ($rentang as $field => [$min, $max]) {
            $nilai = $data[$field] ?? null;

            if ($nilai !== null && ($nilai < $min || $nilai > $max)) {
                return true;
            }
        }

        // diastol ≥ sistol: mungkin, tapi tidak wajar → flag (kontrak §7.2).
        if (isset($data['sistol'], $data['diastol']) && $data['diastol'] >= $data['sistol']) {
            return true;
        }

        return false;
    }

    /*
    |-------------------------------------------------------------------
    | 7. Rangkuman response JSON (bentuk kontrak §7.2)
    |-------------------------------------------------------------------
    */

    /**
     * Field hitung-server untuk 1 catatan. Nilai diambil dari SNAPSHOT
     * yang tersimpan, bukan dihitung ulang dari ambang saat ini.
     */
    public function rangkum(CatatanKesehatan $c): array
    {
        return [
            'tinggi_cm'           => $c->tinggi_cm === null ? null : (float) $c->tinggi_cm,
            'imt'                 => $c->imt,
            'kategori_imt'        => $c->kategori_imt,
            'kategori_tensi'      => $c->kategori_tensi,
            'kategori_gula_darah' => $c->kategori_gula_darah,
            'kategori_kolesterol' => $c->kategori_kolesterol,
            'kategori_asam_urat'  => $c->kategori_asam_urat,
            'status_kesehatan'    => $c->status_kesehatan,
            'skor_risiko'         => $c->skor_risiko,
        ];
    }
}
